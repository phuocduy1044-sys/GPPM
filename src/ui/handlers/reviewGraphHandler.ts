/**
 * Review & Graph Slash Commands Handler (100% CLI Mind Map)
 * 
 * Implements the 100% CLI workflow:
 * 1. CLI is the sole work environment where user runs review and gets instant findings.
 * 2. `/graph` (or `/Graph`) transitions to a dedicated CLI frame view showing the
 *    mind map of project architecture and detailed error annotations below.
 * 3. 100% CLI — zero external web server or browser dependencies.
 */
import { resolve, basename } from 'path'
import { execSync } from 'child_process'
import { reviewProject, getCurrentReport, setCurrentReport } from '../../review/engine.js'
import { scanProject } from '../../review/scanner.js'
import { buildAstGraph } from '../../review/ast.js'
import type { ReviewReport } from '../../review/types.js'

export async function handleReviewCommand(
  rawInput: string,
  cwd: string,
  report: (content: string) => void,
  setNotice: (text: string | null) => void,
): Promise<void> {
  setNotice('🔍 Đang phân tích mã nguồn và dựng đồ thị gọi hàm...')
  try {
    const targetArg = rawInput.replace(/^\/[rR]eview\s*/, '').trim()
    const targetPath = targetArg ? resolve(cwd, targetArg) : cwd

    const rep = await reviewProject({ projectRoot: targetPath, mode: 'rules' })
    setCurrentReport(rep)

    const crit = rep.findings.filter((f) => f.severity === 'critical').length
    const high = rep.findings.filter((f) => f.severity === 'high').length
    const med = rep.findings.filter((f) => f.severity === 'medium').length
    const low = rep.findings.filter((f) => f.severity === 'low').length

    let findingsList = ''
    if (rep.findings.length === 0) {
      findingsList = '✓ Không phát hiện lỗ hổng hay vi phạm nào trong phạm vi quét.'
    } else {
      findingsList = rep.findings.slice(0, 8).map((f, i) => {
        const badge = f.severity === 'critical' ? '🔴 **CRITICAL**'
          : f.severity === 'high' ? '🟠 **HIGH**'
          : f.severity === 'medium' ? '🟡 **MEDIUM**'
          : '🔵 **LOW**'
        return `### #${i + 1} [${f.category.toUpperCase()}] ${f.title}\n` +
          `- **Mức độ:** ${badge} | **Vị trí:** \`${f.filePath}:${f.line}\`\n` +
          `- **Bằng chứng:** \`${f.evidence.replace(/\n/g, ' ')}\`\n` +
          `- **Nguyên nhân:** ${f.explanation}\n` +
          `- **Đề xuất sửa:** ${f.suggestion}\n`
      }).join('\n')
      if (rep.findings.length > 8) {
        findingsList += `\n*...và còn ${rep.findings.length - 8} vấn đề khác.*`
      }
    }

    const summary = [
      '# 🔍 BÁO CÁO PHÂN TÍCH MÃ NGUỒN (AI CODE REVIEW)',
      '',
      `**Dự án:** \`${rep.projectName}\` | **Phiên bản (Revision):** \`${rep.revision}\``,
      `**Phạm vi quét:** ${rep.scanScope.totalFilesScanned} tệp (${rep.scanScope.scanDurationMs}ms) | **Đồ thị AST:** ${rep.nodes.length} nodes, ${rep.edges.length} edges`,
      '',
      '---',
      '',
      `### 📊 Tổng quan phát hiện: ${rep.findings.length} vấn đề`,
      `- 🔴 Critical: **${crit}** | 🟠 High: **${high}** | 🟡 Medium: **${med}** | 🔵 Low: **${low}**`,
      '',
      '---',
      '',
      findingsList,
      '',
      '---',
      '💡 **Xem sơ đồ tư duy:** Nhập **/graph** (hoặc **/Graph**) để chuyển sang giao diện khung xem sơ đồ tư duy (mind map) và chú thích lỗi trong CLI!',
    ].join('\n')

    report(summary)
  } catch (err: unknown) {
    report(`❌ Lỗi khi phân tích mã nguồn: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    setNotice(null)
  }
}

export async function handleGraphCommand(
  cwd: string,
  report: (content: string) => void,
  setNotice: (text: string | null) => void,
  onOpenGraphView?: (rep: ReviewReport) => void,
): Promise<void> {
  try {
    let rep = getCurrentReport()

    if (!rep || (rep.projectRoot && resolve(rep.projectRoot) !== resolve(cwd))) {
      report([
        `⚠ **Chưa có kết quả review cho dự án hiện tại (${basename(cwd)}).**`,
        '',
        'CLI là nơi làm việc chính. Hãy yêu cầu phân tích mã nguồn trước bằng lệnh:',
        '👉 `/review`',
        '',
        'Sau khi CLI phân tích xong, bạn chỉ cần nhập `/graph` để xem sơ đồ tư duy (mind map) trong giao diện khung CLI!',
      ].join('\n'))
      return
    }

    // 1. Dựng bổ sung Graph nếu report chưa có nodes/edges mà không gọi lại AI
    if (!rep.nodes || rep.nodes.length === 0) {
      const scope = scanProject(cwd)
      const ast = buildAstGraph(scope.files)
      rep.nodes = ast.nodes
      rep.edges = ast.edges
      rep.unresolvedCalls = ast.unresolvedCalls
      setCurrentReport(rep)
    }

    // 2. Kiểm tra xem mã nguồn có thay đổi so với thời điểm review không
    let isOutdated = false
    try {
      const curRev = execSync('git rev-parse --short HEAD', {
        cwd,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      const dirty = execSync('git status --porcelain', {
        cwd,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim().length > 0
      if (curRev !== rep.revision || dirty) isOutdated = true
    } catch { /* not git repository */ }

    // 3. Chuyển sang giao diện khung sơ đồ tư duy 100% CLI
    if (onOpenGraphView) {
      onOpenGraphView(rep)
    }

    const outdatedNotice = isOutdated
      ? '\n> ⚠ **Lưu ý:** Mã nguồn dự án đã có thay đổi so với thời điểm review này. Bạn có thể gõ `/review` để quét lại mã mới nhất.\n'
      : ''

    report([
      '🧠 **Sơ đồ tư duy kiến trúc mã nguồn (Mind Map - 100% CLI)**',
      '',
      `Đã chuyển sang giao diện khung xem sơ đồ tư duy cho **${rep.projectName}** (Phiên bản: \`${rep.revision}\`):`,
      `- Đồ thị kiến trúc: **${rep.nodes.length} nodes**, **${rep.edges.length} edges**`,
      `- Ghi nhận: **${rep.findings.length} vấn đề** (có chú thích chi tiết cho từng file & ngôn ngữ bên dưới sơ đồ)`,
      outdatedNotice,
      '*(Dùng **↑/↓** hoặc **PgUp/PgDn** để cuộn sơ đồ tư duy. Nhấn **Esc** hoặc **q** để trở lại màn hình trò chuyện)*',
    ].filter(Boolean).join('\n'))
  } catch (err: unknown) {
    report(`❌ Không thể mở sơ đồ tư duy Mind Map: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    setNotice(null)
  }
}

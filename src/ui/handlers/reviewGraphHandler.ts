/**
 * Review & Graph Slash Commands Handler
 * 
 * Implements the CLI-first workflow:
 * 1. CLI is the primary work environment where user runs review and gets instant findings.
 * 2. `/graph` (or `/Graph`) opens or reuses the local Code Reviewer by Graph UI,
 *    binding directly to the current CLI session's review results without re-running AI.
 */
import { resolve, basename } from 'path'
import { execSync } from 'child_process'
import { reviewProject, getCurrentReport, setCurrentReport } from '../../review/engine.js'
import { scanProject } from '../../review/scanner.js'
import { buildAstGraph } from '../../review/ast.js'
import { getOrStartCliWebServer, openBrowser } from '../../web/cliWebServer.js'

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
      '💡 **Xem trực quan:** Nhập **/graph** (hoặc **/Graph**) để mở giao diện đồ thị tương tác của lần review này!',
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
        'Sau khi CLI phân tích xong, bạn chỉ cần nhập `/graph` để mở đồ thị trực quan!',
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

    // 3. Khởi động hoặc tái sử dụng Web Server localhost
    setNotice('Đang khởi động giao diện Code Reviewer by Graph...')
    const { url } = await getOrStartCliWebServer(cwd)
    openBrowser(url)

    const outdatedNotice = isOutdated
      ? '\n> ⚠ **Lưu ý:** Mã nguồn dự án đã có thay đổi so với thời điểm review này. Bạn có thể gõ `/review` để quét lại mã mới nhất.\n'
      : ''

    report([
      '📊 **Code Reviewer by Graph**',
      '',
      `Đã mở giao diện trực quan cho dự án **${rep.projectName}** (Phiên bản: \`${rep.revision}\`):`,
      `👉 **[${url}](${url})**`,
      '',
      `- Đồ thị hiển thị: **${rep.nodes.length} nodes**, **${rep.edges.length} edges**`,
      `- Đã gắn: **${rep.findings.length} vấn đề** vào đúng file/hàm/dòng mã`,
      outdatedNotice,
      '*(Đường dẫn đã được tự động mở trong trình duyệt. Bạn có thể nhấp lại link trên hoặc tiếp tục làm việc trong CLI)*',
    ].join('\n'))
  } catch (err: unknown) {
    report(`❌ Không thể mở Code Reviewer by Graph: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    setNotice(null)
  }
}

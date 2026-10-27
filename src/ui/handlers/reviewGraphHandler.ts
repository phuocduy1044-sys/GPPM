/**
 * Review & Graph Slash Commands Handler
 * 
 * Implements the CLI-first workflow:
 * 1. CLI is the primary work environment where user runs review and gets instant findings.
 * 2. `/graph` (or `/Graph`) opens or reuses the local Code Reviewer by Graph UI on the web,
 *    binding directly to the current CLI session's review results without re-running AI.
 * 3. Context-aware folder detection: when user sends a folder address/path in conversation
 *    context, bare `/review` automatically picks up that target folder instead of analyzing
 *    the entire project root.
 */
import { resolve, basename, relative, isAbsolute } from 'path'
import { existsSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { reviewProject, getCurrentReport, setCurrentReport } from '../../review/engine.js'
import { scanProject } from '../../review/scanner.js'
import { buildAstGraph } from '../../review/ast.js'
import { getOrStartCliWebServer, openBrowser } from '../../web/cliWebServer.js'
import type { ChatMessage } from '../types.js'

/**
 * Validates whether candidate string points to an existing directory.
 * Ignores project cwd root itself, URLs, and ignored folders (node_modules, .git, etc.).
 */
export function checkDirectoryCandidate(candidate: string, cwd: string): string | null {
  if (!candidate || typeof candidate !== 'string') return null
  let cleaned = candidate.trim()

  // Remove leading @ if mention style
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1).trim()
  }

  // Strip leading and trailing quotes (single, double, backtick)
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim()

  // Strip trailing punctuation common in prose (.,;:!?)]})
  cleaned = cleaned.replace(/[.,;:!?)}\]]+$/g, '').trim()

  // Strip again in case of nested quotes: `path` -> path
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim()

  if (!cleaned || cleaned === '.' || cleaned === '..' || cleaned === '/' || cleaned === '\\') {
    return null
  }

  // Ignore URLs
  if (/^[a-zA-Z]+:\/\//.test(cleaned)) {
    return null
  }

  try {
    const fullPath = isAbsolute(cleaned) ? resolve(cleaned) : resolve(cwd, cleaned)
    // Avoid selecting project cwd itself when looking for a specific folder from context
    if (fullPath === resolve(cwd)) {
      return null
    }

    const base = basename(fullPath).toLowerCase()
    if (base === 'node_modules' || base === '.git' || base === 'dist' || base === 'build' || base === '.cache') {
      return null
    }

    if (existsSync(fullPath)) {
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        return fullPath
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Searches for a folder address/path mention inside text message.
 */
export function findFolderInText(text: string, cwd: string): string | null {
  if (!text || typeof text !== 'string') return null

  // 1. Keyword based: thư mục X, folder X, dir: X, địa chỉ folder X
  const keywordRegex = /(?:thư\s*mục|thu\s*muc|folder|directory|địa\s*chỉ\s*folder|dia\s*chi\s*folder|dir)\s*[:=]?\s*([`'"]?[^\s,;'"<>\n\r\t]+[`'"]?)/gi
  let match: RegExpExecArray | null
  while ((match = keywordRegex.exec(text)) !== null) {
    const dir = checkDirectoryCandidate(match[1], cwd)
    if (dir) return dir
  }

  // 2. Mention @dir
  const mentionRegex = /@([^\s,;'"<>\n\r\t]+)/g
  while ((match = mentionRegex.exec(text)) !== null) {
    const dir = checkDirectoryCandidate(match[1], cwd)
    if (dir) return dir
  }

  // 3. Quoted strings (backticks, single/double quotes)
  const quotedRegex = /[`'"]([^`'"\n\r\t]+)[`'"]/g
  while ((match = quotedRegex.exec(text)) !== null) {
    const dir = checkDirectoryCandidate(match[1], cwd)
    if (dir) return dir
  }

  // 4. Windows paths (C:\... or C:/...)
  const winPathRegex = /[a-zA-Z]:[\\/][^\s,;'"<>\n\r\t]+/g
  while ((match = winPathRegex.exec(text)) !== null) {
    const dir = checkDirectoryCandidate(match[0], cwd)
    if (dir) return dir
  }

  // 5. Slash paths (relative ./... or dir/sub)
  const slashPathRegex = /(?:\.{1,2}[\\/]|[a-zA-Z0-9_\-\.]+[\\/])[^\s,;'"<>\n\r\t]*/g
  while ((match = slashPathRegex.exec(text)) !== null) {
    const dir = checkDirectoryCandidate(match[0], cwd)
    if (dir) return dir
  }

  // 6. Word tokens
  const words = text.split(/[\s,;'"()<>[\]]+/)
  for (const word of words) {
    if (word.length >= 2 && !/^(the|and|for|with|this|that|from|have|true|false|null|undefined|vào|của|trong|cho|với|được|không|hãy)$/i.test(word)) {
      const dir = checkDirectoryCandidate(word, cwd)
      if (dir) return dir
    }
  }

  return null
}

/**
 * Extracts candidate target folder from conversation context (recent messages, tool uses, agent history, or previous report).
 */
export function extractContextFolder(
  cwd: string,
  messages?: ChatMessage[],
  agentHistory?: Array<{ role: string; content?: unknown }>,
): string | null {
  // 1. Check messages in reverse (most recent message first)
  if (messages && messages.length > 0) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (typeof msg.content === 'string' && msg.content.trim()) {
        const found = findFolderInText(msg.content, cwd)
        if (found) return found
      }
      if (Array.isArray(msg.tool_uses)) {
        for (const tool of msg.tool_uses) {
          if (tool && tool.input && typeof tool.input === 'object') {
            const input = tool.input as Record<string, unknown>
            for (const key of ['dir', 'directory', 'path', 'filePath', 'cwd', 'targetDir']) {
              if (typeof input[key] === 'string') {
                const found = checkDirectoryCandidate(input[key] as string, cwd)
                if (found) return found
              }
            }
          }
        }
      }
    }
  }

  // 2. Check agentHistory in reverse
  if (agentHistory && agentHistory.length > 0) {
    for (let i = agentHistory.length - 1; i >= 0; i--) {
      const item = agentHistory[i]
      if (typeof item.content === 'string' && item.content.trim()) {
        const found = findFolderInText(item.content, cwd)
        if (found) return found
      } else if (Array.isArray(item.content)) {
        for (const part of item.content) {
          if (typeof part === 'string') {
            const found = findFolderInText(part, cwd)
            if (found) return found
          } else if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
            const found = findFolderInText((part as { text: string }).text, cwd)
            if (found) return found
          }
        }
      }
    }
  }

  // 3. Fallback: check previous review report if it reviewed a subfolder
  const prevReport = getCurrentReport()
  if (prevReport?.projectRoot) {
    const prevRoot = resolve(prevReport.projectRoot)
    const cwdRoot = resolve(cwd)
    if (prevRoot !== cwdRoot && prevRoot.startsWith(cwdRoot) && existsSync(prevRoot)) {
      return prevRoot
    }
  }

  return null
}

export async function handleReviewCommand(
  rawInput: string,
  cwd: string,
  report: (content: string) => void,
  setNotice: (text: string | null) => void,
  agentHistory?: Array<{ role: string; content?: unknown }>,
  messages?: ChatMessage[],
): Promise<void> {
  setNotice('🔍 Đang phân tích mã nguồn và dựng đồ thị gọi hàm...')
  try {
    let targetArg = rawInput.replace(/^\/[rR]eview\s*/, '').trim()
    let isFromContext = false
    let targetPath: string

    if (targetArg) {
      targetArg = targetArg.replace(/^['"`]+|['"`]+$/g, '').trim()
      if (targetArg === '.' || targetArg.toLowerCase() === 'all') {
        targetPath = cwd
      } else {
        targetPath = resolve(cwd, targetArg)
      }
    } else {
      const contextFolder = extractContextFolder(cwd, messages, agentHistory)
      if (contextFolder) {
        targetPath = contextFolder
        isFromContext = true
      } else {
        targetPath = cwd
      }
    }

    if (!existsSync(targetPath)) {
      report(`❌ Thư mục không tồn tại: \`${targetPath}\``)
      return
    }

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

    const scopeRelative = relative(cwd, targetPath)
    const scopeDisplay = scopeRelative ? scopeRelative.replace(/\\/g, '/') : '.'
    const scopeLine = isFromContext
      ? `**Phạm vi quét:** Thư mục \`${scopeDisplay}\` *(tự động nhận từ ngữ cảnh hội thoại)* | ${rep.scanScope.totalFilesScanned} tệp (${rep.scanScope.scanDurationMs}ms)`
      : targetPath !== cwd
        ? `**Phạm vi quét:** Thư mục \`${scopeDisplay}\` | ${rep.scanScope.totalFilesScanned} tệp (${rep.scanScope.scanDurationMs}ms)`
        : `**Phạm vi quét:** Toàn bộ dự án | ${rep.scanScope.totalFilesScanned} tệp (${rep.scanScope.scanDurationMs}ms)`

    const contextNote = isFromContext
      ? `\n> 💡 **Ghi chú:** Đã tự động nhận diện thư mục \`${scopeDisplay}\` từ ngữ cảnh hội thoại. Nhập \`/review .\` nếu muốn phân tích toàn bộ dự án.\n`
      : ''

    const summary = [
      '# 🔍 BÁO CÁO PHÂN TÍCH MÃ NGUỒN (AI CODE REVIEW)',
      '',
      `**Dự án:** \`${rep.projectName}\` | **Phiên bản (Revision):** \`${rep.revision}\``,
      `${scopeLine} | **Đồ thị AST:** ${rep.nodes.length} nodes, ${rep.edges.length} edges`,
      contextNote,
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
    ].filter(Boolean).join('\n')

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

    const rootResolved = rep?.projectRoot ? resolve(rep.projectRoot) : ''
    const cwdResolved = resolve(cwd)
    const isMatch = !!rep && (
      !rootResolved ||
      rootResolved === cwdResolved ||
      rootResolved.startsWith(cwdResolved) ||
      cwdResolved.startsWith(rootResolved)
    )

    if (!rep || !isMatch) {
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
      const scanDir = rep.projectRoot || cwd
      const scope = scanProject(scanDir)
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

    rep.isOutdated = isOutdated
    setCurrentReport(rep)

    // 3. Khởi động hoặc tái sử dụng Web Server localhost
    setNotice('Đang khởi động giao diện Code Reviewer by Graph...')
    const { url } = await getOrStartCliWebServer(cwd)
    openBrowser(url)

    const outdatedNotice = isOutdated
      ? '\n> ⚠ **Lưu ý:** Mã nguồn dự án đã có thay đổi so với thời điểm review này. Bạn có thể gõ `/review` để quét lại mã mới nhất.\n'
      : ''

    const cleanDisplayUrl = url.split('#')[0]

    report([
      '📊 **Code Reviewer by Graph**',
      '',
      `Đã mở giao diện trực quan cho dự án **${rep.projectName}** (Phiên bản: \`${rep.revision}\`):`,
      `👉 **[${cleanDisplayUrl}](${url})**`,
      '',
      `- Đồ thị hiển thị: **${rep.nodes.length} nodes**, **${rep.edges.length} edges**`,
      `- Đã gắn: **${rep.findings.length} vấn đề** vào đúng file/hàm/dòng mã`,
      outdatedNotice,
      '*(Đường dẫn đã được tự động mở trong trình duyệt. Bạn có thể nhấp lại link trên hoặc tiếp tục làm việc trong CLI)*',
    ].filter(Boolean).join('\n'))
  } catch (err: unknown) {
    report(`❌ Không thể mở Code Reviewer by Graph: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    setNotice(null)
  }
}

/**
 * Review & Graph Slash Commands Handler
 * 
 * Implements the CLI-first workflow:
 * 1. CLI is the primary work environment where user runs review and gets instant findings.
 * 2. `/graph` (or `/Graph`) opens or reuses the local Code Reviewer by Graph UI on the web,
 *    binding directly to the current CLI session's review results without re-running AI.
 * 3. Context-aware folder detection:
 *    - If `/review` has requirements or target folder: executes that requirement/target.
 *    - If bare `/review` without arguments: reviews the folder from conversation context.
 *    - If no folder in context either: prints clear guidance notification instead of blindly scanning cwd.
 */
import { resolve, basename, relative, isAbsolute } from 'path'
import { existsSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { reviewProject, getCurrentReport, setCurrentReport, computeRevision } from '../../review/engine.js'
import { scanProject } from '../../review/scanner.js'
import { buildAstGraph } from '../../review/ast.js'
import { getOrStartCliWebServer, openBrowser } from '../../web/cliWebServer.js'
import type { Finding } from '../../review/types.js'
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



  return null
}

export interface ParsedReviewInput {
  targetFolder: string | null
  requirement: string | null
  isExplicitProjectRoot: boolean
}

/**
 * Parses raw `/review` input to separate target folder, requirements, or explicit project-root flags.
 */
export function parseReviewInput(rawInput: string, cwd: string): ParsedReviewInput {
  const trimmedInput = rawInput.replace(/^\/[rR]eview\s*/, '').trim()
  if (!trimmedInput) {
    return { targetFolder: null, requirement: null, isExplicitProjectRoot: false }
  }

  if (trimmedInput === '.' || trimmedInput.toLowerCase() === 'all') {
    return { targetFolder: cwd, requirement: null, isExplicitProjectRoot: true }
  }

  if (/^\.\s+/.test(trimmedInput) || /^all\s+/i.test(trimmedInput)) {
    const req = trimmedInput.replace(/^(\.|\ball\b)\s+/i, '').trim()
    return { targetFolder: cwd, requirement: req || null, isExplicitProjectRoot: true }
  }

  // Quoted folder at beginning: "folder" requirement
  const quotedMatch = /^(['"`])([^'"`]+)\1(?:\s+([\s\S]*))?$/.exec(trimmedInput)
  if (quotedMatch) {
    const possiblePath = quotedMatch[2].trim()
    const possibleReq = (quotedMatch[3] || '').trim()
    const dir = checkDirectoryCandidate(possiblePath, cwd)
    if (dir) {
      return { targetFolder: dir, requirement: possibleReq || null, isExplicitProjectRoot: false }
    }
  }

  // First token is directory
  const firstSpaceIdx = trimmedInput.search(/\s/)
  if (firstSpaceIdx > 0) {
    const firstToken = trimmedInput.slice(0, firstSpaceIdx)
    const rest = trimmedInput.slice(firstSpaceIdx).trim()
    const dir = checkDirectoryCandidate(firstToken, cwd)
    if (dir) {
      return { targetFolder: dir, requirement: rest || null, isExplicitProjectRoot: false }
    }
  }

  // Entire input is directory
  const wholeDir = checkDirectoryCandidate(trimmedInput, cwd)
  if (wholeDir) {
    return { targetFolder: wholeDir, requirement: null, isExplicitProjectRoot: false }
  }

  // Embedded directory in text
  const embeddedDir = findFolderInText(trimmedInput, cwd)
  if (embeddedDir) {
    return { targetFolder: embeddedDir, requirement: trimmedInput, isExplicitProjectRoot: false }
  }

  // No directory found: entire input is requirement
  return { targetFolder: null, requirement: trimmedInput, isExplicitProjectRoot: false }
}

/**
 * Checks if a finding directly matches the user's specific review requirement.
 */
export function matchesRequirement(finding: Finding, requirement: string): boolean {
  if (!requirement || !requirement.trim()) return false
  const reqLower = requirement.toLowerCase()
  const text = `${finding.title} ${finding.explanation} ${finding.ruleId} ${finding.category} ${finding.evidence} ${finding.filePath}`.toLowerCase()

  if (finding.category === 'security' && /(bảo mật|an toàn|security|tấn công|lỗ hổng|vulnerability|injection|xss|sql|auth|token|secret|leak|credential)/i.test(reqLower)) {
    return true
  }
  if (finding.category === 'bug' && /(bug|lỗi|sai|crash|null|exception|hỏng|failure|error)/i.test(reqLower)) {
    return true
  }
  if ((finding.category === 'maintainability' || text.includes('memory') || text.includes('leak') || text.includes('perf')) && /(hiệu năng|tối ưu|performance|speed|chậm|memory|leak|tài nguyên)/i.test(reqLower)) {
    return true
  }
  if (finding.category === 'style' && /(style|chuẩn|format|convention|quy tắc|định dạng|clean)/i.test(reqLower)) {
    return true
  }

  const tokens = reqLower.split(/[\s,;'"()<>[\]]+/).filter((t) => t.length >= 3 && !/^(các|cho|với|trong|kiểm|tra|xem|tìm|giùm|giúp|nhé|được|không|phân|tích)$/i.test(t))
  for (const token of tokens) {
    if (text.includes(token)) return true
  }

  return false
}

export async function handleReviewCommand(
  rawInput: string,
  cwd: string,
  report: (content: string) => void,
  setNotice: (text: string | null) => void,
  agentHistory?: Array<{ role: string; content?: unknown }>,
  messages?: ChatMessage[],
  sessionId?: string,
): Promise<void> {
  const parsed = parseReviewInput(rawInput, cwd)
  let isFromContext = false

  // 1. If bare /review was called without any folder or requirement:
  if (!parsed.isExplicitProjectRoot && !parsed.targetFolder && !parsed.requirement) {
    // Check if the current session already reviewed a folder previously
    const prevSessionReport = getCurrentReport(sessionId)
    if (prevSessionReport?.projectRoot && existsSync(prevSessionReport.projectRoot)) {
      parsed.targetFolder = prevSessionReport.projectRoot
      isFromContext = true
    } else {
      const contextFolder = extractContextFolder(cwd, messages, agentHistory)
      if (!contextFolder) {
        report([
          '⚠ **Chưa xác định được thư mục cần phân tích.**',
          '',
          'Không tìm thấy đường dẫn thư mục trong lệnh và cũng không có thư mục nào được đề cập trong ngữ cảnh hội thoại gần đây.',
          '',
          '👉 Bạn có thể dùng lệnh theo các cách sau:',
          '   - Thư mục kèm yêu cầu: `/review <thư-mục> <yêu-cầu>` *(ví dụ: `/review src/ kiểm tra lỗi bảo mật`)*',
          '   - Chỉ định thư mục cụ thể: `/review <đường-dẫn-thư-mục>` *(ví dụ: `/review examples/demo-project`)*',
          '   - Yêu cầu phân tích cụ thể: `/review <yêu-cầu>` *(ví dụ: `/review kiểm tra bảo mật SQL injection`)*',
          '   - Phân tích toàn bộ dự án: `/review .`',
          '',
          '💡 *Gợi ý:* Bạn cũng có thể gửi địa chỉ folder vào khung chat trước, sau đó chỉ cần gõ `/review`.',
        ].join('\n'))
        return
      }

      parsed.targetFolder = contextFolder
      isFromContext = true
    }
  }

  // 2. Determine target path and whether it's from context
  let targetPath: string

  if (parsed.isExplicitProjectRoot) {
    targetPath = cwd
  } else if (parsed.targetFolder) {
    targetPath = parsed.targetFolder
  } else {
    // User provided a requirement without a folder, e.g. `/review kiểm tra SQL injection`
    const prevSessionReport = getCurrentReport(sessionId)
    if (prevSessionReport?.projectRoot && existsSync(prevSessionReport.projectRoot)) {
      targetPath = prevSessionReport.projectRoot
      isFromContext = true
    } else {
      const contextFolder = extractContextFolder(cwd, messages, agentHistory)
      if (contextFolder) {
        targetPath = contextFolder
        isFromContext = true
      } else {
        targetPath = cwd
      }
    }
  }

  if (!existsSync(targetPath)) {
    report(`❌ Thư mục không tồn tại: \`${targetPath}\``)
    return
  }

  setNotice(parsed.requirement
    ? `🔍 Đang phân tích mã nguồn theo yêu cầu: "${parsed.requirement}"...`
    : '🔍 Đang phân tích mã nguồn và dựng đồ thị gọi hàm...')

  try {
    const rep = await reviewProject({
      projectRoot: targetPath,
      mode: 'rules',
      userRequirement: parsed.requirement || undefined,
      sessionId,
    })
    setCurrentReport(rep, sessionId)

    const crit = rep.findings.filter((f) => f.severity === 'critical').length
    const high = rep.findings.filter((f) => f.severity === 'high').length
    const med = rep.findings.filter((f) => f.severity === 'medium').length
    const low = rep.findings.filter((f) => f.severity === 'low').length

    let matchedFindings: Finding[] = []
    let otherFindings: Finding[] = rep.findings

    if (parsed.requirement) {
      matchedFindings = rep.findings.filter((f) => matchesRequirement(f, parsed.requirement!))
      otherFindings = rep.findings.filter((f) => !matchesRequirement(f, parsed.requirement!))
    }

    const renderFinding = (f: Finding, i: number, isMatched: boolean) => {
      const badge = f.severity === 'critical' ? '🔴 **CRITICAL**'
        : f.severity === 'high' ? '🟠 **HIGH**'
        : f.severity === 'medium' ? '🟡 **MEDIUM**'
        : '🔵 **LOW**'
      const matchTag = isMatched ? ' 🎯 *(Trực tiếp liên quan đến yêu cầu)*' : ''
      return `### #${i + 1} [${f.category.toUpperCase()}] ${f.title}${matchTag}\n` +
        `- **Mức độ:** ${badge} | **Vị trí:** \`${f.filePath}:${f.line}\`\n` +
        `- **Bằng chứng:** \`${f.evidence.replace(/\n/g, ' ')}\`\n` +
        `- **Nguyên nhân:** ${f.explanation}\n` +
        `- **Đề xuất sửa:** ${f.suggestion}\n`
    }

    let findingsList = ''
    if (rep.findings.length === 0) {
      findingsList = '✓ Không phát hiện lỗ hổng hay vi phạm nào trong phạm vi quét.'
    } else if (parsed.requirement) {
      const sections: string[] = []
      if (matchedFindings.length > 0) {
        sections.push(
          `### 🎯 Vấn đề liên quan trực tiếp đến yêu cầu "${parsed.requirement}" (${matchedFindings.length}):\n\n` +
          matchedFindings.map((f, i) => renderFinding(f, i, true)).join('\n')
        )
      } else {
        sections.push(`> 🎯 **Yêu cầu:** "${parsed.requirement}"\n> ✓ Không phát hiện vấn đề nào vi phạm trực tiếp yêu cầu này trong các tệp đã quét.\n`)
      }

      if (otherFindings.length > 0) {
        sections.push(
          `### 📋 Các phát hiện khác (${otherFindings.length}):\n\n` +
          otherFindings.slice(0, 5).map((f, i) => renderFinding(f, matchedFindings.length + i, false)).join('\n')
        )
        if (otherFindings.length > 5) {
          sections.push(`*...và còn ${otherFindings.length - 5} vấn đề khác.*`)
        }
      }
      findingsList = sections.join('\n\n')
    } else {
      findingsList = rep.findings.slice(0, 8).map((f, i) => renderFinding(f, i, false)).join('\n')
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

    const requirementLine = parsed.requirement
      ? `**Yêu cầu trọng tâm:** 🎯 *"${parsed.requirement}"*\n`
      : ''

    const contextNote = isFromContext
      ? `\n> 💡 **Ghi chú:** Đã tự động nhận diện thư mục \`${scopeDisplay}\` từ ngữ cảnh hội thoại. Nhập \`/review .\` nếu muốn phân tích toàn bộ dự án.\n`
      : ''

    const summary = [
      '# 🔍 BÁO CÁO PHÂN TÍCH MÃ NGUỒN (AI CODE REVIEW)',
      '',
      `**Dự án:** \`${rep.projectName}\` | **Phiên bản (Revision):** \`${rep.revision}\``,
      `${scopeLine} | **Đồ thị AST:** ${rep.nodes.length} nodes, ${rep.edges.length} edges`,
      requirementLine,
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
  sessionId?: string,
): Promise<void> {
  try {
    let rep = getCurrentReport(sessionId)

    // Strictly check if report exists for this session
    if (!rep) {
      report([
        '⚠ **Chưa có kết quả review cho phiên làm việc hiện tại.**',
        '',
        'CLI là nơi làm việc chính. Hãy yêu cầu phân tích mã nguồn trước bằng lệnh:',
        '👉 `/review <thư-mục>`',
        '',
        'Sau khi CLI phân tích xong, bạn chỉ cần nhập `/graph` để mở đồ thị trực quan!',
      ].join('\n'))
      return
    }

    // 1. Build AST graph without re-running AI if missing
    if (!rep.nodes || rep.nodes.length === 0) {
      const scanDir = rep.projectRoot || cwd
      const scope = scanProject(scanDir)
      const ast = buildAstGraph(scope.files)
      rep.nodes = ast.nodes
      rep.edges = ast.edges
      rep.unresolvedCalls = ast.unresolvedCalls
      setCurrentReport(rep, sessionId)
    }

    // 2. Check if source code at rep.projectRoot has changed compared to reviewed revision
    let isOutdated = false
    try {
      if (existsSync(rep.projectRoot)) {
        try {
          const curRev = execSync('git rev-parse --short HEAD', {
            cwd: rep.projectRoot,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim()
          const dirty = execSync('git status --porcelain', {
            cwd: rep.projectRoot,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim().length > 0
          if (curRev !== rep.revision || dirty) isOutdated = true
        } catch {
          // If not a git repo, compute hash of current files
          const { files } = scanProject(rep.projectRoot)
          const curRev = computeRevision(files)
          if (curRev !== rep.revision) isOutdated = true
        }
      }
    } catch { /* ignore */ }

    rep.isOutdated = isOutdated
    setCurrentReport(rep, sessionId)

    // 3. Start or reuse Web Server localhost
    setNotice('Đang khởi động giao diện Code Reviewer by Graph...')
    const { url } = await getOrStartCliWebServer(rep.projectRoot || cwd)

    const baseWithoutHash = url.split('#')[0]
    const tokenPart = url.includes('#') ? url.slice(url.indexOf('#')) : ''
    const sessionQuery = sessionId ? `session=${encodeURIComponent(sessionId)}` : `reviewId=${encodeURIComponent(rep.reviewId)}`
    const sep = baseWithoutHash.includes('?') ? '&' : '?'
    const fullUrl = `${baseWithoutHash}${sep}${sessionQuery}${tokenPart ? `${tokenPart}&${sessionQuery}` : `#${sessionQuery}`}`

    openBrowser(fullUrl)

    const outdatedNotice = isOutdated
      ? `\n> ⚠ **Lưu ý:** Mã nguồn tại \`${rep.projectRoot}\` đã có thay đổi so với thời điểm review này (\`${rep.revision}\`).\n> Đang hiển thị kết quả phân tích cũ. Bạn có thể gõ \`/review "${rep.projectRoot}"\` để quét lại mã mới nhất.\n`
      : ''

    const cleanDisplayUrl = fullUrl.split('#')[0]

    report([
      '📊 **Code Reviewer by Graph (Sơ đồ cây trực quan SVG)**',
      '',
      `Đã mở giao diện trực quan cho dự án **${rep.projectName}** (Phiên bản: \`${rep.revision}\`):`,
      `👉 **[${cleanDisplayUrl}](${fullUrl})**`,
      '',
      `- Thư mục phân tích: \`${rep.projectRoot}\``,
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

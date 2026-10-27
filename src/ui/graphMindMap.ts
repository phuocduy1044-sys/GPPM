import type { ReviewReport, Finding } from '../review/types.js'
import { C } from './theme.js'

export interface MindMapLine {
  text: string
  color?: string
  bold?: boolean
  dimColor?: boolean
  inverse?: boolean
}

/**
 * Detect programming language from file path extension.
 */
export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'TypeScript'
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'JavaScript'
    case 'py':
      return 'Python'
    case 'go':
      return 'Go'
    case 'rs':
      return 'Rust'
    case 'java':
      return 'Java'
    case 'c':
    case 'h':
      return 'C'
    case 'cpp':
    case 'hpp':
    case 'cc':
    case 'cxx':
      return 'C++'
    case 'cs':
      return 'C#'
    case 'php':
      return 'PHP'
    case 'rb':
      return 'Ruby'
    case 'html':
      return 'HTML'
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return 'CSS'
    case 'json':
      return 'JSON'
    case 'md':
    case 'markdown':
      return 'Markdown'
    case 'sh':
    case 'bash':
      return 'Shell'
    case 'ps1':
      return 'PowerShell'
    case 'bat':
    case 'cmd':
      return 'Batch'
    case 'sql':
      return 'SQL'
    case 'yaml':
    case 'yml':
      return 'YAML'
    default:
      return ext ? ext.toUpperCase() : 'Text'
  }
}

/**
 * Formats a single node or directory branch in the mind map.
 */
function normalizeDir(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  if (parts.length <= 1) return '.'
  return parts.slice(0, -1).join('/')
}

function baseFileName(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop() ?? filePath
}

/**
 * Generates the complete Mind Map and Annotations lines for CLI rendering.
 */
export function generateMindMap(report: ReviewReport, maxWidth = 80): MindMapLine[] {
  const lines: MindMapLine[] = []

  const crit = report.findings.filter((f) => f.severity === 'critical').length
  const high = report.findings.filter((f) => f.severity === 'high').length
  const med = report.findings.filter((f) => f.severity === 'medium').length
  const low = report.findings.filter((f) => f.severity === 'low').length

  const boxWidth = Math.max(30, Math.min(maxWidth, 90))

  // 1. Header Box
  lines.push({ text: `╭${'─'.repeat(boxWidth - 2)}╮`, color: C.blue })
  lines.push({
    text: `│ 🧠 SƠ ĐỒ TƯ DUY KIẾN TRÚC MÃ NGUỒN (MIND MAP)`,
    color: C.blue,
    bold: true,
  })
  lines.push({
    text: `│ Dự án: ${report.projectName}  ·  Revision: ${report.revision}  ·  Chế độ: 100% CLI`,
    dimColor: true,
  })
  lines.push({ text: `╰${'─'.repeat(boxWidth - 2)}╯`, color: C.blue })
  lines.push({ text: '' })

  // 2. Summary stats line
  const summaryColor = crit > 0 ? C.red : high > 0 ? C.yellow : C.green
  lines.push({
    text: `📊 Tổng kết phát hiện: ${report.findings.length} vấn đề  ·  🔴 Critical: ${crit}  🟠 High: ${high}  🟡 Medium: ${med}  🔵 Low: ${low}`,
    color: summaryColor,
    bold: true,
  })
  lines.push({
    text: `📐 Đồ thị AST: ${report.nodes.length} nodes (tệp & hàm)  ·  ${report.edges.length} edges (lời gọi hàm & imports)`,
    dimColor: true,
  })
  lines.push({ text: '' })

  // 3. SƠ ĐỒ TƯ DUY (MIND MAP TREE)
  lines.push({
    text: `─── 🧠 SƠ ĐỒ TƯ DUY CẤU TRÚC DỰ ÁN (MIND MAP) ──────────────────────────────────`,
    color: C.cyan,
    bold: true,
  })
  lines.push({ text: '' })
  lines.push({
    text: `📦 [${report.projectName}] (Gốc dự án / Root)`,
    color: C.blue,
    bold: true,
  })
  lines.push({ text: `│`, dimColor: true })

  // Collect all unique file paths
  const fileSet = new Set<string>()
  for (const n of report.nodes) {
    if (n.filePath) fileSet.add(n.filePath.replace(/\\/g, '/'))
  }
  for (const f of report.findings) {
    if (f.filePath) fileSet.add(f.filePath.replace(/\\/g, '/'))
  }
  if (report.scanScope?.filesRead) {
    for (const f of report.scanScope.filesRead) {
      if (f) fileSet.add(f.replace(/\\/g, '/'))
    }
  }

  const allFiles = Array.from(fileSet).sort()

  // Group files by directory
  const dirMap = new Map<string, string[]>()
  for (const file of allFiles) {
    const dir = normalizeDir(file)
    if (!dirMap.has(dir)) dirMap.set(dir, [])
    dirMap.get(dir)!.push(file)
  }

  const sortedDirs = Array.from(dirMap.keys()).sort((a, b) => {
    if (a === '.') return -1
    if (b === '.') return 1
    return a.localeCompare(b)
  })

  // Function nodes lookup
  const fnNodesByFile = new Map<string, typeof report.nodes>()
  for (const n of report.nodes) {
    if (n.type === 'function' && n.filePath) {
      const normPath = n.filePath.replace(/\\/g, '/')
      if (!fnNodesByFile.has(normPath)) fnNodesByFile.set(normPath, [])
      fnNodesByFile.get(normPath)!.push(n)
    }
  }

  // Edge calls lookup by sourceId
  const callsByFnId = new Map<string, string[]>()
  for (const e of report.edges) {
    if (e.type === 'call') {
      if (!callsByFnId.has(e.sourceId)) callsByFnId.set(e.sourceId, [])
      const targetNode = report.nodes.find((n) => n.id === e.targetId)
      const targetName = targetNode?.name || e.targetId.split(':').pop() || e.targetId
      callsByFnId.get(e.sourceId)!.push(targetName)
    }
  }

  for (let dirIdx = 0; dirIdx < sortedDirs.length; dirIdx++) {
    const dir = sortedDirs[dirIdx]
    const dirFiles = dirMap.get(dir) || []
    const isLastDir = dirIdx === sortedDirs.length - 1
    const dirPrefix = isLastDir ? '└── ' : '├── '
    const subPrefix = isLastDir ? '    ' : '│   '

    lines.push({
      text: `${dirPrefix}📁 ${dir === '.' ? 'Thư mục gốc (Root Files)' : dir + '/'}`,
      color: C.cyan,
      bold: true,
    })

    for (let fIdx = 0; fIdx < dirFiles.length; fIdx++) {
      const file = dirFiles[fIdx]
      const fileName = baseFileName(file)
      const lang = detectLanguage(file)
      const fileFindings = report.findings.filter(
        (f) => f.filePath.replace(/\\/g, '/') === file,
      )
      const isLastFile = fIdx === dirFiles.length - 1
      const filePrefix = isLastFile ? '└── ' : '├── '
      const fnPrefix = isLastFile ? '    ' : '│   '

      let badge = ' [✓ an toàn]'
      let badgeColor: string | undefined = C.green
      if (fileFindings.length > 0) {
        const fileCrit = fileFindings.filter((f) => f.severity === 'critical').length
        const fileHigh = fileFindings.filter((f) => f.severity === 'high').length
        const fileMed = fileFindings.filter((f) => f.severity === 'medium').length
        const fileLow = fileFindings.filter((f) => f.severity === 'low').length

        if (fileCrit > 0) {
          badge = ` [🔴 ${fileCrit} CRITICAL${fileHigh > 0 ? `, 🟠 ${fileHigh} HIGH` : ''}]`
          badgeColor = C.red
        } else if (fileHigh > 0) {
          badge = ` [🟠 ${fileHigh} HIGH${fileMed > 0 ? `, 🟡 ${fileMed} MED` : ''}]`
          badgeColor = C.yellow
        } else {
          badge = ` [⚠️ ${fileFindings.length} lỗi: ${fileMed} Med, ${fileLow} Low]`
          badgeColor = C.yellow
        }
      }

      lines.push({
        text: `${subPrefix}${filePrefix}📄 ${fileName} (${lang})${badge}`,
        color: badgeColor,
        bold: fileFindings.length > 0,
      })

      // List functions under this file
      const fns = fnNodesByFile.get(file) || []
      for (let fnIdx = 0; fnIdx < fns.length; fnIdx++) {
        const fn = fns[fnIdx]
        const isLastFn = fnIdx === fns.length - 1
        const fnBranch = isLastFn ? '└── ' : '├── '
        const calls = callsByFnId.get(fn.id) || []
        const callChain =
          calls.length > 0
            ? ` ──> ${calls.slice(0, 3).join(', ')}${calls.length > 3 ? '…' : ''}`
            : ''

        // Check if any finding is inside this function
        const fnFinding = fileFindings.find(
          (f) => f.line >= fn.startLine && f.line <= fn.endLine,
        )
        const fnIssueMark = fnFinding ? ` 🔴 [lỗi dòng ${fnFinding.line}]` : ''

        lines.push({
          text: `${subPrefix}${fnPrefix}${fnBranch}⚡ ${fn.name}()${callChain}${fnIssueMark}`,
          color: fnFinding ? C.red : undefined,
          dimColor: !fnFinding,
        })
      }
    }

    if (!isLastDir) {
      lines.push({ text: `│`, dimColor: true })
    }
  }

  // 4. CHÚ THÍCH BÊN DƯỚI SƠ ĐỒ TƯ DUY CHO TỪNG FILE + NGÔN NGỮ CODE
  lines.push({ text: '' })
  lines.push({
    text: `─── 📋 CHÚ THÍCH CHI TIẾT CÁC LỖI THEO TỪNG TỆP (ANNOTATIONS & ISSUES) ────────`,
    color: C.cyan,
    bold: true,
  })
  lines.push({ text: '' })

  if (report.findings.length === 0) {
    lines.push({
      text: `  ✓ Tuyệt vời! Không phát hiện lỗi nào trong các tệp mã nguồn đã quét. Kiến trúc an toàn.`,
      color: C.green,
      bold: true,
    })
  } else {
    // Group findings by file
    const filesWithIssues = Array.from(
      new Set(report.findings.map((f) => f.filePath.replace(/\\/g, '/'))),
    ).sort()

    for (let fIdx = 0; fIdx < filesWithIssues.length; fIdx++) {
      const filePath = filesWithIssues[fIdx]
      const lang = detectLanguage(filePath)
      const fileFindings = report.findings.filter(
        (f) => f.filePath.replace(/\\/g, '/') === filePath,
      )

      lines.push({
        text: `📁 ${filePath} [Ngôn ngữ: ${lang}] • ${fileFindings.length} lỗi phát hiện:`,
        color: C.blue,
        bold: true,
      })

      for (let i = 0; i < fileFindings.length; i++) {
        const f = fileFindings[i]
        const isLastFinding = i === fileFindings.length - 1
        const branch = isLastFinding ? '└── ' : '├── '
        const sub = isLastFinding ? '    ' : '│   '
        const badge =
          f.severity === 'critical'
            ? '🔴 [CRITICAL]'
            : f.severity === 'high'
              ? '🟠 [HIGH]'
              : f.severity === 'medium'
                ? '🟡 [MEDIUM]'
                : '🔵 [LOW]'
        const titleColor =
          f.severity === 'critical'
            ? C.red
            : f.severity === 'high' || f.severity === 'medium'
              ? C.yellow
              : C.blue

        lines.push({
          text: ` ${branch}${badge} ${f.title} (Dòng ${f.line})`,
          color: titleColor,
          bold: true,
        })
        lines.push({
          text: ` ${sub}• Phân loại: ${f.category.toUpperCase()} | Độ tin cậy: ${f.confidence.toUpperCase()}${f.ruleId ? ` [${f.ruleId}]` : ''}`,
          dimColor: true,
        })
        if (f.evidence) {
          lines.push({
            text: ` ${sub}• Bằng chứng: \`${f.evidence.replace(/\r?\n/g, ' ').trim()}\``,
            color: C.magenta,
          })
        }
        if (f.explanation) {
          lines.push({
            text: ` ${sub}• Nguyên nhân: ${f.explanation.replace(/\r?\n/g, ' ').trim()}`,
          })
        }
        if (f.suggestion) {
          lines.push({
            text: ` ${sub}• Đề xuất sửa: ${f.suggestion.replace(/\r?\n/g, ' ').trim()}`,
            color: C.green,
          })
        }
        if (!isLastFinding) {
          lines.push({ text: ` ${sub}`, dimColor: true })
        }
      }

      lines.push({ text: '' })
    }
  }

  lines.push({
    text: `─────────────────────────────────────────────────────────────────────────────`,
    dimColor: true,
  })
  lines.push({
    text: `💡 Nhấn Esc hoặc q để quay lại màn hình trò chuyện CLI.`,
    dimColor: true,
  })

  return lines
}

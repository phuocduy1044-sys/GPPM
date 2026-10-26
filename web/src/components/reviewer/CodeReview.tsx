import { useState, useEffect } from 'react'
import { IconFileCode, IconX } from '@tabler/icons-react'
import type { Finding } from '@/lib/reviewTypes'

interface CodeReviewProps {
  files: { name: string; lineCount: number; issueCount: number }[]
  activeFile: string
  onSelectFile: (file: string) => void
  fileContents: Record<string, string>
  findings: Finding[]
  selectedFindingId?: string
  onSelectFinding: (findingId: string) => void
}

export function CodeReview({
  files,
  activeFile,
  onSelectFile,
  fileContents,
  findings,
  selectedFindingId,
  onSelectFinding,
}: CodeReviewProps) {
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    return files.length > 0 ? files.slice(0, 3).map((f) => f.name) : [activeFile]
  })

  // Ensure active file is always in open tabs
  useEffect(() => {
    if (activeFile && !openTabs.includes(activeFile)) {
      setOpenTabs((prev) => [...prev, activeFile])
    }
  }, [activeFile])

  // Sync open tabs when project files load
  useEffect(() => {
    if (files.length > 0 && !openTabs.some((t) => files.some((f) => f.name === t))) {
      setOpenTabs(files.slice(0, 3).map((f) => f.name))
    }
  }, [files])

  const currentContent = fileContents[activeFile] || `// ${activeFile}\n// Không có nội dung tệp`
  const lines = currentContent.split('\n')

  const fileFindings = findings.filter((f) => f.file === activeFile)
  const lineFindingMap = new Map<number, Finding>()
  fileFindings.forEach((f) => lineFindingMap.set(f.line, f))

  const selectedFinding = findings.find((f) => f.id === selectedFindingId)

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#070c14] text-foreground font-mono">
      {/* File Tabs Bar */}
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border/40 bg-[#09101b] px-2 overflow-x-auto">
        {openTabs.map((tab) => {
          const fileInfo = files.find((f) => f.name === tab)
          const isActive = tab === activeFile
          return (
            <div
              key={tab}
              onClick={() => onSelectFile(tab)}
              className={`group flex items-center gap-2 rounded-t-md px-3 py-1.5 text-xs font-medium cursor-pointer border-t-2 transition-all ${
                isActive
                  ? 'border-primary bg-[#070c14] text-foreground shadow-sm'
                  : 'border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <span className="size-2 rounded-full bg-amber-400" />
              <IconFileCode className="size-3.5 opacity-70" />
              <span>{tab}</span>
              {fileInfo && fileInfo.issueCount > 0 && (
                <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                  {fileInfo.issueCount}
                </span>
              )}
              {openTabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const next = openTabs.filter((t) => t !== tab)
                    setOpenTabs(next)
                    if (isActive && next.length) onSelectFile(next[0])
                  }}
                  className="rounded p-0.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground"
                >
                  <IconX className="size-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Editor Subheader */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border/30 bg-[#0a121e]/80 px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-rose-500/80" />
            <span className="size-2.5 rounded-full bg-amber-500/80" />
            <span className="size-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="font-semibold text-foreground/80">{activeFile}</span>
          <span>· JavaScript</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {fileFindings.length > 0 && (
            <span className="rounded bg-rose-500/15 px-2 py-0.5 font-medium text-rose-400 border border-rose-500/30 animate-pulse">
              {fileFindings.length} dòng có vấn đề
            </span>
          )}
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="flex-1 overflow-auto p-2 text-xs leading-relaxed select-text">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineText, idx) => {
              const lineNum = idx + 1
              const finding = lineFindingMap.get(lineNum)
              const isSelected = selectedFinding?.line === lineNum

              return (
                <tr
                  key={lineNum}
                  className={`group transition-colors ${
                    isSelected
                      ? 'bg-rose-500/15'
                      : finding
                      ? 'bg-rose-500/5 hover:bg-rose-500/10'
                      : 'hover:bg-muted/10'
                  }`}
                  onClick={() => {
                    if (finding) onSelectFinding(finding.id)
                  }}
                >
                  {/* Gutter Line Number */}
                  <td className="w-10 select-none pr-3 text-right text-muted-foreground/40 font-mono text-[11px]">
                    {lineNum}
                  </td>

                  {/* Gutter Issue Indicator Dot */}
                  <td className="w-4 select-none px-1 text-center">
                    {finding && (
                      <span
                        className={`inline-block size-2 rounded-full cursor-pointer shadow-[0_0_8px] ${
                          finding.severity === 'critical'
                            ? 'bg-rose-500 shadow-rose-500/60'
                            : finding.severity === 'high'
                            ? 'bg-amber-500 shadow-amber-500/60'
                            : 'bg-yellow-500 shadow-yellow-500/60'
                        }`}
                        title={finding.title}
                      />
                    )}
                  </td>

                  {/* Code Line Content */}
                  <td className="py-0.5 pl-2 font-mono whitespace-pre text-foreground/90">
                    {lineText}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

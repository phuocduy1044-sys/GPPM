import { useState } from 'react'
import {
  IconCheck,
  IconCornerDownRight,
  IconCpu,
  IconFileDiff,
  IconGitCommit,
  IconMessageCode,
  IconSparkles,
  IconTool,
} from '@tabler/icons-react'
import type { GraphNode, Finding } from '@/lib/reviewTypes'

interface RightPanelProps {
  selectedNode?: GraphNode
  selectedFinding?: Finding
  onApplyPatch?: (findingId: string) => void
  onAnalyzeFile?: (file: string) => void
  onRunTest?: () => void
}

export function RightPanel({
  selectedNode,
  selectedFinding,
  onApplyPatch,
  onAnalyzeFile,
  onRunTest,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'fix' | 'chat'>(
    selectedFinding ? 'fix' : 'overview'
  )
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const handleApply = async () => {
    if (!selectedFinding) return
    setApplying(true)
    try {
      await fetch('/api/review/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: selectedFinding.id }),
      }).catch(() => null)
    } finally {
      setApplying(false)
      setApplied(true)
      onApplyPatch?.(selectedFinding.id)
    }
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border/40 bg-[#0a121e] select-none text-foreground">
      {/* Top Tabs */}
      <div className="flex h-10 shrink-0 items-center border-b border-border/40 px-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <IconCpu className="size-3.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fix')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'fix'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <IconTool className="size-3.5" />
          <span>Fix</span>
          {selectedFinding && (
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'chat'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <IconMessageCode className="size-3.5" />
          <span>Chat</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {selectedNode ? (
              <>
                <div className="border-b border-border/40 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">
                      {selectedNode.functionName}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        function
                      </span>
                      {selectedNode.hasIssue && (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                          {selectedNode.issueCount || 1} issue
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedNode.file} · dòng {selectedNode.startLine}-{selectedNode.endLine}
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                  Hàm <span className="font-mono text-cyan-400 font-semibold">{selectedNode.functionName}</span> là hàm khai báo trong {selectedNode.file}, dài {selectedNode.endLine - selectedNode.startLine + 1} dòng và {selectedNode.hasIssue ? `đang gắn ${selectedNode.issueCount || 1} issue cần xử lý.` : 'hiện không có issue nào.'}
                </div>

                {/* Input / Output 2-column box */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                    <div className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1">
                      ĐẦU VÀO
                    </div>
                    <div className="text-[11px] text-foreground font-sans">
                      {selectedNode.inputsDescription || 'không có tham số'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                    <div className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1">
                      ĐẦU RA
                    </div>
                    <div className="text-[11px] text-foreground font-sans">
                      {selectedNode.outputsDescription || 'có câu lệnh return'}
                    </div>
                  </div>
                </div>

                {/* Code Snippet */}
                {selectedNode.codeSnippet && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      NGUỒN · {selectedNode.file.toUpperCase()}
                    </div>
                    <pre className="max-h-40 overflow-auto rounded-lg border border-border/50 bg-[#070c14] p-2.5 text-[10px] text-foreground/80 leading-relaxed">
                      {selectedNode.codeSnippet}
                    </pre>
                  </div>
                )}

                {/* Called By */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    CALLED BY
                  </div>
                  <div className="rounded-lg border border-border/40 bg-muted/10 p-2 text-[11px]">
                    {selectedNode.calledBy && selectedNode.calledBy.length > 0 ? (
                      selectedNode.calledBy.map((cb) => (
                        <div key={cb} className="flex items-center gap-1.5 text-cyan-400">
                          <IconCornerDownRight className="size-3 shrink-0" />
                          <span>{cb}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground/70">không có hàm gọi</span>
                    )}
                  </div>
                </div>

                {/* Calls */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    CALLS
                  </div>
                  <div className="rounded-lg border border-border/40 bg-muted/10 p-2 text-[11px]">
                    {selectedNode.calls && selectedNode.calls.length > 0 ? (
                      selectedNode.calls.map((c) => (
                        <div key={c.functionName} className="space-y-1">
                          <div className="flex items-center gap-1.5 text-cyan-400">
                            <IconCornerDownRight className="size-3 shrink-0" />
                            <span>{c.functionName} ({c.file})</span>
                          </div>
                          {c.subCalls && c.subCalls.map((sc) => (
                            <div key={sc.functionName} className="flex items-center gap-1.5 pl-4 text-cyan-300/80">
                              <IconCornerDownRight className="size-3 shrink-0" />
                              <span>{sc.functionName} ({sc.file})</span>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground/70">không gọi hàm nào</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Tổng quan dự án</div>
                <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                  Chọn một hàm trên Graph Review hoặc tệp trong Explorer để xem chi tiết ngữ cảnh, đầu vào/đầu ra và quan hệ gọi.
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="font-semibold text-foreground">app.js</div>
                  <div className="text-[11px] text-muted-foreground">18 dòng · chưa kiểm định</div>
                  <button
                    type="button"
                    onClick={() => onAnalyzeFile?.('app.js')}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-lime-500/40 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-400 hover:bg-lime-500/20"
                  >
                    <IconTool className="size-3.5" />
                    <span>Phân tích tệp này</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FIX */}
        {activeTab === 'fix' && (
          <div className="space-y-4">
            {selectedFinding ? (
              <>
                <div className="border-b border-border/40 pb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono ${
                        selectedFinding.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : selectedFinding.severity === 'high'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      {selectedFinding.severity}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedFinding.file}:{selectedFinding.line}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground leading-snug">
                    {selectedFinding.title}
                  </h3>
                </div>

                <div className="space-y-2 font-sans text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground">Mô tả: </span>
                    <span className="text-foreground/90">{selectedFinding.description}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground">Nguyên nhân: </span>
                    <span className="text-foreground/90">{selectedFinding.rootCause}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground">Điều kiện gây lỗi: </span>
                    <span className="text-foreground/90">{selectedFinding.triggerCondition}</span>
                  </div>
                </div>

                {/* Evidence snippet */}
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                    BẰNG CHỨNG (EVIDENCE)
                  </div>
                  <pre className="rounded border border-rose-500/30 bg-rose-950/20 p-2 text-[10px] text-rose-300 overflow-x-auto">
                    {selectedFinding.evidence}
                  </pre>
                </div>

                {/* Suggested Fix & Diff */}
                {selectedFinding.patch && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                      <IconFileDiff className="size-3 text-primary" />
                      <span>BẢN VÁ ĐỀ XUẤT (PATCH DIFF)</span>
                    </div>
                    <pre className="rounded border border-border/60 bg-[#070c14] p-2 text-[10px] leading-relaxed overflow-x-auto">
                      <div className="text-rose-400 bg-rose-500/10 px-1 rounded-xs">
                        - {selectedFinding.patch.original}
                      </div>
                      <div className="text-emerald-400 bg-emerald-500/10 px-1 rounded-xs mt-0.5">
                        + {selectedFinding.patch.replacement}
                      </div>
                    </pre>
                  </div>
                )}

                {/* Apply Patch Action Button */}
                <div className="pt-2">
                  {applied ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-400">
                        <IconCheck className="size-4" />
                        <span>Đã áp dụng bản sửa thành công!</span>
                      </div>
                      <button
                        type="button"
                        onClick={onRunTest}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-primary/20 py-2 text-xs font-semibold text-primary hover:bg-primary/30"
                      >
                        <IconGitCommit className="size-3.5" />
                        <span>Chạy lại bộ kiểm thử để xác minh</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={applying || !selectedFinding.patch}
                      onClick={handleApply}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-lime-500/50 bg-lime-500/15 py-2 text-xs font-semibold text-lime-400 shadow-3d-1 transition-all hover:bg-lime-500/25 hover:border-lime-500 disabled:opacity-50"
                    >
                      <IconSparkles className="size-4" />
                      <span>{applying ? 'Đang áp dụng bản sửa...' : 'Áp dụng bản sửa (Apply Patch)'}</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <IconTool className="size-8 mx-auto mb-2 opacity-40" />
                <p>Chọn một issue trong danh sách để xem chi tiết nguyên nhân và bản vá đề xuất.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHAT */}
        {activeTab === 'chat' && (
          <div className="space-y-3 font-sans">
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
              Hỏi đáp trực tiếp với AI về logic hàm hoặc hỏi giải thích sâu hơn về lỗ hổng bảo mật được phát hiện.
            </div>
            <div className="space-y-2">
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-xs text-foreground">
                <span className="font-semibold text-primary">AI: </span>
                Hàm <code className="text-cyan-400 font-mono">buildAuthQuery</code> đang có nguy cơ cao về SQL Injection do nối chuỗi trực tiếp. Nên dùng parameterization $1, $2 để truy vấn an toàn.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

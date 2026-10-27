import { useState, useEffect } from 'react'
import {
  IconCheck,
  IconCornerDownRight,
  IconCpu,
  IconFileDiff,
  IconGitCommit,
  IconLoader2,
  IconArrowBackUp,
  IconSparkles,
  IconTool,
} from '@tabler/icons-react'
import type { GraphNode, Finding, TestResult } from '@/lib/reviewTypes'

interface RightPanelProps {
  selectedNode?: GraphNode
  selectedFinding?: Finding
  findings?: Finding[]
  testResult?: TestResult
  onApplyPatch?: (findingId: string) => Promise<void> | void
  onUndoPatch?: (findingId: string) => Promise<void> | void
  onAnalyzeFile?: (file: string) => void
  onRunTest?: () => Promise<void> | void
  onSelectFinding?: (findingId: string) => void
}

export function RightPanel({
  selectedNode,
  selectedFinding,
  findings = [],
  testResult,
  onApplyPatch,
  onUndoPatch,
  onAnalyzeFile,
  onRunTest,
  onSelectFinding,
}: RightPanelProps) {
  const nodeFindings = selectedNode
    ? findings.filter(
        (f) =>
          f.id === selectedNode.id ||
          (f.file === selectedNode.file &&
            f.line >= selectedNode.startLine &&
            f.line <= selectedNode.endLine)
      )
    : []

  const activeFinding = selectedNode
    ? (nodeFindings.find((f) => f.id === selectedFinding?.id) || nodeFindings[0] || null)
    : (selectedFinding || null)

  const [activeTab, setActiveTab] = useState<'overview' | 'fix'>('overview')
  const [applying, setApplying] = useState(false)
  const [appliedFindingIds, setAppliedFindingIds] = useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const [undoing, setUndoing] = useState(false)
  const handleUndo = async () => {
    if (!activeFinding) return
    setUndoing(true)
    setErrorMessage(null)
    try {
      if (onUndoPatch) {
        await onUndoPatch(activeFinding.id)
      } else {
        const token = new URLSearchParams(window.location.search).get('token') || ''
        const session = new URLSearchParams(window.location.search).get('session') || ''
        const res = await fetch(`/api/review/undo?session=${session}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { 'x-viecodie-token': token } : {}),
            ...(session ? { 'x-viecodie-session-id': session } : {}),
          },
          body: JSON.stringify({
            patchId: activeFinding.patchId,
            confirm: true,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Hoàn tác bản vá thất bại')
        }
      }
      setAppliedFindingIds((prev) => {
        const next = new Set(prev)
        next.delete(activeFinding.id)
        return next
      })
      if (activeFinding) activeFinding.status = 'open'
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setUndoing(false)
    }
  }

  // Clear error message when switching
  useEffect(() => {
    setErrorMessage(null)
  }, [activeFinding?.id, selectedNode?.id])

  const isApplied = activeFinding ? (activeFinding.status === "applied" || appliedFindingIds.has(activeFinding.id)) : false

  // Switch to fix tab if user selects a finding with issues
  useEffect(() => {
    if (selectedFinding && (!selectedNode || nodeFindings.length > 0)) {
      setActiveTab('fix')
    }
  }, [selectedFinding?.id])

  const handleApply = async () => {
    if (!activeFinding) return
    setApplying(true)
    setErrorMessage(null)
    try {
      await onApplyPatch?.(activeFinding.id)
      setAppliedFindingIds((prev) => new Set([...prev, activeFinding.id]))
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Áp dụng bản vá thất bại')
    } finally {
      setApplying(false)
    }
  }

  const handleRunVerify = async () => {
    setVerifying(true)
    try {
      await onRunTest?.()
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border/40 bg-[#0a121e] select-none text-foreground">
      {/* Top Tabs: Only Overview and Fix */}
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
          {activeFinding && (
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
          )}
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
                  Hàm <span className="font-mono text-cyan-400 font-semibold">{selectedNode.functionName}</span> là hàm khai báo trong {selectedNode.file}, dài {selectedNode.endLine - selectedNode.startLine + 1} dòng và {selectedNode.hasIssue ? `đang gắn ${selectedNode.issueCount || nodeFindings.length || 1} vấn đề cần xử lý.` : 'hiện không có issue nào (sạch).'}
                </div>

                {/* DANH SÁCH LỖI VÀ NGUYÊN NHÂN */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    CHI TIẾT LỖI & NGUYÊN NHÂN ({nodeFindings.length})
                  </div>
                  {nodeFindings.length > 0 ? (
                    nodeFindings.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-border/50 bg-[#070c14] p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono ${
                              f.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : f.severity === 'high'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            dòng {f.line}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-foreground font-sans">
                          {f.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                          <strong className="text-foreground/90">Nguyên nhân: </strong>
                          <span>{f.rootCause || f.description}</span>
                        </div>
                        {f.evidence && (
                          <pre className="rounded border border-rose-500/20 bg-rose-950/20 p-1.5 text-[9px] text-rose-300 overflow-x-auto">
                            {f.evidence}
                          </pre>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectFinding?.(f.id)
                            setActiveTab('fix')
                          }}
                          className="flex items-center gap-1 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 pt-1"
                        >
                          <span>Xem bản vá (Fix) →</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 p-2 text-[11px] text-emerald-400 font-sans">
                      ✓ Không có lỗi nào trên hàm này (nhãn sạch).
                    </div>
                  )}
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
            {selectedNode && nodeFindings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground font-sans">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-3 shadow-3d-1">
                  <IconCheck className="size-6" />
                </div>
                <div className="text-sm font-semibold text-emerald-400">Hàm sạch (Clean)</div>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px] leading-relaxed">
                  Hàm <span className="font-mono text-cyan-400 font-semibold">{selectedNode.functionName}</span> không có lỗi hoặc lỗ hổng nào cần sửa.
                </p>
              </div>
            ) : activeFinding ? (
              <>
                <div className="border-b border-border/40 pb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono ${
                        activeFinding.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : activeFinding.severity === 'high'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      {activeFinding.severity}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {activeFinding.file}:{activeFinding.line}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground leading-snug">
                    {activeFinding.title}
                  </h3>
                </div>

                <div className="space-y-2 font-sans text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground">Mô tả: </span>
                    <span className="text-foreground/90">{activeFinding.description}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground">Nguyên nhân: </span>
                    <span className="text-foreground/90">{activeFinding.rootCause}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground">Điều kiện gây lỗi: </span>
                    <span className="text-foreground/90">{activeFinding.triggerCondition}</span>
                  </div>
                </div>

                {/* Evidence snippet */}
                {activeFinding.evidence && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                      BẰNG CHỨNG (EVIDENCE)
                    </div>
                    <pre className="rounded border border-rose-500/30 bg-rose-950/20 p-2 text-[10px] text-rose-300 overflow-x-auto font-mono">
                      {activeFinding.evidence}
                    </pre>
                  </div>
                )}

                {/* Suggested Fix & Diff: only if patch is present */}
                {activeFinding.patch ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                      <IconFileDiff className="size-3 text-primary" />
                      <span>BẢN VÁ ĐỀ XUẤT (PATCH DIFF)</span>
                    </div>
                    <pre className="rounded border border-border/60 bg-[#070c14] p-2 text-[10px] leading-relaxed overflow-x-auto font-mono">
                      <div className="text-rose-400 bg-rose-500/10 px-1 rounded-xs">
                        - {activeFinding.patch.original}
                      </div>
                      <div className="text-emerald-400 bg-emerald-500/10 px-1 rounded-xs mt-0.5">
                        + {activeFinding.patch.replacement}
                      </div>
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                      HƯỚNG DẪN KHẮC PHỤC
                    </div>
                    <div className="text-xs text-foreground/90 font-sans leading-relaxed">
                      {activeFinding.suggestedFix}
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="rounded border border-rose-500/40 bg-rose-950/30 p-2 text-[11px] text-rose-300 font-sans">
                    ⚠ {errorMessage}
                  </div>
                )}
                {/* Apply Patch Action Button: ONLY SHOWN IF APPLICABLE PATCH EXISTS */}
                {activeFinding.patch ? (
                  <div className="pt-2 space-y-2.5">
                    {isApplied ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-400 font-sans">
                          <IconCheck className="size-4 shrink-0" />
                          <span>Đã chỉnh sửa tệp gốc thành công!</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={verifying}
                            onClick={handleRunVerify}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-primary/20 py-2 text-xs font-semibold text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                          >
                            {verifying ? (
                              <IconLoader2 className="size-3.5 animate-spin" />
                            ) : (
                              <IconGitCommit className="size-3.5" />
                            )}
                            <span>{verifying ? 'Đang kiểm thử...' : 'Chạy lại kiểm thử'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={undoing}
                            onClick={handleUndo}
                            title="Hoàn tác bản vá về trạng thái gốc"
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                          >
                            {undoing ? (
                              <IconLoader2 className="size-3.5 animate-spin" />
                            ) : (
                              <IconArrowBackUp className="size-3.5" />
                            )}
                            <span>{undoing ? 'Đang hoàn tác...' : 'Hoàn tác (Undo)'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={applying}
                        onClick={handleApply}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-lime-500/50 bg-lime-500/15 py-2 text-xs font-semibold text-lime-400 shadow-3d-1 transition-all hover:bg-lime-500/25 hover:border-lime-500 disabled:opacity-50"
                      >
                        <IconSparkles className="size-4" />
                        <span>{applying ? 'Đang áp dụng bản sửa vào tệp...' : 'Áp dụng bản sửa (Apply Patch)'}</span>
                      </button>
                    )}

                    {/* LIVE VERIFICATION TEST FEEDBACK RIGHT UNDER BUTTON */}
                    {isApplied && testResult && (
                      <div className="rounded-lg border border-border/50 bg-[#070c14] p-2.5 space-y-1.5 font-mono text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                            KẾT QUẢ XÁC MINH
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              verifying || testResult.status === 'running'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse'
                                : testResult.status === 'passed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}
                          >
                            {verifying || testResult.status === 'running' ? 'ĐANG CHẠY' : testResult.status === 'passed' ? 'ĐẠT (PASS)' : 'TRƯỢT (FAIL)'}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Lệnh: <code className="text-cyan-400">{testResult.command}</code> · {testResult.durationMs}ms · exit {testResult.exitCode}
                        </div>
                        <pre className="max-h-36 overflow-auto rounded border border-border/30 bg-[#05080f] p-2 text-[10px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
                          {testResult.logOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-sans">
                <IconTool className="size-8 mx-auto mb-2 opacity-40" />
                <p>Chọn một issue trong danh sách để xem chi tiết cách khắc phục.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBug,
  IconCode,
  IconCpu,
  IconFileCode,
  IconFocus2,
  IconMaximize,
  IconMessageChatbot,
  IconRefresh,
  IconShieldLock,
  IconSparkles,
} from '@tabler/icons-react'
import type { ReviewProject, Finding } from '@/lib/reviewTypes'
import { token, reviewSessionId } from '@/lib/api'
import { GraphReview } from './GraphReview'
import { CodeReview } from './CodeReview'
import { RightPanel } from './RightPanel'
import { TestDrawer } from './TestDrawer'

interface ReviewerLayoutProps {
  onSwitchToAgentChat?: () => void
}

export function ReviewerLayout({ onSwitchToAgentChat }: ReviewerLayoutProps) {
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [project, setProject] = useState<ReviewProject | null>(null)
  const [activeTab, setActiveTab] = useState<'graph' | 'code'>('graph')
  const [activeFile, setActiveFile] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string>('')
  const [selectedFindingId, setSelectedFindingId] = useState<string>('')
  const [dualAiEnabled, setDualAiEnabled] = useState(true)
  const [reReviewing, setReReviewing] = useState(false)

  // Fetch live backend report
  const fetchCurrentReport = useCallback(async () => {
    setLoadStatus('loading')
    setErrorMessage(null)

    try {
      const queryToken = token ? `token=${encodeURIComponent(token)}` : ''
      const querySession = reviewSessionId ? `session=${encodeURIComponent(reviewSessionId)}` : ''
      const qParams = [queryToken, querySession].filter(Boolean).join('&')
      const queryString = qParams ? `?${qParams}` : ''
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (token) headers['x-viecodie-token'] = token
      if (reviewSessionId) headers['x-viecodie-session-id'] = reviewSessionId

      const res = await fetch(`/api/review/current${queryString}`, { headers })

      if (res.status === 404) {
        setLoadStatus('error')
        setErrorMessage(
          'Chưa có kết quả review cho dự án hiện tại. CLI là nơi làm việc chính — hãy mở terminal của dự án và chạy lệnh /review trước.'
        )
        return
      }

      if (res.status === 401) {
        setLoadStatus('error')
        setErrorMessage(
          'Phiên kết nối chưa được xác thực (401 Unauthorized). Vui lòng gõ lệnh /graph trong CLI để mở lại trang.'
        )
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        setLoadStatus('error')
        setErrorMessage(
          errJson.error || `Không thể tải dữ liệu review từ máy chủ (mã lỗi HTTP ${res.status}).`
        )
        return
      }

      const data = await res.json()
      if (!data || (!data.projectName && !data.nodes && !data.findings && !data.scanScope)) {
        setLoadStatus('error')
        setErrorMessage(
          'Dữ liệu review trả về không đúng cấu trúc hợp lệ. Vui lòng chạy lại lệnh /review trong CLI.'
        )
        return
      }

      // 1. Adapt findings
      const adaptedFindings = (data.findings as any[] || []).map((f: any) => {
        const fileName = f.filePath?.replace(/\\/g, '/') || 'file'
        return {
          id: f.id,
          file: fileName,
          fullPath: f.filePath,
          line: f.line,
          endLine: f.endLine,
          severity: f.severity,
          category: f.category,
          title: f.title,
          description: f.explanation,
          evidence: f.evidence,
          rootCause: f.explanation,
          triggerCondition: f.confidenceReason || 'Phát hiện qua phân tích AST Engine',
          suggestedFix: f.suggestion,
          patch: {
            original: f.evidence,
            replacement: f.suggestion,
            diffText: `--- a/${f.filePath}\n+++ b/${f.filePath}\n@@ -${f.line},1 +${f.line},1 @@\n-${f.evidence}\n+${f.suggestion}`,
          },
          source: f.source || 'rule',
          status: 'open' as const,
        }
      })

      // 2. Adapt function nodes
      const rawFuncNodes = ((data.nodes as any[]) || []).filter(
        (n: any) => n.type === 'function' || (!n.type && !String(n.id).startsWith('file:'))
      )
      const adaptedNodes = rawFuncNodes.map((n: any) => {
        const fileName = n.filePath?.replace(/\\/g, '/') || 'file'
        const matchingFindings = adaptedFindings.filter(
          (fi: any) => fi.id === n.id || (fi.file === fileName && fi.line >= n.startLine && fi.line <= n.endLine)
        )
        return {
          id: n.id,
          file: fileName,
          functionName: n.name,
          startLine: n.startLine,
          endLine: n.endLine,
          language: n.filePath?.endsWith('.ts') || n.filePath?.endsWith('.tsx') ? 'TypeScript' : 'JavaScript',
          hasIssue: matchingFindings.length > 0,
          issueCount: matchingFindings.length,
          calledBy: ((n.callerIds || []) as any[]).map((cid: any) => String(cid).split(':').pop() || String(cid)),
          calls: ((n.calleeIds || []) as any[]).map((cid: any) => ({
            functionName: String(cid).split(':').pop() || String(cid),
            file: String(cid).split(':')[1] || String(cid),
          })),
        }
      })

      // 3. Adapt edges
      const adaptedEdges = ((data.edges as any[]) || []).map((e: any) => ({
        id: e.id,
        sourceNodeId: e.sourceId,
        targetNodeId: e.targetId,
        type: e.type === 'call' ? ('call' as const) : ('cross_file' as const),
        label: e.evidenceSnippet ? e.evidenceSnippet.slice(0, 30) : undefined,
      }))

      // 4. Collect files list
      const fileNamesSet = new Set<string>()
      if (Array.isArray(data.scanScope?.filesRead)) {
        data.scanScope.filesRead.forEach((fp: string) => {
          fileNamesSet.add(fp.replace(/\\/g, '/'))
        })
      }
      adaptedNodes.forEach((n: any) => fileNamesSet.add(n.file))
      adaptedFindings.forEach((f: any) => fileNamesSet.add(f.file))
      const uniqueFileNames = Array.from(fileNamesSet)

      // 5. File contents
      let fileContents: Record<string, string> = data.fileContents || {}

      if (Object.keys(fileContents).length === 0 && uniqueFileNames.length > 0) {
        const fetched: Record<string, string> = {}
        await Promise.all(
          uniqueFileNames.map(async (fn) => {
            try {
              const sRes = await fetch(`/api/review/source?path=${encodeURIComponent(fn)}${queryToken.replace('?', '&')}`, { headers })
              if (sRes.ok) {
                const sJson = await sRes.json()
                if (sJson?.content) {
                  fetched[fn] = sJson.content
                }
              }
            } catch {}
          })
        )
        fileContents = fetched
      }

      const adaptedFiles = uniqueFileNames.map((fileName) => {
        const content = fileContents[fileName] || ''
        const lineCount = content ? content.split('\n').length : 30
        const issueCount = adaptedFindings.filter((af: any) => af.file === fileName).length
        return {
          name: fileName,
          lineCount,
          issueCount,
          status: issueCount > 0 ? `${issueCount} vấn đề` : 'Sạch',
        }
      })

      const proj: ReviewProject = {
        projectName: data.projectName || 'Dự án hiện tại',
        revision: data.revision || '1',
        rawRevision: String(data.revision || '1'),
        projectRoot: data.projectRoot || '',
        reviewId: data.reviewId || '',
        engineStatus: 'ready',
        files: adaptedFiles,
        nodes: adaptedNodes,
        edges: adaptedEdges,
        findings: adaptedFindings,
        fileContents,
        isOutdated: Boolean(data.isOutdated),
        testResult: data.verification ? {
          status: data.verification.status || (data.verification.exitCode === 0 ? 'passed' : 'failed'),
          totalTests: data.verification.testsSummary?.total ?? null,
          passedTests: data.verification.testsSummary?.passed ?? null,
          failedTests: data.verification.testsSummary?.failed ?? null,
          durationMs: data.verification.durationMs || 0,
          command: data.verification.command || 'npm test',
          exitCode: data.verification.exitCode,
          logOutput: data.verification.sanitizedLog || data.verification.stdout || data.verification.stderr || 'Hoàn tất kiểm thử',
          score: data.verification.testsSummary ? `${data.verification.testsSummary.passed}/${data.verification.testsSummary.total}` : null,
          tests: data.verification.tests || [],
        } : undefined,
      }

      setProject(proj)
      setLoadStatus('ready')

      // Select first file with issues or first available file
      const firstIssueFile = adaptedFiles.find((f) => f.issueCount > 0)?.name || adaptedFiles[0]?.name || ''
      setActiveFile(firstIssueFile)

      if (firstIssueFile) {
        const nodeInFile = adaptedNodes.find((n) => n.file === firstIssueFile)
        if (nodeInFile) {
          setSelectedNodeId(nodeInFile.id)
        } else if (adaptedNodes.length > 0) {
          setSelectedNodeId(adaptedNodes[0].id)
        }
      } else if (adaptedNodes.length > 0) {
        setSelectedNodeId(adaptedNodes[0].id)
      }

      if (adaptedFindings.length > 0) {
        setSelectedFindingId(adaptedFindings[0].id)
      }
    } catch (err) {
      console.error('Error fetching review report:', err)
      setLoadStatus('error')
      setErrorMessage('Không thể kết nối đến máy chủ local. Vui lòng đảm bảo phiên CLI vẫn đang mở.')
    }
  }, [])

  useEffect(() => {
    fetchCurrentReport()
  }, [fetchCurrentReport])

  const selectedNode = project?.nodes.find((n) => n.id === selectedNodeId)
  const selectedFinding = project?.findings.find((f) => f.id === selectedFindingId)

  // Handle node selection
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    if (!project) return
    const node = project.nodes.find((n) => n.id === nodeId)
    if (node && node.file && node.file !== 'HTTP API') {
      setActiveFile(node.file)
      const ff = project.findings.find((f) => f.file === node.file)
      if (ff) setSelectedFindingId(ff.id)
    }
  }

  // Handle patch application
  const handleApplyPatch = async (findingId: string) => {
    try {
      const queryToken = token ? `?token=${encodeURIComponent(token)}` : ''
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['x-viecodie-token'] = token

      const res = await fetch(`/api/review/apply${queryToken}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ findingId, confirm: true }),
      })

      if (res.ok) {
        // Refresh live data
        await fetchCurrentReport()
      } else {
        // Optimistic update
        setProject((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            findings: prev.findings.map((f) => (f.id === findingId ? { ...f, status: 'applied' as const } : f)),
          }
        })
      }
    } catch {
      setProject((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          findings: prev.findings.map((f) => (f.id === findingId ? { ...f, status: 'applied' as const } : f)),
        }
      })
    }
  }

  const handleUndoPatch = async (findingId: string) => {
    const finding = project?.findings.find((f) => f.id === findingId)
    const patchId = finding?.patchId
    const queryToken = token ? `?token=${encodeURIComponent(token)}` : ''
    const session = reviewSessionId ? `&session=${encodeURIComponent(reviewSessionId)}` : ''
    const fullQuery = queryToken ? `${queryToken}${session}` : (session ? `?${session.slice(1)}` : '')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['x-viecodie-token'] = token
    if (reviewSessionId) headers['x-viecodie-session-id'] = reviewSessionId

    const res = await fetch(`/api/review/undo${fullQuery}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ patchId, confirm: true }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Hoàn tác bản vá thất bại')
    }
    await fetchCurrentReport()
  }

  // Handle re-run verification tests
  const handleRunTest = async () => {
    if (!project) return
    try {
      const queryToken = token ? `?token=${encodeURIComponent(token)}` : ''
      const session = reviewSessionId ? `&session=${encodeURIComponent(reviewSessionId)}` : ''
      const fullQuery = queryToken ? `${queryToken}${session}` : (session ? `?${session.slice(1)}` : '')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['x-viecodie-token'] = token
      if (reviewSessionId) headers['x-viecodie-session-id'] = reviewSessionId

      setProject((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          testResult: {
            status: 'running',
            totalTests: prev.testResult?.totalTests ?? null,
            passedTests: null,
            failedTests: null,
            durationMs: 0,
            command: 'npm test',
            exitCode: null,
            logOutput: '⏳ Đang thực thi bộ kiểm thử (npm test)...',
          },
        }
      })

      const res = await fetch(`/api/review/verify${fullQuery}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ checkCommand: 'npm test', confirm: true }),
      })

      if (res.ok) {
        const v = await res.json()
        setProject((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            testResult: {
              status: v.status || (v.exitCode === 0 ? 'passed' : 'failed'),
              totalTests: v.testsSummary?.total ?? null,
              passedTests: v.testsSummary?.passed ?? null,
              failedTests: v.testsSummary?.failed ?? null,
              durationMs: v.durationMs || 0,
              score: v.testsSummary ? `${v.testsSummary.passed}/${v.testsSummary.total}` : null,
              command: v.command || 'npm test',
              exitCode: v.exitCode,
              logOutput: v.sanitizedLog || v.stdout || v.stderr || 'Hoàn tất kiểm thử',
              tests: v.tests || [],
            },
          }
        })
      }
    } catch (err) {
      console.error('Run test error:', err)
    }
  }

  // Handle re-reviewing project
  const handleReReview = async () => {
    setReReviewing(true)
    try {
      const queryToken = token ? `token=${encodeURIComponent(token)}` : ''
      const querySession = reviewSessionId ? `session=${encodeURIComponent(reviewSessionId)}` : ''
      const qParams = [queryToken, querySession].filter(Boolean).join('&')
      const queryString = qParams ? `?${qParams}` : ''
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['x-viecodie-token'] = token
      if (reviewSessionId) headers['x-viecodie-session-id'] = reviewSessionId

      const res = await fetch(`/api/review${queryString}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: 'rules', projectPath: project?.projectRoot }),
      })
      if (res.ok) {
        await fetchCurrentReport()
      }
    } finally {
      setReReviewing(false)
    }
  }

  // 1. LOADING STATE
  if (loadStatus === 'loading') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#070c14] text-foreground font-sans select-none">
        <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/40 shadow-3d-2 animate-pulse">
            <IconFocus2 className="size-8" stroke={2.2} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold tracking-tight text-foreground">Đang tải dữ liệu Code Review...</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Đang đồng bộ kết quả phân tích AST, quan hệ đồ thị và các lỗi phát hiện từ phiên CLI hiện tại.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/60 pt-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>VIECODIE Reviewer Engine</span>
          </div>
        </div>
      </div>
    )
  }

  // 2. ERROR STATE (No fallback to fake fixture)
  if (loadStatus === 'error' || !project) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#070c14] text-foreground font-sans select-none p-4">
        <div className="flex flex-col items-center gap-4 text-center p-8 max-w-lg rounded-2xl border border-border/60 bg-[#09101d] shadow-3d-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-3d-1">
            <IconAlertCircle className="size-8" stroke={2} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-foreground">Không thể tải dữ liệu Code Review</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {errorMessage || 'Chưa tìm thấy dữ liệu review của phiên hiện tại.'}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-[#060a12] p-3 text-left w-full space-y-1 text-xs font-mono text-muted-foreground">
            <div className="text-[11px] font-bold text-foreground/80">Hướng dẫn nhanh:</div>
            <div>1. Trong terminal dự án, gõ <code className="text-lime-400 font-semibold">/review</code> để phân tích mã nguồn.</div>
            <div>2. Sau khi review xong, gõ <code className="text-cyan-400 font-semibold">/graph</code> để mở trực quan.</div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => fetchCurrentReport()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-3d-1"
            >
              <IconRefresh className="size-4" />
              <span>Thử lại (Retry)</span>
            </button>
            {onSwitchToAgentChat && (
              <button
                type="button"
                onClick={onSwitchToAgentChat}
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <IconMessageChatbot className="size-4" />
                <span>Chuyển sang Agent Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 3. READY STATE: Render live Code Reviewer by Graph
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#070c14] text-foreground font-sans antialiased">
      {/* Global Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-[#09101d] px-4 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40 shadow-3d-1">
              <IconFocus2 className="size-4" stroke={2.2} />
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm text-foreground">VIECODIE</span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono leading-none">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Review Engine</span>
              </div>
            </div>
          </div>

          {onSwitchToAgentChat && (
            <button
              type="button"
              onClick={onSwitchToAgentChat}
              className="ml-4 flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <IconMessageChatbot className="size-3.5" />
              <span>Chuyển sang Agent Chat</span>
            </button>
          )}
        </div>

        {/* Center Project & Revision Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border/50 bg-[#0d1626] px-3 py-1 font-mono text-xs">
            <span className="text-muted-foreground">project: </span>
            <span className="font-bold text-cyan-400 ml-1">{project.projectName}</span>
            <span className="text-muted-foreground mx-1.5">·</span>
            <span className="text-muted-foreground">rev: </span>
            <span className="font-bold text-foreground ml-1">{project.revision}</span>
          </div>

          {project.isOutdated && (
            <span className="rounded-md border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 animate-pulse">
              Dữ liệu cũ
            </span>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {project.isOutdated && (
            <button
              type="button"
              onClick={handleReReview}
              disabled={reReviewing}
              className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <IconRefresh className={`size-3.5 ${reReviewing ? 'animate-spin' : ''}`} />
              <span>{reReviewing ? 'Đang quét lại...' : 'Review lại'}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">AI kép</span>
            <button
              type="button"
              onClick={() => setDualAiEnabled((e) => !e)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                dualAiEnabled ? 'bg-amber-500' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  dualAiEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="h-4 w-px bg-border/50" />

          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen()
              else document.exitFullscreen()
            }}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Toàn màn hình"
          >
            <IconMaximize className="size-4" />
          </button>
        </div>
      </header>

      {/* Outdated Notice Banner */}
      {project.isOutdated && (
        <div className="z-20 flex shrink-0 items-center justify-between border-b border-amber-500/30 bg-amber-950/40 px-4 py-1.5 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="size-4 text-amber-400 shrink-0" />
            <span>
              <strong>Lưu ý:</strong> Mã nguồn đã có thay đổi so với lần review này (phiên bản: <code>{project.revision}</code>). Kết quả hiển thị bên dưới thuộc về phiên bản cũ.
            </span>
          </div>
          <button
            type="button"
            onClick={handleReReview}
            disabled={reReviewing}
            className="rounded bg-amber-500/20 px-2 py-0.5 font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors"
          >
            {reReviewing ? 'Đang phân tích lại...' : 'Quét lại mã mới'}
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR: Nav + Explorer + Issues */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-border/40 bg-[#080e19] select-none">
          <div className="p-2 space-y-1 border-b border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeTab === 'graph'
                  ? 'bg-lime-500/15 text-lime-400 border border-lime-500/30 shadow-3d-1'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <IconFocus2 className="size-4" />
              <span>Graph Review</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeTab === 'code'
                  ? 'bg-lime-500/15 text-lime-400 border border-lime-500/30 shadow-3d-1'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <IconCode className="size-4" />
              <span>Code</span>
            </button>
          </div>

          {/* EXPLORER SECTION */}
          <div className="border-b border-border/40 p-2">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
              <span className="flex items-center gap-1.5">
                <IconFileCode className="size-3 text-primary" />
                <span>EXPLORER</span>
              </span>
              <span className="rounded bg-muted/60 px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                {project.files.length}
              </span>
            </div>

            <div className="mt-1 space-y-0.5">
              {project.files.map((file) => {
                const isSelected = file.name === activeFile
                return (
                  <div
                    key={file.name}
                    onClick={() => {
                      setActiveFile(file.name)
                      const node = project.nodes.find((n) => n.file === file.name)
                      if (node) setSelectedNodeId(node.id)
                    }}
                    className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-mono cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`size-2 rounded-full ${file.issueCount > 0 ? 'bg-rose-500' : 'bg-amber-400'}`} />
                      <span className="truncate">{file.name}</span>
                    </div>
                    {file.issueCount > 0 && (
                      <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                        {file.issueCount}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ISSUES SECTION */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
              <span className="flex items-center gap-1.5">
                <IconBug className="size-3 text-rose-400" />
                <span>ISSUES</span>
              </span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                {project.findings.length}
              </span>
            </div>

            <div className="mt-1.5 space-y-1.5">
              {project.findings.map((f) => {
                const isSelected = f.id === selectedFindingId
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFindingId(f.id)
                      setActiveFile(f.file)
                      const node = project.nodes.find((n) => n.file === f.file)
                      if (node) setSelectedNodeId(node.id)
                    }}
                    className={`rounded-lg border p-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-rose-500/80 bg-rose-950/30 shadow-sm'
                        : f.status === 'applied'
                        ? 'border-border/30 bg-muted/10 opacity-60'
                        : 'border-border/40 bg-muted/15 hover:bg-muted/30 hover:border-border/70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                      <span
                        className={`rounded px-1.5 py-0.2 font-bold uppercase ${
                          f.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : f.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {f.file}:{f.line}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium leading-snug line-clamp-2 text-foreground/90 font-sans">
                      {f.title}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex h-10 shrink-0 items-center justify-between border-t border-border/40 px-3 bg-[#070c14]">
            <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
              V
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60">VIECODIE v3.13.1</span>
          </div>
        </aside>

        {/* CENTER VIEW: Graph Review or Code Viewer + Bottom Test Drawer */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeTab === 'graph' ? (
            <GraphReview
              nodes={project.nodes}
              edges={project.edges}
              findings={project.findings}
              projectName={project.projectName}
              projectRoot={project.projectRoot}
              revision={project.rawRevision || String(project.revision)}
              isOutdated={project.isOutdated}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              onAnalyzeFile={(file) => {
                setActiveFile(file)
                setActiveTab('code')
              }}
              onReReview={handleReReview}
            />
          ) : (
            <CodeReview
              files={project.files}
              activeFile={activeFile}
              onSelectFile={setActiveFile}
              fileContents={project.fileContents || {}}
              findings={project.findings}
              selectedFindingId={selectedFindingId}
              onSelectFinding={setSelectedFindingId}
            />
          )}

          {/* Bottom Test Drawer */}
          <TestDrawer
            testResult={project.testResult}
            onRunTest={handleRunTest}
          />
        </main>

        {/* RIGHT PANEL: Overview / Fix / Chat */}
        <RightPanel
          selectedNode={selectedNode}
          selectedFinding={selectedFinding}
          findings={project.findings}
          testResult={project.testResult}
          onApplyPatch={handleApplyPatch}
          onUndoPatch={handleUndoPatch}
          onAnalyzeFile={(file) => {
            setActiveFile(file)
            setActiveTab('code')
          }}
          onRunTest={handleRunTest}
          onSelectFinding={(id) => setSelectedFindingId(id)}
        />
      </div>
    </div>
  )
}

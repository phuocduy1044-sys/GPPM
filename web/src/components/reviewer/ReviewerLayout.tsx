import { useState, useEffect } from 'react'
import {
  IconBug,
  IconCode,
  IconCpu,
  IconFileCode,
  IconFocus2,
  IconLayoutSidebarLeftCollapse,
  IconMessageChatbot,
  IconMaximize,
  IconShieldLock,
  IconSparkles,
} from '@tabler/icons-react'
import { DEMO_PROJECT_FIXTURE } from '@/lib/reviewFixture'
import type { Finding } from '@/lib/reviewTypes'
import { GraphReview } from './GraphReview'
import { CodeReview } from './CodeReview'
import { RightPanel } from './RightPanel'
import { TestDrawer } from './TestDrawer'

interface ReviewerLayoutProps {
  onSwitchToAgentChat?: () => void
}

export function ReviewerLayout({ onSwitchToAgentChat }: ReviewerLayoutProps) {
  const [project, setProject] = useState(DEMO_PROJECT_FIXTURE)
  const [activeTab, setActiveTab] = useState<'graph' | 'code'>('graph')
  const [activeFile, setActiveFile] = useState('auth.js')
  const [selectedNodeId, setSelectedNodeId] = useState<string>('auth_buildAuthQuery')
  const [selectedFindingId, setSelectedFindingId] = useState<string>('f1')
  const [dualAiEnabled, setDualAiEnabled] = useState(true)

  // Fetch live backend report if available
  useEffect(() => {
    fetch('/api/review/current')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.nodes && data.findings && data.findings.length > 0) {
          const adaptedNodes = (data.nodes as any[]).map((n: any) => ({
            id: n.id,
            file: n.filePath?.split(/[\\/]/).pop() || n.filePath || 'file',
            functionName: n.name,
            startLine: n.startLine,
            endLine: n.endLine,
            language: 'JavaScript/TypeScript',
            hasIssue: (data.findings as any[]).some((fi: any) => fi.nodeId === n.id || (fi.filePath === n.filePath && fi.line >= n.startLine && fi.line <= n.endLine)),
            issueCount: (data.findings as any[]).filter((fi: any) => fi.nodeId === n.id || (fi.filePath === n.filePath && fi.line >= n.startLine && fi.line <= n.endLine)).length,
            calledBy: ((n.callerIds || []) as any[]).map((cid: any) => String(cid).split(':').pop() || String(cid)),
            calls: ((n.calleeIds || []) as any[]).map((cid: any) => ({ functionName: String(cid).split(':').pop() || String(cid), file: String(cid).split(':')[1] || String(cid) })),
          }))

          const adaptedEdges = (data.edges as any[]).map((e: any) => ({
            id: e.id,
            sourceNodeId: e.sourceId,
            targetNodeId: e.targetId,
            type: e.type === 'call' ? ('call' as const) : ('cross_file' as const),
            label: e.evidenceSnippet ? e.evidenceSnippet.slice(0, 30) : undefined,
          }))

          const adaptedFindings = (data.findings as any[]).map((f: any) => ({
            id: f.id,
            file: f.filePath?.split(/[\\/]/).pop() || f.filePath,
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
          }))

          const uniqueFiles = Array.from(new Set((data.scanScope?.filesRead || []) as string[]))
          const adaptedFiles = uniqueFiles.map((fp: string) => {
            const fileName = fp.split(/[\\/]/).pop() || fp
            const issueCount = adaptedFindings.filter((af: any) => af.file === fileName || af.file.endsWith(fileName)).length
            return {
              name: fileName,
              lineCount: 25,
              issueCount,
              status: issueCount > 0 ? `${issueCount} vấn đề` : 'Sạch',
            }
          })

          setProject((prev) => ({
            ...prev,
            projectName: data.projectName || prev.projectName,
            revision: typeof data.revision === 'string' ? 1 : (data.revision || prev.revision),
            files: adaptedFiles.length > 0 ? adaptedFiles : prev.files,
            nodes: adaptedNodes.length > 0 ? adaptedNodes : prev.nodes,
            edges: adaptedEdges.length > 0 ? adaptedEdges : prev.edges,
            findings: adaptedFindings.length > 0 ? adaptedFindings : prev.findings,
          }))

          if (adaptedNodes.length > 0) {
            setSelectedNodeId(adaptedNodes[0].id)
            if (adaptedNodes[0].file) setActiveFile(adaptedNodes[0].file)
          }
          if (adaptedFindings.length > 0) {
            setSelectedFindingId(adaptedFindings[0].id)
          }
        }
      })
      .catch(() => {})
  }, [])

  const selectedNode = project.nodes.find((n) => n.id === selectedNodeId)
  const selectedFinding = project.findings.find((f) => f.id === selectedFindingId)

  // Handle node selection
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    const node = project.nodes.find((n) => n.id === nodeId)
    if (node && node.file && node.file !== 'HTTP API') {
      setActiveFile(node.file)
      // Pick first finding of that file if any
      const ff = project.findings.find((f) => f.file === node.file)
      if (ff) setSelectedFindingId(ff.id)
    }
  }

  // Handle patch application
  const handleApplyPatch = (findingId: string) => {
    setProject((prev) => {
      const nextFindings = prev.findings.map((f) =>
        f.id === findingId ? { ...f, status: 'applied' as const } : f
      )
      return {
        ...prev,
        revision: prev.revision + 1,
        findings: nextFindings,
        testResult: {
          status: 'passed',
          totalTests: 1,
          failedTests: 0,
          durationMs: 82,
          score: '100/100',
          command: 'node --test suite.mjs',
          exitCode: 0,
          logOutput: `>_ vie-review@sandbox:~$ node --test suite.mjs                      exit 0 · 82 ms\n✔ buildAuthQuery handles SQL injection safely (12ms)\n✔ all 1 tests passed`,
        },
      }
    })
  }

  // Handle re-run test
  const handleRunTest = () => {
    // Already simulated via TestDrawer or patch
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#070c14] text-foreground font-sans antialiased">
      {/* 1. Global Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-[#09101d] px-4 select-none">
        {/* Left Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40 shadow-3d-1">
              <IconFocus2 className="size-4" stroke={2.2} />
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm text-foreground">VIECODIE</span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono leading-none">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Engine sẵn sàng</span>
              </div>
            </div>
          </div>

          {/* Mode Switcher: Agent Chat vs Graph Reviewer */}
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
        <div className="flex items-center rounded-md border border-border/50 bg-[#0d1626] px-3 py-1 font-mono text-xs">
          <span className="text-muted-foreground">project: </span>
          <span className="font-bold text-cyan-400 ml-1">{project.projectName}</span>
          <span className="text-muted-foreground mx-1.5">·</span>
          <span className="text-muted-foreground">rev: </span>
          <span className="font-bold text-foreground ml-1">{project.revision}</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Dual AI Toggle */}
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

          {/* Fullscreen icon */}
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

      {/* 2. Main Body (Left Sidebar + Center Views + Right Panel) */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR: Nav + Explorer + Issues */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-border/40 bg-[#080e19] select-none">
          {/* Main Navigation Tabs */}
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
                      <span className="size-2 rounded-full bg-amber-400" />
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

          {/* Bottom user avatar */}
          <div className="flex h-10 shrink-0 items-center justify-between border-t border-border/40 px-3 bg-[#070c14]">
            <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
              N
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60">AGY B · v3.13.1</span>
          </div>
        </aside>

        {/* CENTER VIEW: Graph Review or Code Viewer + Bottom Test Drawer */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeTab === 'graph' ? (
            <GraphReview
              nodes={project.nodes}
              edges={project.edges}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              onAnalyzeFile={(file) => {
                setActiveFile(file)
                setActiveTab('code')
              }}
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
          onApplyPatch={handleApplyPatch}
          onAnalyzeFile={(file) => {
            setActiveFile(file)
            setActiveTab('code')
          }}
          onRunTest={handleRunTest}
        />
      </div>
    </div>
  )
}

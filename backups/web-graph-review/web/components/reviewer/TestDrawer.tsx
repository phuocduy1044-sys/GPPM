import { useState } from 'react'
import {
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconRotateClockwise,
  IconTerminal2,
  IconTestPipe,
} from '@tabler/icons-react'
import type { TestResult } from '@/lib/reviewTypes'

interface TestDrawerProps {
  testResult?: TestResult
  onRunTest?: () => void
}

export function TestDrawer({ testResult, onRunTest }: TestDrawerProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    setRunning(true)
    try {
      await onRunTest?.()
    } finally {
      setRunning(false)
    }
  }

  if (!testResult) return null

  const isFailed = testResult.status === 'failed' || testResult.exitCode !== 0
  const isPassed = testResult.status === 'passed' && testResult.exitCode === 0

  return (
    <div className="border-t border-border/50 bg-[#09101d] text-foreground font-mono transition-all">
      {/* Drawer Header */}
      <div className="flex h-10 items-center justify-between px-4 text-xs select-none border-b border-border/30 bg-[#0c1524]">
        <div className="flex items-center gap-2.5">
          <IconTerminal2 className="size-4 text-primary" />
          <span className="font-bold text-foreground">Test drawer</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              running
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : isPassed
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {running ? 'ĐANG CHẠY' : isPassed ? 'ĐẠT' : 'TRƯỢT'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {testResult.totalTests} test · {testResult.failedTests} lỗi · {testResult.durationMs} ms
            {testResult.score ? ` · kiểm định trước: ${testResult.score}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={running}
            onClick={handleRun}
            className="flex items-center gap-1.5 rounded-md border border-lime-500/50 bg-lime-500/10 px-2.5 py-1 text-xs font-semibold text-lime-400 hover:bg-lime-500/20 disabled:opacity-50"
          >
            {running ? (
              <IconLoader2 className="size-3.5 animate-spin" />
            ) : (
              <IconRotateClockwise className="size-3.5" />
            )}
            <span>{running ? 'Đang kiểm tra...' : 'Chạy lại kiểm thử'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {collapsed ? <IconChevronUp className="size-4" /> : <IconChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {/* Terminal Log Output */}
      {!collapsed && (
        <div className="max-h-56 overflow-auto bg-[#05080f] p-3 text-xs leading-relaxed text-muted-foreground font-mono">
          <div className="flex items-center justify-between border-b border-border/20 pb-1 mb-2 text-[11px]">
            <span className="text-cyan-400">
              &gt;_ vie-review@sandbox:~$ {testResult.command}
            </span>
            <span className={isPassed ? 'text-emerald-400' : 'text-rose-400'}>
              exit {testResult.exitCode} · {testResult.durationMs} ms
            </span>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground/85">
            {testResult.logOutput}
          </pre>
        </div>
      )}
    </div>
  )
}

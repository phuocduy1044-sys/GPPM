import { useState } from 'react'
import {
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconRotateClockwise,
  IconTerminal2,
  IconTestPipe,
  IconCheck,
  IconX,
  IconMinus,
  IconListCheck,
} from '@tabler/icons-react'
import type { TestResult } from '@/lib/reviewTypes'

interface TestDrawerProps {
  testResult?: TestResult
  onRunTest?: () => void
}

export function TestDrawer({ testResult, onRunTest }: TestDrawerProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [running, setRunning] = useState(false)
  const [tab, setTab] = useState<'cases' | 'logs'>('cases')

  const handleRun = async () => {
    setRunning(true)
    try {
      await onRunTest?.()
    } finally {
      setRunning(false)
    }
  }

  if (!testResult) return null

  const isFailed = testResult.status === 'failed' || (testResult.exitCode != null && testResult.exitCode !== 0)
  const isPassed = testResult.status === 'passed' && (testResult.exitCode == null || testResult.exitCode === 0)
  const isRunning = running || testResult.status === 'running'
  const isNoTests = testResult.status === 'no_tests'

  const testCases = testResult.tests || []

  return (
    <div className="border-t border-border/50 bg-[#09101d] text-foreground font-mono transition-all">
      {/* Drawer Header */}
      <div className="flex h-10 items-center justify-between px-4 text-xs select-none border-b border-border/30 bg-[#0c1524]">
        <div className="flex items-center gap-2.5">
          <IconTerminal2 className="size-4 text-primary" />
          <span className="font-bold text-foreground">Test Runner Sandbox</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              isRunning
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse'
                : isPassed
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : isNoTests
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {isRunning
              ? 'ĐANG CHẠY'
              : isPassed
              ? 'ĐẠT'
              : isNoTests
              ? 'KHÔNG CÓ TEST'
              : 'TRƯỢT'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {testResult.totalTests != null
              ? `${testResult.totalTests} test · ${testResult.failedTests ?? 0} lỗi · ${testResult.durationMs ?? 0} ms`
              : `${testResult.durationMs ?? 0} ms · exit ${testResult.exitCode ?? '?'}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab selector */}
          <div className="flex items-center bg-[#070c16] rounded border border-border/40 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setTab('cases')
                if (collapsed) setCollapsed(false)
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                tab === 'cases' && !collapsed
                  ? 'bg-primary/20 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconListCheck className="size-3" />
              <span>Kiểm thử {testCases.length > 0 ? `(${testCases.length})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('logs')
                if (collapsed) setCollapsed(false)
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                tab === 'logs' && !collapsed
                  ? 'bg-primary/20 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconTerminal2 className="size-3" />
              <span>Nhật ký Console</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isRunning}
            onClick={handleRun}
            className="flex items-center gap-1.5 rounded-md border border-lime-500/50 bg-lime-500/10 px-2.5 py-1 text-xs font-semibold text-lime-400 hover:bg-lime-500/20 disabled:opacity-50"
          >
            {isRunning ? (
              <IconLoader2 className="size-3.5 animate-spin" />
            ) : (
              <IconRotateClockwise className="size-3.5" />
            )}
            <span>{isRunning ? 'Đang kiểm tra...' : 'Chạy lại kiểm thử'}</span>
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

      {/* Drawer Body */}
      {!collapsed && (
        <div className="max-h-60 overflow-auto bg-[#05080f] p-3 text-xs leading-relaxed text-muted-foreground font-mono">
          {tab === 'cases' ? (
            testCases.length > 0 ? (
              <div className="space-y-1.5">
                {testCases.map((tc, idx) => {
                  const pass = tc.status === 'passed'
                  const fail = tc.status === 'failed'
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col gap-1 rounded border px-3 py-1.5 text-[11px] ${
                        pass
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                          : fail
                          ? 'border-rose-500/20 bg-rose-500/5 text-rose-300'
                          : 'border-border/20 bg-accent/10 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {pass ? (
                            <IconCheck className="size-3.5 text-emerald-400 shrink-0" />
                          ) : fail ? (
                            <IconX className="size-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <IconMinus className="size-3.5 text-zinc-400 shrink-0" />
                          )}
                          <span className="font-semibold text-foreground/90">{tc.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {tc.durationMs != null ? `${tc.durationMs} ms` : ''}
                        </span>
                      </div>
                      {tc.failureMessage && (
                        <pre className="text-[10px] text-rose-400/90 whitespace-pre-wrap pl-5 border-l-2 border-rose-500/30">
                          {tc.failureMessage}
                        </pre>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                <IconTestPipe className="size-6 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-semibold text-foreground/80">
                  {isNoTests
                    ? 'Dự án chưa có kịch bản kiểm thử tự động.'
                    : 'Đã hoàn tất kiểm thử tổng thể.'}
                </p>
                <p className="text-[11px] mt-1 text-muted-foreground">
                  Lệnh thực thi: <span className="text-cyan-400">{testResult.command}</span> · Mã thoát:{' '}
                  <span className={isPassed ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResult.exitCode ?? 0}
                  </span>
                </p>
              </div>
            )
          ) : (
            <div>
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
      )}
    </div>
  )
}

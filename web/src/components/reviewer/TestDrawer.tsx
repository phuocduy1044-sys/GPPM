import { useState } from 'react'
import {
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconRotateClockwise,
  IconTerminal2,
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
  const [activeTab, setActiveTab] = useState<'tests' | 'logs'>('tests')

  const handleRun = async () => {
    setRunning(true)
    try {
      await onRunTest?.()
    } finally {
      setRunning(false)
    }
  }

  if (!testResult) return null

  const isRunning = running || testResult.status === 'running'
  const isNoTests = testResult.status === 'no_tests' || (testResult.totalTests === 0 && (!testResult.tests || testResult.tests.length === 0))
  const isPassed = !isRunning && !isNoTests && (testResult.status === 'passed' || (testResult.exitCode === 0 && (testResult.failedTests ?? 0) === 0))
  const isFailed = !isRunning && !isNoTests && !isPassed

  const hasSubtests = Array.isArray(testResult.tests) && testResult.tests.length > 0

  return (
    <div className="border-t border-border/50 bg-[#09101d] text-foreground font-mono transition-all">
      {/* Drawer Header */}
      <div className="flex h-10 items-center justify-between px-4 text-xs select-none border-b border-border/30 bg-[#0c1524]">
        <div className="flex items-center gap-2.5">
          <IconTerminal2 className="size-4 text-primary" />
          <span className="font-bold text-foreground">Test Drawer</span>
          
          {/* Trạng thái trực quan: ĐẠT (xanh), TRƯỢT (đỏ), KHÔNG CÓ TEST (xám), ĐANG CHẠY (vàng) */}
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
              isRunning
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                : isPassed
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : isNoTests
                ? 'bg-slate-500/20 text-slate-400 border border-slate-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {isRunning ? 'ĐANG CHẠY' : isPassed ? 'ĐẠT' : isNoTests ? 'KHÔNG CÓ TEST' : 'TRƯỢT'}
          </span>

          <span className="text-[11px] text-muted-foreground">
            {testResult.totalTests != null
              ? `${testResult.totalTests} test · ${testResult.failedTests ?? 0} lỗi · ${testResult.durationMs ?? 0} ms`
              : `${testResult.durationMs ?? 0} ms · exit ${testResult.exitCode ?? '?'}`}
            {testResult.score ? ` · kiểm định: ${testResult.score}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switcher if subtests exist */}
          {hasSubtests && !collapsed && (
            <div className="flex items-center rounded border border-border/50 bg-background/50 p-0.5 mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('tests')}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  activeTab === 'tests'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <IconListCheck className="size-3" />
                <span>Ca test ({testResult.tests!.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  activeTab === 'logs'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <IconTerminal2 className="size-3" />
                <span>Console</span>
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={isRunning}
            onClick={handleRun}
            className="flex items-center gap-1.5 rounded-md border border-lime-500/50 bg-lime-500/10 px-2.5 py-1 text-xs font-semibold text-lime-400 hover:bg-lime-500/20 disabled:opacity-50 transition-colors"
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
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={collapsed ? 'Mở rộng ngăn kéo' : 'Thu gọn'}
          >
            {collapsed ? <IconChevronUp className="size-4" /> : <IconChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      {!collapsed && (
        <div className="max-h-64 overflow-auto bg-[#05080f] p-3 text-xs leading-relaxed font-mono">
          {/* Subtest Items List */}
          {hasSubtests && activeTab === 'tests' ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/20 pb-1.5 mb-1">
                <span className="font-semibold text-foreground/80">Danh sách các ca kiểm thử tự động ({testResult.tests!.length}):</span>
                <span className="text-[10px]">Lệnh: <code className="text-cyan-400">{testResult.command}</code></span>
              </div>
              {testResult.tests!.map((tc, idx) => {
                const tcPassed = tc.status === 'passed'
                const tcSkipped = tc.status === 'skipped'
                return (
                  <div
                    key={idx}
                    className={`flex flex-col rounded border px-3 py-2 text-[11px] transition-colors ${
                      tcPassed
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                        : tcSkipped
                        ? 'border-slate-500/20 bg-slate-500/5 text-slate-400'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tcPassed ? (
                          <IconCheck className="size-3.5 text-emerald-400" />
                        ) : tcSkipped ? (
                          <IconMinus className="size-3.5 text-slate-400" />
                        ) : (
                          <IconX className="size-3.5 text-rose-400" />
                        )}
                        <span className="font-semibold">{tc.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        {tc.durationMs != null && (
                          <span className="text-muted-foreground">{tc.durationMs} ms</span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                            tcPassed
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : tcSkipped
                              ? 'bg-slate-500/20 text-slate-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {tcPassed ? 'ĐẠT' : tcSkipped ? 'BỎ QUA' : 'TRƯỢT'}
                        </span>
                      </div>
                    </div>
                    {tc.errorMessage && (
                      <div className="mt-1.5 rounded bg-black/40 p-1.5 text-[10px] text-rose-300 whitespace-pre-wrap border border-rose-500/20 font-mono">
                        {tc.errorMessage}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Terminal Console Log Output */
            <div>
              <div className="flex items-center justify-between border-b border-border/20 pb-1 mb-2 text-[11px]">
                <span className="text-cyan-400">
                  &gt;_ vie-review@sandbox:~$ {testResult.command}
                </span>
                <span className={isPassed ? 'text-emerald-400' : isNoTests ? 'text-slate-400' : 'text-rose-400'}>
                  exit {testResult.exitCode ?? 0} · {testResult.durationMs ?? 0} ms
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground/85">
                {testResult.logOutput || '(Không có log output)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

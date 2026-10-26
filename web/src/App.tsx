import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { IconBuildingSkyscraper, IconCode, IconCpu, IconMenu2, IconPlus, IconShieldLock, IconSparkles, IconTerminal2, IconUserCheck, IconVolume, IconWifiOff } from '@tabler/icons-react'
import { AddModelModal } from '@/components/AddModelModal'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Composer } from '@/components/Composer'
import { DiffStat, MessageView } from '@/components/MessageView'
import { PermissionCard } from '@/components/PermissionCard'
import { Todos } from '@/components/ToolCall'
import { Sidebar } from '@/components/Sidebar'
import { useViecodie } from '@/hooks/useViecodie'
import { get, post, token } from '@/lib/api'
import { confirmRewind } from '@/lib/swal'
import type { Answer, Checkpoint, WebMessage, WebState } from '@/lib/types'
import { cn, fmtDuration, latestTodos, sessionTally } from '@/lib/utils'

function useThemeSetup() {
  useEffect(() => {
    document.documentElement.classList.add('dark')
    try { localStorage.setItem('viecodie-theme', 'dark') } catch { /* storage blocked */ }
  }, [])
}

function Elapsed({ busy }: { busy: boolean }) {
  const [start] = useState(() => Date.now())
  const [, tick] = useState(0)
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [busy])
  return <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">{fmtDuration(Date.now() - start)}</span>
}

function Meter({ state }: { state: WebState }) {
  if (!state.usedTokens) return null
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
  const pct = state.ctx ? Math.min(100, Math.round((state.usedTokens / state.ctx) * 100)) : null
  return (
    <span className="hidden items-center gap-2 font-mono text-xs text-muted-foreground sm:flex" title="Ngữ cảnh đã dùng">
      {pct !== null && (
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <span className={cn('block h-full rounded-full bg-primary', pct > 85 && 'bg-destructive')} style={{ width: `${pct}%` }} />
        </span>
      )}
      {k(state.usedTokens)}{state.ctx ? ` / ${k(state.ctx)}` : ''}
    </span>
  )
}

/** The session's running score — files touched and lines in/out — beside the context meter. */
function Tally({ messages }: { messages: WebMessage[] }) {
  const t = useMemo(() => sessionTally(messages.map((m) => m.summary)), [messages])
  if (!t.files) return null
  return (
    <span
      key={`${t.files}:${t.added}:${t.removed}`}
      className="hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground animate-in zoom-in-95 fade-in-0 duration-300 sm:inline-flex"
      title="Thay đổi trong phiên này"
    >
      {t.files} tệp
      <DiffStat added={t.added} removed={t.removed} />
    </span>
  )
}

const STARTERS = [
  { cmd: '/init', text: 'Write a VIECODIE.md for this repo' },
  { cmd: '/review', text: 'Review my uncommitted changes' },
  { cmd: '/plan', text: 'Plan before touching anything' },
]

function VietnamLogoBadge({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute -inset-2 rounded-full bg-red-600/25 blur-lg" />
      <div className="relative size-16 rounded-full border-2 border-red-500/50 bg-gradient-to-b from-[#da251d] to-[#a8140e] shadow-3d-2 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-white/15" />
        <svg
          viewBox="0 0 100 100"
          className="relative size-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
          fill="#ffeb3b"
        >
          <polygon points="50,5 64,36 98,36 71,57 81,91 50,70 19,91 29,57 2,36 36,36" />
        </svg>
      </div>
    </div>
  )
}

function Welcome({ cwd, onPick }: { cwd: string; onPick: (text: string) => void }) {
  const name = cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
  return (
    <div className="mx-auto mt-4 max-w-2xl text-center">
      <div className="flex justify-center mb-3">
        <VietnamLogoBadge />
      </div>

      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-primary font-semibold">
        Nền tảng Trợ lý Lập trình AI Việt Nam
      </div>
      <h1 className="mb-2 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        Trợ thủ mã nguồn thông minh cho Doanh nghiệp & Cá nhân
      </h1>
      <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
        Viecodie đọc hiểu toàn diện dự án, phân tích bảo mật, viết và sửa mã tự động ngay trong thư mục{' '}
        <span className="rounded bg-code px-1.5 py-0.5 font-mono text-xs text-foreground border border-border/80">{name}</span>
      </p>

      {/* Grid 2 cột: Doanh nghiệp & Cá nhân */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
        {/* Dành cho Doanh nghiệp */}
        <div className="rounded-xl border border-border/90 bg-card p-4 shadow-3d-1 transition-all hover:shadow-3d-2">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconBuildingSkyscraper className="size-4 text-primary" stroke={1.75} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Dành cho Doanh nghiệp</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground leading-normal">
            <li className="flex items-start gap-1.5">
              <IconShieldLock className="size-3.5 text-emerald-400 shrink-0 mt-0.5" stroke={1.75} />
              <span><strong>Bảo mật 100% dữ liệu:</strong> Chạy offline/local-first, mã nguồn tuyệt đối không rời khỏi máy chủ nội bộ.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <IconSparkles className="size-3.5 text-primary shrink-0 mt-0.5" stroke={1.75} />
              <span><strong>Audit & Chuẩn hóa:</strong> Quét lỗ hổng, rà soát chất lượng code tự động và refactor dự án lớn.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <IconCpu className="size-3.5 text-sky-400 shrink-0 mt-0.5" stroke={1.75} />
              <span><strong>Đám mây AI Việt Nam:</strong> Sẵn sàng tích hợp FPT Cloud, Viettel, VNPT với băng thông tối đa.</span>
            </li>
          </ul>
        </div>

        {/* Dành cho Cá nhân & Lập trình viên */}
        <div className="rounded-xl border border-border/90 bg-card p-4 shadow-3d-1 transition-all hover:shadow-3d-2">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <IconUserCheck className="size-4 text-emerald-400" stroke={1.75} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Dành cho Cá nhân</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground leading-normal">
            <li className="flex items-start gap-1.5">
              <IconTerminal2 className="size-3.5 text-emerald-400 shrink-0 mt-0.5" stroke={1.75} />
              <span><strong>Pair-Programming:</strong> Hỗ trợ fix bug, viết tính năng mới, tạo test và giải thích logic.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <IconCode className="size-3.5 text-primary shrink-0 mt-0.5" stroke={1.75} />
              <span><strong>Thực thi lệnh chuẩn xác:</strong> Tự động sửa tệp với phạm vi tối thiểu, chạy lệnh kiểm thử an toàn.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <IconVolume className="size-3.5 text-sky-400 shrink-0 mt-0.5" stroke={1.75} />
              <span><strong>Siêu tiết kiệm Token:</strong> Phản hồi ngắn gọn, hỗ trợ giọng đọc tiếng Việt truyền cảm (FPT.TTS-ultra).</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Cảnh báo quyền hạn & bảo mật */}
      <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-100 shadow-3d-1">
        <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-400">
          <IconShieldLock className="size-3.5 shrink-0" stroke={1.75} />
          <span>Quyền truy cập & bảo mật</span>
        </div>
        <div>Viecodie có thể đọc tệp trong thư mục dự án để hiểu yêu cầu. Việc sửa tệp và chạy lệnh tuân theo chế độ quyền hiện tại; hãy xem kỹ trước khi chấp thuận.</div>
      </div>

      {/* Các lệnh gợi ý bắt đầu */}
      <div className="flex flex-wrap justify-center gap-2">
        {STARTERS.map((s) => (
          <Button key={s.cmd} variant="outline" size="sm" className="rounded-full shadow-3d-1 hover:shadow-3d-2 gap-1.5" onClick={() => onPick(s.cmd)}>
            <IconCode className="size-3.5 text-primary" stroke={1.75} />
            <span className="font-mono text-muted-foreground">{s.cmd}</span> {s.text}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** A system notification, if the browser allows them. Clicking it brings this tab back. */
function notify(title: string, body?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const n = new Notification(`Viecodie — ${title}`, { body, tag: 'viecodie', silent: false })
    n.onclick = () => { window.focus(); n.close() }
  } catch { /* some browsers only allow notifications from a service worker */ }
}

export function App() {
  const [showAddModel, setShowAddModel] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const showToast = useCallback((text: string) => {
    setToast(text)
    setTimeout(() => setToast((t) => (t === text ? null : t)), 3500)
  }, [])
  const { ready, state, messages, sessions, commands, modes, connected, unauthorized } = useViecodie(showToast)
  useThemeSetup()
  const [sideOpen, setSideOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const todos = useMemo(() => latestTodos(messages), [messages])
  const clearDraft = useCallback(() => setDraft(null), [])

  // Follow the transcript while you're at the bottom; leave it alone once you scroll up to read.
  const scroller = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  const [away, setAway] = useState(false)
  const toBottom = useCallback((smooth = false) => {
    pinned.current = true
    setAway(false)
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [messages, state?.pending, state?.status])
  // A different chat starts at its latest message.
  useEffect(() => toBottom(), [state?.sessionId, toBottom])
  // Sending is a request to see the reply, wherever you were scrolled. It is
  // also a click, which is what browsers want before they'll ask about notifications.
  const onSent = useCallback(() => {
    toBottom()
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission().catch(() => {})
  }, [toBottom])

  const rewind = useCallback(async (m: WebMessage) => {
    if (m.turn === undefined) return
    try {
      const { checkpoints } = await get<{ checkpoints: Checkpoint[] }>('checkpoints')
      const files = [...new Set(checkpoints.filter((c) => c.turn >= m.turn!).flatMap((c) => c.files))]
      const ok = await confirmRewind(files.length, files)
      if (!ok) return
      await post('rewind', { turn: m.turn })
      // As in the terminal: the message comes back to the composer to edit and resend.
      setDraft(m.content)
    } catch (e) {
      showToast((e as Error).message)
    }
  }, [showToast])

  // Turns run long and people switch tabs. When this one is in the background
  // and viecodie needs an answer or has finished, say so in the tab title and, if
  // allowed, with a system notification.
  const [attention, setAttention] = useState<string | null>(null)
  const wasBusy = useRef(false)
  const pendingId = state?.pending?.id
  useEffect(() => {
    const busy = !!state?.busy
    const finished = wasBusy.current && !busy
    wasBusy.current = busy
    if (!document.hidden || !state) return
    const why = pendingId !== undefined
      ? (state.pending?.toolName === 'exit_plan_mode' ? 'Plan ready for review' : 'Waiting for approval')
      : finished ? (state.error ? 'Stopped' : 'Done') : null
    if (!why) return
    setAttention(why)
    notify(why, pendingId !== undefined ? state.pending?.label : state.title || undefined)
    // Only the edges matter — a new prompt, or busy going false.
  }, [pendingId, state?.busy])
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) setAttention(null) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    const base = state?.title ? `${state.title} · Viecodie` : 'Viecodie'
    document.title = attention ? `● ${attention} — ${base}` : base
  }, [state?.title, attention])

  // esc stops the turn, as in the terminal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state?.busy && !document.querySelector('[data-radix-popper-content-wrapper]')) void post('stop')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state?.busy])

  if (!token || unauthorized) {
    return (
      <div className="grid h-full place-items-center p-4">
        <div className="max-w-md text-center">
          <KeyRound className="mx-auto mb-4 size-10 text-primary" />
          <h1 className="mb-2 text-xl font-semibold">Mở liên kết từ terminal của bạn</h1>
          <p className="text-muted-foreground">
            Trang này cần liên kết được in ra khi chạy lệnh <code className="rounded bg-code px-1 font-mono text-sm">viecodie web</code> — liên kết chứa khóa bảo mật kết nối với agent của bạn.
          </p>
        </div>
      </div>
    )
  }
  if (!ready || !state) {
    return <div className="grid h-full place-items-center text-muted-foreground">Đang kết nối tới Viecodie…</div>
  }

  const answer = (a: Answer) => {
    if (!state.pending) return
    void post('permission', { id: state.pending.id, answer: a }).catch((e: Error) => showToast(e.message))
    // The card held focus for its 1/2/3 keys; hand it back to the composer.
    document.querySelector<HTMLTextAreaElement>('main textarea')?.focus()
  }
  const showStatus = state.busy && !state.pending
  // Pinned while there is work on it; once a finished list's turn ends, the
  // turn's receipt takes over.
  const showTodos = !!todos && (state.busy || todos.some((t) => t.status !== 'completed'))

  return (
    <TooltipProvider>
      <div className="flex h-full overflow-hidden">
        <aside className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 shrink-0 border-r border-sidebar-border transition-transform md:static md:translate-x-0',
          sideOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
          <Sidebar sessions={sessions} activeId={state.sessionId} cwd={state.cwd} busy={state.busy} onPick={() => setSideOpen(false)} onError={showToast} />
        </aside>
        {sideOpen && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSideOpen(false)} />}

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-13 shrink-0 items-center gap-2 px-4">
            <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setSideOpen(true)} aria-label="Mở thanh bên"><IconMenu2 className="size-4" stroke={1.75} /></Button>
            <div className="min-w-0 flex-1 truncate font-medium">{state.title || (messages.length ? 'Đoạn chat chưa đặt tên' : '')}</div>
            {!connected && <span className="flex items-center gap-1 text-xs text-destructive"><IconWifiOff className="size-3.5" stroke={1.75} /> đang kết nối lại</span>}
            <Tally messages={messages} />
            <Meter state={state} />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg border-border/80 shadow-3d-1 hover:shadow-3d-2 text-xs font-medium"
              onClick={() => setShowAddModel(true)}
            >
              <IconPlus className="size-3.5 text-primary" stroke={2.25} />
              <span>Thêm mô hình</span>
            </Button>
            
          </header>

          <div
            ref={scroller}
            className="flex-1 overflow-y-auto"
            onScroll={(e) => {
              const el = e.currentTarget
              pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
              setAway(!pinned.current)
            }}
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-4 pb-10 sm:px-6">
              {messages.length === 0
                ? <Welcome cwd={state.cwd} onPick={setDraft} />
                : messages.map((m, i) => (
                    <div key={m.id} className={cn(m.role === 'assistant' && messages[i - 1]?.role === 'assistant' && '-mt-3.5')}>
                      <MessageView m={m} onRewind={state.busy ? undefined : rewind} />
                    </div>
                  ))}
            </div>
          </div>

          <div className="relative shrink-0 px-4 pb-3 sm:px-6">
            {away && (
              <Button
                variant="outline"
                size="icon-sm"
                className="absolute -top-11 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background shadow-md"
                onClick={() => toBottom(true)}
                aria-label="Jump to latest"
              >
                <ArrowDown />
              </Button>
            )}
            <div className="mx-auto flex max-w-3xl flex-col gap-2">
              {showTodos && todos && <Todos todos={todos} />}
              {showStatus && (
                <div className="flex items-center gap-2.5 px-1 text-sm text-muted-foreground">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-muted border-t-warning" />
                  <span className="shimmer truncate">{state.status ?? 'Working…'}</span>
                  <Elapsed key={messages.filter((m) => m.role === 'user').length} busy={state.busy} />
                  <span className="ml-auto hidden text-xs sm:inline">esc to stop</span>
                </div>
              )}
              {state.error && !state.busy && <div className="px-1 text-sm whitespace-pre-wrap text-destructive">{state.error}</div>}
              {state.pending && <PermissionCard key={state.pending.id} p={state.pending} onAnswer={answer} />}
              {state.queued.length > 0 && (
                <div className="rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  <span className="font-medium">Queued:</span> {state.queued.join(' · ')}
                </div>
              )}
              {!state.model && (
                <div className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm">Pick a model from the menu below to get started.</div>
              )}
              <Composer onOpenAddModel={() => setShowAddModel(true)} state={state} commands={commands} modes={modes} draft={draft} onDraftUsed={clearDraft} onSent={onSent} onError={showToast} />
              <div className="hidden text-center text-[11px] text-muted-foreground/80 sm:block">
                ⏎ send · ⇧⏎ newline · esc stop · ⇧⇥ mode · / commands · Viecodie can make mistakes — review what it changes
              </div>
            </div>
          </div>
        </main>
      </div>
      {toast && (
        <div className="fixed bottom-32 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg animate-in fade-in-0 slide-in-from-bottom-2">
          {toast}
        </div>
      )}
          <AddModelModal
        open={showAddModel}
        onClose={() => setShowAddModel(false)}
        onSuccess={(provider, model) => {
          showToast(`Đã lưu & kích hoạt mô hình ${model || provider} thành công!`)
        }}
      />
    </TooltipProvider>
  )
}

import { useState } from 'react'
import { ChevronRight, CircleCheck, CircleStop, CircleX, FlaskConical, ImageIcon, Undo2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CopyButton, Markdown } from '@/components/Markdown'
import { SpeechButton } from '@/components/SpeechButton'
import { ToolCall } from '@/components/ToolCall'
import type { TurnSummary, WebMessage } from '@/lib/types'
import { cn, fmtDuration } from '@/lib/utils'

function ThoughtIcon({ live }: { live?: boolean }) {
  return (
    <div className="relative flex size-4 shrink-0 items-center justify-center">
      {live && <span className="absolute inset-0 size-full animate-ping rounded-full bg-primary/30" />}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('size-4 transition-colors', live ? 'text-primary' : 'text-muted-foreground')}
      >
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z" />
      </svg>
    </div>
  )
}

function Thinking({ text, live }: { text: string; live?: boolean }) {
  const [open, setOpen] = useState(live ?? false)
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'group/think my-2 rounded-xl border border-border/80 bg-card p-3 shadow-3d-1 transition-all duration-200 hover:shadow-3d-2',
        live && 'border-primary/40 bg-primary/[0.02] shadow-3d-2 ring-1 ring-primary/20',
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2.5 text-left text-sm select-none cursor-pointer">
        <ThoughtIcon live={live} />
        <span className={cn('font-medium text-xs tracking-tight', live ? 'text-foreground' : 'text-muted-foreground group-hover/think:text-foreground transition-colors')}>
          {live ? 'Đang suy nghĩ…' : 'Quá trình suy nghĩ'}
        </span>
        <span className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
          {live ? 'tư duy phân tích' : `${words} từ`}
        </span>
        <ChevronRight className={cn('ml-auto size-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-90')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 border-t border-border/50 pt-2.5">
        <div className="relative pl-3.5 border-l-2 border-primary/30 max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground/90 select-text">
          {text}
        </div>
        <div className="mt-2.5 flex items-center justify-end">
          <CopyButton text={text} label="Sao chép suy nghĩ" className="text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground" />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function fmtTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

/** "+42 −10" in sage and rose, as in the terminal. */
export function DiffStat({ added, removed, className }: { added: number; removed: number; className?: string }) {
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      <span className="text-diff-add-fg">+{added}</span>
      {removed > 0 && <span className="ml-1 text-diff-del-fg">−{removed}</span>}
    </span>
  )
}

/**
 * The closing line of a turn, always on show: did it land, what did it touch,
 * did the tests pass. The mark pops in as the turn finishes — the small payoff
 * for waiting — and the file chips say exactly where to look next.
 */
function TurnReceipt({ summary, tokens, duration, copy }: { summary: TurnSummary; tokens?: string; duration?: number; copy?: string }) {
  const failed = summary.tests === 'failed'
  const Mark = failed ? CircleX : summary.stopped ? CircleStop : CircleCheck
  const added = summary.files.reduce((n, f) => n + f.added, 0)
  const removed = summary.files.reduce((n, f) => n + f.removed, 0)
  const name = (p: string) => p.split(/[\\/]/).pop() ?? p
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Mark
        className={cn(
          'size-4 shrink-0 animate-in zoom-in-50 fade-in-0 duration-300',
          // Green only for a turn that did something; a plain answer gets a quiet check.
          failed ? 'text-destructive' : summary.files.length || summary.tests === 'passed' ? 'text-success' : 'text-muted-foreground/60',
        )}
      />
      {summary.files.length ? (
        <>
          <span className="font-medium text-foreground/80">
            Đã thay đổi {summary.files.length} tệp
          </span>
          <DiffStat added={added} removed={removed} />
          {summary.files.slice(0, 4).map((f) => (
            <span key={f.path} title={`${f.path}  +${f.added} −${f.removed}`} className="rounded-md bg-code px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
              {name(f.path)}
            </span>
          ))}
          {summary.files.length > 4 && <span>+còn {summary.files.length - 4} tệp</span>}
        </>
      ) : (
        <span>{summary.stopped ? 'Đã dừng' : 'Hoàn tất'}</span>
      )}
      {summary.tests && (
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
          failed ? 'bg-diff-del text-diff-del-fg' : 'bg-diff-add text-diff-add-fg',
        )}>
          <FlaskConical className="size-3" /> kiểm thử {summary.tests === 'passed' ? 'đạt' : 'thất bại'}
        </span>
      )}
      {tokens && <span>· {tokens} tokens</span>}
      {duration ? <span>· {fmtDuration(duration, true)}</span> : null}
      {copy && (
        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton text={copy} label="Sao chép" />
          <SpeechButton text={copy} />
        </div>
      )}
    </div>
  )
}

export function MessageView({ m, onRewind }: { m: WebMessage; onRewind?: (m: WebMessage) => void }) {
  if (m.role === 'user') {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-xl rounded-l-sm border-l-[3px] border-user-rule bg-secondary px-4 py-2.5 whitespace-pre-wrap break-words shadow-3d-1 transition-shadow duration-200 hover:shadow-3d-2">
          {m.content}
          {m.images ? (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="size-3.5" /> {m.images} hình ảnh
            </div>
          ) : null}
        </div>
        {onRewind && m.turn !== undefined && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <CopyButton text={m.content} label="Sao chép" />
            <button
              type="button"
              onClick={() => onRewind(m)}
              title="Hoàn tác tin nhắn này và mọi thay đổi sau đó, bao gồm các tệp tin"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Undo2 className="size-3.5" /> Tua lại tới đây
            </button>
          </div>
        )}
      </div>
    )
  }
  if (m.role === 'notice') {
    return (
      <div className="rounded-r-lg border-l-[3px] border-primary bg-primary/5 px-4 py-2 text-sm">
        <Markdown text={m.content} />
      </div>
    )
  }
  const hasText = m.content.trim().length > 0
  return (
    <div className="group flex min-w-0 flex-col gap-2.5">
      {m.thinking && <Thinking text={m.thinking} live={m.live && !hasText && !m.tools?.length} />}
      {m.tools?.length ? <div className="flex flex-col gap-1.5">{m.tools.map((t) => <ToolCall key={t.id} tool={t} />)}</div> : null}
      {(hasText || (m.live && !m.thinking && !m.tools?.length)) && <Markdown text={m.content} streaming={m.live} />}
      {!m.live && m.summary && (
        <TurnReceipt
          summary={m.summary}
          // Zero means the provider didn't report usage, not that it was free.
          tokens={m.tokens && m.tokens.prompt + m.tokens.eval > 0 ? fmtTokens(m.tokens.prompt + m.tokens.eval) : undefined}
          duration={m.duration}
          copy={hasText ? m.content : undefined}
        />
      )}
      {!m.live && !m.summary && (m.tokens || m.duration) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {hasText && (
            <>
              <CopyButton text={m.content} label="Sao chép" className="-ml-1.5" />
              <SpeechButton text={m.content} />
            </>
          )}
          {/* Zero means the provider didn't report usage, not that it was free. */}
          {m.tokens && m.tokens.prompt + m.tokens.eval > 0 ? <span>{fmtTokens(m.tokens.prompt + m.tokens.eval)} tokens</span> : null}
          {m.duration ? <span>{fmtDuration(m.duration, true)}</span> : null}
        </div>
      )}
    </div>
  )
}

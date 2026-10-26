import { IconFolder, IconMessages, IconPlus, IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { post } from '@/lib/api'
import type { SessionMeta } from '@/lib/types'
import { cn } from '@/lib/utils'
import { confirmDeleteSession } from '@/lib/swal'

function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ`
  return `${Math.floor(s / 86400)} ngày`
}

export function Sidebar({
  sessions, activeId, cwd, busy, onPick, onError,
}: {
  sessions: SessionMeta[]
  activeId: string
  cwd: string
  busy: boolean
  onPick: () => void
  onError: (msg: string) => void
}) {
  const act = (p: Promise<void>) => { p.catch((e: Error) => onError(e.message)); onPick() }
  const parts = cwd.replace(/^\/(Users|home)\/[^/]+/, '~').split(/[\\/]/)
  const home = parts.length > 3 ? `…/${parts.slice(-2).join('/')}` : parts.join('/')
  return (
    <div className="flex h-full flex-col gap-1 bg-sidebar p-3 text-sidebar-foreground">
      <div className="px-2 pt-1 pb-3">
        <span className="font-mono text-base font-semibold tracking-tight"><span className="text-primary">&gt;_</span> Viecodie</span>
      </div>
      <Button variant="outline" className="justify-start" onClick={() => act(post('session/new'))} disabled={busy}>
        <IconPlus className="size-4 shrink-0 text-primary" stroke={2.25} /> Đoạn chat mới
      </Button>
      <div className="px-2 pt-4 pb-1 text-xs font-medium text-muted-foreground">Gần đây</div>
      <nav className="-mx-1 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-1">
        {sessions.length === 0 && <div className="px-2 py-1 text-sm text-muted-foreground">Chưa có đoạn chat nào</div>}
        {sessions.map((s) => (
          <div key={s.id} className={cn('group flex items-center rounded-lg transition-all duration-150 hover:-translate-y-0.5 hover:shadow-3d-1 hover:bg-sidebar-accent', s.id === activeId && 'bg-sidebar-accent shadow-3d-1 font-medium')}>
            <button
              type="button"
              disabled={busy && s.id !== activeId}
              onClick={() => s.id !== activeId && act(post('session/resume', { id: s.id }))}
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm disabled:opacity-50"
              title={s.title}
            >
              <IconMessages className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" stroke={1.75} />
              <span className="truncate">{s.title}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground group-hover:hidden">{ago(s.updatedAt)}</span>
            </button>
            <button
              type="button"
              aria-label="Xóa đoạn chat"
              onClick={async (e) => {
                e.stopPropagation()
                const ok = await confirmDeleteSession(s.title)
                if (ok) act(post('session/delete', { id: s.id }))
              }}
              className="mr-1 hidden rounded p-1 text-muted-foreground hover:text-destructive group-hover:block"
            >
              <IconTrash className="size-3.5" stroke={1.75} />
            </button>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2 border-t px-2 pt-3 text-xs text-muted-foreground" title={cwd}>
        <IconFolder className="size-3.5 shrink-0 text-muted-foreground" stroke={1.75} />
        <span className="truncate font-mono">{home}</span>
      </div>
    </div>
  )
}

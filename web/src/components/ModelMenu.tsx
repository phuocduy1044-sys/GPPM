import { useRef, useState } from 'react'
import { IconChevronDown, IconCpu, IconLoader2, IconPlus, IconSearch } from '@tabler/icons-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { get, post } from '@/lib/api'
import type { Effort, ProviderInfo, WebState } from '@/lib/types'

export function ModelMenu({ state, onError, onOpenAddModel }: { state: WebState; onError: (msg: string) => void; onOpenAddModel?: () => void }) {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<string[] | null>(null)
  const [listed, setListed] = useState(true)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const search = useRef<HTMLInputElement>(null)

  const load = () => {
    setModels(null)
    setError(null)
    void get<{ models: string[]; listed?: boolean; error?: string }>('models')
      .then((r) => { setModels(r.models); setListed(r.listed ?? true); setError(r.error ?? null) })
      .catch((e) => setError(String(e.message)))
    void get<{ providers: ProviderInfo[] }>('providers').then((r) => setProviders(r.providers)).catch(() => {})
  }
  const act = (p: Promise<void>) => p.catch((e: Error) => onError(e.message))
  const choose = (model: string) => { act(post('model', { model })); setOpen(false) }

  // As in the terminal picker: the typed text is a row of its own unless it
  // names a listed model exactly, so a name that's a substring of another
  // (llama3 vs llama3:8b) stays reachable. First when the provider can't list
  // its models — the list is only a suggestion then — last otherwise.
  const q = query.trim()
  const matched = (models ?? []).filter((m) => m.toLowerCase().includes(q.toLowerCase()))
  const typed = q && !matched.includes(q) ? q : null
  const rows = typed ? (listed ? [...matched, typed] : [typed, ...matched]) : matched

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) { setQuery(''); load() }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-[38vw] text-muted-foreground sm:max-w-[240px]">
          <IconCpu className="size-4" stroke={1.75} />
          <span className="truncate">{state.model ?? 'Chọn mô hình'}</span>
          <IconChevronDown className="size-3.5 opacity-60" stroke={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        className="w-80"
        // Land in the search box, not on the first item, so typing filters straight away.
        onFocus={(e) => { if (e.target === e.currentTarget) search.current?.focus() }}
      >
        <DropdownMenuLabel>Mô hình · {state.provider}</DropdownMenuLabel>
        <div className="flex items-center gap-2 px-2 pb-1">
          <IconSearch className="size-3.5 shrink-0 text-muted-foreground" stroke={1.75} />
          <input
            ref={search}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter takes the top row; ↓ steps into the list; esc and tab are
              // the menu's. Everything else stays here, out of the menu's typeahead.
              if (e.key === 'Enter') { e.preventDefault(); if (rows[0]) choose(rows[0]) }
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                e.currentTarget.closest('[role=menu]')?.querySelector<HTMLElement>('[role=menuitemradio]')?.focus()
              }
              if (e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation()
            }}
            placeholder={listed ? 'Lọc hoặc nhập tên mô hình' : 'Nhập tên mô hình'}
            className="h-7 min-w-0 flex-1 bg-transparent font-mono text-xs outline-none placeholder:font-sans placeholder:text-muted-foreground"
          />
        </div>
        {!listed && !error && !q && (
          <div className="px-2 pb-1 text-xs text-muted-foreground">Nhà cung cấp này không liệt kê sẵn danh sách mô hình — hãy nhập tên bất kỳ rồi nhấn Enter.</div>
        )}
        {models === null && !error && <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground"><IconLoader2 className="size-4 animate-spin" stroke={2} /> Đang tải danh sách mô hình…</div>}
        {error && <div className="px-2 py-2 text-sm text-destructive whitespace-pre-wrap">{error}</div>}
        {models && models.length === 0 && listed && !error && !q && <div className="px-2 py-2 text-sm text-muted-foreground">Không có mô hình nào trên nhà cung cấp này.</div>}
        {rows.length > 0 && (
          <DropdownMenuRadioGroup value={state.model ?? ''} onValueChange={choose}>
            <div className="max-h-64 overflow-y-auto">
              {rows.map((m) => (
                <DropdownMenuRadioItem key={m} value={m} className="font-mono text-xs">
                  {m === typed ? <span><span className="font-sans text-muted-foreground">Dùng </span>{m}</span> : m}
                </DropdownMenuRadioItem>
              ))}
            </div>
          </DropdownMenuRadioGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Mức nỗ lực</DropdownMenuLabel>
        <div className="flex gap-1 px-1 pb-1">
          {(['low', 'medium', 'high'] as Effort[]).map((e) => (
            <Button key={e} size="sm" variant={state.effort === e ? 'inverted' : 'outline'} className="h-7 flex-1 capitalize"
              onClick={() => act(post('effort', { effort: e }))}>{e}</Button>
          ))}
        </div>
        {providers.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Nhà cung cấp: {state.provider}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                <DropdownMenuRadioGroup value={state.provider} onValueChange={(name) => act(post('provider', { name }).then(load))}>
                  {providers.map((p) => (
                    <DropdownMenuRadioItem key={p.name} value={p.name} onSelect={(e) => e.preventDefault()}>
                      <div className="min-w-0">
                        <div>{p.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.baseUrl}</div>
                      </div>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

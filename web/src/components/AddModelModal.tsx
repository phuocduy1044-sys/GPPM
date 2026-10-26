import { useState } from 'react'
import { IconCheck, IconCpu, IconKey, IconLayersIntersect, IconLoader2, IconSparkles, IconWorld, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { post } from '@/lib/api'

interface AddModelModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (provider: string, model: string) => void
}

interface Preset {
  label: string
  name: string
  type: 'openai' | 'ollama'
  baseUrl: string
  model: string
  contextWindow: number
  outputTokens: number
  mode: 'online' | 'offline'
}

const PRESETS: Preset[] = [
  {
    label: 'DeepSeek Chat',
    name: 'deepseek',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    contextWindow: 65536,
    outputTokens: 8192,
    mode: 'online',
  },
  {
    label: 'DeepSeek R1',
    name: 'deepseek',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-reasoner',
    contextWindow: 65536,
    outputTokens: 8192,
    mode: 'online',
  },
  {
    label: 'Ollama Qwen',
    name: 'ollama',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5-coder:7b',
    contextWindow: 32768,
    outputTokens: 8192,
    mode: 'offline',
  },
  {
    label: 'Ollama DeepSeek',
    name: 'ollama',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'deepseek-r1:7b',
    contextWindow: 32768,
    outputTokens: 8192,
    mode: 'offline',
  },
  {
    label: 'OpenAI',
    name: 'openai',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    contextWindow: 128000,
    outputTokens: 16384,
    mode: 'online',
  },
  {
    label: 'FPT Cloud',
    name: 'fptcloud',
    type: 'openai',
    baseUrl: 'https://mkp-api.fptcloud.com',
    model: 'FPT.TTS-ultra',
    contextWindow: 32768,
    outputTokens: 8192,
    mode: 'online',
  },
  {
    label: 'LM Studio',
    name: 'lmstudio',
    type: 'openai',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    contextWindow: 32768,
    outputTokens: 8192,
    mode: 'offline',
  },
]

export function AddModelModal({ open, onClose, onSuccess }: AddModelModalProps) {
  const [name, setName] = useState('deepseek')
  const [type, setType] = useState<'openai' | 'ollama'>('openai')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com')
  const [model, setModel] = useState('deepseek-chat')
  const [apiKey, setApiKey] = useState('')
  const [contextWindow, setContextWindow] = useState('32768')
  const [outputTokens, setOutputTokens] = useState('8192')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const applyPreset = (p: Preset) => {
    setName(p.name)
    setType(p.type)
    setBaseUrl(p.baseUrl)
    setModel(p.model)
    setContextWindow(String(p.contextWindow))
    setOutputTokens(String(p.outputTokens))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedUrl = baseUrl.trim()
    const trimmedModel = model.trim()
    const trimmedName = name.trim() || 'custom'

    if (!trimmedUrl) {
      setError('Vui lòng nhập địa chỉ URL (Base URL).')
      return
    }

    setLoading(true)
    try {
      await post('provider/add', {
        name: trimmedName,
        type,
        baseUrl: trimmedUrl,
        apiKey: apiKey.trim() || undefined,
        model: trimmedModel || undefined,
        contextWindow: contextWindow ? parseInt(contextWindow, 10) : 32768,
        outputTokens: outputTokens ? parseInt(outputTokens, 10) : 8192,
      })

      onSuccess(trimmedName, trimmedModel)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-3d-3 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-3d-1">
              <IconCpu className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Thêm mô hình & Cấu hình URL</h2>
              <p className="text-xs text-muted-foreground">Tự do cấu hình URL, API Key và hạn mức Token</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <IconX className="size-4" stroke={2} />
          </button>
        </div>

        {/* Mẫu cấu hình nhanh (Presets) */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <IconSparkles className="size-3 text-primary" stroke={2} />
            <span>Mẫu cấu hình nhanh:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary/80 px-2.5 py-1 text-xs font-medium transition-all hover:bg-accent hover:border-primary/50 shadow-3d-1"
              >
                <span>{p.label}</span>
                <span className={`rounded px-1 py-0.2 text-[10px] font-mono font-semibold ${p.mode === 'online' ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30' : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'}`}>
                  {p.mode === 'online' ? 'Online' : 'Offline'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tên nhà cung cấp (ID)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="fptcloud, openai, custom..."
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-3d-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Giao thức kết nối
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'openai' | 'ollama')}
                className="w-full rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-3d-1"
              >
                <option value="openai">OpenAI-compatible (/v1, FPT, v.v.)</option>
                <option value="ollama">Ollama (Native)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
              <IconWorld className="size-3" stroke={1.75} />
              <span>Địa chỉ URL (Base URL)</span>
            </label>
            <input
              type="url"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://mkp-api.fptcloud.com hoặc https://api.openai.com/v1"
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-3d-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <IconCpu className="size-3" stroke={1.75} />
                <span>Tên mô hình (Model ID)</span>
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="FPT.TTS-ultra, gpt-4o-mini..."
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-3d-1"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <IconKey className="size-3" stroke={1.75} />
                <span>Khóa API (API Key)</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập API Key nếu có"
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-3d-1"
              />
            </div>
          </div>

          {/* Cấu hình Giới hạn Token Input và Output tự điền */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <IconLayersIntersect className="size-3 text-primary" stroke={1.75} />
                <span>Input Token (Context)</span>
              </label>
              <input
                type="number"
                min={1024}
                max={2000000}
                step={1024}
                value={contextWindow}
                onChange={(e) => setContextWindow(e.target.value)}
                placeholder="32768"
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-3d-1"
              />
              <span className="text-[10px] text-muted-foreground">Ngữ cảnh đầu vào (tokens)</span>
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <IconLayersIntersect className="size-3 text-emerald-400" stroke={1.75} />
                <span>Output Token (Predict)</span>
              </label>
              <input
                type="number"
                min={512}
                max={65536}
                step={512}
                value={outputTokens}
                onChange={(e) => setOutputTokens(e.target.value)}
                placeholder="8192"
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-3d-1"
              />
              <span className="text-[10px] text-muted-foreground">Giới hạn sinh câu trả lời</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4 mt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5 shadow-3d-2">
              {loading ? (
                <>
                  <IconLoader2 className="size-3.5 animate-spin" stroke={2} /> Đang lưu…
                </>
              ) : (
                <>
                  <IconCheck className="size-3.5" stroke={2} /> Lưu & Kích hoạt mô hình
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

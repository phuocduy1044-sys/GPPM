/**
 * The token `viecodie web` printed arrives in the URL fragment (never sent to a
 * server, never in a Referer). It is moved to sessionStorage and scrubbed from
 * the address bar, so a screenshot or a copied URL doesn't carry it.
 */
const KEY = 'viecodie-token'

function readToken(): string | null {
  const mHash = location.hash.match(/token=([\w-]+)/)
  const mSearch = location.search.match(/[?&]token=([\w-]+)/)
  const mCookie = typeof document !== 'undefined' ? document.cookie.match(/viecodie-session=([\w-]+)/) : null
  const val = mHash?.[1] || mSearch?.[1] || mCookie?.[1]
  if (val) {
    try { sessionStorage.setItem(KEY, val) } catch { /* private mode — keep it in memory */ }
    if (mHash || mSearch) {
      history.replaceState(null, '', location.pathname)
    }
    return val
  }
  try { return sessionStorage.getItem(KEY) } catch { return null }
}

export const token = readToken()

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/${path}`, { headers: { 'x-viecodie-token': token ?? '' } })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText)
  return res.json() as Promise<T>
}

export async function post(path: string, body: unknown = {}): Promise<void> {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-viecodie-token': token ?? '' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText)
}

export async function postBlob(path: string, body: unknown = {}): Promise<Blob> {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-viecodie-token': token ?? '' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText)
  return res.blob()
}

export function events(): EventSource {
  return new EventSource(`/api/events?token=${encodeURIComponent(token ?? '')}`)
}

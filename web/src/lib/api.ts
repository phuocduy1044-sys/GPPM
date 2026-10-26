/**
 * The token `viecodie web` printed arrives in the URL fragment (never sent to a
 * server, never in a Referer). It is moved to sessionStorage and scrubbed from
 * the address bar, so a screenshot or a copied URL doesn't carry it.
 */
const KEY = 'viecodie-token'

function readToken(): string | null {
  const m = location.hash.match(/token=([\w-]+)/)
  if (m) {
    try { sessionStorage.setItem(KEY, m[1]) } catch { /* private mode — keep it in memory */ }
    history.replaceState(null, '', location.pathname + location.search)
    return m[1]
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

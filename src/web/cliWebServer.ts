/**
 * CLI Web Server Singleton Manager
 * 
 * Ensures that within an interactive CLI session, `/graph` can be called
 * multiple times without creating duplicate servers or failing on EADDRINUSE.
 */
import { spawn } from 'child_process'
import { startWeb, type RunningWeb } from './server.js'

let activeServer: RunningWeb | null = null

export function openBrowser(url: string): void {
  const [cmd, ...args] =
    process.platform === 'darwin' ? ['open', url]
      : process.platform === 'win32' ? ['cmd', '/c', 'start', '""', url]
        : ['xdg-open', url]
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref()
  } catch { /* no browser */ }
}

export async function getOrStartCliWebServer(cwd: string, port = 4747): Promise<{ url: string; isNew: boolean }> {
  // If we already have a running instance, test if it is still alive
  if (activeServer) {
    try {
      const res = await fetch(`http://127.0.0.1:${activeServer.port}/api/health`, {
        signal: AbortSignal.timeout(1200),
      })
      if (res.ok) {
        return { url: activeServer.url, isNew: false }
      }
    } catch {
      activeServer = null
    }
  }

  // Not running -> start a new one
  try {
    activeServer = await startWeb({ port, cwd })
    return { url: activeServer.url, isNew: true }
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'EADDRINUSE') {
      // Let startWeb find next free port
      activeServer = await startWeb({ port: 0, cwd })
      return { url: activeServer.url, isNew: true }
    }
    throw err
  }
}

export async function closeCliWebServer(): Promise<void> {
  if (activeServer) {
    try {
      await activeServer.close()
    } catch { /* ignore */ }
    activeServer = null
  }
}

/**
 * `viecodie web` — the same agent, in a browser tab.
 *
 * A plain node:http server: the page and its assets, a JSON API for what the
 * user does, and one Server-Sent Events stream per tab for everything the agent
 * does. SSE rather than a WebSocket because traffic is almost all one way and
 * it needs no dependency; the few things a browser sends are ordinary POSTs.
 *
 * This server can run shell commands on the machine, so it is locked down the
 * way a local dev tool should be:
 *   - it binds to 127.0.0.1 only, never 0.0.0.0;
 *   - every API call must carry the random token printed at startup, so another
 *     page open in the same browser cannot drive it with a blind fetch;
 *   - the Host header must name loopback, which stops a DNS-rebinding page from
 *     reaching it under a domain of its own.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { dirname, extname, join, resolve, sep } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes, timingSafeEqual } from 'crypto'
import { WebAgent, type WebEvent } from './session.js'
import { PERMISSION_MODES, type PermissionMode } from '../permissions/policy.js'
import { addProvider, setModel, setModelContexts, type Effort } from '../config.js'
import { generateSpeech } from '../tts/speech.js'

/** A pasted screenshot or three, base64'd, with room to spare. */
const MAX_BODY = 32 * 1024 * 1024

export interface WebServerOptions {
  port?: number
  host?: string
  token?: string
  cwd?: string
  resumeId?: string
  continueLast?: boolean
}

export interface RunningWeb {
  server: Server
  agent: WebAgent
  url: string
  port: number
  token: string
  close: () => Promise<void>
}

/**
 * Where the built React app is. The published package bundles the CLI into
 * dist/cli.js with the app beside it in dist/web; running from source with tsx
 * (this file at src/web/server.ts) it is the same dist/web after `npm run build`.
 */
export function clientDir(): string | null {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const dir of [join(here, 'web'), join(here, '..', '..', 'dist', 'web')]) {
    if (existsSync(join(dir, 'index.html'))) return dir
  }
  return null
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
}

const PAGE_HEADERS = {
  'content-security-policy':
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
  'referrer-policy': 'no-referrer',
}

const MISSING_BUILD =
  '<!doctype html><meta charset="utf-8"><title>Viecodie</title><body style="font:15px system-ui;padding:40px">' +
  '<h1>The web app has not been built</h1><p>Run <code>npm run build</code> in the viecodie repo, ' +
  'or <code>npm run dev:web</code> for a hot-reloading copy.</p>'

function send(res: ServerResponse, status: number, body: unknown, type = 'application/json; charset=utf-8') {
  const data = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(data)
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) { reject(new Error('request too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8')
        const parsed = raw ? JSON.parse(raw) : {}
        resolve(parsed && typeof parsed === 'object' ? parsed : {})
      } catch {
        reject(new Error('body is not JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Loopback under any spelling a browser sends — and nothing else. */
export function isLoopbackHost(host: string | undefined): boolean {
  if (!host) return false
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
  return name === '127.0.0.1' || name === 'localhost' || name === '[::1]'
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

export function createWebHandler(agent: WebAgent, token: string) {
  const dir = clientDir()

  return async (req: IncomingMessage, res: ServerResponse) => {
    if (!isLoopbackHost(req.headers.host)) return send(res, 403, { error: 'viecodie web only answers on localhost' })
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname

    // The page itself is not secret — the token is. It arrives in the URL the
    // CLI prints or through loopback session cookie, and the page's script lifts it out and sends it on every call.
    if (req.method === 'GET' && !path.startsWith('/api/')) {
      const queryToken = url.searchParams.get('token')
      const headerToken = str(req.headers['x-viecodie-token'])
      // Only grant session cookie if request presented the valid secret token
      if ((queryToken && sameToken(queryToken, token)) || (headerToken && sameToken(headerToken, token))) {
        res.setHeader('Set-Cookie', `viecodie-session=${token}; Path=/; SameSite=Strict`)
      }
      return serveStatic(dir, path, res)
    }

    if (!path.startsWith('/api/')) return send(res, 404, { error: 'not found' })
    // Authenticate via x-viecodie-token header, query param, or loopback session cookie
    const cookieToken = req.headers.cookie?.match(/viecodie-session=([\w-]+)/)?.[1]
    const given = str(req.headers['x-viecodie-token']) ?? url.searchParams.get('token') ?? cookieToken ?? ''
    if (!sameToken(given, token)) return send(res, 401, { error: 'missing or wrong token — open the URL viecodie printed' })

    try {
      if (req.method === 'GET') {
        switch (path) {
          case '/api/events': return stream(agent, req, res)
          case '/api/state': return send(res, 200, agent.hello())
          case '/api/models': return send(res, 200, await agent.models())
          case '/api/providers': return send(res, 200, { providers: agent.providers() })
          case '/api/checkpoints': return send(res, 200, { checkpoints: agent.checkpoints() })
          case '/api/health': {
            return send(res, 200, {
              status: 'ok',
              engine: 'viecodie-core',
              version: '3.13.1',
              cwd: agent.cwd,
            })
          }
          case '/api/review/current': {
            const { getCurrentReport } = await import('../review/engine.js')
            const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
            const report = getCurrentReport(reqSessionId || undefined)
            if (!report) return send(res, 404, { error: 'Chưa có báo cáo review nào' })
            return send(res, 200, report)
          }
          case '/api/review/history': {
            const { getCurrentReport } = await import('../review/engine.js')
            const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
            const report = getCurrentReport(reqSessionId || undefined)
            if (!report) return send(res, 404, { error: 'Chưa có báo cáo review nào' })
            return send(res, 200, {
              applyHistory: report.applyHistory || [],
              undoHistory: report.undoHistory || [],
              candidates: report.candidates || {},
            })
          }
          case '/api/review/tests': {
            const { listProjectTestFiles, computeTestsHash } = await import('../runner/testBundleService.js')
            const { discoverChecks } = await import('../runner/discovery.js')
            const { getCurrentReport } = await import('../review/engine.js')
            const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
            const current = getCurrentReport(reqSessionId || undefined)
            const targetRoot = current?.projectRoot || agent.cwd
            const testFiles = listProjectTestFiles(targetRoot)
            const manifest = discoverChecks(targetRoot)
            const testsHash = computeTestsHash(targetRoot, testFiles)
            return send(res, 200, {
              testFiles,
              suggestedCommands: manifest.discoveredConfigs,
              testsHash,
              hasTests: testFiles.length > 0,
            })
          }
          case '/api/review/source': {
            const relPath = str(url.searchParams.get('path'))
            const rev = str(url.searchParams.get('revision'))
            const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
            if (!relPath) return send(res, 400, { error: 'expected ?path=<file>' })
            const { getCurrentReport } = await import('../review/engine.js')
            const report = getCurrentReport(reqSessionId || undefined)

            const rootDir = report?.projectRoot ? resolve(report.projectRoot) : resolve(agent.cwd)

            // Strictly verify path containment
            const { confineToRoot } = await import('../tools/paths.js')
            let fullPath: string
            try {
              fullPath = confineToRoot(relPath, rootDir)
            } catch {
              return send(res, 403, { error: 'Truy cập ngoài phạm vi thư mục dự án bị từ chối' })
            }

            if (rev && report?.revision && rev !== report.revision && rev !== 'current') {
              return send(res, 404, { error: `Revision ${rev} không khả dụng (hiện tại là ${report.revision})` })
            }

            if (report?.fileContents) {
              const normalizedRel = relPath.replace(/\\/g, '/')
              if (report.fileContents[normalizedRel]) {
                return send(res, 200, { filePath: relPath, revision: report.revision, content: report.fileContents[normalizedRel] })
              }
            }

            const { readFileSync, existsSync, statSync } = await import('fs')
            if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
              return send(res, 404, { error: 'Tệp tin không tồn tại' })
            }
            const content = readFileSync(fullPath, 'utf8')
            return send(res, 200, { filePath: relPath, revision: report?.revision || 'current', content })
          }
        }
        return send(res, 404, { error: 'not found' })
      }
      if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })

      const body = await readJson(req)
      switch (path) {
        case '/api/send': {
          const text = str(body.text) ?? ''
          const images = Array.isArray(body.images) ? body.images.filter((i): i is string => typeof i === 'string') : undefined
          // Fire and forget: the turn's progress arrives over the event stream.
          void agent.submit(text, images?.length ? images : undefined)
          return send(res, 202, { ok: true })
        }
        case '/api/stop':
          agent.stop()
          return send(res, 200, { ok: true })
        case '/api/permission': {
          const answer = str(body.answer)
          if (typeof body.id !== 'number' || (answer !== 'yes' && answer !== 'no' && answer !== 'always')) {
            return send(res, 400, { error: 'expected { id, answer: yes | no | always }' })
          }
          agent.answer(body.id, answer)
          return send(res, 200, { ok: true })
        }
        case '/api/mode': {
          const mode = str(body.mode)
          if (!mode || !(PERMISSION_MODES as string[]).includes(mode)) return send(res, 400, { error: 'unknown mode' })
          agent.setMode(mode as PermissionMode)
          return send(res, 200, { ok: true })
        }
        case '/api/model': {
          const model = str(body.model)
          if (!model) return send(res, 400, { error: 'expected { model }' })
          agent.chooseModel(model)
          return send(res, 200, { ok: true })
        }
        case '/api/provider': {
          const name = str(body.name)
          if (!name || !agent.chooseProvider(name)) return send(res, 400, { error: 'unknown provider' })
          return send(res, 200, { ok: true })
        }
        case '/api/effort': {
          const effort = str(body.effort)
          if (effort !== 'low' && effort !== 'medium' && effort !== 'high') return send(res, 400, { error: 'effort is low, medium or high' })
          agent.chooseEffort(effort as Effort)
          return send(res, 200, { ok: true })
        }
        case '/api/session/new':
          agent.newSession()
          return send(res, 200, { ok: true })
        case '/api/session/resume': {
          const id = str(body.id)
          if (!id) return send(res, 400, { error: 'expected { id }' })
          agent.resume(id)
          return send(res, 200, { ok: true })
        }
        case '/api/session/delete': {
          const id = str(body.id)
          if (!id) return send(res, 400, { error: 'expected { id }' })
          agent.removeSession(id)
          return send(res, 200, { ok: true })
        }
        case '/api/speech': {
          const text = str(body.text)
          if (!text) return send(res, 400, { error: 'Vui lòng cung cấp văn bản cần đọc.' })
          try {
            const { buffer, contentType } = await generateSpeech({
              text,
              voice: str(body.voice),
              speed: typeof body.speed === 'number' ? body.speed : 1,
              apiKey: str(body.apiKey),
              baseURL: str(body.baseURL),
              model: str(body.model),
            })
            res.writeHead(200, {
              'Content-Type': contentType,
              'Content-Length': buffer.length,
              'Cache-Control': 'no-cache',
            })
            res.end(buffer)
            return
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            return send(res, 500, { error: message })
          }
        }
        case '/api/provider/add': {
          const name = (str(body.name) || 'custom').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
          const type = str(body.type) === 'ollama' ? 'ollama' : 'openai'
          const baseUrl = str(body.baseUrl)?.trim()
          const apiKey = str(body.apiKey)?.trim()
          const model = str(body.model)?.trim()
          const contextWindow = typeof body.contextWindow === 'number' && body.contextWindow > 0 ? body.contextWindow : undefined
          const outputTokens = typeof body.outputTokens === 'number' && body.outputTokens > 0 ? body.outputTokens : undefined

          if (!baseUrl) {
            return send(res, 400, { error: 'Vui lòng nhập địa chỉ URL (Base URL).' })
          }

          addProvider(name, {
            type,
            baseUrl,
            apiKey: apiKey || undefined,
            contextWindow: contextWindow ?? 32768,
          })

          if (model) {
            setModel(model)
            if (contextWindow) {
              setModelContexts({ [model]: contextWindow })
            }
          }

          agent.chooseProvider(name)
          if (model) agent.chooseModel(model)

          return send(res, 200, { ok: true, provider: name, model, contextWindow, outputTokens })
        }
        case '/api/review': {
          const { reviewProject, getCurrentReport } = await import('../review/engine.js')
          const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
          const prev = getCurrentReport(reqSessionId || undefined)
          const projectPath = str(body.projectPath) || prev?.projectRoot || agent.cwd
          const mode = str(body.mode)
          try {
            const report = await reviewProject({
              projectRoot: projectPath,
              mode: (mode as any) || 'rules',
              sessionId: reqSessionId || undefined,
            })
            return send(res, 200, { jobId: report.reviewId, status: 'completed', report })
          } catch (err) {
            return send(res, 500, { error: err instanceof Error ? err.message : String(err) })
          }
        }
        case '/api/review/patch': {
          const { createPatch } = await import('../review/patch.js')
          const { getCurrentReport } = await import('../review/engine.js')
          const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
          const current = getCurrentReport(reqSessionId || undefined)
          if (!current) return send(res, 404, { error: 'Không tìm thấy báo cáo review hiện tại' })
          const findingIds = Array.isArray(body.findingIds) ? body.findingIds.filter((id): id is string => typeof id === 'string') : undefined
          const patch = createPatch(agent.cwd, current.findings, current.revision, findingIds)
          return send(res, 200, { patch })
        }
                        case '/api/review/apply': {
          const { createPatch } = await import('../review/patch.js')
          const { getCurrentReport } = await import('../review/engine.js')
          const { applyPatchWithSnapshot } = await import('../review/applyService.js')
          const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
          const current = getCurrentReport(reqSessionId || undefined)
          if (!current) return send(res, 404, { success: false, status: 'failed', error: 'Không tìm thấy báo cáo review' })
          
          const patchId = str(body.patchId)
          const reviewId = str(body.reviewId)
          const baseRevision = str(body.baseRevision) || current.revision
          const confirm = body.confirm !== undefined ? Boolean(body.confirm) : true

          if (!confirm) {
            return send(res, 400, { success: false, status: 'unsupported', error: 'Yêu cầu xác nhận (confirm: true) để áp dụng bản vá' })
          }

          if (reviewId && current.reviewId && reviewId !== current.reviewId) {
            return send(res, 400, { success: false, status: 'stale', error: `reviewId (${reviewId}) không khớp với phiên hiện tại (${current.reviewId})` })
          }

          const reqProjectPath = str(body.projectPath)
          if (reqProjectPath) {
            const { computeProjectId } = await import('../review/engine.js')
            if (current.projectId && computeProjectId(reqProjectPath) !== current.projectId) {
              return send(res, 400, { success: false, status: 'stale', error: 'Báo cáo review không thuộc về dự án đích' })
            }
          }

          const targetRoot = current.projectRoot || agent.cwd

          // Lookup patch from report.patches record
          let patch = (current.patches && patchId) ? current.patches[patchId] : undefined

          const findingId = str(body.findingId)
          if (!patch) {
            const targetFinding = current.findings.find(f => f.patchId === patchId || (findingId && f.id === findingId))
            if (targetFinding && current.patches && targetFinding.patchId) {
              patch = current.patches[targetFinding.patchId]
            }
          }

          if (!patch) {
            const fid = findingId || (patchId ? patchId.replace(/^patch-/, '') : undefined)
            const findingIds = fid ? [fid] : (Array.isArray(body.findingIds) ? body.findingIds.filter((id): id is string => typeof id === 'string') : undefined)
            if (!findingIds || findingIds.length === 0) {
              return send(res, 400, { success: false, status: 'unsupported', error: 'Không tìm thấy bản vá khả dụng cho yêu cầu này.' })
            }
            patch = createPatch(targetRoot, current.findings, current.revision, findingIds)
          }

          if (!patch || !patch.files || patch.files.length === 0) {
            return send(res, 400, { success: false, status: 'no_changes', error: 'Bản vá rỗng, không có thay đổi mã nguồn nào.' })
          }

          const result = await applyPatchWithSnapshot({
            projectRoot: targetRoot,
            patch,
            baseRevision,
            confirm,
            sessionId: reqSessionId || undefined,
            candidateId: findingId ? `cand-${findingId}` : undefined,
          })

          if (!result.success) {
            return send(res, 400, result)
          }

          return send(res, 200, {
            ...result,
            patchId: patch.id,
            newRevision: result.newReport?.revision || baseRevision,
            modifiedFiles: result.modifiedFiles || [],
            report: result.newReport,
            canUndo: true,
          })
        }
        case '/api/review/undo': {
          const { undoApplyWithSnapshot } = await import('../review/applyService.js')
          const { getCurrentReport } = await import('../review/engine.js')
          const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
          const current = getCurrentReport(reqSessionId || undefined)
          if (!current) return send(res, 404, { success: false, status: 'failed', error: 'Không tìm thấy báo cáo review' })

          const targetRoot = current.projectRoot || agent.cwd
          const applyRecordId = str(body.applyRecordId)
          const patchId = str(body.patchId)
          const confirm = body.confirm !== undefined ? Boolean(body.confirm) : true

          const result = await undoApplyWithSnapshot({
            projectRoot: targetRoot,
            applyRecordId,
            patchId,
            sessionId: reqSessionId || undefined,
            confirm,
          })

          if (!result.success) {
            return send(res, 400, result)
          }
          return send(res, 200, {
            ...result,
            report: result.newReport,
          })
        }
                case '/api/review/tests/import': {
          const { importTestBundle } = await import('../runner/testBundleService.js')
          const { getCurrentReport, setCurrentReport } = await import('../review/engine.js')
          const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
          const current = getCurrentReport(reqSessionId || undefined)
          const targetRoot = str(body.projectPath) || current?.projectRoot || agent.cwd
          const testFiles = Array.isArray(body.testFiles) ? (body.testFiles as any) : []
          const overwrite = body.overwrite !== undefined ? Boolean(body.overwrite) : true

          const result = importTestBundle({
            projectRoot: targetRoot,
            testFiles,
            overwrite,
          })

          if (!result.success) {
            return send(res, 400, result)
          }

          if (current) {
            current.testsHash = result.testsHash
            setCurrentReport(current, reqSessionId || undefined)
          }

          return send(res, 200, result)
        }
        case '/api/review/tests/run': {
          const { runVerification } = await import('../review/verify.js')
          const { getCurrentReport, setCurrentReport } = await import('../review/engine.js')
          const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
          const current = getCurrentReport(reqSessionId || undefined)
          const targetRoot = str(body.projectPath) || current?.projectRoot || agent.cwd
          const checkCommand = str(body.command) || str(body.checkCommand) || 'npm test'
          const baseRevision = current?.revision || 'rev-current'

          const result = await runVerification({
            projectRoot: targetRoot,
            checkCommand,
            baseRevision,
          })

          if (current) {
            current.verification = result
            setCurrentReport(current, reqSessionId || undefined)
          }

          return send(res, 200, {
            success: result.status === 'passed',
            result,
          })
        }
case '/api/review/verify': {
          const { runVerification } = await import('../review/verify.js')
          const { getCurrentReport, setCurrentReport } = await import('../review/engine.js')
          const reqSessionId = str(url.searchParams.get('session')) || str(req.headers['x-viecodie-session-id'])
          const checkCommand = str(body.checkCommand) || 'npm test'
          const confirm = body.confirm !== undefined ? Boolean(body.confirm) : true
          const current = getCurrentReport(reqSessionId || undefined)
          const targetRoot = current?.projectRoot || agent.cwd
          const baseRevision = current?.revision || 'rev-current'
          const result = await runVerification({
            projectRoot: targetRoot,
            checkCommand,
            baseRevision,
          })
          if (current) {
            current.verification = result
            setCurrentReport(current, reqSessionId || undefined)
          }
          return send(res, 200, result)
        }
        case '/api/rewind': {
          if (typeof body.turn !== 'number') return send(res, 400, { error: 'expected { turn }' })
          agent.rewind(body.turn)
          return send(res, 200, { ok: true })
        }
      }
      return send(res, 404, { error: 'not found' })
    } catch (err) {
      return send(res, 400, { error: err instanceof Error ? err.message : String(err) })
    }
  }
}

function serveStatic(dir: string | null, path: string, res: ServerResponse) {
  if (!dir) {
    res.writeHead(200, { 'content-type': TYPES['.html'], ...PAGE_HEADERS })
    res.end(MISSING_BUILD)
    return
  }
  // Resolve inside the build directory and nowhere else; anything that is not
  // a file there is the single-page app.
  let decoded: string
  try {
    decoded = decodeURIComponent(path)
  } catch {
    // `/%E0` and friends: a bad request, not a reason for the process to die.
    return send(res, 400, { error: 'malformed URL' })
  }
  const target = resolve(dir, '.' + decoded)
  const inside = target.startsWith(dir + sep)
  const file = inside && existsSync(target) && statSync(target).isFile() ? target : join(dir, 'index.html')
  const type = TYPES[extname(file)] ?? 'application/octet-stream'
  const headers: Record<string, string> = {
    'content-type': type,
    'x-content-type-options': 'nosniff',
    // Vite fingerprints everything under /assets, so those can be cached for good.
    'cache-control': file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-store',
  }
  if (type === TYPES['.html']) Object.assign(headers, PAGE_HEADERS)
  res.writeHead(200, headers)
  res.end(readFileSync(file))
}

function stream(agent: WebAgent, req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  const write = (name: string, data: unknown) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)
  write('hello', agent.hello())
  const off = agent.subscribe((ev: WebEvent) => write(ev.type, ev))
  // A comment line every so often keeps proxies and sleeping laptops from
  // deciding the connection is idle and dropping it.
  const ping = setInterval(() => res.write(': ping\n\n'), 20_000)
  req.on('close', () => { off(); clearInterval(ping) })
}

/** Start the server. Resolves once it is listening. */
export async function startWeb(opts: WebServerOptions = {}): Promise<RunningWeb> {
  const host = opts.host ?? '127.0.0.1'
  const token = opts.token ?? randomBytes(18).toString('base64url')
  const agent = new WebAgent(opts.cwd ?? process.cwd(), {
    ...(opts.resumeId ? { resumeId: opts.resumeId } : {}),
    ...(opts.continueLast ? { continueLast: true } : {}),
  })
  const handler = createWebHandler(agent, token)
  // Anything the handler throws ends this one request. Left unhandled, a single
  // bad request from any page in the browser would exit the whole server.
  const server = createServer((req, res) => {
    handler(req, res).catch((err: unknown) => {
      if (res.headersSent) res.destroy()
      else send(res, 500, { error: err instanceof Error ? err.message : String(err) })
    })
  })

  const port = await new Promise<number>((resolve, reject) => {
    const tryListen = (p: number, attemptsLeft: number) => {
      server.once('error', (err: NodeJS.ErrnoException) => {
        // A fixed port that is taken moves up one; an explicit --port 0 never collides.
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0 && p !== 0) tryListen(p + 1, attemptsLeft - 1)
        else reject(err)
      })
      server.listen(p, host, () => {
        const addr = server.address()
        resolve(typeof addr === 'object' && addr ? addr.port : p)
      })
    }
    tryListen(opts.port ?? 4747, opts.port === undefined ? 20 : 0)
  })

  const url = `http://${host === '127.0.0.1' ? 'localhost' : host}:${port}/#token=${token}`
  return {
    server,
    agent,
    url,
    port,
    token,
    close: () => new Promise((resolve) => {
      agent.stop()
      server.closeAllConnections?.()
      server.close(() => resolve())
    }),
  }
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let home: string
let realHome: string | undefined
let realUserProfile: string | undefined

// CONFIG_PATH is resolved from homedir() at import time, so HOME must point at
// the temp dir before config.ts loads — hence a fresh module per test.
async function loadWith(raw: unknown) {
  mkdirSync(join(home, '.viecodie'), { recursive: true })
  writeFileSync(join(home, '.viecodie', 'config.json'), JSON.stringify(raw))
  vi.resetModules()
  const { loadConfig } = await import('./config.js')
  return loadConfig()
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'viecodie-home-'))
  realHome = process.env.HOME
  realUserProfile = process.env.USERPROFILE
  process.env.HOME = home
  process.env.USERPROFILE = home
})
afterEach(() => {
  rmSync(home, { recursive: true, force: true })
  if (realHome === undefined) delete process.env.HOME
  else process.env.HOME = realHome
  if (realUserProfile === undefined) delete process.env.USERPROFILE
  else process.env.USERPROFILE = realUserProfile
})

describe('loadConfig', () => {
  it('loads the previous Miii config when no Viecodie config exists', async () => {
    const legacy = {
      provider: 'deepseek',
      model: 'deepseek-flash',
      providers: {
        deepseek: {
          type: 'openai',
          baseUrl: 'https://api.deepseek.com',
          apiKey: 'test-secret',
        },
      },
    }
    mkdirSync(join(home, '.miii'), { recursive: true })
    writeFileSync(join(home, '.miii', 'config.json'), JSON.stringify(legacy))
    vi.resetModules()
    const { loadConfig, resolveProvider } = await import('./config.js')

    expect(loadConfig().model).toBe('deepseek-flash')
    expect(resolveProvider().name).toBe('deepseek')
    expect(resolveProvider().entry.baseUrl).toBe('https://api.deepseek.com')
  })

  it('keeps decider, so the stop gate can actually be turned on', async () => {
    const cfg = await loadWith({ decider: { model: 'qwen3:0.6b' } })
    expect(cfg.decider).toEqual({ model: 'qwen3:0.6b' })
  })

  it('keeps maxTurns', async () => {
    const cfg = await loadWith({ maxTurns: 40 })
    expect(cfg.maxTurns).toBe(40)
  })
})

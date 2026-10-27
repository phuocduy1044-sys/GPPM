import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createPatch, applyPatch, getFindingPatch } from './patch.js'
import { reviewProject } from './engine.js'
import { parseTestsSummary, runVerification } from './verify.js'

describe('T01 Regression Test Suite (Audit T00 Findings)', () => {
  const testDir = join(process.cwd(), 'temp_t01_regression')

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true })
  })

  it('Probe 01: applyPatch fails with unsupported when confirm is false, does not modify file', () => {
    const code = 'export function test() { return 123; }'
    const filePath = join(testDir, 'test.js')
    writeFileSync(filePath, code, 'utf8')

    const patch: any = {
      id: 'patch-01',
      findingIds: ['f-1'],
      baseRevision: 'rev-1',
      files: [{
        filePath: 'test.js',
        oldHash: 'hash-old',
        newHash: 'hash-new',
        diff: '--- test.js\n+++ test.js\n@@ -1,1 +1,1 @@\n-123\n+456',
        newContent: 'export function test() { return 456; }',
      }],
      status: 'proposed',
    }

    // Try applying with confirm: false
    const res = applyPatch(testDir, patch, 'rev-1', false)
    expect(res.success).toBe(false)
    expect(res.status).toBe('unsupported')
    expect(res.modifiedFiles).toEqual([])

    // File content remains unchanged
    expect(readFileSync(filePath, 'utf8')).toBe(code)
  })

  it('Probe 02: suggestion text is NOT used as code replacement', async () => {
    const code = `
export function compute(x) {
  // complex architectural code
  return x * 2;
}
`
    const filePath = join(testDir, 'compute.js')
    writeFileSync(filePath, code, 'utf8')

    const findingAdviceOnly: any = {
      id: 'finding-style-99',
      ruleId: 'COMPLEX_ARCHITECTURE_ADVICE',
      filePath: 'compute.js',
      line: 2,
      evidence: 'return x * 2;',
      suggestion: 'Hãy cân nhắc tách nhỏ hàm này theo nguyên lý Single Responsibility.',
    }

    const patch = getFindingPatch(testDir, findingAdviceOnly)
    expect(patch).toBeNull()
  })

  it('Probe 03: empty patch does not report success or create new revision', () => {
    const emptyPatch: any = {
      id: 'patch-empty',
      findingIds: ['f-empty'],
      baseRevision: 'rev-original',
      files: [],
      status: 'proposed',
    }

    const res = applyPatch(testDir, emptyPatch, 'rev-original', true)
    expect(res.success).toBe(false)
    expect(res.status).toBe('no_changes')
    expect(res.newRevision).toBe('rev-original')
    expect(res.modifiedFiles.length).toBe(0)
  })

  it('Probe 04a: command that does not run tests produces status "no_tests", not "passed"', async () => {
    const res = await runVerification({
      projectRoot: testDir,
      checkCommand: 'node -e "console.log(\'non-test command finished\')"',
      baseRevision: 'rev-test',
    })

    expect(res.exitCode).toBe(0)
    expect(res.status).toBe('no_tests')
    expect(res.testsSummary).toBeUndefined()
  })

  it('Probe 04b: TAP output with 1 pass and 2 fails correctly parses to total 3 (1 pass, 2 fail)', () => {
    const tapOutput = `
TAP version 13
# Subtest: test pass
ok 1 - test pass
# Subtest: test fail 1
not ok 2 - test fail 1
# Subtest: test fail 2
not ok 3 - test fail 2
# tests 3
# pass 1
# fail 2
# cancelled 0
# skipped 0
# todo 0
# duration_ms 55.12
`
    const summary = parseTestsSummary(tapOutput)
    expect(summary).toBeDefined()
    expect(summary?.passed).toBe(1)
    expect(summary?.failed).toBe(2)
    expect(summary?.total).toBe(3)
  })

  it('Probe 09: reviewProject generates real string revision hash and stores patch record', async () => {
    const code = `
export function login(username) {
  return queryUnsafe(\`SELECT * FROM users WHERE username = '\${username}'\`);
}
`
    writeFileSync(join(testDir, 'login.js'), code, 'utf8')

    const report = await reviewProject({ projectRoot: testDir, mode: 'rules' })
    expect(typeof report.revision).toBe('string')
    expect(report.revision.length).toBeGreaterThan(4)

    // Patches are recorded on the server
    expect(report.patches).toBeDefined()
    const patchKeys = Object.keys(report.patches || {})
    expect(patchKeys.length).toBeGreaterThan(0)

    const patch = report.patches![patchKeys[0]]
    expect(patch.files.length).toBe(1)
    expect(patch.files[0].diff).toContain('querySafe')
  })
})

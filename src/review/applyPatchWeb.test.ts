import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createPatch, applyPatch, getFindingPatch } from './patch.js'
import { reviewProject } from './engine.js'

describe('Web Fix & Patch Application', () => {
  const testDir = join(process.cwd(), 'temp_test_patch_web')

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true })
  })

  it('1. correctly identifies patchable vs non-patchable findings and applies patch to original file', async () => {
    const codeWithSqlInjection = `
export function getUser(username) {
  const query = queryUnsafe(\`SELECT * FROM users WHERE username = '\${username}'\`);
  return query;
}

export function cleanFunction() {
  return 42;
}
`
    const filePath = join(testDir, 'app.js')
    writeFileSync(filePath, codeWithSqlInjection, 'utf8')

    // Review the project
    const report = await reviewProject({ projectRoot: testDir, mode: 'rules' })
    expect(report.findings.length).toBeGreaterThan(0)

    const sqlFinding = report.findings.find((f) => f.ruleId === 'SEC_SQL_INJECTION')
    expect(sqlFinding).toBeDefined()
    expect(sqlFinding?.canPatch).toBe(true)
    expect(sqlFinding?.patchPreview).toBeDefined()
    expect(sqlFinding?.patchPreview?.diffText).toContain('querySafe')

    // Create patch and apply to original file
    const patch = createPatch(testDir, report.findings, report.revision, [sqlFinding!.id])
    expect(patch.files.length).toBe(1)

    const res = applyPatch(testDir, patch, report.revision, true)
    expect(res.success).toBe(true)

    // Check that original file on disk was genuinely modified
    const modifiedContent = readFileSync(filePath, 'utf8')
    expect(modifiedContent).toContain("querySafe('SELECT * FROM users WHERE username = $1', [username])")
    expect(modifiedContent).not.toContain('queryUnsafe')
  })

  it('2. returns null for clean functions and non-patchable findings so Apply Patch button is omitted', () => {
    const findingAdviceOnly: any = {
      id: 'finding-style-01',
      ruleId: 'COMPLEX_ARCHITECTURE_ADVICE',
      filePath: 'app.js',
      line: 10,
      evidence: 'function complex() {}',
      suggestion: 'Hãy tái cấu trúc hàm thành nhiều file nhỏ hơn.',
    }

    const patch = getFindingPatch(testDir, findingAdviceOnly)
    expect(patch).toBeNull()
  })

  it('3. applies multi-file patches without duplicating guard statements', async () => {
    const authCode = `
const { findUserByUsername } = require('./db.js');
async function authenticateUser(username, password) {
  const record = findUserByUsername(username);
  if (record.passwordHash === hashPassword(password)) {
    return { success: true, user: { id: record.id, username: record.username, role: record.role } };
  }
  return { success: false };
}
`
    const dbCode = `
function findUserByUsername(username) {
  const results = queryUnsafe(\`SELECT * FROM users WHERE username = '\${username}'\`);
  return results.length > 0 ? results[0] : null;
}
`
    writeFileSync(join(testDir, 'auth.js'), authCode, 'utf8')
    writeFileSync(join(testDir, 'db.js'), dbCode, 'utf8')

    const report = await reviewProject({ projectRoot: testDir, mode: 'rules' })
    const allFindingIds = report.findings.map((f) => f.id)
    const patch = createPatch(testDir, report.findings, report.revision, allFindingIds)

    expect(patch.files.length).toBe(2)
    const authFilePatch = patch.files.find((f) => f.filePath === 'auth.js')
    expect(authFilePatch).toBeDefined()

    // Ensure the guard statement is NOT duplicated 8 times
    const occurrences = (authFilePatch!.newContent!.match(/if \(!record\) return/g) || []).length
    expect(occurrences).toBe(1)

    const applyRes = applyPatch(testDir, patch, report.revision, true)
    expect(applyRes.success).toBe(true)

    // Re-review after applying patch should have 0 critical findings
    const reportAfter = await reviewProject({ projectRoot: testDir, mode: 'rules' })
    const criticals = reportAfter.findings.filter((f) => f.severity === 'critical')
    expect(criticals.length).toBe(0)
  })
})

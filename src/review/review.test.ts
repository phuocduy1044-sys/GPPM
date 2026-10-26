import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { reviewProject } from './engine.js';
import { createPatch, applyPatch } from './patch.js';
import { runVerification } from './verify.js';

describe('Review Engine Full Lifecycle', () => {
  const demoRoot = resolve('examples/demo-project');
  const dbPath = resolve(demoRoot, 'src/db.js');
  const authPath = resolve(demoRoot, 'src/auth.js');

  const origDb = readFileSync(dbPath, 'utf8');
  const origAuth = readFileSync(authPath, 'utf8');

  it('detects SQL injection and bug null dereference', async () => {
    const report = await reviewProject({ projectRoot: demoRoot, mode: 'rules' });

    expect(report.schemaVersion).toBe(1);
    expect(report.findings.length).toBeGreaterThanOrEqual(2);

    const sqlFinding = report.findings.find(f => f.ruleId === 'SEC_SQL_INJECTION');
    expect(sqlFinding).toBeDefined();
    expect(sqlFinding?.severity).toBe('critical');

    const nullFinding = report.findings.find(f => f.ruleId === 'BUG_POTENTIAL_NULL_DEREFERENCE');
    expect(nullFinding).toBeDefined();
    expect(nullFinding?.severity).toBe('high');

    // Test initially fails before patch
    const preVerify = await runVerification({
      projectRoot: demoRoot,
      checkCommand: 'npm test',
      baseRevision: report.revision,
    });
    expect(preVerify.status).toBe('failed');
    expect(preVerify.exitCode).not.toBe(0);

    // Create patch
    const patch = createPatch(demoRoot, report.findings, report.revision);
    expect(patch.files.length).toBeGreaterThanOrEqual(2);
    expect(patch.fullDiff).toContain('querySafe');

    // Apply patch
    const applyRes = applyPatch(demoRoot, patch, report.revision, true);
    expect(applyRes.success).toBe(true);

    try {
      // Test now passes after patch!
      const postVerify = await runVerification({
        projectRoot: demoRoot,
        checkCommand: 'npm test',
        baseRevision: applyRes.newRevision,
      });
      expect(postVerify.status).toBe('passed');
      expect(postVerify.exitCode).toBe(0);

      // Re-review: SQL injection finding should be gone
      const postReport = await reviewProject({ projectRoot: demoRoot, mode: 'rules' });
      const postSql = postReport.findings.find(f => f.ruleId === 'SEC_SQL_INJECTION');
      expect(postSql).toBeUndefined();
    } finally {
      // Restore original files for repeat testing
      writeFileSync(dbPath, origDb, 'utf8');
      writeFileSync(authPath, origAuth, 'utf8');
    }
  });

  it('detects hardcoded secret, loose equality, and var keyword', async () => {
    const { buildAstGraph } = await import('./ast.js');
    const { runRules } = await import('./rules.js');

    const sampleFiles = [
      {
        path: '/mock/app.js',
        absolutePath: '/mock/app.js',
        relativePath: 'src/app.js',
        size: 120,
        content: `
var apiKey = "sk_live_1234567890abcdef";
function verifyToken(userRole) {
  if (userRole == "admin") {
    eval("console.log('authorized')");
  }
}
`,
      },
    ];

    const ast = buildAstGraph(sampleFiles);
    const findings = runRules(sampleFiles, ast);

    const secretFind = findings.find(f => f.ruleId === 'SEC_HARDCODED_SECRET');
    expect(secretFind).toBeDefined();
    expect(secretFind?.severity).toBe('critical');

    const looseEqFind = findings.find(f => f.ruleId === 'BUG_LOOSE_EQUALITY');
    expect(looseEqFind).toBeDefined();
    expect(looseEqFind?.severity).toBe('medium');

    const varFind = findings.find(f => f.ruleId === 'STYLE_VAR_KEYWORD');
    expect(varFind).toBeDefined();
    expect(varFind?.severity).toBe('low');

    const evalFind = findings.find(f => f.ruleId === 'SEC_DANGEROUS_EVAL');
    expect(evalFind).toBeDefined();
  });
});

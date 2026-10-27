import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildAstGraph } from './ast.js';
import { reviewProject, clearReportCache } from './engine.js';
import type { ScannedFile } from './scanner.js';

describe('T06 AST Graph Engine, Type Resolution & Path Preservation', () => {
  let root: string;

  beforeEach(() => {
    clearReportCache();
    root = mkdtempSync(join(tmpdir(), 'viecodie-t06-'));
  });

  afterEach(() => {
    clearReportCache();
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  // ---------------------------------------------------------------------------
  // 1. Probe 08a: Import alias resolution
  // ---------------------------------------------------------------------------
  it('Probe 08a: resolves imported alias function call to canonical exported declaration', () => {
    const files: ScannedFile[] = [
      {
        relativePath: 'src/crypto.ts',
        absolutePath: join(root, 'src', 'crypto.ts'),
        size: 100,
        content: `export function hashPassword(raw: string) {
  return "hash_" + raw;
}`,
      },
      {
        relativePath: 'src/auth.ts',
        absolutePath: join(root, 'src', 'auth.ts'),
        size: 150,
        content: `import { hashPassword as computeSha } from './crypto.js';

export function registerUser(username: string, pass: string) {
  const secret = computeSha(pass);
  return { username, secret };
}`,
      },
    ];

    const result = buildAstGraph(files);

    const callerNode = result.nodes.find((n) => n.id === 'fn:src/auth.ts:registerUser');
    const targetNode = result.nodes.find((n) => n.id === 'fn:src/crypto.ts:hashPassword');

    expect(callerNode).toBeDefined();
    expect(targetNode).toBeDefined();

    // Verify edge connects registerUser -> hashPassword despite alias computeSha
    const callEdge = result.edges.find(
      (e) => e.type === 'call' && e.sourceId === callerNode?.id && e.targetId === targetNode?.id
    );
    expect(callEdge).toBeDefined();
    expect(callEdge?.resolved).toBe('resolved');

    // Verify callerIds and calleeIds
    expect(callerNode?.calleeIds).toContain(targetNode?.id);
    expect(targetNode?.callerIds).toContain(callerNode?.id);
  });

  // ---------------------------------------------------------------------------
  // 2. Probe 08b: Method call vs independent function disambiguation
  // ---------------------------------------------------------------------------
  it('Probe 08b: does NOT mistakenly connect object method call to unrelated global function', () => {
    const files: ScannedFile[] = [
      {
        relativePath: 'src/utils.ts',
        absolutePath: join(root, 'src', 'utils.ts'),
        size: 80,
        content: `export function validate() {
  return true;
}`,
      },
      {
        relativePath: 'src/service.ts',
        absolutePath: join(root, 'src', 'service.ts'),
        size: 120,
        content: `export function processPayment(paymentGateway: any) {
  // Method call on external object paymentGateway
  return paymentGateway.validate();
}`,
      },
    ];

    const result = buildAstGraph(files);

    const callerNode = result.nodes.find((n) => n.id === 'fn:src/service.ts:processPayment');
    const globalValidateNode = result.nodes.find((n) => n.id === 'fn:src/utils.ts:validate');

    expect(callerNode).toBeDefined();
    expect(globalValidateNode).toBeDefined();

    // Must NOT link paymentGateway.validate() to free-standing validate()
    const wrongEdge = result.edges.find(
      (e) => e.sourceId === callerNode?.id && e.targetId === globalValidateNode?.id
    );
    expect(wrongEdge).toBeUndefined();
    expect(callerNode?.calleeIds).not.toContain(globalValidateNode?.id);
  });

  // ---------------------------------------------------------------------------
  // 3. Probe 08c: Classes with identical method names produce unique node IDs
  // ---------------------------------------------------------------------------
  it('Probe 08c: disambiguates identical method names in different classes with qualified IDs', () => {
    const files: ScannedFile[] = [
      {
        relativePath: 'src/models.ts',
        absolutePath: join(root, 'src', 'models.ts'),
        size: 200,
        content: `export class Admin {
  delete(id: string) {
    return "admin delete " + id;
  }
}

export class Article {
  delete(id: string) {
    return "article delete " + id;
  }
}`,
      },
    ];

    const result = buildAstGraph(files);

    const adminDelete = result.nodes.find((n) => n.id === 'fn:src/models.ts:Admin.delete');
    const articleDelete = result.nodes.find((n) => n.id === 'fn:src/models.ts:Article.delete');

    expect(adminDelete).toBeDefined();
    expect(articleDelete).toBeDefined();
    expect(adminDelete?.id).not.toBe(articleDelete?.id);
    expect(adminDelete?.name).toBe('Admin.delete');
    expect(articleDelete?.name).toBe('Article.delete');
  });

  // ---------------------------------------------------------------------------
  // 4. Probe 09: Relative full path preservation (a/index.ts and b/index.ts)
  // ---------------------------------------------------------------------------
  it('Probe 09: preserves separate entries and contents for files sharing the same basename', async () => {
    mkdirSync(join(root, 'src', 'moduleA'), { recursive: true });
    mkdirSync(join(root, 'src', 'moduleB'), { recursive: true });

    writeFileSync(
      join(root, 'src', 'moduleA', 'index.ts'),
      'export function initA() { return "MODULE_A_CONTENT"; }\n',
      'utf8'
    );
    writeFileSync(
      join(root, 'src', 'moduleB', 'index.ts'),
      'export function initB() { return "MODULE_B_CONTENT"; }\n',
      'utf8'
    );

    const report = await reviewProject({ projectRoot: root, mode: 'rules' });

    // File nodes must have normalized full relative paths
    const fileNodeA = report.nodes.find((n) => n.id === 'file:src/moduleA/index.ts');
    const fileNodeB = report.nodes.find((n) => n.id === 'file:src/moduleB/index.ts');

    expect(fileNodeA).toBeDefined();
    expect(fileNodeB).toBeDefined();
    expect(fileNodeA?.filePath).toBe('src/moduleA/index.ts');
    expect(fileNodeB?.filePath).toBe('src/moduleB/index.ts');

    // Both files must exist in fileContents with their distinct contents
    expect(report.fileContents?.['src/moduleA/index.ts']).toContain('MODULE_A_CONTENT');
    expect(report.fileContents?.['src/moduleB/index.ts']).toContain('MODULE_B_CONTENT');
    expect(report.fileContents?.['src/moduleA/index.ts']).not.toBe(
      report.fileContents?.['src/moduleB/index.ts']
    );

    // ScanScope filesRead preserves full paths
    expect(report.scanScope.filesRead).toContain('src/moduleA/index.ts');
    expect(report.scanScope.filesRead).toContain('src/moduleB/index.ts');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  importTestBundle,
  computeTestsHash,
  listProjectTestFiles,
} from './testBundleService.js';
import { defaultRunnerService, discoverChecks } from './index.js';
import { reviewProject, clearReportCache, getCurrentReport } from '../review/engine.js';
import { createWebHandler } from '../web/server.js';
import { WebAgent } from '../web/session.js';
import { detectCheck, runCheck } from '../fix/run.js';

describe('T05 Test Bundle / Import Endpoints, Test Drawer & Runner Integration', () => {
  let root: string;

  beforeEach(() => {
    clearReportCache();
    root = mkdtempSync(join(tmpdir(), 'viecodie-t05-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(root, 'tests'), { recursive: true });

    // Dummy package.json
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify(
        {
          name: 'demo-t05',
          version: '1.0.0',
          scripts: {
            test: 'node --test',
          },
        },
        null,
        2
      ),
      'utf8'
    );

    // Dummy source file
    writeFileSync(
      join(root, 'src', 'math.js'),
      'export function add(a, b) { return a + b; }\n',
      'utf8'
    );
  });

  afterEach(() => {
    clearReportCache();
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  // ---------------------------------------------------------------------------
  // 1. Test Bundle Import & Containment
  // ---------------------------------------------------------------------------
  describe('Test Bundle Service (testBundleService.ts)', () => {
    it('imports test files safely into project root and computes testsHash', () => {
      const res = importTestBundle({
        projectRoot: root,
        testFiles: [
          {
            filePath: 'tests/math.test.js',
            content: 'import test from "node:test"; test("math add", () => {});',
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.importedFiles).toContain('tests/math.test.js');
      expect(res.testsHash).toBeDefined();
      expect(res.testsHash.length).toBe(64); // SHA-256

      // Verify file written to disk
      const content = readFileSync(join(root, 'tests', 'math.test.js'), 'utf8');
      expect(content).toContain('test("math add"');
    });

    it('rejects path traversal attempts outside projectRoot', () => {
      const res = importTestBundle({
        projectRoot: root,
        testFiles: [
          {
            filePath: '../malicious.test.js',
            content: '// evil',
          },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/không an toàn|vượt quá phạm vi/i);
    });

    it('rejects empty testFiles array or invalid path', () => {
      const res = importTestBundle({
        projectRoot: root,
        testFiles: [],
      });
      expect(res.success).toBe(false);

      const res2 = importTestBundle({
        projectRoot: root,
        testFiles: [{ filePath: '   ', content: '' }],
      });
      expect(res2.success).toBe(false);
    });

    it('honors overwrite=false flag when file already exists', () => {
      writeFileSync(join(root, 'tests', 'existing.test.js'), '// original', 'utf8');

      const res = importTestBundle({
        projectRoot: root,
        testFiles: [{ filePath: 'tests/existing.test.js', content: '// new' }],
        overwrite: false,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/đã tồn tại/i);
      expect(readFileSync(join(root, 'tests', 'existing.test.js'), 'utf8')).toBe('// original');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Test File Discovery & Cryptographic testsHash
  // ---------------------------------------------------------------------------
  describe('Test Discovery & testsHash Computation', () => {
    it('discovers all test files and ignores node_modules and .git', () => {
      writeFileSync(join(root, 'tests', 'a.test.js'), '// a', 'utf8');
      writeFileSync(join(root, 'src', 'b.spec.ts'), '// b', 'utf8');

      // Add a fake node_modules test file that must be ignored
      mkdirSync(join(root, 'node_modules', 'dep', 'tests'), { recursive: true });
      writeFileSync(join(root, 'node_modules', 'dep', 'tests', 'dep.test.js'), '// dep', 'utf8');

      const found = listProjectTestFiles(root);
      expect(found).toContain('tests/a.test.js');
      expect(found).toContain('src/b.spec.ts');
      expect(found.some((p) => p.includes('node_modules'))).toBe(false);
    });

    it('computes deterministic testsHash and detects modifications', () => {
      writeFileSync(join(root, 'tests', 'calc.test.js'), '// version 1', 'utf8');
      const hash1 = computeTestsHash(root);
      const hash2 = computeTestsHash(root);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);

      // Modify the file
      writeFileSync(join(root, 'tests', 'calc.test.js'), '// version 2 modified', 'utf8');
      const hash3 = computeTestsHash(root);
      expect(hash3).not.toBe(hash1);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Web API Endpoints (/api/review/tests, /api/review/tests/import, /api/review/tests/run)
  // ---------------------------------------------------------------------------
  describe('Web API Test Endpoints', () => {
    it('GET /api/review/tests returns discovered tests and suggested commands', async () => {
      writeFileSync(join(root, 'tests', 'sample.test.js'), '// sample', 'utf8');

      const agent = new WebAgent(root);
      const token = 'token-t05-tests';
      const handler = createWebHandler(agent, token);

      let statusCode = 0;
      let bodyData = '';
      const mockRes = () => ({
        writeHead: (s: number) => { statusCode = s; },
        setHeader: () => {},
        end: (d: string) => { bodyData = d; },
      });

      const req: any = {
        method: 'GET',
        url: '/api/review/tests',
        headers: { host: 'localhost', 'x-viecodie-token': token },
      };

      await handler(req, mockRes() as any);
      expect(statusCode).toBe(200);

      const parsed = JSON.parse(bodyData);
      expect(parsed.testFiles).toContain('tests/sample.test.js');
      expect(parsed.testsHash).toBeDefined();
      expect(parsed.testsHash.length).toBe(64);
      expect(parsed.hasTests).toBe(true);
      expect(parsed.suggestedCommands.length).toBeGreaterThan(0);
    });

    it('POST /api/review/tests/import imports test bundle and updates session report', async () => {
      const agent = new WebAgent(root);
      const token = 'token-t05-import';
      const handler = createWebHandler(agent, token);

      // Initialize report for session
      await reviewProject({ projectRoot: root, mode: 'rules', sessionId: 'sess-import' });

      let statusCode = 0;
      let bodyData = '';
      const mockRes = () => ({
        writeHead: (s: number) => { statusCode = s; },
        setHeader: () => {},
        end: (d: string) => { bodyData = d; },
      });

      const importReq: any = {
        method: 'POST',
        url: '/api/review/tests/import?session=sess-import',
        headers: { host: 'localhost', 'x-viecodie-token': token },
        on: (event: string, cb: any) => {
          if (event === 'data') {
            cb(
              Buffer.from(
                JSON.stringify({
                  testFiles: [
                    {
                      filePath: 'tests/imported.test.js',
                      content: 'console.log("imported test");',
                    },
                  ],
                })
              )
            );
          }
          if (event === 'end') cb();
        },
      };

      await handler(importReq, mockRes() as any);
      expect(statusCode).toBe(200);

      const parsed = JSON.parse(bodyData);
      expect(parsed.success).toBe(true);
      expect(parsed.importedFiles).toContain('tests/imported.test.js');
      expect(parsed.testsHash).toBeDefined();

      // Verify file on disk
      expect(readFileSync(join(root, 'tests', 'imported.test.js'), 'utf8')).toContain('imported test');

      // Verify report updated with testsHash
      const rep = getCurrentReport('sess-import');
      expect(rep?.testsHash).toBe(parsed.testsHash);
    });

    it('POST /api/review/tests/run runs test check and records structured verification', async () => {
      const agent = new WebAgent(root);
      const token = 'token-t05-run';
      const handler = createWebHandler(agent, token);

      await reviewProject({ projectRoot: root, mode: 'rules', sessionId: 'sess-run' });

      let statusCode = 0;
      let bodyData = '';
      const mockRes = () => ({
        writeHead: (s: number) => { statusCode = s; },
        setHeader: () => {},
        end: (d: string) => { bodyData = d; },
      });

      const runReq: any = {
        method: 'POST',
        url: '/api/review/tests/run?session=sess-run',
        headers: { host: 'localhost', 'x-viecodie-token': token },
        on: (event: string, cb: any) => {
          if (event === 'data') {
            cb(Buffer.from(JSON.stringify({ command: 'node -e "process.exit(0)"' })));
          }
          if (event === 'end') cb();
        },
      };

      await handler(runReq, mockRes() as any);
      expect(statusCode).toBe(200);

      const parsed = JSON.parse(bodyData);
      expect(parsed.success).toBe(true);
      expect(parsed.result).toBeDefined();
      expect(parsed.result.status).toBe('passed');
      expect(parsed.result.exitCode).toBe(0);
      expect(parsed.result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Fix Loop Integration with Unified Runner
  // ---------------------------------------------------------------------------
  describe('Fix Loop & Runner Service Connection', () => {
    it('detectCheck leverages unified runner discovery without executing code', () => {
      const cmd = detectCheck(root);
      expect(cmd).toBe('npm test');
    });

    it('runCheck executes command via RunnerService and captures duration and status', async () => {
      const res = await runCheck('node -e "console.log(\'fix runner check\')"', root, 10);
      expect(res.exitCode).toBe(0);
      expect(res.output).toContain('fix runner check');
      expect(res.timedOut).toBe(false);
      expect(res.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});

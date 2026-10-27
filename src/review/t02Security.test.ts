import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { createServer, type Server } from 'http';
import { confineToRoot, isPathContained, isUnder } from '../tools/paths.js';
import { scanProject } from './scanner.js';
import { scrubSecrets } from './scrub.js';
import { sanitizeLog } from './verify.js';
import { reviewProject, getCurrentReport, clearReportCache, computeProjectId } from './engine.js';
import { createWebHandler } from '../web/server.js';
import { WebAgent } from '../web/session.js';

describe('T02 Security & Isolation Test Suite', () => {
  const baseDir = mkdtempSync(join(tmpdir(), 'viecodie-t02-'));
  const projectDir = join(baseDir, 'project');
  const siblingDir = join(baseDir, 'project-sibling');
  const outsideSecretDir = join(baseDir, 'outside-secret');

  const canSymlink = (() => {
    try {
      const src = join(baseDir, 'probe-src.txt');
      const dst = join(baseDir, 'probe-dst.txt');
      writeFileSync(src, 'test');
      symlinkSync(src, dst);
      rmSync(dst, { force: true });
      rmSync(src, { force: true });
      return true;
    } catch {
      return false;
    }
  })();

  beforeEach(() => {
    clearReportCache();
    mkdirSync(join(projectDir, 'src'), { recursive: true });
    mkdirSync(siblingDir, { recursive: true });
    mkdirSync(outsideSecretDir, { recursive: true });

    writeFileSync(join(projectDir, 'src', 'index.js'), 'export function hello() { return "world"; }\n');
    writeFileSync(join(siblingDir, 'public-dummy.js'), 'const SIBLING_MARKER = "LEAKED_SIBLING_DATA";\n');
    writeFileSync(join(outsideSecretDir, 'credentials.env'), 'DB_PASSWORD=SuperSecretPass123\n');
  });

  afterEach(() => {
    clearReportCache();
    try {
      rmSync(baseDir, { recursive: true, force: true });
    } catch {}
  });

  // -------------------------------------------------------------
  // 1. Probe 05: Path Containment & Traversal Prevention
  // -------------------------------------------------------------
  describe('Probe 05: Path containment & Traversal protection', () => {
    it('isUnder correctly rejects sibling directories that share a prefix', () => {
      expect(isUnder(projectDir, siblingDir)).toBe(false);
      expect(isUnder(projectDir, join(siblingDir, 'public-dummy.js'))).toBe(false);
      expect(isUnder(projectDir, join(projectDir, 'src', 'index.js'))).toBe(true);
    });

    it('confineToRoot rejects .. directory traversal to sibling folder', () => {
      expect(() => confineToRoot('../project-sibling/public-dummy.js', projectDir)).toThrow(/outside the project directory/);
      expect(isPathContained('../project-sibling/public-dummy.js', projectDir)).toBe(false);
    });

    it('confineToRoot allows valid internal paths', () => {
      const resolved = confineToRoot('src/index.js', projectDir);
      expect(resolved).toBe(resolve(projectDir, 'src', 'index.js'));
      expect(isPathContained('src/index.js', projectDir)).toBe(true);
    });

    it('Web API /api/review/source returns 403 on sibling path traversal probe', async () => {
      const agent = new WebAgent(projectDir);
      const token = 'test-token-123456';
      const handler = createWebHandler(agent, token);

      // Initialize report on projectDir
      await reviewProject({ projectRoot: projectDir, mode: 'rules', sessionId: 'sess-p05' });

      // Probe: attempt reading ../project-sibling/public-dummy.js
      const req: any = {
        method: 'GET',
        url: '/api/review/source?path=../project-sibling/public-dummy.js&session=sess-p05',
        headers: {
          host: 'localhost',
          'x-viecodie-token': token,
        },
      };

      let statusCode = 0;
      let bodyData = '';
      const res: any = {
        writeHead: (status: number) => { statusCode = status; },
        setHeader: () => {},
        end: (data: string) => { bodyData = data; },
      };

      await handler(req, res);
      expect(statusCode).toBe(403);
      expect(bodyData).toContain('Truy cập ngoài phạm vi thư mục dự án bị từ chối');
    });

    it('Web API /api/review/source allows reading safe internal source file', async () => {
      const agent = new WebAgent(projectDir);
      const token = 'test-token-123456';
      const handler = createWebHandler(agent, token);

      await reviewProject({ projectRoot: projectDir, mode: 'rules', sessionId: 'sess-safe' });

      const req: any = {
        method: 'GET',
        url: '/api/review/source?path=src/index.js&session=sess-safe',
        headers: {
          host: 'localhost',
          'x-viecodie-token': token,
        },
      };

      let statusCode = 0;
      let bodyData = '';
      const res: any = {
        writeHead: (status: number) => { statusCode = status; },
        setHeader: () => {},
        end: (data: string) => { bodyData = data; },
      };

      await handler(req, res);
      expect(statusCode).toBe(200);
      const parsed = JSON.parse(bodyData);
      expect(parsed.content).toContain('export function hello()');
    });
  });

  // -------------------------------------------------------------
  // 2. Probe 06a: Scanner Symlink / Junction Containment
  // -------------------------------------------------------------
  describe('Probe 06a: Scanner symlink containment', () => {
    it.skipIf(!canSymlink)('scanner skips symlinks pointing outside the project root', () => {
      const symlinkFile = join(projectDir, 'src', 'leaked-sibling.js');
      symlinkSync(join(siblingDir, 'public-dummy.js'), symlinkFile);

      const result = scanProject(projectDir);

      // The symlinked file outside must NOT be included in scanned files
      const found = result.files.find(f => f.relativePath.includes('leaked-sibling.js'));
      expect(found).toBeUndefined();

      // Must be recorded in filesIgnored
      const ignoredEntry = result.scope.filesIgnored.find(p => p.includes('leaked-sibling.js'));
      expect(ignoredEntry).toBeDefined();
      if (ignoredEntry) {
        expect(result.scope.ignoreReasons[ignoredEntry]).toContain('outside project root');
      }
    });

    it.skipIf(!canSymlink)('scanner skips directory symlinks pointing outside the project root', () => {
      const symlinkSubdir = join(projectDir, 'outside-folder');
      symlinkSync(outsideSecretDir, symlinkSubdir);

      const result = scanProject(projectDir);
      const found = result.files.find(f => f.relativePath.includes('outside-folder'));
      expect(found).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // 3. Probe 06b: Server Session Security & Static GET Cookie Isolation
  // -------------------------------------------------------------
  describe('Probe 06b: Static GET unauthenticated cookie isolation', () => {
    it('unauthenticated static GET does NOT issue viecodie-session cookie with token', async () => {
      const agent = new WebAgent(projectDir);
      const token = 'secret-master-token-xyz';
      const handler = createWebHandler(agent, token);

      let cookieSet = '';
      const req: any = {
        method: 'GET',
        url: '/',
        headers: { host: 'localhost' },
      };
      const res: any = {
        writeHead: () => {},
        setHeader: (key: string, val: string) => {
          if (key.toLowerCase() === 'set-cookie') cookieSet = val;
        },
        end: () => {},
      };

      await handler(req, res);
      // Unauthenticated visitor must NOT be handed the token cookie
      expect(cookieSet).toBe('');
    });

    it('unauthenticated request to /api/health is rejected with 401', async () => {
      const agent = new WebAgent(projectDir);
      const token = 'secret-master-token-xyz';
      const handler = createWebHandler(agent, token);

      let statusCode = 0;
      let bodyData = '';
      const req: any = {
        method: 'GET',
        url: '/api/health',
        headers: { host: 'localhost' },
      };
      const res: any = {
        writeHead: (s: number) => { statusCode = s; },
        setHeader: () => {},
        end: (data: string) => { bodyData = data; },
      };

      await handler(req, res);
      expect(statusCode).toBe(401);
      expect(bodyData).toContain('missing or wrong token');
    });

    it('authenticated static GET (?token=...) receives the session cookie', async () => {
      const agent = new WebAgent(projectDir);
      const token = 'secret-master-token-xyz';
      const handler = createWebHandler(agent, token);

      let cookieSet = '';
      const req: any = {
        method: 'GET',
        url: `/?token=${token}`,
        headers: { host: 'localhost' },
      };
      const res: any = {
        writeHead: () => {},
        setHeader: (key: string, val: string) => {
          if (key.toLowerCase() === 'set-cookie') cookieSet = val;
        },
        end: () => {},
      };

      await handler(req, res);
      expect(cookieSet).toContain(`viecodie-session=${token}`);
    });
  });

  // -------------------------------------------------------------
  // 4. Project & Session Identity & Cache Isolation
  // -------------------------------------------------------------
  describe('Project/Session Identity & Isolated Cache', () => {
    it('generates distinct projectId for different project paths', () => {
      const p1 = computeProjectId(projectDir);
      const p2 = computeProjectId(siblingDir);
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      expect(p1).not.toBe(p2);
    });

    it('reviewProject stores projectId on report and isolates cache', async () => {
      const report = await reviewProject({ projectRoot: projectDir, mode: 'rules' });
      expect(report.projectId).toBe(computeProjectId(projectDir));

      // Querying cache for projectDir returns report
      const cached = getCurrentReport(undefined, projectDir);
      expect(cached).toBeDefined();
      expect(cached?.projectId).toBe(report.projectId);

      // Querying cache for siblingDir does not leak projectDir report
      const siblingCached = getCurrentReport(undefined, siblingDir);
      expect(siblingCached).toBeNull();
    });

    it('multi-session review keeps session reports strictly isolated', async () => {
      const repA = await reviewProject({ projectRoot: projectDir, mode: 'rules', sessionId: 'sess-alpha' });
      const repB = await reviewProject({ projectRoot: siblingDir, mode: 'rules', sessionId: 'sess-beta' });

      const fromA = getCurrentReport('sess-alpha');
      const fromB = getCurrentReport('sess-beta');

      expect(fromA?.projectId).toBe(computeProjectId(projectDir));
      expect(fromB?.projectId).toBe(computeProjectId(siblingDir));
      expect(fromA?.sessionId).toBe('sess-alpha');
      expect(fromB?.sessionId).toBe('sess-beta');
    });
  });

  // -------------------------------------------------------------
  // 5. Secret Scrubbing
  // -------------------------------------------------------------
  describe('Secret Scrubbing (scrubSecrets)', () => {
    it('redacts OpenAI and Anthropic API keys', () => {
      const raw = 'const key = "sk-proj-abc12345678901234567890"; const ant = "sk-ant-api03-abcdef1234567890abcdef";';
      const clean = scrubSecrets(raw);
      expect(clean).not.toContain('sk-proj-');
      expect(clean).not.toContain('sk-ant-');
      expect(clean).toContain('[REDACTED_API_KEY]');
    });

    it('redacts GitHub tokens and AWS keys', () => {
      const raw = 'export GITHUB_TOKEN="ghp_123456789012345678901234567890123456"; export AWS="AKIAIOSFODNN7EXAMPLE";';
      const clean = scrubSecrets(raw);
      expect(clean).not.toContain('ghp_');
      expect(clean).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(clean).toContain('[REDACTED_GITHUB_TOKEN]');
      expect(clean).toContain('[REDACTED_AWS_KEY]');
    });

    it('redacts private keys and certificates', () => {
      const pem = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y1+examplePrivateDataKey1234567890==
-----END RSA PRIVATE KEY-----`;
      const clean = scrubSecrets(pem);
      expect(clean).not.toContain('MIIEowIBAAKCAQEA');
      expect(clean).toContain('[REDACTED_PRIVATE_KEY]');
    });

    it('redacts passwords in database connection URIs', () => {
      const uri = 'postgres://postgres:SuperSecretP@ssword@localhost:5432/production_db';
      const clean = scrubSecrets(uri);
      expect(clean).not.toContain('SuperSecretP@ssword');
      expect(clean).toBe('postgres://postgres:[REDACTED_PASSWORD]@localhost:5432/production_db');
    });

    it('sanitizeLog in verify.ts cleans leaked secrets from test logs', () => {
      const log = 'Error: connection failed with key sk-proj-1234567890abcdef123456 and token="ghp_098765432109876543210987654321098765"';
      const clean = sanitizeLog(log);
      expect(clean).not.toContain('sk-proj-');
      expect(clean).not.toContain('ghp_');
      expect(clean).toContain('[REDACTED');
    });
  });
});

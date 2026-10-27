import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  createProjectSnapshot,
  restoreProjectSnapshot,
  clearSnapshots,
} from './snapshotService.js';
import {
  computePatchHash,
  generateCandidates,
} from './candidateService.js';
import {
  applyPatchWithSnapshot,
  undoApplyWithSnapshot,
} from './applyService.js';
import { reviewProject, getCurrentReport, clearReportCache } from './engine.js';
import { createWebHandler } from '../web/server.js';
import { WebAgent } from '../web/session.js';
import type { Patch } from './types.js';

describe('T04 Snapshot, Candidate, Patch, Apply & Undo Services', () => {
  let root: string;
  let srcFile: string;

  beforeEach(() => {
    clearReportCache();
    clearSnapshots();
    root = mkdtempSync(join(tmpdir(), 'viecodie-t04-'));
    mkdirSync(join(root, 'src'), { recursive: true });

    srcFile = join(root, 'src', 'db.js');
    writeFileSync(
      srcFile,
      'function queryUnsafe(sql) { return sql; }\nexport function findUser(username) {\n  return queryUnsafe(`SELECT * FROM users WHERE username = \'${username}\'`);\n}\n',
      'utf8'
    );
  });

  afterEach(() => {
    clearReportCache();
    clearSnapshots();
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  // ---------------------------------------------------------------------------
  // 1. Snapshot Service
  // ---------------------------------------------------------------------------
  describe('Snapshot Service (snapshotService.ts)', () => {
    it('creates immutable snapshot with sourceHash and captures file contents', () => {
      const snap = createProjectSnapshot(root, ['src/db.js']);
      expect(snap.snapshotId).toMatch(/^snap-/);
      expect(snap.sourceHash).toBeDefined();
      expect(snap.files['src/db.js']).toContain('SELECT * FROM users');
    });

    it('restores project file byte-for-byte from snapshot', () => {
      const originalContent = readFileSync(srcFile, 'utf8');
      const snap = createProjectSnapshot(root, ['src/db.js']);

      // Modify the file
      writeFileSync(srcFile, '// MODIFIED CONTENT BY AN EXTERNAL SCRIPT', 'utf8');
      expect(readFileSync(srcFile, 'utf8')).not.toBe(originalContent);

      // Restore from snapshot
      const { restoredFiles, restoredRevision } = restoreProjectSnapshot(root, snap.snapshotId);
      expect(restoredFiles).toContain('src/db.js');
      expect(restoredRevision).toBeDefined();
      expect(readFileSync(srcFile, 'utf8')).toBe(originalContent);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Candidate Service & Patch Hash
  // ---------------------------------------------------------------------------
  describe('Candidate Service & Cryptographic Hashes', () => {
    it('computes deterministic cryptographic patchHash', () => {
      const patchA: Patch = {
        id: 'patch-1',
        findingIds: ['f-1'],
        reviewId: 'rev-1',
        baseRevision: 'base-1',
        newRevision: 'rev-2',
        createdAt: new Date().toISOString(),
        files: [
          {
            filePath: 'src/db.js',
            oldHash: 'h1',
            newHash: 'h2',
            diff: '--- a/src/db.js\n+++ b/src/db.js\n- bad\n+ good\n',
          },
        ],
        fullDiff: '--- a/src/db.js\n+++ b/src/db.js\n- bad\n+ good\n',
        status: 'proposed',
      };

      const hash1 = computePatchHash(patchA);
      const hash2 = computePatchHash(patchA);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256
    });

    it('generates candidates record linking findings and patches', async () => {
      const report = await reviewProject({ projectRoot: root, mode: 'rules' });
      expect(report.candidates).toBeDefined();
      const candidateList = Object.values(report.candidates || {});
      if (candidateList.length > 0) {
        const first = candidateList[0];
        expect(first.candidateId).toMatch(/^cand-/);
        expect(first.patchHash).toBeDefined();
        expect(first.status).toBe('proposed');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Apply & Undo Service with Snapshot Ledger
  // ---------------------------------------------------------------------------
  describe('Apply & Undo Service with Immutable Snapshot Ledger', () => {
    it('applies patch, records ApplyRecord, and updates report revision', async () => {
      const reportBefore = await reviewProject({ projectRoot: root, mode: 'rules', sessionId: 'sess-t04' });
      const sqlFinding = reportBefore.findings.find((f) => f.ruleId === 'SEC_SQL_INJECTION');
      expect(sqlFinding).toBeDefined();
      expect(sqlFinding?.patchId).toBeDefined();

      const patch = reportBefore.patches?.[sqlFinding!.patchId!];
      expect(patch).toBeDefined();

      const applyRes = await applyPatchWithSnapshot({
        projectRoot: root,
        patch: patch!,
        baseRevision: reportBefore.revision,
        confirm: true,
        sessionId: 'sess-t04',
      });

      expect(applyRes.success).toBe(true);
      expect(applyRes.status).toBe('applied');
      expect(applyRes.record).toBeDefined();
      expect(applyRes.record?.snapshotBeforeId).toMatch(/^snap-/);
      expect(applyRes.record?.snapshotAfterId).toMatch(/^snap-/);
      expect(applyRes.record?.patchHash).toBeDefined();
      expect(applyRes.record?.status).toBe('applied');

      // Verify file modified on disk
      const modifiedContent = readFileSync(srcFile, 'utf8');
      expect(modifiedContent).not.toContain('return queryUnsafe');
      expect(modifiedContent).toContain('return querySafe');

      // Verify report updated with apply history
      const current = getCurrentReport('sess-t04');
      expect(current?.applyHistory?.length).toBe(1);
      expect(current?.applyHistory?.[0].patchId).toBe(patch!.id);
    });

    it('undoes applied patch, restores original content and baseRevision, records UndoRecord', async () => {
      const originalCode = readFileSync(srcFile, 'utf8');
      const reportBefore = await reviewProject({ projectRoot: root, mode: 'rules', sessionId: 'sess-undo' });
      const sqlFinding = reportBefore.findings.find((f) => f.ruleId === 'SEC_SQL_INJECTION');
      const patch = reportBefore.patches?.[sqlFinding!.patchId!];

      // Step 1: Apply
      const applyRes = await applyPatchWithSnapshot({
        projectRoot: root,
        patch: patch!,
        baseRevision: reportBefore.revision,
        confirm: true,
        sessionId: 'sess-undo',
      });
      expect(applyRes.success).toBe(true);
      expect(readFileSync(srcFile, 'utf8')).not.toBe(originalCode);

      // Step 2: Undo
      const undoRes = await undoApplyWithSnapshot({
        projectRoot: root,
        sessionId: 'sess-undo',
        confirm: true,
      });

      expect(undoRes.success).toBe(true);
      expect(undoRes.status).toBe('undone');
      expect(undoRes.restoredFiles).toContain('src/db.js');

      // Verify file on disk restored exactly byte-for-byte
      expect(readFileSync(srcFile, 'utf8')).toBe(originalCode);

      // Verify revision restored
      expect(undoRes.restoredRevision).toBe(reportBefore.revision);

      // Verify history ledger updated
      const current = getCurrentReport('sess-undo');
      expect(current?.applyHistory?.[0].status).toBe('undone');
      expect(current?.undoHistory?.length).toBe(1);
      expect(current?.undoHistory?.[0].applyRecordId).toBe(applyRes.record?.recordId);

      // Step 3: Attempting to undo again returns no_changes
      const secondUndo = await undoApplyWithSnapshot({
        projectRoot: root,
        sessionId: 'sess-undo',
        confirm: true,
      });
      expect(secondUndo.success).toBe(false);
      expect(secondUndo.status).toBe('no_changes');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Web API Endpoints (/api/review/apply, /api/review/undo, /api/review/history)
  // ---------------------------------------------------------------------------
  describe('Web API Endpoints Integration', () => {
    it('POST /api/review/undo reverts applied patch via web API', async () => {
      const agent = new WebAgent(root);
      const token = 'test-token-t04';
      const handler = createWebHandler(agent, token);

      const report = await reviewProject({ projectRoot: root, mode: 'rules', sessionId: 'sess-api' });
      const finding = report.findings[0];
      const patch = report.patches?.[finding.patchId!];

      // 1. Apply via API
      let statusCode = 0;
      let bodyData = '';
      const mockRes = () => ({
        writeHead: (s: number) => { statusCode = s; },
        setHeader: () => {},
        end: (d: string) => { bodyData = d; },
      });

      const applyReq: any = {
        method: 'POST',
        url: '/api/review/apply?session=sess-api',
        headers: { host: 'localhost', 'x-viecodie-token': token },
        on: (event: string, cb: any) => {
          if (event === 'data') cb(Buffer.from(JSON.stringify({ patchId: patch!.id, confirm: true })));
          if (event === 'end') cb();
        },
      };

      await handler(applyReq, mockRes() as any);
      expect(statusCode).toBe(200);

      // 2. Undo via API
      const undoReq: any = {
        method: 'POST',
        url: '/api/review/undo?session=sess-api',
        headers: { host: 'localhost', 'x-viecodie-token': token },
        on: (event: string, cb: any) => {
          if (event === 'data') cb(Buffer.from(JSON.stringify({ confirm: true })));
          if (event === 'end') cb();
        },
      };

      await handler(undoReq, mockRes() as any);
      expect(statusCode).toBe(200);
      const parsed = JSON.parse(bodyData);
      expect(parsed.success).toBe(true);
      expect(parsed.status).toBe('undone');
      expect(parsed.restoredFiles).toContain('src/db.js');

      // 3. GET /api/review/history returns history
      const histReq: any = {
        method: 'GET',
        url: '/api/review/history?session=sess-api',
        headers: { host: 'localhost', 'x-viecodie-token': token },
      };
      await handler(histReq, mockRes() as any);
      expect(statusCode).toBe(200);
      const hist = JSON.parse(bodyData);
      expect(hist.applyHistory.length).toBeGreaterThan(0);
      expect(hist.undoHistory.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Contract v2 Fields & Metadata
  // ---------------------------------------------------------------------------
  describe('Contract v2 Fields & Metadata', () => {
    it('reviewProject includes sourceHash, runtimeFingerprint, and candidates', async () => {
      const rep = await reviewProject({ projectRoot: root, mode: 'rules' });
      expect(rep.sourceHash).toBeDefined();
      expect(rep.sourceHash?.length).toBe(64);
      expect(rep.runtimeFingerprint).toBeDefined();
      expect(rep.runtimeFingerprint?.platform).toBe(process.platform);
      expect(rep.runtimeFingerprint?.nodeVersion).toBe(process.version);
      expect(rep.candidates).toBeDefined();
    });
  });
});

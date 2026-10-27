import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { selectGraphContext, validateAiFinding } from './contextSelector.js';
import { runAiEnhancement } from './ai.js';
import { reviewProject, clearReportCache } from './engine.js';
import type { ScannedFile } from './scanner.js';
import type { GraphNode, GraphEdge, Finding } from './types.js';

describe('T07 — Call Graph Context Selector, Finding Validator, Token Accounting & Cancellation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'viecodie-t07-'));
    clearReportCache();
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    clearReportCache();
  });

  it('Probe 10 Elimination: selectGraphContext prioritizes seed findings and caller/callee neighborhood over blind first 10 files', () => {
    // Construct 15 dummy files
    const files: ScannedFile[] = [];
    for (let i = 0; i < 12; i++) {
      files.push({
        absolutePath: join(tempDir, `src/dummy${i}.ts`),
        relativePath: `src/dummy${i}.ts`,
        content: `export function dummy${i}() { return ${i}; }\n`,
        size: 50,
      });
    }

    // Critical files located AFTER dummy files
    const tokenServiceFile: ScannedFile = {
      absolutePath: join(tempDir, 'src/auth/tokenService.ts'),
      relativePath: 'src/auth/tokenService.ts',
      content: `import { queryUser } from '../db/userRepo.js';\nexport function verifyToken(rawToken: string) {\n  const user = queryUser(rawToken);\n  return user;\n}\n`,
      size: 150,
    };
    const loginRouteFile: ScannedFile = {
      absolutePath: join(tempDir, 'src/api/loginRoute.ts'),
      relativePath: 'src/api/loginRoute.ts',
      content: `import { verifyToken } from '../auth/tokenService.js';\nexport function handleLogin(req: any) {\n  return verifyToken(req.token);\n}\n`,
      size: 140,
    };
    const userRepoFile: ScannedFile = {
      absolutePath: join(tempDir, 'src/db/userRepo.ts'),
      relativePath: 'src/db/userRepo.ts',
      content: `export function queryUser(id: string) {\n  return { id, role: 'admin' };\n}\n`,
      size: 80,
    };

    files.push(tokenServiceFile, loginRouteFile, userRepoFile);

    // Graph nodes
    const nodes: GraphNode[] = [
      {
        id: 'fn:src/auth/tokenService.ts:verifyToken',
        type: 'function',
        name: 'verifyToken',
        filePath: 'src/auth/tokenService.ts',
        startLine: 2,
        endLine: 5,
        callerIds: ['fn:src/api/loginRoute.ts:handleLogin'],
        calleeIds: ['fn:src/db/userRepo.ts:queryUser'],
      },
      {
        id: 'fn:src/api/loginRoute.ts:handleLogin',
        type: 'function',
        name: 'handleLogin',
        filePath: 'src/api/loginRoute.ts',
        startLine: 2,
        endLine: 4,
        callerIds: [],
        calleeIds: ['fn:src/auth/tokenService.ts:verifyToken'],
      },
      {
        id: 'fn:src/db/userRepo.ts:queryUser',
        type: 'function',
        name: 'queryUser',
        filePath: 'src/db/userRepo.ts',
        startLine: 1,
        endLine: 3,
        callerIds: ['fn:src/auth/tokenService.ts:verifyToken'],
        calleeIds: [],
      },
    ];

    const edges: GraphEdge[] = [
      {
        id: 'edge:login->verify',
        sourceId: 'fn:src/api/loginRoute.ts:handleLogin',
        targetId: 'fn:src/auth/tokenService.ts:verifyToken',
        type: 'call',
        evidenceLine: 3,
        evidenceSnippet: 'verifyToken(req.token)',
        resolved: 'resolved',
      },
      {
        id: 'edge:verify->query',
        sourceId: 'fn:src/auth/tokenService.ts:verifyToken',
        targetId: 'fn:src/db/userRepo.ts:queryUser',
        type: 'call',
        evidenceLine: 3,
        evidenceSnippet: 'queryUser(rawToken)',
        resolved: 'resolved',
      },
    ];

    // Finding located on tokenService.ts line 3
    const ruleFindings: Finding[] = [
      {
        id: 'find-sec-01',
        ruleId: 'SEC_SQL_INJECTION',
        category: 'security',
        severity: 'critical',
        title: 'SQL Injection in verifyToken',
        filePath: 'src/auth/tokenService.ts',
        line: 3,
        evidence: 'const user = queryUser(rawToken);',
        explanation: 'Untrusted input reaches database sink.',
        suggestion: 'Sanitize token before querying.',
        source: 'rule',
        confidence: 'high',
      },
    ];

    // Select context with limited token budget (e.g. 500 tokens ~ 2000 chars)
    const result = selectGraphContext({
      files,
      nodes,
      edges,
      ruleFindings,
      maxTokens: 500,
    });

    // Verify Probe 10 is eliminated:
    // 1. The seed node and its connected 1-hop caller and callee MUST be selected!
    expect(result.selectedNodes).toContain('fn:src/auth/tokenService.ts:verifyToken');
    expect(result.selectedNodes).toContain('fn:src/api/loginRoute.ts:handleLogin');
    expect(result.selectedNodes).toContain('fn:src/db/userRepo.ts:queryUser');

    // 2. The files containing the vulnerability and its caller/callee MUST be selected!
    expect(result.selectedFiles).toContain('src/auth/tokenService.ts');
    expect(result.selectedFiles).toContain('src/api/loginRoute.ts');
    expect(result.selectedFiles).toContain('src/db/userRepo.ts');

    // 3. Unrelated dummy files at the beginning of the files array were NOT given priority over graph nodes
    expect(result.seedNodesCount).toBe(1);
    expect(result.neighborNodesCount).toBe(2);
    expect(result.topologySummary).toContain('[TARGET SEED] fn:src/auth/tokenService.ts:verifyToken');
    expect(result.topologySummary).toContain('<- Inbound Callers: fn:src/api/loginRoute.ts:handleLogin');
    expect(result.topologySummary).toContain('-> Outbound Callees: fn:src/db/userRepo.ts:queryUser');
    expect(result.formattedContext).toContain('--- [SEED FUNCTION - VULNERABILITY LOCATION]');
    expect(result.formattedContext).toContain('--- [INBOUND CALLER - UPSTREAM ENTRY/EXECUTION]');
    expect(result.formattedContext).toContain('--- [OUTBOUND CALLEE - DOWNSTREAM DEPENDENCY/SINK]');
  });

  it('selectGraphContext scrubs secrets from selected code snippets and user requirements', () => {
    const rawApiKey = 'sk-ant-api03-secret12345678901234567890';
    const files: ScannedFile[] = [
      {
        absolutePath: join(tempDir, 'src/config.ts'),
        relativePath: 'src/config.ts',
        content: `export const API_KEY = "${rawApiKey}";\nexport function getKey() { return API_KEY; }\n`,
        size: 80,
      },
    ];

    const nodes: GraphNode[] = [
      {
        id: 'fn:src/config.ts:getKey',
        type: 'function',
        name: 'getKey',
        filePath: 'src/config.ts',
        startLine: 2,
        endLine: 2,
      },
    ];

    const ruleFindings: Finding[] = [
      {
        id: 'find-sec-secret',
        ruleId: 'SEC_HARDCODED_SECRET',
        category: 'security',
        severity: 'high',
        title: 'Hardcoded API Key',
        filePath: 'src/config.ts',
        line: 2,
        evidence: `export const API_KEY = "${rawApiKey}";`,
        explanation: 'Sensitive credentials in source code.',
        suggestion: 'Use environment variables.',
        source: 'rule',
        confidence: 'certain',
      },
    ];

    const result = selectGraphContext({
      files,
      nodes,
      ruleFindings,
      userRequirement: `Kiểm tra xem key ${rawApiKey} có bị lộ không`,
    });

    // The raw secret MUST be scrubbed from formatted context
    expect(result.formattedContext).not.toContain(rawApiKey);
    expect(result.formattedContext).toContain('[REDACTED_API_KEY]');
  });

  it('validateAiFinding accepts valid findings and rejects hallucinated files, lines, and evidence', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: join(tempDir, 'src/service.ts'),
        relativePath: 'src/service.ts',
        content: `export function processData(input: string) {\n  if (!input) return null;\n  return input.trim();\n}\n`,
        size: 85,
      },
    ];

    const nodes: GraphNode[] = [
      {
        id: 'fn:src/service.ts:processData',
        type: 'function',
        name: 'processData',
        filePath: 'src/service.ts',
        startLine: 1,
        endLine: 4,
      },
    ];

    let counter = 1;
    const nextId = () => `find-ai-${counter++}`;

    // 1. Valid AI finding
    const validRaw = {
      ruleId: 'BUG_CHECK',
      category: 'bug',
      severity: 'medium',
      title: 'Thiếu kiểm tra kiểu dữ liệu',
      filePath: 'src/service.ts',
      line: 2,
      evidence: 'if (!input) return null;',
      explanation: 'Cần kiểm tra kỹ hơn',
      suggestion: 'Thêm typeof check',
      confidence: 'high',
    };
    const validResult = validateAiFinding(validRaw, files, nodes, nextId);
    expect(validResult).not.toBeNull();
    expect(validResult?.filePath).toBe('src/service.ts');
    expect(validResult?.line).toBe(2);
    expect(validResult?.nodeId).toBe('fn:src/service.ts:processData');
    expect(validResult?.source).toBe('ai');

    // 2. Hallucinated file path -> MUST reject
    const fakeFileRaw = {
      ...validRaw,
      filePath: 'src/nonExistentFile.ts',
    };
    expect(validateAiFinding(fakeFileRaw, files, nodes, nextId)).toBeNull();

    // 3. Hallucinated line number outside file -> MUST reject
    const fakeLineRaw = {
      ...validRaw,
      line: 999,
    };
    expect(validateAiFinding(fakeLineRaw, files, nodes, nextId)).toBeNull();

    // 4. Negative line number -> MUST reject
    const negativeLineRaw = {
      ...validRaw,
      line: -5,
    };
    expect(validateAiFinding(negativeLineRaw, files, nodes, nextId)).toBeNull();

    // 5. Hallucinated evidence not in file at all -> falls back to line snippet or rejects
    const fakeEvidenceRaw = {
      ...validRaw,
      line: 2,
      evidence: 'some completely nonexistent code that is nowhere in the file',
    };
    const recovered = validateAiFinding(fakeEvidenceRaw, files, nodes, nextId);
    expect(recovered).not.toBeNull();
    // Evidence is corrected to actual line snippet
    expect(recovered?.evidence).toBe('if (!input) return null;');
  });

  it('runAiEnhancement handles rules_only_fallback mode and records provenance metadata', async () => {
    const files: ScannedFile[] = [
      {
        absolutePath: join(tempDir, 'src/math.ts'),
        relativePath: 'src/math.ts',
        content: `export function add(a: number, b: number) { return a + b; }\n`,
        size: 60,
      },
    ];

    const nodes: GraphNode[] = [
      {
        id: 'fn:src/math.ts:add',
        type: 'function',
        name: 'add',
        filePath: 'src/math.ts',
        startLine: 1,
        endLine: 1,
      },
    ];

    const ruleFindings: Finding[] = [
      {
        id: 'find-rule-01',
        ruleId: 'STYLE_EXPLICIT_TYPE',
        category: 'style',
        severity: 'info',
        title: 'Explicit return type recommended',
        filePath: 'src/math.ts',
        line: 1,
        evidence: 'export function add',
        explanation: 'Khuyến nghị thêm kiểu trả về rõ ràng.',
        suggestion: 'Khai báo : number.',
        source: 'rule',
        confidence: 'high',
      },
    ];

    const result = await runAiEnhancement(ruleFindings, files, nodes, 'rules');

    expect(result.mode).toBe('rules_only_fallback');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].id).toBe('find-rule-01');

    // Provenance metadata must be populated
    expect(result.providerInfo.provenance).toBeDefined();
    expect(result.providerInfo.provenance?.selectedFiles).toContain('src/math.ts');
    expect(result.providerInfo.provenance?.selectedNodes).toContain('fn:src/math.ts:add');
    expect(result.providerInfo.provenance?.completedAt).toBeDefined();
  });

  it('runAiEnhancement respects AbortSignal cancellation and safely aborts without hanging', async () => {
    const files: ScannedFile[] = [
      {
        absolutePath: join(tempDir, 'src/slow.ts'),
        relativePath: 'src/slow.ts',
        content: `export function computeLong() { return 42; }\n`,
        size: 45,
      },
    ];

    const nodes: GraphNode[] = [
      {
        id: 'fn:src/slow.ts:computeLong',
        type: 'function',
        name: 'computeLong',
        filePath: 'src/slow.ts',
        startLine: 1,
        endLine: 1,
      },
    ];

    const controller = new AbortController();
    // Abort immediately before call
    controller.abort();

    const result = await runAiEnhancement(
      [],
      files,
      nodes,
      'ai',
      undefined,
      { signal: controller.signal }
    );

    expect(result.mode).toBe('rules_only_fallback');
    expect(result.providerInfo.isFallback).toBe(true);
    expect(result.providerInfo.fallbackReason).toContain('cancelled');
  });

  it('reviewProject integrates Graph-aware AI context selector, provenance and user requirements', async () => {
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(
      join(tempDir, 'src/auth.ts'),
      `export function login(user: string, pass: string) {\n  const token = 'tok-' + user;\n  return token;\n}\n`
    );
    writeFileSync(
      join(tempDir, 'src/app.ts'),
      `import { login } from './auth.js';\nexport function start() { return login('admin', '123'); }\n`
    );

    const report = await reviewProject({
      projectRoot: tempDir,
      mode: 'rules',
      userRequirement: 'Kiểm tra bảo mật hàm login',
    });

    expect(report.status).toBe('completed');
    expect(report.nodes.length).toBeGreaterThanOrEqual(2);
    expect(report.providerInfo.provenance).toBeDefined();
    expect(report.providerInfo.provenance?.selectedFiles.length).toBeGreaterThanOrEqual(1);
    expect(report.sourceHash).toBeDefined();
    expect(report.runtimeFingerprint).toBeDefined();
    expect(report.userRequirement).toBe('Kiểm tra bảo mật hàm login');
  });
});

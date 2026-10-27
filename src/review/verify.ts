import { spawn } from 'child_process';
import { resolve } from 'path';
import type { VerificationResult, TestsSummary, VerificationStatus } from './types.js';
import { defaultRunnerService } from '../runner/service.js';
import { scrubSecrets } from './scrub.js';

export interface RunVerifyOptions {
  projectRoot: string;
  checkCommand: string;
  baseRevision: string;
  timeoutSec?: number;
  maxLogBytes?: number;
  isolate?: 'container' | 'process';
}

export function sanitizeLog(raw: string): string {
  // Strip ANSI color escape codes
  let clean = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // Mask potential secrets / tokens thoroughly
  clean = scrubSecrets(clean);
  clean = clean.replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.]{8,}['"]?/gi, '$1: [REDACTED]');
  return clean;
}

export function parseTestsSummary(output: string): TestsSummary | undefined {
  // 1. Vitest / Jest: "Tests  2 passed (2)" or "Tests: 2 passed, 2 total"
  const vitestMatch = output.match(/Tests\s+(\d+)\s+passed(?:,\s*(\d+)\s+failed)?\s*(?:\((\d+)\))?/i);
  if (vitestMatch) {
    const passed = parseInt(vitestMatch[1], 10);
    const failed = vitestMatch[2] ? parseInt(vitestMatch[2], 10) : 0;
    const total = vitestMatch[3] ? parseInt(vitestMatch[3], 10) : (passed + failed);
    return { passed, failed, total };
  }

  const jestMatch = output.match(/Tests:\s*(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/i);
  if (jestMatch) {
    const failed = jestMatch[1] ? parseInt(jestMatch[1], 10) : 0;
    const passed = parseInt(jestMatch[2], 10);
    const total = parseInt(jestMatch[3], 10);
    return { passed, failed, total };
  }

  // 2. TAP / Node.js test runner summary: "# tests 3", "# pass 1", "# fail 2"
  const tapTests = output.match(/#\s*tests\s+(\d+)/i) || output.match(/ℹ\s*tests\s+(\d+)/i);
  const tapPass = output.match(/#\s*pass\s+(\d+)/i) || output.match(/ℹ\s*pass\s+(\d+)/i);
  const tapFail = output.match(/#\s*fail\s+(\d+)/i) || output.match(/ℹ\s*fail\s+(\d+)/i);
  const tapSkip = output.match(/#\s*skipped?\s+(\d+)/i) || output.match(/ℹ\s*skipped?\s+(\d+)/i);

  if (tapTests || tapPass || tapFail) {
    const passed = tapPass ? parseInt(tapPass[1], 10) : 0;
    const failed = tapFail ? parseInt(tapFail[1], 10) : 0;
    const skipped = tapSkip ? parseInt(tapSkip[1], 10) : 0;
    const total = tapTests ? parseInt(tapTests[1], 10) : (passed + failed + skipped);
    return { passed, failed, total, skipped };
  }

  // 3. Counting TAP ok / not ok lines:
  const notOkMatches = output.match(/^\s*not ok\s+\d+/gmi) || [];
  const okMatches = output.match(/^\s*ok\s+\d+/gmi) || [];
  if (notOkMatches.length > 0 || okMatches.length > 0) {
    const failed = notOkMatches.length;
    const passed = okMatches.length;
    return { passed, failed, total: passed + failed };
  }

  // 4. Generic pass / fail symbols like "✓ 5 passed"
  const symPass = output.match(/(?:✓|PASS)\s*(\d+)?/gi);
  const symFail = output.match(/(?:✕|FAIL)\s*(\d+)?/gi);
  if (symPass || symFail) {
    let passed = 0;
    if (symPass) {
      for (const m of symPass) {
        const num = m.replace(/[^\d]/g, '');
        passed += num ? parseInt(num, 10) : 1;
      }
    }
    let failed = 0;
    if (symFail) {
      for (const m of symFail) {
        const num = m.replace(/[^\d]/g, '');
        failed += num ? parseInt(num, 10) : 1;
      }
    }
    if (passed > 0 || failed > 0) {
      return { passed, failed, total: passed + failed };
    }
  }

  return undefined;
}

export async function runVerification(options: RunVerifyOptions): Promise<VerificationResult> {
  const { projectRoot, checkCommand, baseRevision, timeoutSec = 60, maxLogBytes = 512 * 1024, isolate } = options;
  const root = resolve(projectRoot);

  const res = await defaultRunnerService.execute({
    projectRoot: root,
    command: checkCommand,
    baseRevision,
    timeoutSec,
    maxLogBytes,
    isolate,
  });

  const testsSummary: TestsSummary | undefined = res.testReport ? {
    passed: res.testReport.passed,
    failed: res.testReport.failed,
    total: res.testReport.total,
    skipped: res.testReport.skipped,
  } : parseTestsSummary(res.sanitizedLog);

  const tests = res.testReport?.tests?.map((t) => ({
    name: t.name,
    status: t.status,
    durationMs: t.durationMs,
    failureMessage: t.error,
  }));

  return {
    checkId: res.runId,
    command: res.command,
    status: res.status as VerificationStatus,
    baseRevision,
    targetRevision: res.targetRevision || baseRevision,
    exitCode: res.exitCode,
    durationMs: res.durationMs,
    stdout: res.stdout,
    stderr: res.stderr,
    sanitizedLog: res.sanitizedLog,
    testsSummary,
    tests,
    verifiedAt: res.executedAt,
  };
}

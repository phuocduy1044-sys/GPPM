import { spawn } from 'child_process';
import { resolve } from 'path';
import type { VerificationResult, TestsSummary } from './types.js';

export interface RunVerifyOptions {
  projectRoot: string;
  checkCommand: string;
  baseRevision: string;
  timeoutSec?: number;
  maxLogBytes?: number;
}

export function sanitizeLog(raw: string): string {
  // Strip ANSI color escape codes
  let clean = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // Mask potential secrets / tokens
  clean = clean.replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.]{8,}['"]?/gi, '$1: [REDACTED]');
  return clean;
}

export function parseTestsSummary(output: string): TestsSummary | undefined {
  // Try parsing Vitest/Jest output: "Tests  2 passed (2)" or "Tests: 2 passed, 2 total"
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

  // Generic pass / fail counting
  const passedCount = (output.match(/(?:✓|PASS|passed)\s+/gi) || []).length;
  const failedCount = (output.match(/(?:✕|FAIL|failed)\s+/gi) || []).length;
  if (passedCount > 0 || failedCount > 0) {
    return {
      passed: passedCount,
      failed: failedCount,
      total: passedCount + failedCount,
    };
  }

  return undefined;
}

export async function runVerification(options: RunVerifyOptions): Promise<VerificationResult> {
  const { projectRoot, checkCommand, baseRevision, timeoutSec = 60, maxLogBytes = 512 * 1024 } = options;
  const startTime = Date.now();
  const root = resolve(projectRoot);
  const checkId = `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  return new Promise<VerificationResult>((resolvePromise) => {
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let timedOut = false;

    // Use platform shell to execute checkCommand safely within project root
    const child = spawn(checkCommand, {
      cwd: root,
      shell: true,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 2000);
    }, timeoutSec * 1000);

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutBuffer.length < maxLogBytes) {
        stdoutBuffer += chunk.toString('utf8');
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderrBuffer.length < maxLogBytes) {
        stderrBuffer += chunk.toString('utf8');
      }
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolvePromise({
        checkId,
        command: checkCommand,
        status: 'error',
        baseRevision,
        exitCode: -1,
        durationMs,
        stdout: stdoutBuffer,
        stderr: err.message,
        sanitizedLog: sanitizeLog(err.message),
        verifiedAt: new Date().toISOString(),
      });
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const combinedOutput = `${stdoutBuffer}\n${stderrBuffer}`;
      const sanitized = sanitizeLog(combinedOutput);
      const summary = parseTestsSummary(sanitized);

      let status: VerificationResult['status'];
      if (timedOut) {
        status = 'timed_out';
      } else if (code === 0) {
        status = 'passed';
      } else {
        status = 'failed';
      }

      resolvePromise({
        checkId,
        command: checkCommand,
        status,
        baseRevision,
        targetRevision: baseRevision,
        exitCode: code,
        durationMs,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        sanitizedLog: sanitized,
        testsSummary: summary,
        verifiedAt: new Date().toISOString(),
      });
    });
  });
}

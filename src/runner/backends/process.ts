import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';
import { execa } from 'execa';
import type { RunnerBackend } from './interface.js';
import type { RunnerExecutionRequest, RunnerExecutionResult } from '../types.js';
import { confineToRoot } from '../../tools/paths.js';
import { scrubSecrets } from '../../review/scrub.js';
import { parseTestReport } from '../adapters/index.js';

export class ProcessRunner implements RunnerBackend {
  readonly name = 'process' as const;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async execute(request: RunnerExecutionRequest, signal?: AbortSignal): Promise<RunnerExecutionResult> {
    const runId = request.runId || `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();
    const checkKind = request.checkKind || 'test_suite';

    // 1. Validate root directory path containment
    let safeRoot: string;
    try {
      safeRoot = confineToRoot('.', request.projectRoot);
    } catch (err) {
      const errorMsg = `Đường dẫn dự án không hợp lệ hoặc nằm ngoài phạm vi cho phép: ${err instanceof Error ? err.message : String(err)}`;
      return {
        runId,
        command: request.command,
        status: 'error',
        exitCode: -1,
        durationMs: Date.now() - startTime,
        stdout: '',
        stderr: errorMsg,
        sanitizedLog: errorMsg,
        checkKind,
        backend: 'process',
        executedAt: new Date().toISOString(),
        error: 'INVALID_PROJECT_ROOT',
      };
    }

    const timeoutSec = request.timeoutSec || 60;
    const maxLogBytes = request.maxLogBytes || 512 * 1024;
    const isWin = process.platform === 'win32';

    return new Promise<RunnerExecutionResult>((resolvePromise) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let resolved = false;

      const finish = (result: RunnerExecutionResult) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolvePromise(result);
      };

      // Spawn child with shell and detached mode on non-windows for process tree kill
      const child: ChildProcess = spawn(request.command, {
        cwd: safeRoot,
        shell: true,
        detached: !isWin,
        env: {
          ...process.env,
          ...(request.env || {}),
          CI: '1',
          FORCE_COLOR: '0',
          NODE_ENV: 'test',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const killProcessTree = () => {
        try {
          if (child.pid) {
            if (isWin) {
              try {
                spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
              } catch {}
              try {
                child.kill();
              } catch {}
            } else {
              try {
                process.kill(-child.pid, 'SIGKILL');
              } catch {
                child.kill('SIGKILL');
              }
            }
          }
        } catch {
          // already exited
        }
      };

      const timer = setTimeout(() => {
        timedOut = true;
        killProcessTree();
        // Fallback: If close event doesn't fire within 1500ms after kill, force resolve
        setTimeout(() => {
          const durationMs = Date.now() - startTime;
          const combined = `${stdout}\n${stderr}`;
          const sanitizedLog = scrubSecrets(combined);
          finish({
            runId,
            command: request.command,
            status: 'timed_out',
            exitCode: null,
            durationMs,
            stdout,
            stderr,
            sanitizedLog,
            checkKind,
            backend: 'process',
            executedAt: new Date().toISOString(),
          });
        }, 1500);
      }, timeoutSec * 1000);

      signal?.addEventListener('abort', () => {
        killProcessTree();
        setTimeout(() => {
          const durationMs = Date.now() - startTime;
          const combined = `${stdout}\n${stderr}`;
          const sanitizedLog = scrubSecrets(combined);
          finish({
            runId,
            command: request.command,
            status: 'cancelled',
            exitCode: null,
            durationMs,
            stdout,
            stderr,
            sanitizedLog,
            checkKind,
            backend: 'process',
            executedAt: new Date().toISOString(),
          });
        }, 1500);
      }, { once: true });

      child.stdout?.on('data', (c: Buffer) => {
        if (stdout.length < maxLogBytes) stdout += c.toString('utf8');
      });

      child.stderr?.on('data', (c: Buffer) => {
        if (stderr.length < maxLogBytes) stderr += c.toString('utf8');
      });

      child.on('error', (err: Error) => {
        const durationMs = Date.now() - startTime;
        finish({
          runId,
          command: request.command,
          status: 'error',
          exitCode: -1,
          durationMs,
          stdout,
          stderr: err.message,
          sanitizedLog: scrubSecrets(err.message),
          checkKind,
          backend: 'process',
          executedAt: new Date().toISOString(),
          error: err.message,
        });
      });

      child.on('close', (code: number | null) => {
        const durationMs = Date.now() - startTime;
        const combined = `${stdout}\n${stderr}`;
        const sanitizedLog = scrubSecrets(combined);
        const testReport = parseTestReport(request.command, sanitizedLog, checkKind);

        let status: RunnerExecutionResult['status'];
        if (timedOut) {
          status = 'timed_out';
        } else if (signal?.aborted) {
          status = 'cancelled';
        } else if (code !== 0) {
          status = 'failed';
        } else {
          if (checkKind === 'test_suite') {
            if (testReport && testReport.total > 0) {
              status = testReport.failed > 0 ? 'failed' : 'passed';
            } else {
              status = 'no_tests';
            }
          } else {
            status = 'passed';
          }
        }

        finish({
          runId,
          command: request.command,
          status,
          exitCode: code,
          durationMs,
          stdout,
          stderr,
          sanitizedLog,
          testReport,
          checkKind,
          backend: 'process',
          baseRevision: request.baseRevision,
          targetRevision: request.targetRevision,
          executedAt: new Date().toISOString(),
        });
      });
    });
  }
}

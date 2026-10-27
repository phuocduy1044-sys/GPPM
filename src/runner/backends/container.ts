import { spawn } from 'child_process';
import { resolve } from 'path';
import type { RunnerBackend } from './interface.js';
import type { RunnerExecutionRequest, RunnerExecutionResult } from '../types.js';
import { confineToRoot } from '../../tools/paths.js';
import { scrubSecrets } from '../../review/scrub.js';
import { parseTestReport } from '../adapters/index.js';

export class ContainerRunner implements RunnerBackend {
  readonly name = 'container' as const;
  private dockerAvailableCache: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.dockerAvailableCache !== null) {
      return this.dockerAvailableCache;
    }

    try {
      const available = await new Promise<boolean>((res) => {
        const child = spawn('docker', ['--version'], {
          shell: true,
          stdio: 'ignore',
        });
        child.on('error', () => res(false));
        child.on('close', (code) => res(code === 0));
        setTimeout(() => {
          try { child.kill(); } catch {}
          res(false);
        }, 3000);
      });
      this.dockerAvailableCache = available;
      return available;
    } catch {
      this.dockerAvailableCache = false;
      return false;
    }
  }

  async execute(request: RunnerExecutionRequest, signal?: AbortSignal): Promise<RunnerExecutionResult> {
    const runId = request.runId || `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();
    const checkKind = request.checkKind || 'test_suite';

    // 1. Validate Docker availability
    const hasDocker = await this.isAvailable();
    if (!hasDocker) {
      const errorMsg = 'Môi trường Docker không khả dụng trên hệ thống này (Docker daemon chưa chạy hoặc chưa cài đặt). Không thể chạy sandbox container.';
      return {
        runId,
        command: request.command,
        status: 'unsupported',
        exitCode: -1,
        durationMs: Date.now() - startTime,
        stdout: '',
        stderr: errorMsg,
        sanitizedLog: errorMsg,
        checkKind,
        backend: 'container',
        executedAt: new Date().toISOString(),
        error: 'DOCKER_NOT_AVAILABLE',
      };
    }

    // 2. Validate root directory path containment
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
        backend: 'container',
        executedAt: new Date().toISOString(),
        error: 'INVALID_PROJECT_ROOT',
      };
    }

    // 3. Containerized execution via docker run
    const timeoutSec = request.timeoutSec || 60;
    const maxLogBytes = request.maxLogBytes || 512 * 1024;
    const containerImage = process.env.VIECODIE_RUNNER_IMAGE || 'node:20-slim';

    return new Promise<RunnerExecutionResult>((resolvePromise) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Construct docker run command with read-write workspace volume and network restrictions
      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'none', // isolated network sandbox
        '-v', `${resolve(safeRoot)}:/workspace:rw`,
        '-w', '/workspace',
        containerImage,
        'sh', '-c', request.command,
      ];

      const child = spawn('docker', dockerArgs, {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill('SIGKILL'); } catch {}
      }, timeoutSec * 1000);

      signal?.addEventListener('abort', () => {
        try { child.kill('SIGKILL'); } catch {}
      }, { once: true });

      child.stdout?.on('data', (c: Buffer) => {
        if (stdout.length < maxLogBytes) stdout += c.toString('utf8');
      });

      child.stderr?.on('data', (c: Buffer) => {
        if (stderr.length < maxLogBytes) stderr += c.toString('utf8');
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        resolvePromise({
          runId,
          command: request.command,
          status: 'error',
          exitCode: -1,
          durationMs,
          stdout,
          stderr: err.message,
          sanitizedLog: scrubSecrets(err.message),
          checkKind,
          backend: 'container',
          executedAt: new Date().toISOString(),
          error: err.message,
        });
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
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

        resolvePromise({
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
          backend: 'container',
          baseRevision: request.baseRevision,
          targetRevision: request.targetRevision,
          executedAt: new Date().toISOString(),
        });
      });
    });
  }
}

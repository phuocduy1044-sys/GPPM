import type {
  RunnerExecutionRequest,
  RunnerExecutionResult,
  DiscoveryManifest,
} from './types.js';
import { discoverChecks, inferCheckKind } from './discovery.js';
import { ContainerRunner } from './backends/container.js';
import { ProcessRunner } from './backends/process.js';
import type { RunnerBackend } from './backends/interface.js';

export class RunnerService {
  private containerBackend: ContainerRunner;
  private processBackend: ProcessRunner;

  constructor() {
    this.containerBackend = new ContainerRunner();
    this.processBackend = new ProcessRunner();
  }

  /**
   * Static discovery of project test/build commands without executing untrusted code.
   */
  discover(projectRoot: string): DiscoveryManifest {
    return discoverChecks(projectRoot);
  }

  /**
   * Check if container/Docker environment is available on this system.
   */
  async isContainerAvailable(): Promise<boolean> {
    return this.containerBackend.isAvailable();
  }

  /**
   * Execute a verification or check command using the appropriate backend.
   */
  async execute(request: RunnerExecutionRequest, signal?: AbortSignal): Promise<RunnerExecutionResult> {
    // 1. Resolve command if not specified
    let command = request.command?.trim();
    if (!command) {
      const manifest = this.discover(request.projectRoot);
      if (!manifest.suggestedCheckCommand) {
        const errorMsg = 'Không xác định được lệnh kiểm thử phù hợp cho dự án này.';
        return {
          runId: request.runId || `run-${Date.now().toString(36)}`,
          command: '',
          status: 'error',
          exitCode: -1,
          durationMs: 0,
          stdout: '',
          stderr: errorMsg,
          sanitizedLog: errorMsg,
          checkKind: 'custom',
          backend: request.isolate || 'process',
          executedAt: new Date().toISOString(),
          error: 'NO_CHECK_COMMAND',
        };
      }
      command = manifest.suggestedCheckCommand;
    }

    const checkKind = request.checkKind || inferCheckKind(command);

    // 2. Select backend
    let backend: RunnerBackend;
    if (request.isolate === 'container') {
      backend = this.containerBackend;
    } else {
      backend = this.processBackend;
    }

    // 3. Execute with selected backend
    return backend.execute(
      {
        ...request,
        command,
        checkKind,
      },
      signal || request.signal
    );
  }
}

export const defaultRunnerService = new RunnerService();

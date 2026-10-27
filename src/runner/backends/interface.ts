import type { RunnerExecutionRequest, RunnerExecutionResult } from '../types.js';

export interface RunnerBackend {
  readonly name: 'container' | 'process';
  isAvailable(): Promise<boolean>;
  execute(request: RunnerExecutionRequest, signal?: AbortSignal): Promise<RunnerExecutionResult>;
}

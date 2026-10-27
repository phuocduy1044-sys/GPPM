import type { RunnerBackend } from './interface.js';
import { ContainerRunner } from './container.js';
import { ProcessRunner } from './process.js';

export function createRunnerBackend(type: 'container' | 'process' = 'process'): RunnerBackend {
  if (type === 'container') {
    return new ContainerRunner();
  }
  return new ProcessRunner();
}

export * from './interface.js';
export * from './container.js';
export * from './process.js';

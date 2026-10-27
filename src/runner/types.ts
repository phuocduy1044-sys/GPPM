/**
 * Unified Runner Service Contracts & Types
 */

export type CheckKind = 'test_suite' | 'typecheck' | 'linter' | 'build' | 'custom';

export type RunnerStatus =
  | 'not_run'
  | 'running'
  | 'passed'
  | 'failed'
  | 'error'
  | 'timed_out'
  | 'cancelled'
  | 'no_tests'
  | 'stale'
  | 'unsupported';

export interface DiscoveredConfig {
  kind: CheckKind;
  command: string;
  framework?: 'vitest' | 'jest' | 'node:test' | 'pytest' | 'cargo' | 'tsc' | 'eslint' | 'unknown';
  configFile?: string;
  isDefault: boolean;
  description?: string;
}

export interface DiscoveryManifest {
  projectRoot: string;
  discoveredConfigs: DiscoveredConfig[];
  suggestedCheckCommand: string | null;
  detectedFrameworks: string[];
}

export interface TestItem {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  error?: string;
}

export interface StructuredTestReport {
  framework?: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs?: number;
  tests?: TestItem[];
}

export interface RunnerExecutionRequest {
  runId?: string;
  projectRoot: string;
  command: string;
  checkKind?: CheckKind;
  timeoutSec?: number;
  maxLogBytes?: number;
  env?: Record<string, string>;
  isolate?: 'container' | 'process';
  baseRevision?: string;
  targetRevision?: string;
  signal?: AbortSignal;
}

export interface RunnerExecutionResult {
  runId: string;
  command: string;
  status: RunnerStatus;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  sanitizedLog: string;
  testReport?: StructuredTestReport;
  checkKind: CheckKind;
  backend: 'container' | 'process';
  baseRevision?: string;
  targetRevision?: string;
  executedAt: string;
  error?: string;
}

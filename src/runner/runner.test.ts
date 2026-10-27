import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  discoverChecks,
  inferCheckKind,
  parseVitestOutput,
  parseNodeTestTapOutput,
  parseTestReport,
  ContainerRunner,
  ProcessRunner,
  RunnerService,
  defaultRunnerService,
} from './index.js';
import { runVerification } from '../review/verify.js';
import { runCheck, detectCheck } from '../fix/run.js';

describe('Unified Runner Service (T03)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'viecodie-runner-test-'));
  });

  afterEach(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  // -------------------------------------------------------------------------
  // 1. Static Discovery without Code Execution
  // -------------------------------------------------------------------------
  describe('Static Discovery (discoverChecks)', () => {
    it('discovers npm test statically from package.json without eval', () => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          name: 'sample-project',
          scripts: { test: 'vitest run', typecheck: 'tsc --noEmit' },
          devDependencies: { vitest: '^1.0.0', typescript: '^5.0.0' },
        })
      );

      const manifest = discoverChecks(root);
      expect(manifest.suggestedCheckCommand).toBe('npm test');
      expect(manifest.detectedFrameworks).toContain('vitest');
      expect(manifest.detectedFrameworks).toContain('typescript');

      const testConfig = manifest.discoveredConfigs.find((c) => c.kind === 'test_suite');
      expect(testConfig).toBeDefined();
      expect(testConfig?.framework).toBe('vitest');

      const typecheckConfig = manifest.discoveredConfigs.find((c) => c.kind === 'typecheck');
      expect(typecheckConfig).toBeDefined();
      expect(typecheckConfig?.command).toBe('npm run typecheck');
    });

    it('ignores npm init placeholder "no test specified"', () => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          scripts: { test: 'echo "Error: no test specified" && exit 1' },
        })
      );

      const manifest = discoverChecks(root);
      expect(manifest.suggestedCheckCommand).toBeNull();
      expect(manifest.discoveredConfigs.length).toBe(0);
    });

    it('detects Cargo, Go and Pytest project markers', () => {
      writeFileSync(join(root, 'Cargo.toml'), '[package]\nname = "rust-app"');
      expect(discoverChecks(root).suggestedCheckCommand).toBe('cargo test');
      rmSync(join(root, 'Cargo.toml'));

      writeFileSync(join(root, 'go.mod'), 'module sample');
      expect(discoverChecks(root).suggestedCheckCommand).toBe('go test ./...');
      rmSync(join(root, 'go.mod'));

      writeFileSync(join(root, 'pytest.ini'), '[pytest]');
      expect(discoverChecks(root).suggestedCheckCommand).toBe('python -m pytest -q');
    });

    it('infers check kinds accurately', () => {
      expect(inferCheckKind('npm test')).toBe('test_suite');
      expect(inferCheckKind('npx vitest run')).toBe('test_suite');
      expect(inferCheckKind('cargo test')).toBe('test_suite');
      expect(inferCheckKind('npm run typecheck')).toBe('typecheck');
      expect(inferCheckKind('npx tsc --noEmit')).toBe('typecheck');
      expect(inferCheckKind('eslint .')).toBe('linter');
      expect(inferCheckKind('npm run build')).toBe('build');
      expect(inferCheckKind('echo hello')).toBe('custom');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Structured Test Output Adapters
  // -------------------------------------------------------------------------
  describe('Structured Output Adapters', () => {
    it('parses Vitest test runner summary and test items', () => {
      const output = `
 RUN  v1.0.0 /app

 ✓ src/a.test.ts (2 tests) 45ms
 ✕ src/b.test.ts (1 test) 80ms

 Tests  1 failed | 2 passed (3)
 Duration  125ms
`;
      const report = parseVitestOutput(output);
      expect(report).toBeDefined();
      expect(report?.framework).toBe('vitest');
      expect(report?.total).toBe(3);
      expect(report?.passed).toBe(2);
      expect(report?.failed).toBe(1);
      expect(report?.durationMs).toBe(125);
      expect(report?.tests?.length).toBe(2);
      expect(report?.tests?.[0].status).toBe('passed');
      expect(report?.tests?.[1].status).toBe('failed');
    });

    it('parses Node.js TAP summary and ok/not ok items', () => {
      const output = `
TAP version 13
# Subtest: math test
ok 1 - should add numbers
not ok 2 - should divide safely
# tests 2
# pass 1
# fail 1
# duration_ms 42.1
`;
      const report = parseNodeTestTapOutput(output);
      expect(report).toBeDefined();
      expect(report?.framework).toBe('node:test');
      expect(report?.total).toBe(2);
      expect(report?.passed).toBe(1);
      expect(report?.failed).toBe(1);
      expect(report?.tests?.length).toBe(2);
      expect(report?.tests?.[0].name).toBe('should add numbers');
      expect(report?.tests?.[1].status).toBe('failed');
    });

    it('parseTestReport returns undefined for non-test commands (typecheck/linter)', () => {
      const tscOutput = 'Found 2 errors in src/app.ts:15';
      const report = parseTestReport('npx tsc --noEmit', tscOutput, 'typecheck');
      expect(report).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Container Runner & Environment Detection
  // -------------------------------------------------------------------------
  describe('ContainerRunner Backend', () => {
    it('accurately identifies whether Docker is available and handles missing Docker gracefully', async () => {
      const runner = new ContainerRunner();
      const isAvailable = await runner.isAvailable();

      // On this machine, Docker is not installed
      expect(typeof isAvailable).toBe('boolean');

      const result = await runner.execute({
        projectRoot: root,
        command: 'npm test',
      });

      if (!isAvailable) {
        expect(result.status).toBe('unsupported');
        expect(result.error).toBe('DOCKER_NOT_AVAILABLE');
        expect(result.backend).toBe('container');
      }
    });

    it('rejects path traversal attempting to escape project root in container request', async () => {
      const runner = new ContainerRunner();
      // Even if docker were present, path escape must be blocked
      const result = await runner.execute({
        projectRoot: '../forbidden-folder-escape',
        command: 'npm test',
      });
      expect(['unsupported', 'error']).toContain(result.status);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Process Runner & Unified Service Execution
  // -------------------------------------------------------------------------
  describe('ProcessRunner & Unified Execution', () => {
    it('executes a passing test command and returns status "passed"', async () => {
      const runner = new ProcessRunner();
      const result = await runner.execute({
        projectRoot: root,
        command: 'node -e "console.log(\'# pass 2\\n# fail 0\\n# tests 2\'); process.exit(0);"',
        checkKind: 'test_suite',
      });

      expect(result.status).toBe('passed');
      expect(result.exitCode).toBe(0);
      expect(result.testReport?.passed).toBe(2);
      expect(result.testReport?.failed).toBe(0);
    });

    it('returns "no_tests" when exitCode is 0 but 0 tests were executed', async () => {
      const runner = new ProcessRunner();
      const result = await runner.execute({
        projectRoot: root,
        command: 'node -e "console.log(\'No test files found.\'); process.exit(0);"',
        checkKind: 'test_suite',
      });

      expect(result.status).toBe('no_tests');
      expect(result.exitCode).toBe(0);
    });

    it('returns "failed" on non-zero exit code', async () => {
      const runner = new ProcessRunner();
      const result = await runner.execute({
        projectRoot: root,
        command: 'node -e "console.error(\'Tests failed\'); process.exit(1);"',
        checkKind: 'test_suite',
      });

      expect(result.status).toBe('failed');
      expect(result.exitCode).toBe(1);
    });

    it('handles command timeout and returns status "timed_out"', async () => {
      const runner = new ProcessRunner();
      const result = await runner.execute({
        projectRoot: root,
        command: 'node -e "setTimeout(() => {}, 15000);"',
        timeoutSec: 1, // 1 second timeout
      });

      expect(result.status).toBe('timed_out');
    });

    it('handles cancellation via AbortSignal and returns "cancelled"', async () => {
      const runner = new ProcessRunner();
      const controller = new AbortController();

      setTimeout(() => controller.abort(), 200);

      const result = await runner.execute(
        {
          projectRoot: root,
          command: 'node -e "setTimeout(() => {}, 10000);"',
          timeoutSec: 5,
        },
        controller.signal
      );

      expect(result.status).toBe('cancelled');
    });

    it('scrubs leaked secrets in execution log', async () => {
      const runner = new ProcessRunner();
      const result = await runner.execute({
        projectRoot: root,
        command: 'node -e "console.log(\'Leaked key: sk-proj-12345678901234567890abcdef and ghp_098765432109876543210987654321098765\');"',
      });

      expect(result.sanitizedLog).not.toContain('sk-proj-');
      expect(result.sanitizedLog).not.toContain('ghp_');
      expect(result.sanitizedLog).toContain('[REDACTED_API_KEY]');
      expect(result.sanitizedLog).toContain('[REDACTED_GITHUB_TOKEN]');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Integration with verify.ts and fix/run.ts
  // -------------------------------------------------------------------------
  describe('Integration with review/verify and fix/run', () => {
    it('runVerification delegates to RunnerService and returns VerificationResult', async () => {
      const res = await runVerification({
        projectRoot: root,
        checkCommand: 'node -e "console.log(\'# pass 3\\n# fail 0\\n# tests 3\'); process.exit(0);"',
        baseRevision: 'rev-abc123',
      });

      expect(res.status).toBe('passed');
      expect(res.baseRevision).toBe('rev-abc123');
      expect(res.testsSummary?.passed).toBe(3);
      expect(res.testsSummary?.total).toBe(3);
    });

    it('fix/run detectCheck and runCheck use unified RunnerService', async () => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ scripts: { test: 'vitest run' } })
      );

      expect(detectCheck(root)).toBe('npm test');

      const checkRes = await runCheck(
        'node -e "console.log(\'All clear\'); process.exit(0);"',
        root,
        10
      );

      expect(checkRes.exitCode).toBe(0);
      expect(checkRes.output).toContain('All clear');
      expect(checkRes.timedOut).toBe(false);
    });
  });
});

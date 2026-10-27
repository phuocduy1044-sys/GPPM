import type { StructuredTestReport, CheckKind } from '../types.js';
import { parseVitestOutput } from './vitest.js';
import { parseNodeTestTapOutput } from './nodeTestTap.js';
import { parseGenericCheckOutput } from './genericCheck.js';

export function parseTestReport(command: string, output: string, kind?: CheckKind): StructuredTestReport | undefined {
  if (kind && kind !== 'test_suite') {
    // Non-test suite commands (e.g. typecheck, linter, build)
    return undefined;
  }

  // 1. Try Vitest / Jest
  const vitest = parseVitestOutput(output);
  if (vitest) return vitest;

  // 2. Try Node:test / TAP
  const tap = parseNodeTestTapOutput(output);
  if (tap) return tap;

  // 3. Try generic regex patterns
  return parseGenericCheckOutput(output);
}

export * from './vitest.js';
export * from './nodeTestTap.js';
export * from './genericCheck.js';

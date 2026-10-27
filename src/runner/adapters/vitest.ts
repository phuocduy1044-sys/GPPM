import type { StructuredTestReport, TestItem } from '../types.js';

export function parseVitestOutput(output: string): StructuredTestReport | undefined {
  // Pattern 1: Vitest runner summary:
  // " Tests  5 passed (5)" or " Tests  2 failed | 3 passed (5)"
  const vitestSummaryMatch = output.match(/Tests\s+(?:(\d+)\s+failed\s*\|?\s*)?(?:(\d+)\s+passed)?(?:\s*\|?\s*(\d+)\s+skipped)?\s*(?:\((\d+)\))?/i);
  if (vitestSummaryMatch && (vitestSummaryMatch[1] || vitestSummaryMatch[2] || vitestSummaryMatch[4])) {
    const failed = vitestSummaryMatch[1] ? parseInt(vitestSummaryMatch[1], 10) : 0;
    const passed = vitestSummaryMatch[2] ? parseInt(vitestSummaryMatch[2], 10) : 0;
    const skipped = vitestSummaryMatch[3] ? parseInt(vitestSummaryMatch[3], 10) : 0;
    const total = vitestSummaryMatch[4] ? parseInt(vitestSummaryMatch[4], 10) : (passed + failed + skipped);

    const durationMatch = output.match(/Duration\s+([\d.]+)(ms|s)/i);
    let durationMs: number | undefined;
    if (durationMatch) {
      const val = parseFloat(durationMatch[1]);
      durationMs = durationMatch[2].toLowerCase() === 's' ? Math.round(val * 1000) : Math.round(val);
    }

    // Extract individual test files / items
    const tests: TestItem[] = [];
    const testLineRegex = /^\s*(✓|✕|↓)\s+([^\n\r]+?)(?:\s+(\d+ms))?$/gm;
    let m: RegExpExecArray | null;
    while ((m = testLineRegex.exec(output)) !== null) {
      const sym = m[1];
      const name = m[2].trim();
      const dur = m[3] ? parseInt(m[3].replace(/[^\d]/g, ''), 10) : undefined;
      tests.push({
        name,
        status: sym === '✓' ? 'passed' : (sym === '✕' ? 'failed' : 'skipped'),
        durationMs: dur,
      });
    }

    return {
      framework: 'vitest',
      total,
      passed,
      failed,
      skipped,
      durationMs,
      tests: tests.length > 0 ? tests : undefined,
    };
  }

  // Pattern 2: Jest / Vitest alternative format: "Tests: 1 failed, 2 passed, 3 total"
  const jestMatch = output.match(/Tests:\s*(?:(\d+)\s+failed,\s*)?(?:(\d+)\s+passed,\s*)?(\d+)\s+total/i);
  if (jestMatch) {
    const failed = jestMatch[1] ? parseInt(jestMatch[1], 10) : 0;
    const passed = jestMatch[2] ? parseInt(jestMatch[2], 10) : 0;
    const total = parseInt(jestMatch[3], 10);
    return {
      framework: 'jest',
      total,
      passed,
      failed,
      skipped: Math.max(0, total - (passed + failed)),
    };
  }

  return undefined;
}

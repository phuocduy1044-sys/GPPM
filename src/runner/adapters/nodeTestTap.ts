import type { StructuredTestReport, TestItem } from '../types.js';

export function parseNodeTestTapOutput(output: string): StructuredTestReport | undefined {
  // Pattern 1: Node.js / TAP summary lines: "# pass 1", "# fail 2", "# tests 3"
  const tapTests = output.match(/#\s*tests\s+(\d+)/i) || output.match(/ℹ\s*tests\s+(\d+)/i);
  const tapPass = output.match(/#\s*pass\s+(\d+)/i) || output.match(/ℹ\s*pass\s+(\d+)/i);
  const tapFail = output.match(/#\s*fail\s+(\d+)/i) || output.match(/ℹ\s*fail\s+(\d+)/i);
  const tapSkip = output.match(/#\s*skipped?\s+(\d+)/i) || output.match(/ℹ\s*skipped?\s+(\d+)/i);

  if (tapTests || tapPass || tapFail) {
    const passed = tapPass ? parseInt(tapPass[1], 10) : 0;
    const failed = tapFail ? parseInt(tapFail[1], 10) : 0;
    const skipped = tapSkip ? parseInt(tapSkip[1], 10) : 0;
    const total = tapTests ? parseInt(tapTests[1], 10) : (passed + failed + skipped);

    const tests: TestItem[] = [];
    const tapLineRegex = /^\s*(ok|not ok)\s+(\d+)\s*-\s*([^\n\r]+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = tapLineRegex.exec(output)) !== null) {
      tests.push({
        name: m[3].trim(),
        status: m[1] === 'ok' ? 'passed' : 'failed',
      });
    }

    return {
      framework: 'node:test',
      total,
      passed,
      failed,
      skipped,
      tests: tests.length > 0 ? tests : undefined,
    };
  }

  // Pattern 2: TAP ok / not ok counting without summary block
  const notOkMatches = output.match(/^\s*not ok\s+\d+/gmi) || [];
  const okMatches = output.match(/^\s*ok\s+\d+/gmi) || [];
  if (notOkMatches.length > 0 || okMatches.length > 0) {
    const failed = notOkMatches.length;
    const passed = okMatches.length;
    return {
      framework: 'tap',
      total: passed + failed,
      passed,
      failed,
      skipped: 0,
    };
  }

  return undefined;
}

import type { StructuredTestReport } from '../types.js';

export function parseGenericCheckOutput(output: string): StructuredTestReport | undefined {
  // Check for common test patterns like "X passed, Y failed"
  const genericMatch = output.match(/(\d+)\s+passed(?:,\s*(\d+)\s+failed)?/i);
  if (genericMatch) {
    const passed = parseInt(genericMatch[1], 10);
    const failed = genericMatch[2] ? parseInt(genericMatch[2], 10) : 0;
    return {
      framework: 'generic',
      total: passed + failed,
      passed,
      failed,
      skipped: 0,
    };
  }

  // Symbol counts: "✓ 3" or "✕ 1"
  const symPass = output.match(/(?:✓|PASS)\s*(\d+)?/gi);
  const symFail = output.match(/(?:✕|FAIL)\s*(\d+)?/gi);
  if (symPass || symFail) {
    let passed = 0;
    if (symPass) {
      for (const m of symPass) {
        const num = m.replace(/[^\d]/g, '');
        passed += num ? parseInt(num, 10) : 1;
      }
    }
    let failed = 0;
    if (symFail) {
      for (const m of symFail) {
        const num = m.replace(/[^\d]/g, '');
        failed += num ? parseInt(num, 10) : 1;
      }
    }
    if (passed > 0 || failed > 0) {
      return {
        framework: 'symbols',
        total: passed + failed,
        passed,
        failed,
        skipped: 0,
      };
    }
  }

  return undefined;
}

import { execSync } from 'child_process';
import os from 'os';

interface StepResult {
  name: string;
  command: string;
  durationMs: number;
  passed: boolean;
  error?: string;
}

async function runSmokeTests() {
  console.log('\n' + '='.repeat(72));
  console.log('   VIECODIE FULL SMOKE TEST & QUALITY GATES PIPELINE');
  console.log('='.repeat(72));
  console.log(`  Hệ điều hành: ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`  Node.js:      ${process.version}`);
  console.log(`  Thời điểm:    ${new Date().toISOString()}\n`);

  const steps: { name: string; command: string; allowNonZero?: boolean; validateOutput?: (stdout: string) => boolean }[] = [
    {
      name: '1. Typecheck Toàn diện (CLI & Web UI)',
      command: 'npm run typecheck',
    },
    {
      name: '2. Toàn bộ Test Suite Tự động (Vitest)',
      command: 'npm test',
    },
    {
      name: '3. Biên dịch Hệ thống (tsup & vite build)',
      command: 'npm run build',
    },
    {
      name: '4. Kiểm chứng Benchmark & Ground-Truth (20 ca)',
      command: 'npm run benchmark',
    },
    {
      name: '5. CLI Headless Review trên Dự án Mẫu (demo-project)',
      command: 'node dist/cli.js review examples/demo-project --mode rules',
      allowNonZero: true, // Review CLI returns exit code 1 when critical findings are present (linting behavior)
      validateOutput: (out: string) => out.includes('VIECODIE AI CODE REVIEWER REPORT') && out.includes('SQL Injection'),
    },
    {
      name: '6. Đóng gói Phân phối & Kiểm kê File (npm pack dry-run)',
      command: 'npm pack --dry-run',
      validateOutput: (out: string) => out.includes('viecodie') || out.includes('.tgz') || out.includes('Tarball'),
    },
  ];

  const results: StepResult[] = [];
  const overallStart = Date.now();

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    process.stdout.write(`[${i + 1}/${steps.length}] Đang chạy: ${s.name}... `);
    const start = Date.now();

    try {
      const stdout = execSync(s.command, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const durationMs = Date.now() - start;

      let valid = true;
      if (s.validateOutput && !s.validateOutput(stdout)) {
        valid = false;
      }

      if (valid) {
        console.log(`\x1b[32mPASSED\x1b[0m (${durationMs}ms)`);
        results.push({ name: s.name, command: s.command, durationMs, passed: true });
      } else {
        console.log(`\x1b[31mFAILED (Output validation failed)\x1b[0m (${durationMs}ms)`);
        results.push({ name: s.name, command: s.command, durationMs, passed: false, error: 'Output validation check failed' });
      }
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const stdout = err.stdout ? String(err.stdout) : '';
      const stderr = err.stderr ? String(err.stderr) : '';

      // Check if command is allowed to exit non-zero (like finding critical issues in CLI scanner)
      const combined = stdout + '\n' + stderr;
      if (s.allowNonZero && s.validateOutput && s.validateOutput(combined)) {
        console.log(`\x1b[32mPASSED\x1b[0m (${durationMs}ms) - (Phát hiện lỗ hổng critical như thiết kế)`);
        results.push({ name: s.name, command: s.command, durationMs, passed: true });
      } else {
        console.log(`\x1b[31mFAILED\x1b[0m (${durationMs}ms)`);
        const errMessage = (stderr || stdout || err.message).slice(0, 300);
        results.push({
          name: s.name,
          command: s.command,
          durationMs,
          passed: false,
          error: errMessage,
        });
      }
    }
  }

  const overallDuration = Date.now() - overallStart;
  const allPassed = results.every(r => r.passed);

  console.log('\n' + '-'.repeat(72));
  console.log('   BẢNG TỔNG KẾT QUALITY GATES');
  console.log('-'.repeat(72));
  for (const r of results) {
    const statusText = r.passed ? '\x1b[32m✔ PASSED\x1b[0m' : '\x1b[31m✖ FAILED\x1b[0m';
    const timeText = `${r.durationMs}ms`.padStart(9);
    console.log(`  ${statusText}  ${timeText}  ${r.name}`);
    if (!r.passed && r.error) {
      console.log(`         \x1b[33mError: ${r.error.replace(/\n/g, ' ')}\x1b[0m`);
    }
  }
  console.log('-'.repeat(72));
  console.log(`  Tổng thời gian: ${(overallDuration / 1000).toFixed(2)}s`);
  console.log(`  Trạng thái chung: ${allPassed ? '\x1b[32m100% QUALITY GATES ĐẠT CHUẨN\x1b[0m' : '\x1b[31mCÓ BƯỚC THẤT BẠI\x1b[0m'}\n`);

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests().catch(err => {
  console.error('[FATAL] Lỗi không lường trước trong smoke test:', err);
  process.exit(1);
});

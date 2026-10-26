import { resolve, relative } from 'path';
import { existsSync, statSync } from 'fs';
import { reviewProject, getCurrentReport, type ReviewProjectOptions } from './engine.js';
import { runVerification } from './verify.js';
import type { ReviewReport, Finding, FindingSeverity } from './types.js';

// ANSI styling helpers
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const cyan = '\x1b[36m';
const magenta = '\x1b[35m';

function severityBadge(sev: FindingSeverity): string {
  switch (sev) {
    case 'critical': return `${bold}\x1b[41m\x1b[37m CRITICAL ${reset}`;
    case 'high':     return `${bold}${red}[HIGH]${reset}`;
    case 'medium':   return `${yellow}[MEDIUM]${reset}`;
    case 'low':      return `${cyan}[LOW]${reset}`;
    case 'info':     return `${dim}[INFO]${reset}`;
  }
}

function categoryBadge(cat: string): string {
  switch (cat) {
    case 'security':        return `${bold}${red}SECURITY${reset}`;
    case 'bug':             return `${bold}${magenta}BUG${reset}`;
    case 'style':           return `${cyan}STYLE${reset}`;
    case 'maintainability': return `${yellow}MAINTAINABILITY${reset}`;
    default:                return cat.toUpperCase();
  }
}

export function printTextReport(report: ReviewReport): void {
  console.log(`\n${bold}${cyan}======================================================================${reset}`);
  console.log(`${bold}  VIECODIE AI CODE REVIEWER REPORT${reset}`);
  console.log(`${cyan}======================================================================${reset}`);
  console.log(`  ${bold}Dự án:${reset}       ${report.projectName}`);
  console.log(`  ${bold}Đường dẫn:${reset}   ${report.projectRoot}`);
  console.log(`  ${bold}Revision:${reset}    ${report.revision}`);
  console.log(`  ${bold}Thời gian:${reset}   ${report.timestamp}`);
  console.log(`  ${bold}Chế độ:${reset}      ${report.analysisMode.toUpperCase()} (${report.providerInfo.provider} / ${report.providerInfo.model})`);
  if (report.providerInfo.isFallback && report.providerInfo.fallbackReason) {
    console.log(`  ${yellow}⚠ Fallback:${reset}  ${report.providerInfo.fallbackReason}`);
  }
  console.log(`  ${bold}Quét mã:${reset}     ${report.scanScope.totalFilesScanned} tệp tin trong ${report.scanScope.scanDurationMs}ms`);
  console.log(`  ${bold}AST Graph:${reset}   ${report.nodes.length} nodes (${report.nodes.filter(n => n.type === 'function').length} functions), ${report.edges.length} edges`);
  if (report.unresolvedCalls.length > 0) {
    console.log(`  ${dim}Unresolved:${reset}  ${report.unresolvedCalls.length} calls`);
  }
  console.log(`${cyan}----------------------------------------------------------------------${reset}\n`);

  if (report.findings.length === 0) {
    console.log(`  ${green}✓ Không phát hiện vấn đề nào trong phạm vi quét (${report.scanScope.totalFilesScanned} files).${reset}\n`);
    return;
  }

  // Count severities
  const critCount = report.findings.filter(f => f.severity === 'critical').length;
  const highCount = report.findings.filter(f => f.severity === 'high').length;
  const medCount = report.findings.filter(f => f.severity === 'medium').length;
  const lowCount = report.findings.filter(f => f.severity === 'low').length;

  console.log(`  ${bold}Tổng cộng phát hiện ${report.findings.length} vấn đề:${reset}`);
  console.log(`  ${red}${critCount} Critical${reset} | ${red}${highCount} High${reset} | ${yellow}${medCount} Medium${reset} | ${cyan}${lowCount} Low${reset}\n`);

  report.findings.forEach((f, idx) => {
    console.log(`${bold}#${idx + 1} ${severityBadge(f.severity)} ${categoryBadge(f.category)} ${bold}${f.title}${reset}`);
    console.log(`   ${bold}Vị trí:${reset}     ${f.filePath}:${f.line}${f.nodeId ? ` (${f.nodeId})` : ''}`);
    console.log(`   ${bold}Bằng chứng:${reset} ${dim}${f.evidence}${reset}`);
    console.log(`   ${bold}Nguyên nhân:${reset}`);
    console.log(`     ${f.explanation}`);
    console.log(`   ${bold}Đề xuất sửa:${reset}`);
    console.log(`     ${green}${f.suggestion}${reset}`);
    console.log(`   ${dim}Nguồn: ${f.source} | Độ tin cậy: ${f.confidence}${f.confidenceReason ? ` (${f.confidenceReason})` : ''}${reset}\n`);
  });

  console.log(`${cyan}======================================================================${reset}\n`);
}

export async function runReviewCli(argv: string[]): Promise<number> {
  // Parse flags
  const outputFormatIdx = argv.indexOf('--output-format');
  const outputFormat = outputFormatIdx !== -1 ? argv[outputFormatIdx + 1] : 'text';

  const modeIdx = argv.indexOf('--mode');
  const mode = modeIdx !== -1 ? (argv[modeIdx + 1] as ReviewProjectOptions['mode']) : 'rules';

  const isWeb = argv.includes('--web');
  const noOpen = argv.includes('--no-open');

  const portIdx = argv.indexOf('--port');
  const port = portIdx !== -1 ? Number(argv[portIdx + 1]) : 4747;

  // Find target path (first arg that is not flag or flag value)
  let targetPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-')) {
      if (['--output-format', '--mode', '--port'].includes(a)) i++;
      continue;
    }
    if (a !== 'review') {
      targetPath = a;
      break;
    }
  }

  if (!targetPath) {
    targetPath = process.cwd();
  }

  const resolvedPath = resolve(targetPath);
  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isDirectory()) {
    console.error(`viecodie: Đường dẫn dự án không hợp lệ hoặc không tồn tại: ${targetPath}`);
    return 3;
  }

  let report: ReviewReport;
  try {
    report = await reviewProject({ projectRoot: resolvedPath, mode });
  } catch (err) {
    console.error(`viecodie review lỗi: ${err instanceof Error ? err.message : String(err)}`);
    return 3;
  }

  if (outputFormat === 'json') {
    // Pure JSON output for scripting / CI / web consumers
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    printTextReport(report);
  }

  if (isWeb) {
    const { startWeb } = await import('../web/server.js');
    const { spawn } = await import('child_process');

    let web;
    try {
      web = await startWeb({ port, cwd: resolvedPath });
    } catch (err) {
      console.error(`viecodie: Không thể khởi chạy web server tại cổng ${port}: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }

    console.log(`\n  ${green}${bold}Code Reviewer by Graph${reset} đang chạy tại: ${web.url}`);
    console.log(`  Báo cáo review cho dự án ${report.projectName} (revision: ${report.revision}) đã sẵn sàng.`);
    console.log(`  Nhấn Ctrl+C để dừng server.\n`);

    if (!noOpen) {
      const [cmd, ...openArgs] = process.platform === 'win32'
        ? ['cmd', '/c', 'start', '""', web.url]
        : process.platform === 'darwin'
          ? ['open', web.url]
          : ['xdg-open', web.url];
      try {
        spawn(cmd, openArgs, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
      } catch { /* ignore */ }
    }

    return new Promise<number>((resolvePromise) => {
      process.once('SIGINT', async () => {
        await web.close();
        resolvePromise(0);
      });
    });
  }

  // Return exit code: 1 if critical/high findings exist, else 0
  const hasSevere = report.findings.some(f => f.severity === 'critical' || f.severity === 'high');
  return hasSevere ? 1 : 0;
}

export async function runVerifyCli(argv: string[]): Promise<number> {
  const outputFormatIdx = argv.indexOf('--output-format');
  const outputFormat = outputFormatIdx !== -1 ? argv[outputFormatIdx + 1] : 'text';

  const checkIdx = argv.indexOf('--check');
  if (checkIdx === -1 || !argv[checkIdx + 1]) {
    console.error('viecodie: Lệnh verify yêu cầu chỉ định cờ --check "<lệnh kiểm thử>"');
    console.error('Ví dụ: viecodie verify . --check "npm test"');
    return 3;
  }
  const checkCommand = argv[checkIdx + 1];

  // Find target path
  let targetPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-')) {
      if (['--check', '--output-format', '--timeout'].includes(a)) i++;
      continue;
    }
    if (a !== 'verify') {
      targetPath = a;
      break;
    }
  }

  if (!targetPath) {
    targetPath = process.cwd();
  }

  const resolvedPath = resolve(targetPath);
  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isDirectory()) {
    console.error(`viecodie: Đường dẫn dự án không tồn tại: ${targetPath}`);
    return 3;
  }

  // Get current revision if report exists, or fallback to hash of path
  const currentReport = getCurrentReport();
  const baseRevision = currentReport?.revision || 'rev-current';

  const result = await runVerification({
    projectRoot: resolvedPath,
    checkCommand,
    baseRevision,
  });

  if (outputFormat === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    console.log(`\n${bold}${cyan}======================================================================${reset}`);
    console.log(`${bold}  VIECODIE VERIFICATION RUNNER${reset}`);
    console.log(`${cyan}======================================================================${reset}`);
    console.log(`  ${bold}Dự án:${reset}       ${resolvedPath}`);
    console.log(`  ${bold}Lệnh:${reset}        ${result.command}`);
    console.log(`  ${bold}Base Rev:${reset}    ${result.baseRevision}`);
    console.log(`  ${bold}Thời gian:${reset}   ${result.durationMs}ms`);
    console.log(`  ${bold}Exit Code:${reset}   ${result.exitCode ?? 'N/A'}`);

    if (result.status === 'passed') {
      console.log(`  ${bold}Kết quả:${reset}     ${green}${bold}✓ PASSED${reset}`);
    } else if (result.status === 'failed') {
      console.log(`  ${bold}Kết quả:${reset}     ${red}${bold}✕ FAILED${reset}`);
    } else {
      console.log(`  ${bold}Kết quả:${reset}     ${yellow}${bold}${result.status.toUpperCase()}${reset}`);
    }

    if (result.testsSummary) {
      console.log(`  ${bold}Kiểm thử:${reset}    ${green}${result.testsSummary.passed} passed${reset}, ${result.testsSummary.failed > 0 ? red : dim}${result.testsSummary.failed} failed${reset}, ${result.testsSummary.total} total`);
    }

    console.log(`${cyan}----------------- NHẬT KÝ KIỂM THỬ (SANITIZED LOG) ------------------${reset}`);
    console.log(result.sanitizedLog.trim() || `${dim}(Không có đầu ra log)${reset}`);
    console.log(`${cyan}======================================================================${reset}\n`);
  }

  if (result.status === 'passed') return 0;
  if (result.status === 'failed') return 2;
  return 3;
}

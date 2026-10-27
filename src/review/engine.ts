import { resolve, basename, join } from 'path';
import { createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import type { ReviewReport, AnalysisMode } from './types.js';
import { scanProject, type ScannedFile } from './scanner.js';
import { buildAstGraph } from './ast.js';
import { runRules } from './rules.js';
import { runAiEnhancement } from './ai.js';

let activeReport: ReviewReport | null = null;

export function computeRevision(files: ScannedFile[]): string {
  const hash = createHash('sha256');
  const sorted = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  for (const f of sorted) {
    hash.update(`${f.relativePath}:${f.size}:${f.content}\n`);
  }
  return hash.digest('hex').slice(0, 12);
}

export interface ReviewProjectOptions {
  projectRoot: string;
  mode?: AnalysisMode;
  forceRescan?: boolean;
}

export async function reviewProject(options: ReviewProjectOptions): Promise<ReviewReport> {
  const { projectRoot, mode = 'rules' } = options;
  const root = resolve(projectRoot);
  const projectName = basename(root);

  // 1. Scan files
  const { files, scope } = scanProject(root);
  const revision = computeRevision(files);

  // 2. Build AST graph
  const astResult = buildAstGraph(files);

  // 3. Run Rules
  const ruleFindings = runRules(files, astResult);

  // 4. Run AI or Fallback
  const aiResult = await runAiEnhancement(ruleFindings, files, astResult.nodes, mode);

  const reviewId = `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const fileContents: Record<string, string> = {};
  for (const f of files) {
    fileContents[f.relativePath] = f.content;
    const base = f.relativePath.split(/[\\/]/).pop();
    if (base) fileContents[base] = f.content;
  }

  const report: ReviewReport = {
    schemaVersion: 1,
    reviewId,
    revision,
    timestamp: new Date().toISOString(),
    projectName,
    projectRoot: root,
    status: 'completed',
    analysisMode: aiResult.mode,
    providerInfo: aiResult.providerInfo,
    scanScope: scope,
    nodes: astResult.nodes,
    edges: astResult.edges,
    unresolvedCalls: astResult.unresolvedCalls,
    findings: aiResult.findings,
    fileContents,
    isOutdated: false,
  };

  activeReport = report;
  saveReportCache(report);

  return report;
}

export function getCurrentReport(): ReviewReport | null {
  if (activeReport) return activeReport;
  return loadReportCache();
}

export function setCurrentReport(report: ReviewReport): void {
  activeReport = report;
  saveReportCache(report);
}

function getCacheDirs(): string[] {
  const dirs: string[] = [];
  if (process.env.LOCALAPPDATA) {
    dirs.push(join(process.env.LOCALAPPDATA, '.viecodie', 'reports'));
  }
  if (process.env.USERPROFILE) {
    dirs.push(join(process.env.USERPROFILE, '.viecodie', 'reports'));
  }
  if (process.env.HOME && process.env.HOME !== process.env.USERPROFILE) {
    dirs.push(join(process.env.HOME, '.viecodie', 'reports'));
  }
  dirs.push(join(process.cwd(), '.viecodie', 'reports'));
  return dirs;
}

export function saveReportCache(report: ReviewReport): void {
  const dirs = getCacheDirs();
  for (const dir of dirs) {
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const filePath = join(dir, 'latest-review.json');
      writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    } catch {
      // Continue to next dir
    }
  }
}

export function loadReportCache(): ReviewReport | null {
  const dirs = getCacheDirs();
  for (const dir of dirs) {
    try {
      const filePath = join(dir, 'latest-review.json');
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content) as ReviewReport;
        if (parsed && parsed.projectName) {
          return parsed;
        }
      }
    } catch {
      // Continue to next dir
    }
  }
  return null;
}

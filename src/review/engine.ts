import { resolve, basename, join } from 'path';
import { createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, rmSync } from 'fs';
import type { ReviewReport, AnalysisMode } from './types.js';
import { scanProject, type ScannedFile } from './scanner.js';
import { buildAstGraph } from './ast.js';
import { runRules } from './rules.js';
import { runAiEnhancement } from './ai.js';
import { computeSourceHash } from './snapshotService.js';
import { generateCandidates } from './candidateService.js';

let activeReport: ReviewReport | null = null;
const sessionReports = new Map<string, ReviewReport>();

export function clearSessionReports(): void {
  sessionReports.clear();
  activeReport = null;
}

export function clearReportCache(): void {
  activeReport = null;
  sessionReports.clear();
  const dirs = getCacheDirs();
  for (const dir of dirs) {
    try {
      const sessions = join(dir, 'sessions');
      if (existsSync(sessions)) {
        rmSync(sessions, { recursive: true, force: true });
      }
      const projects = join(dir, 'projects');
      if (existsSync(projects)) {
        rmSync(projects, { recursive: true, force: true });
      }
      const latest = join(dir, 'latest-review.json');
      if (existsSync(latest)) {
        unlinkSync(latest);
      }
    } catch {}
  }
}

export function computeRevision(files: ScannedFile[]): string {
  const hash = createHash('sha256');
  const sorted = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  for (const f of sorted) {
    hash.update(`${f.relativePath}:${f.size}:${f.content}\n`);
  }
  return hash.digest('hex').slice(0, 12);
}

export function computeProjectId(projectRoot: string): string {
  const normalized = resolve(projectRoot).toLowerCase().replace(/\\/g, '/');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

export interface ReviewProjectOptions {
  projectRoot: string;
  mode?: AnalysisMode;
  forceRescan?: boolean;
  userRequirement?: string;
  sessionId?: string;
  signal?: AbortSignal;
  maxContextTokens?: number;
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
  const effectiveMode = options.mode ?? 'rules';
  const aiResult = await runAiEnhancement(
    ruleFindings,
    files,
    astResult.nodes,
    effectiveMode,
    options.userRequirement,
    {
      edges: astResult.edges,
      signal: options.signal,
      maxContextTokens: options.maxContextTokens,
      projectRoot: root,
    }
  );

  const reviewId = `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const fileContents: Record<string, string> = {};
  for (const f of files) {
    const norm = f.relativePath.replace(/\\/g, '/');
    fileContents[f.relativePath] = f.content;
    fileContents[norm] = f.content;
    const base = norm.split('/').pop();
    if (base && !fileContents[base]) {
      fileContents[base] = f.content;
    }
  }

  const { getFindingPatch, createPatch } = await import('./patch.js');
  const patchesRecord: Record<string, import('./types.js').Patch> = {};
  for (const f of aiResult.findings) {
    const p = getFindingPatch(root, f);
    if (p) {
      const pId = `patch-${f.id}`;
      const patchObj = createPatch(root, [f], revision, [f.id]);
      if (patchObj.files && patchObj.files.length > 0) {
        patchObj.id = pId;
        patchesRecord[pId] = patchObj;
        f.patchId = pId;
        f.canPatch = true;
        f.patchPreview = p;
      } else {
        f.canPatch = false;
        f.patchId = undefined;
        f.patchPreview = undefined;
      }
    } else {
      f.canPatch = false;
      f.patchId = undefined;
      f.patchPreview = undefined;
    }
  }

  const sourceHash = computeSourceHash(fileContents);
  const runtimeFingerprint: import('./types.js').RuntimeFingerprint = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
  };
  const candidates = generateCandidates(aiResult.findings, patchesRecord, revision);

  const prevReport = getCurrentReport(options.sessionId, root);
  const applyHistory = prevReport?.applyHistory || [];
  const undoHistory = prevReport?.undoHistory || [];

  const report: ReviewReport = {
    schemaVersion: 1,
    reviewId,
    sessionId: options.sessionId,
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
    patches: patchesRecord,
    fileContents,
    isOutdated: false,
    userRequirement: options.userRequirement,
    sourceHash,
    runtimeFingerprint,
    candidates,
    applyHistory,
    undoHistory,
  };

  setCurrentReport(report, options.sessionId);

  return report;
}

export function getCurrentReport(sessionId?: string, projectRoot?: string): ReviewReport | null {
  if (sessionId) {
    const mem = sessionReports.get(sessionId);
    if (mem) {
      if (!projectRoot || computeProjectId(mem.projectRoot) === computeProjectId(projectRoot)) {
        return mem;
      }
    }
    const disk = loadReportCache(sessionId, projectRoot);
    if (disk) {
      sessionReports.set(sessionId, disk);
      return disk;
    }
    return null;
  }

  if (projectRoot) {
    const targetPId = computeProjectId(projectRoot);
    if (activeReport && computeProjectId(activeReport.projectRoot) === targetPId) {
      return activeReport;
    }
    return loadReportCache(undefined, projectRoot);
  }

  if (activeReport) return activeReport;
  return loadReportCache(undefined, process.cwd());
}

export function setCurrentReport(report: ReviewReport | null, sessionId?: string): void {
  if (!report) {
    activeReport = null;
    if (sessionId) sessionReports.delete(sessionId);
    return;
  }
  activeReport = report;
  const sid = sessionId || report.sessionId;
  if (sid) {
    report.sessionId = sid;
    sessionReports.set(sid, report);
  }
  saveReportCache(report, sid);
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

export function saveReportCache(report: ReviewReport, sessionId?: string): void {
  const dirs = getCacheDirs();
  const pId = report.projectId || computeProjectId(report.projectRoot);
  report.projectId = pId;

  for (const dir of dirs) {
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const sid = sessionId || report.sessionId;
      if (sid) {
        const sessionsDir = join(dir, 'sessions');
        if (!existsSync(sessionsDir)) mkdirSync(sessionsDir, { recursive: true });
        const sessionFile = join(sessionsDir, `review-${sid}.json`);
        writeFileSync(sessionFile, JSON.stringify(report, null, 2), 'utf8');
      }

      const projectDir = join(dir, 'projects', pId);
      if (!existsSync(projectDir)) mkdirSync(projectDir, { recursive: true });
      const projectLatest = join(projectDir, 'latest.json');
      writeFileSync(projectLatest, JSON.stringify(report, null, 2), 'utf8');
      if (report.revision) {
        const revFile = join(projectDir, `review-${report.revision}.json`);
        writeFileSync(revFile, JSON.stringify(report, null, 2), 'utf8');
      }
    } catch {
      // Continue to next dir
    }
  }
}

export function loadReportCache(sessionId?: string, projectRoot?: string): ReviewReport | null {
  const dirs = getCacheDirs();
  for (const dir of dirs) {
    try {
      if (sessionId) {
        const sessionFile = join(dir, 'sessions', `review-${sessionId}.json`);
        if (existsSync(sessionFile)) {
          const content = readFileSync(sessionFile, 'utf8');
          const parsed = JSON.parse(content) as ReviewReport;
          if (parsed && (!projectRoot || computeProjectId(parsed.projectRoot) === computeProjectId(projectRoot))) {
            return parsed;
          }
        }
        // Legacy session file fallback
        const legacySession = join(dir, `review-${sessionId}.json`);
        if (existsSync(legacySession)) {
          const content = readFileSync(legacySession, 'utf8');
          const parsed = JSON.parse(content) as ReviewReport;
          if (parsed && (!projectRoot || computeProjectId(parsed.projectRoot) === computeProjectId(projectRoot))) {
            return parsed;
          }
        }
      } else if (projectRoot) {
        const pId = computeProjectId(projectRoot);
        const projectLatest = join(dir, 'projects', pId, 'latest.json');
        if (existsSync(projectLatest)) {
          const content = readFileSync(projectLatest, 'utf8');
          const parsed = JSON.parse(content) as ReviewReport;
          if (parsed && parsed.projectName) {
            return parsed;
          }
        }
      }
    } catch {
      // Continue to next dir
    }
  }
  return null;
}

/**
 * VIECODIE Review Engine Contract v1
 * Data-only TypeScript definitions shared between Core Engine (CLI/API) and Web UI.
 * 
 * IMPORTANT: Pure data types only. No Node.js runtime imports allowed here
 * so that web frontend can safely import type definitions.
 */

export type FindingCategory = 'bug' | 'security' | 'style' | 'maintainability';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingSource = 'rule' | 'ai' | 'both';
export type FindingConfidence = 'certain' | 'high' | 'medium' | 'low';

export type AnalysisMode = 'rules' | 'ai' | 'rules_only_fallback';

export interface ProviderInfo {
  provider: string; // e.g. 'deepseek', 'ollama', 'none'
  model: string;    // e.g. 'deepseek-coder', 'qwen2.5-coder'
  isFallback: boolean;
  fallbackReason?: string;
}

export interface GraphNode {
  id: string;                      // unique node id, e.g. 'file:src/app.ts' or 'fn:src/app.ts:runAudit'
  type: 'file' | 'function';
  name: string;                    // file name or function name
  filePath: string;                // relative to project root
  startLine: number;
  endLine: number;
  callerIds?: string[];            // ids of functions/files calling this
  calleeIds?: string[];            // ids of functions called by this
}

export interface GraphEdge {
  id: string;                      // e.g. 'edge:fnA->fnB'
  sourceId: string;                // caller node id
  targetId: string;                // callee node id
  type: 'import' | 'call';
  evidenceLine: number;
  evidenceSnippet: string;
  resolved: 'resolved' | 'inferred' | 'unresolved';
}

export interface UnresolvedCall {
  callerId: string;
  name: string;
  line: number;
  filePath: string;
  reason: string;
}

export interface Finding {
  id: string;                      // e.g. 'finding-sec-01'
  ruleId: string;                  // e.g. 'SEC_SQL_INJECTION', 'BUG_UNHANDLED_REJECTION'
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  filePath: string;                // relative path to file
  line: number;
  endLine?: number;
  nodeId?: string;                 // linked GraphNode id if applicable
  evidence: string;                // actual code snippet with flaw
  explanation: string;             // why this is an issue (Vietnamese)
  suggestion: string;              // how to remediate (Vietnamese)
  source: FindingSource;
  confidence: FindingConfidence;
  confidenceReason?: string;
}

export interface PatchFile {
  filePath: string;
  oldHash: string;
  newHash: string;
  diff: string;                    // unified diff
  newContent?: string;             // optional full patched content for deterministic apply
}

export type PatchStatus = 'proposed' | 'applied' | 'stale' | 'rejected' | 'failed';

export interface Patch {
  id: string;
  findingIds: string[];
  baseRevision: string;
  files: PatchFile[];
  fullDiff: string;
  status: PatchStatus;
  appliedAt?: string;
  error?: string;
}

export type VerificationStatus = 'not_run' | 'running' | 'passed' | 'failed' | 'error' | 'timed_out';

export interface TestsSummary {
  passed: number;
  failed: number;
  total: number;
  skipped?: number;
}

export interface VerificationResult {
  checkId: string;
  command: string;
  status: VerificationStatus;
  baseRevision: string;
  targetRevision?: string;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  sanitizedLog: string;
  testsSummary?: TestsSummary;
  verifiedAt: string;
}

export interface ScanScope {
  totalFilesScanned: number;
  filesRead: string[];
  filesIgnored: string[];
  ignoreReasons: Record<string, string>;
  scanDurationMs: number;
  limitsReached?: boolean;
}

export interface ReviewReport {
  schemaVersion: 1;
  reviewId: string;
  revision: string;                // SHA/hash of analyzed source tree
  timestamp: string;               // ISO 8601
  projectName: string;
  projectRoot: string;
  status: 'idle' | 'scanning' | 'analyzing' | 'completed' | 'failed';
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  analysisMode: AnalysisMode;
  providerInfo: ProviderInfo;
  scanScope: ScanScope;
  nodes: GraphNode[];
  edges: GraphEdge[];
  unresolvedCalls: UnresolvedCall[];
  findings: Finding[];
  fileContents?: Record<string, string>;
  isOutdated?: boolean;
  patch?: Patch;
  verification?: VerificationResult;
}

// Request & Response types for Local API

export interface ReviewRequest {
  projectPath: string;
  mode?: AnalysisMode;
  forceRescan?: boolean;
}

export interface ReviewResponse {
  jobId: string;
  status: 'started' | 'completed' | 'failed';
  report?: ReviewReport;
  error?: string;
}

export interface PatchRequest {
  reviewId: string;
  findingIds?: string[];           // if omitted, creates patch for all actionable findings
}

export interface ApplyPatchRequest {
  patchId: string;
  baseRevision: string;
  confirm: boolean;
}

export interface ApplyPatchResponse {
  success: boolean;
  newRevision: string;
  modifiedFiles: string[];
  error?: string;
}

export interface VerifyRequest {
  projectPath: string;
  checkCommand: string;            // explicitly configured or selected by user
  confirm: boolean;
}

export interface SourceViewRequest {
  filePath: string;
  revision?: string;
}

export interface SourceViewResponse {
  filePath: string;
  revision: string;
  content: string;
  error?: string;
}

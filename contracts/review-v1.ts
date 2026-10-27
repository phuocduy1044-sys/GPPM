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

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimated?: boolean;
}

export interface AiProvenance {
  selectedFiles: string[];
  selectedNodes: string[];
  graphNeighborhoodSize?: number;
  completedAt?: string;
}

export interface ProviderInfo {
  provider: string; // e.g. 'deepseek', 'ollama', 'none'
  model: string;    // e.g. 'deepseek-coder', 'qwen2.5-coder'
  isFallback: boolean;
  fallbackReason?: string;
  usage?: TokenUsage;
  provenance?: AiProvenance;
}

export interface GraphNode {
  id: string;
  patchId?: string;                      // unique node id, e.g. 'file:src/app.ts' or 'fn:src/app.ts:runAudit'
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
  patchId?: string;
  status?: 'open' | 'applied' | 'stale';
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
  canPatch?: boolean;
  patchPreview?: {
    original: string;
    replacement: string;
    diffText: string;
  };
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
  newRevision?: string;
  reviewId?: string;
  createdAt?: string;
  files: PatchFile[];
  fullDiff: string;
  status: PatchStatus;
  appliedAt?: string;
  error?: string;
  record?: ApplyRecord;
  canUndo?: boolean;
  report?: ReviewReport;
}

export type VerificationStatus = 'not_run' | 'running' | 'passed' | 'failed' | 'error' | 'timed_out' | 'cancelled' | 'no_tests' | 'stale' | 'unsupported';

export interface TestsSummary {
  passed: number;
  failed: number;
  total: number;
  skipped?: number;
}

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  failureMessage?: string;
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
  tests?: TestCase[];
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

export interface RuntimeFingerprint {
  platform: string;
  arch: string;
  nodeVersion: string;
  dependenciesHash?: string;
}

export interface Candidate {
  candidateId: string;
  findingId: string;
  patchId: string;
  patch: Patch;
  baseRevision: string;
  targetRevision?: string;
  patchHash: string;
  status: 'proposed' | 'applied' | 'rejected' | 'undone';
  verificationBefore?: VerificationResult;
  verificationAfter?: VerificationResult;
  createdAt: string;
}

export interface ApplyRecord {
  recordId: string;
  patchId: string;
  candidateId?: string;
  findingIds?: string[];
  baseRevision: string;
  newRevision: string;
  snapshotBeforeId: string;
  snapshotAfterId: string;
  patchHash: string;
  sourceHashBefore?: string;
  sourceHashAfter?: string;
  modifiedFiles: string[];
  appliedAt: string;
  status: 'applied' | 'undone';
}

export interface UndoRecord {
  recordId: string;
  applyRecordId: string;
  patchId: string;
  restoredRevision: string;
  restoredFiles: string[];
  undoneAt: string;
}

export interface ReviewReport {
  schemaVersion: 1;
  reviewId: string;
  sessionId?: string;
  projectId?: string;
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
  patches?: Record<string, Patch>;
  verification?: VerificationResult;
  userRequirement?: string;
  sourceHash?: string;
  testsHash?: string;
  configHash?: string;
  runtimeFingerprint?: RuntimeFingerprint;
  candidates?: Record<string, Candidate>;
  applyHistory?: ApplyRecord[];
  undoHistory?: UndoRecord[];
}

// Request & Response types for Local API

export interface ReviewRequest {
  projectPath: string;
  mode?: AnalysisMode;
  forceRescan?: boolean;
  userRequirement?: string;
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

export type ApplyPatchStatus = 'applied' | 'no_changes' | 'unsupported' | 'stale' | 'failed';

export interface UndoPatchRequest {
  applyRecordId?: string;
  patchId?: string;
  reviewId?: string;
  confirm?: boolean;
}

export interface UndoPatchResponse {
  success: boolean;
  status?: 'undone' | 'no_changes' | 'stale' | 'failed';
  restoredRevision?: string;
  restoredFiles?: string[];
  error?: string;
  report?: ReviewReport;
}

export interface ApplyPatchResponse {
  success: boolean;
  status?: ApplyPatchStatus;
  patchId?: string;
  newRevision: string;
  modifiedFiles: string[];
  error?: string;
  record?: ApplyRecord;
  canUndo?: boolean;
  report?: ReviewReport;
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

export interface ImportedTestFile {
  filePath: string;
  content: string;
}

export interface ImportTestsRequest {
  projectPath?: string;
  testFiles: ImportedTestFile[];
  overwrite?: boolean;
}

export interface ImportTestsResponse {
  success: boolean;
  importedFiles: string[];
  testsHash: string;
  error?: string;
}

export interface DiscoveredCheckCommand {
  kind: 'test_suite' | 'typecheck' | 'linter' | 'build' | 'custom';
  command: string;
  framework?: string;
  isDefault: boolean;
  description?: string;
}

export interface GetTestsResponse {
  testFiles: string[];
  suggestedCommands: DiscoveredCheckCommand[];
  testsHash?: string;
  hasTests: boolean;
}

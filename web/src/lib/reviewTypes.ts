export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low'
export type FindingCategory = 'security' | 'bug' | 'style' | 'maintainability'

export interface Finding {
  id: string
  patchId?: string
  file: string
  line: number
  endLine?: number
  severity: FindingSeverity
  category: FindingCategory
  title: string
  description: string
  evidence: string
  rootCause: string
  triggerCondition: string
  suggestedFix: string
  canPatch?: boolean
  patch?: {
    original: string
    replacement: string
    diffText: string
  }
  source: 'rule' | 'ai' | 'both'
  status: 'open' | 'applied' | 'stale'
}

export interface GraphNode {
  id: string
  file: string
  functionName: string
  startLine: number
  endLine: number
  language: string
  hasIssue?: boolean
  issueCount?: number
  inputsDescription?: string
  outputsDescription?: string
  codeSnippet?: string
  isExternal?: boolean
  calledBy?: string[]
  calls?: { functionName: string; file: string; subCalls?: { functionName: string; file: string }[] }[]
}

export interface GraphEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  type: 'call' | 'cross_file' | 'inferred_http'
  label?: string
}

export interface TestCase {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  durationMs?: number
  errorMessage?: string
}

export interface TestResult {
  status: 'not_run' | 'running' | 'passed' | 'failed' | 'error' | 'timed_out' | 'cancelled' | 'no_tests' | 'stale' | 'unsupported'
  totalTests?: number | null
  failedTests?: number | null
  passedTests?: number | null
  durationMs?: number | null
  score?: string | null
  command: string
  exitCode: number | null
  logOutput: string
  tests?: TestCase[]
}

export interface ReviewProject {
  projectName: string
  revision: string | number
  engineStatus: 'ready' | 'not_connected' | 'analyzing'
  files: { name: string; lineCount: number; issueCount: number; status: string }[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  findings: Finding[]
  patches?: Record<string, any>
  testResult?: TestResult
  fileContents?: Record<string, string>
  isOutdated?: boolean
  projectRoot?: string
  reviewId?: string
  projectId?: string
  rawRevision?: string
}

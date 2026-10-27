export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low'
export type FindingCategory = 'security' | 'bug' | 'style' | 'maintainability'

export interface Finding {
  id: string
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

export interface TestResult {
  status: 'not_run' | 'running' | 'passed' | 'failed' | 'error' | 'timed_out'
  totalTests: number
  failedTests: number
  durationMs: number
  score?: string
  command: string
  exitCode: number
  logOutput: string
}

export interface ReviewProject {
  projectName: string
  revision: number
  engineStatus: 'ready' | 'not_connected' | 'analyzing'
  files: { name: string; lineCount: number; issueCount: number; status: string }[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  findings: Finding[]
  testResult?: TestResult
  fileContents?: Record<string, string>
  isOutdated?: boolean
}

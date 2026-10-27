import type { Finding, GraphNode, GraphEdge, FindingCategory, FindingSeverity, FindingConfidence } from './types.js';
import type { ScannedFile } from './scanner.js';
import { scrubSecrets } from './scrub.js';

export interface GraphContextOptions {
  files: ScannedFile[];
  nodes: GraphNode[];
  edges?: GraphEdge[];
  ruleFindings: Finding[];
  userRequirement?: string;
  maxTokens?: number; // default ~8,000 tokens (approx. 32,000 characters)
}

export interface CallPathImpact {
  seedNodeId: string;
  findingTitle: string;
  ruleId: string;
  severity: string;
  callers: string[];
  callees: string[];
}

export interface SelectedContextResult {
  formattedContext: string;
  topologySummary: string;
  selectedFiles: string[];
  selectedNodes: string[];
  seedNodesCount: number;
  neighborNodesCount: number;
  totalTokensEstimated: number;
}

export interface RawAiFinding {
  ruleId: string;
  category: string;
  severity: string;
  title: string;
  filePath: string;
  line: number;
  endLine?: number;
  evidence: string;
  explanation: string;
  suggestion: string;
  confidence?: string;
}

/**
 * Normalizes file path to forward slash POSIX format.
 */
function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Call Graph-aware Context Selector (eliminates Probe 10).
 * Prioritizes functions with rule findings (Seeds), inbound callers (Data sources / Entry points),
 * outbound callees (Dependencies / Sinks), and packs the most relevant code within token budgets.
 */
export function selectGraphContext(options: GraphContextOptions): SelectedContextResult {
  const {
    files,
    nodes,
    edges = [],
    ruleFindings,
    userRequirement,
    maxTokens = 8000,
  } = options;

  const maxChars = maxTokens * 4;

  // 1. Index files by normalized path
  const fileMap = new Map<string, ScannedFile>();
  for (const f of files) {
    fileMap.set(normPath(f.relativePath), f);
  }

  // 2. Index nodes and build caller/callee adjacency lists
  const nodeMap = new Map<string, GraphNode>();
  const callersMap = new Map<string, Set<string>>();
  const calleesMap = new Map<string, Set<string>>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    callersMap.set(node.id, new Set(node.callerIds || []));
    calleesMap.set(node.id, new Set(node.calleeIds || []));
  }

  // Augment caller/callee sets using edges
  for (const edge of edges) {
    if (edge.type === 'call') {
      if (!calleesMap.has(edge.sourceId)) calleesMap.set(edge.sourceId, new Set());
      calleesMap.get(edge.sourceId)!.add(edge.targetId);

      if (!callersMap.has(edge.targetId)) callersMap.set(edge.targetId, new Set());
      callersMap.get(edge.targetId)!.add(edge.sourceId);
    }
  }

  // 3. Identify Seed Nodes from Rule Findings
  const seedNodeIds = new Set<string>();
  const seedFindingMap = new Map<string, Finding[]>();
  const seedFiles = new Set<string>();

  for (const finding of ruleFindings) {
    const findingPath = normPath(finding.filePath);
    seedFiles.add(findingPath);

    // Find function node containing finding.line
    let matchedNode: GraphNode | undefined;
    for (const node of nodes) {
      if (
        node.type === 'function' &&
        normPath(node.filePath) === findingPath &&
        node.startLine <= finding.line &&
        finding.line <= node.endLine
      ) {
        matchedNode = node;
        break;
      }
    }

    if (matchedNode) {
      seedNodeIds.add(matchedNode.id);
      if (!seedFindingMap.has(matchedNode.id)) {
        seedFindingMap.set(matchedNode.id, []);
      }
      seedFindingMap.get(matchedNode.id)!.push(finding);
    } else {
      // Top-level or file-level finding
      const fileNodeId = `file:${findingPath}`;
      seedNodeIds.add(fileNodeId);
      if (!seedFindingMap.has(fileNodeId)) {
        seedFindingMap.set(fileNodeId, []);
      }
      seedFindingMap.get(fileNodeId)!.push(finding);
    }
  }

  // If userRequirement provided, match keyword seeds
  if (userRequirement) {
    const reqWords = userRequirement
      .toLowerCase()
      .split(/[^a-zA-Z0-9_]+/)
      .filter(w => w.length >= 3);

    for (const node of nodes) {
      const lowerName = node.name.toLowerCase();
      const lowerPath = node.filePath.toLowerCase();
      if (reqWords.some(w => lowerName.includes(w) || lowerPath.includes(w))) {
        seedNodeIds.add(node.id);
        seedFiles.add(normPath(node.filePath));
      }
    }
  }

  // If no seeds found (e.g. clean repo, no findings), pick entry point files or highest degree nodes
  if (seedNodeIds.size === 0) {
    const sortedByDegree = [...nodes].sort((a, b) => {
      const degA = (callersMap.get(a.id)?.size || 0) + (calleesMap.get(a.id)?.size || 0);
      const degB = (callersMap.get(b.id)?.size || 0) + (calleesMap.get(b.id)?.size || 0);
      return degB - degA;
    });

    for (const topNode of sortedByDegree.slice(0, 5)) {
      seedNodeIds.add(topNode.id);
      seedFiles.add(normPath(topNode.filePath));
    }
  }

  // 4. Graph Neighborhood Expansion (1-hop callers and callees)
  const hop1CallerIds = new Set<string>();
  const hop1CalleeIds = new Set<string>();
  const impacts: CallPathImpact[] = [];

  for (const seedId of seedNodeIds) {
    const callers = Array.from(callersMap.get(seedId) || []);
    const callees = Array.from(calleesMap.get(seedId) || []);

    for (const c of callers) hop1CallerIds.add(c);
    for (const c of callees) hop1CalleeIds.add(c);

    const findings = seedFindingMap.get(seedId) || [];
    const mainFinding = findings[0];

    impacts.push({
      seedNodeId: seedId,
      findingTitle: mainFinding ? mainFinding.title : 'Focus target',
      ruleId: mainFinding ? mainFinding.ruleId : 'CONTEXT_SEED',
      severity: mainFinding ? mainFinding.severity : 'info',
      callers,
      callees,
    });
  }

  // 5. Construct Call Graph Topology Summary
  const topologyLines: string[] = ['=== CALL GRAPH TOPOLOGY & IMPACT PATHS ==='];
  if (impacts.length === 0) {
    topologyLines.push('(No call graph nodes identified)');
  } else {
    for (const imp of impacts) {
      topologyLines.push(`* [TARGET SEED] ${imp.seedNodeId} [${imp.ruleId}: ${imp.severity.toUpperCase()}]`);
      if (imp.callers.length > 0) {
        topologyLines.push(`    <- Inbound Callers: ${imp.callers.join(', ')}`);
      } else {
        topologyLines.push(`    <- Inbound Callers: (None / Entrypoint)`);
      }
      if (imp.callees.length > 0) {
        topologyLines.push(`    -> Outbound Callees: ${imp.callees.join(', ')}`);
      } else {
        topologyLines.push(`    -> Outbound Callees: (None / Leaf function)`);
      }
    }
  }
  const topologySummary = topologyLines.join('\n');

  // 6. Gather Code Context Prioritized by Call Graph
  const selectedFiles = new Set<string>();
  const selectedNodes = new Set<string>();
  const contextSections: string[] = [topologySummary, '\n=== RELEVANT CODE CONTEXT ==='];
  let currentChars = contextSections.join('\n').length;

  // Helper to extract function or file snippet
  function extractNodeSnippet(node: GraphNode, role: string): string | null {
    const file = fileMap.get(normPath(node.filePath));
    if (!file) return null;

    selectedFiles.add(normPath(node.filePath));
    selectedNodes.add(node.id);

    const lines = file.content.split('\n');
    const start = Math.max(0, node.startLine - 2);
    const end = Math.min(lines.length, node.endLine + 2);
    const slice = lines.slice(start, end).join('\n');
    const clean = scrubSecrets(slice);

    return `--- [${role.toUpperCase()}] Node: ${node.id} (${node.filePath}:${node.startLine}-${node.endLine}) ---\n${clean}`;
  }

  // Priority 1: Seed Nodes (Functions with Rule Findings)
  for (const seedId of seedNodeIds) {
    const node = nodeMap.get(seedId);
    if (node && node.type === 'function') {
      const snippet = extractNodeSnippet(node, 'Seed Function - Vulnerability Location');
      if (snippet && currentChars + snippet.length <= maxChars) {
        contextSections.push(snippet);
        currentChars += snippet.length;
      }
    } else {
      // File-level seed
      const p = seedId.replace(/^file:/, '');
      const file = fileMap.get(normPath(p));
      if (file) {
        selectedFiles.add(normPath(p));
        selectedNodes.add(seedId);
        const clean = scrubSecrets(file.content.slice(0, 3000));
        const snippet = `--- [SEED FILE] ${file.relativePath} ---\n${clean}`;
        if (currentChars + snippet.length <= maxChars) {
          contextSections.push(snippet);
          currentChars += snippet.length;
        }
      }
    }
  }

  // Priority 2: 1-Hop Callers (Inbound data sources / callers)
  for (const callerId of hop1CallerIds) {
    if (selectedNodes.has(callerId)) continue;
    const node = nodeMap.get(callerId);
    if (node) {
      const snippet = extractNodeSnippet(node, 'Inbound Caller - Upstream Entry/Execution');
      if (snippet && currentChars + snippet.length <= maxChars) {
        contextSections.push(snippet);
        currentChars += snippet.length;
      }
    }
  }

  // Priority 3: 1-Hop Callees (Outbound sinks / dependencies)
  for (const calleeId of hop1CalleeIds) {
    if (selectedNodes.has(calleeId)) continue;
    const node = nodeMap.get(calleeId);
    if (node) {
      const snippet = extractNodeSnippet(node, 'Outbound Callee - Downstream Dependency/Sink');
      if (snippet && currentChars + snippet.length <= maxChars) {
        contextSections.push(snippet);
        currentChars += snippet.length;
      }
    }
  }

  // Priority 4: Enclosing files containing seeds if space permits
  for (const seedFilePath of seedFiles) {
    if (currentChars >= maxChars) break;
    const file = fileMap.get(seedFilePath);
    if (file && !contextSections.some(s => s.includes(`--- [FILE CONTEXT] ${file.relativePath}`))) {
      selectedFiles.add(seedFilePath);
      const clean = scrubSecrets(file.content.slice(0, 2500));
      const snippet = `--- [FILE CONTEXT] ${file.relativePath} ---\n${clean}`;
      if (currentChars + snippet.length <= maxChars) {
        contextSections.push(snippet);
        currentChars += snippet.length;
      }
    }
  }

  // Priority 5: Other remaining files only if budget has ample remaining capacity
  for (const file of files) {
    if (currentChars >= maxChars) break;
    const norm = normPath(file.relativePath);
    if (selectedFiles.has(norm)) continue;

    selectedFiles.add(norm);
    const clean = scrubSecrets(file.content.slice(0, 1500));
    const snippet = `--- [ADDITIONAL FILE] ${file.relativePath} ---\n${clean}`;
    if (currentChars + snippet.length <= maxChars) {
      contextSections.push(snippet);
      currentChars += snippet.length;
    }
  }

  const formattedContext = contextSections.join('\n\n');
  const neighborNodesCount = hop1CallerIds.size + hop1CalleeIds.size;
  const totalTokensEstimated = Math.ceil(formattedContext.length / 4);

  return {
    formattedContext,
    topologySummary,
    selectedFiles: Array.from(selectedFiles),
    selectedNodes: Array.from(selectedNodes),
    seedNodesCount: seedNodeIds.size,
    neighborNodesCount,
    totalTokensEstimated,
  };
}

/**
 * Validates and sanitizes an AI-generated finding against true codebase AST & files.
 * Prevents hallucinated findings on non-existent files or fake lines.
 */
export function validateAiFinding(
  raw: RawAiFinding,
  files: ScannedFile[],
  nodes: GraphNode[],
  idGenerator: () => string
): Finding | null {
  if (!raw.filePath || !raw.title || typeof raw.line !== 'number') {
    return null;
  }

  const normTarget = normPath(raw.filePath);
  const matchedFile = files.find(f => normPath(f.relativePath) === normTarget);
  if (!matchedFile) {
    // Hallucinated file path
    return null;
  }

  const lines = matchedFile.content.split('\n');
  if (raw.line < 1 || raw.line > lines.length) {
    // Hallucinated line number outside file bounds
    return null;
  }

  const endLine = raw.endLine && raw.endLine >= raw.line && raw.endLine <= lines.length
    ? raw.endLine
    : raw.line;

  // Validate evidence: Check if raw.evidence appears in file content (with whitespace tolerance)
  const rawEvidence = (raw.evidence || '').trim();
  const fileContentNorm = matchedFile.content.replace(/\r\n/g, '\n');
  const evidenceNorm = rawEvidence.replace(/\r\n/g, '\n');

  let verifiedEvidence = rawEvidence;
  if (!fileContentNorm.includes(evidenceNorm)) {
    // Check line snippet as fallback
    const targetLineSnippet = lines[raw.line - 1]?.trim() || '';
    if (targetLineSnippet.length > 0) {
      verifiedEvidence = targetLineSnippet;
    } else {
      // Evidence completely absent and line is empty -> reject hallucination
      return null;
    }
  }

  // Resolve matching GraphNode
  let matchedNodeId: string | undefined;
  for (const node of nodes) {
    if (
      node.type === 'function' &&
      normPath(node.filePath) === normTarget &&
      node.startLine <= raw.line &&
      raw.line <= node.endLine
    ) {
      matchedNodeId = node.id;
      break;
    }
  }

  const categoryEnum: FindingCategory = ['bug', 'security', 'style', 'maintainability'].includes(raw.category)
    ? (raw.category as FindingCategory)
    : 'maintainability';

  const severityEnum: FindingSeverity = ['critical', 'high', 'medium', 'low', 'info'].includes(raw.severity)
    ? (raw.severity as FindingSeverity)
    : 'medium';

  const confidenceEnum: FindingConfidence = ['certain', 'high', 'medium', 'low'].includes(raw.confidence || '')
    ? (raw.confidence as FindingConfidence)
    : 'high';

  return {
    id: idGenerator(),
    ruleId: raw.ruleId || 'AI_DETECTED_ISSUE',
    category: categoryEnum,
    severity: severityEnum,
    title: scrubSecrets(raw.title),
    filePath: matchedFile.relativePath,
    line: raw.line,
    endLine,
    nodeId: matchedNodeId,
    evidence: scrubSecrets(verifiedEvidence),
    explanation: scrubSecrets(raw.explanation || 'Phát hiện bởi mô hình AI dựa trên phân tích Call Graph.'),
    suggestion: scrubSecrets(raw.suggestion || 'Xem xét tái cấu trúc hoặc áp dụng kiểm tra hợp lệ.'),
    source: 'ai',
    confidence: confidenceEnum,
  };
}

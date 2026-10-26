import ts from 'typescript';
import { dirname, join, normalize } from 'path';
import type { GraphNode, GraphEdge, UnresolvedCall } from './types.js';
import type { ScannedFile } from './scanner.js';

export interface AstAnalysisResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  unresolvedCalls: UnresolvedCall[];
  sourceFiles: Map<string, ts.SourceFile>;
  functionNodesMap: Map<string, GraphNode>;
}

interface LocalFunctionInfo {
  name: string;
  node: GraphNode;
  astNode: ts.Node;
}

interface ImportInfo {
  importedSymbol: string;
  sourceModule: string;
  resolvedFilePath?: string;
  line: number;
}

export function buildAstGraph(files: ScannedFile[]): AstAnalysisResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const unresolvedCalls: UnresolvedCall[] = [];
  const sourceFiles = new Map<string, ts.SourceFile>();
  const functionNodesMap = new Map<string, GraphNode>();

  const fileMap = new Map<string, ScannedFile>();
  for (const f of files) {
    fileMap.set(f.relativePath, f);
  }

  // Parse each file into ts.SourceFile and create file nodes
  const parsedFiles: {
    scanned: ScannedFile;
    sourceFile: ts.SourceFile;
    functions: LocalFunctionInfo[];
    imports: ImportInfo[];
  }[] = [];

  for (const file of files) {
    const sourceFile = ts.createSourceFile(
      file.relativePath,
      file.content,
      ts.ScriptTarget.Latest,
      true,
      file.relativePath.endsWith('.tsx') || file.relativePath.endsWith('.jsx')
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS
    );
    sourceFiles.set(file.relativePath, sourceFile);

    const lineCount = file.content.split('\n').length;
    const fileNode: GraphNode = {
      id: `file:${file.relativePath}`,
      type: 'file',
      name: file.relativePath,
      filePath: file.relativePath,
      startLine: 1,
      endLine: lineCount,
      callerIds: [],
      calleeIds: [],
    };
    nodes.push(fileNode);

    parsedFiles.push({
      scanned: file,
      sourceFile,
      functions: [],
      imports: [],
    });
  }

  // Helper to resolve import paths to relative files
  function resolveImportPath(currentFile: string, moduleSpecifier: string): string | undefined {
    if (!moduleSpecifier.startsWith('.')) return undefined; // External package
    const currentDir = dirname(currentFile);
    const basePath = normalize(join(currentDir, moduleSpecifier)).replace(/\\/g, '/');

    // Candidate extensions
    const candidates = [
      basePath,
      basePath + '.ts',
      basePath + '.tsx',
      basePath + '.js',
      basePath + '.jsx',
      basePath + '/index.ts',
      basePath + '/index.js',
    ];

    for (const cand of candidates) {
      if (fileMap.has(cand)) return cand;
    }
    return undefined;
  }

  // Phase 1: Collect functions & imports
  for (const item of parsedFiles) {
    const { scanned, sourceFile, functions, imports } = item;
    const lines = scanned.content.split('\n');

    function visitNode(node: ts.Node) {
      // Imports
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const resolved = resolveImportPath(scanned.relativePath, spec);

        if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const el of node.importClause.namedBindings.elements) {
            imports.push({
              importedSymbol: el.name.text,
              sourceModule: spec,
              resolvedFilePath: resolved,
              line,
            });
          }
        } else if (node.importClause?.name) {
          imports.push({
            importedSymbol: node.importClause.name.text,
            sourceModule: spec,
            resolvedFilePath: resolved,
            line,
          });
        }

        if (resolved) {
          const edgeId = `edge:import:${scanned.relativePath}->${resolved}`;
          if (!edges.some(e => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              sourceId: `file:${scanned.relativePath}`,
              targetId: `file:${resolved}`,
              type: 'import',
              evidenceLine: line,
              evidenceSnippet: lines[line - 1]?.trim() || `import from '${spec}';`,
              resolved: 'resolved',
            });
          }
        }
      }

      // Functions
      let fnName: string | undefined;
      let fnNode: ts.Node | undefined;

      if (ts.isFunctionDeclaration(node) && node.name) {
        fnName = node.name.text;
        fnNode = node;
      } else if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        fnName = node.name.text;
        fnNode = node;
      } else if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
      ) {
        fnName = node.name.text;
        fnNode = node.initializer;
      }

      if (fnName && fnNode) {
        const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const funcGraphNode: GraphNode = {
          id: `fn:${scanned.relativePath}:${fnName}`,
          type: 'function',
          name: fnName,
          filePath: scanned.relativePath,
          startLine: startPos.line + 1,
          endLine: endPos.line + 1,
          callerIds: [],
          calleeIds: [],
        };
        nodes.push(funcGraphNode);
        functionNodesMap.set(funcGraphNode.id, funcGraphNode);
        functions.push({
          name: fnName,
          node: funcGraphNode,
          astNode: fnNode,
        });
      }

      ts.forEachChild(node, visitNode);
    }

    visitNode(sourceFile);
  }

  // Phase 2: Resolve function calls & connect edges
  for (const item of parsedFiles) {
    const { scanned, sourceFile, functions, imports } = item;
    const lines = scanned.content.split('\n');

    for (const fnInfo of functions) {
      function findCalls(node: ts.Node) {
        if (ts.isCallExpression(node)) {
          const callLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          const snippet = lines[callLine - 1]?.trim() || node.getText(sourceFile);

          let calledName: string | undefined;
          let callerId = fnInfo.node.id;

          if (ts.isIdentifier(node.expression)) {
            calledName = node.expression.text;
          } else if (ts.isPropertyAccessExpression(node.expression)) {
            calledName = node.expression.name.text;
          }

          if (calledName) {
            let targetFnNode: GraphNode | undefined;

            // 1. Check if called function is declared in same file
            const localFn = functions.find(f => f.name === calledName);
            if (localFn && localFn.node.id !== callerId) {
              targetFnNode = localFn.node;
            }

            // 2. Check if called function was imported from another file
            if (!targetFnNode) {
              const imp = imports.find(i => i.importedSymbol === calledName);
              if (imp && imp.resolvedFilePath) {
                const targetId = `fn:${imp.resolvedFilePath}:${calledName}`;
                targetFnNode = functionNodesMap.get(targetId);
              }
            }

            // 3. Check globally across other files if unique
            if (!targetFnNode) {
              const matches = Array.from(functionNodesMap.values()).filter(fn => fn.name === calledName);
              if (matches.length === 1) {
                targetFnNode = matches[0];
              }
            }

            if (targetFnNode) {
              // Add relations
              if (!fnInfo.node.calleeIds?.includes(targetFnNode.id)) {
                fnInfo.node.calleeIds?.push(targetFnNode.id);
              }
              if (!targetFnNode.callerIds?.includes(fnInfo.node.id)) {
                targetFnNode.callerIds?.push(fnInfo.node.id);
              }

              const edgeId = `edge:call:${fnInfo.node.id}->${targetFnNode.id}`;
              if (!edges.some(e => e.id === edgeId)) {
                edges.push({
                  id: edgeId,
                  sourceId: fnInfo.node.id,
                  targetId: targetFnNode.id,
                  type: 'call',
                  evidenceLine: callLine,
                  evidenceSnippet: snippet,
                  resolved: 'resolved',
                });
              }
            } else {
              // Unresolved call
              const isCommonBuiltin = [
                'log', 'info', 'warn', 'error', 'push', 'pop', 'shift', 'unshift',
                'map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every',
                'join', 'split', 'replace', 'trim', 'toLowerCase', 'toUpperCase',
                'includes', 'startsWith', 'endsWith', 'slice', 'substring',
                'then', 'catch', 'finally', 'resolve', 'reject',
                'parse', 'stringify', 'assign', 'keys', 'values', 'entries',
              ].includes(calledName);

              if (!isCommonBuiltin) {
                unresolvedCalls.push({
                  callerId: fnInfo.node.id,
                  name: calledName,
                  line: callLine,
                  filePath: scanned.relativePath,
                  reason: `Call to '${calledName}' could not be statically resolved to a local or imported function`,
                });
              }
            }
          }
        }

        ts.forEachChild(node, findCalls);
      }

      findCalls(fnInfo.astNode);
    }
  }

  return {
    nodes,
    edges,
    unresolvedCalls,
    sourceFiles,
    functionNodesMap,
  };
}

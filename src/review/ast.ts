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
  program?: ts.Program;
  typeChecker?: ts.TypeChecker;
}

interface LocalFunctionInfo {
  name: string;
  qualifiedName: string;
  enclosingScope?: string;
  isMethod: boolean;
  node: GraphNode;
  astNode: ts.Node;
}

interface ImportInfo {
  localName: string;
  exportedName: string;
  isNamespace?: boolean;
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
    const normalized = f.relativePath.replace(/\\/g, '/');
    fileMap.set(normalized, f);
    fileMap.set(f.relativePath, f);
  }

  // Helper to resolve import paths to relative files
  function resolveImportPath(currentFile: string, moduleSpecifier: string): string | undefined {
    if (!moduleSpecifier.startsWith('.')) return undefined; // External package
    const currentDir = dirname(currentFile);
    const basePath = normalize(join(currentDir, moduleSpecifier)).replace(/\\/g, '/');
    const withoutExt = basePath.replace(/\.[a-zA-Z0-9]+$/, '');

    // Candidate extensions (including TypeScript ESM where import specifies .js for a .ts file)
    const candidates = [
      basePath,
      withoutExt + '.ts',
      withoutExt + '.tsx',
      withoutExt + '.js',
      withoutExt + '.jsx',
      withoutExt + '.mjs',
      withoutExt + '.cjs',
      basePath + '.ts',
      basePath + '.tsx',
      basePath + '.js',
      basePath + '/index.ts',
      basePath + '/index.js',
      basePath + '/index.tsx',
      withoutExt + '/index.ts',
      withoutExt + '/index.js',
    ];

    for (const cand of candidates) {
      if (fileMap.has(cand)) return cand;
    }
    return undefined;
  }

  // Parse each file into ts.SourceFile and create file nodes
  const parsedFiles: {
    scanned: ScannedFile;
    sourceFile: ts.SourceFile;
    functions: LocalFunctionInfo[];
    imports: ImportInfo[];
  }[] = [];

  for (const file of files) {
    const normRel = file.relativePath.replace(/\\/g, '/');
    const sourceFile = ts.createSourceFile(
      normRel,
      file.content,
      ts.ScriptTarget.Latest,
      true,
      normRel.endsWith('.tsx') || normRel.endsWith('.jsx')
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS
    );
    sourceFiles.set(normRel, sourceFile);
    sourceFiles.set(file.relativePath, sourceFile);

    const lineCount = file.content.split('\n').length;
    const fileNode: GraphNode = {
      id: `file:${normRel}`,
      type: 'file',
      name: normRel, // Keep full normalized relative path to avoid collision between a/index.ts and b/index.ts
      filePath: normRel,
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

  // Phase 1: Collect functions & imports
  for (const item of parsedFiles) {
    const { scanned, sourceFile, functions, imports } = item;
    const normRel = scanned.relativePath.replace(/\\/g, '/');
    const lines = scanned.content.split('\n');

    function visitNode(node: ts.Node) {
      // 1. Imports
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const resolved = resolveImportPath(normRel, spec);

        if (node.importClause) {
          // Named imports: import { a as b, c } from '...'
          if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            for (const el of node.importClause.namedBindings.elements) {
              const localName = el.name.text;
              const exportedName = el.propertyName ? el.propertyName.text : el.name.text;
              imports.push({
                localName,
                exportedName,
                sourceModule: spec,
                resolvedFilePath: resolved,
                line,
              });
            }
          }
          // Namespace import: import * as ns from '...'
          else if (node.importClause.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
            const localName = node.importClause.namedBindings.name.text;
            imports.push({
              localName,
              exportedName: '*',
              isNamespace: true,
              sourceModule: spec,
              resolvedFilePath: resolved,
              line,
            });
          }
          // Default import: import def from '...'
          if (node.importClause.name) {
            imports.push({
              localName: node.importClause.name.text,
              exportedName: 'default',
              sourceModule: spec,
              resolvedFilePath: resolved,
              line,
            });
          }
        }

        if (resolved) {
          const edgeId = `edge:import:${normRel}->${resolved}`;
          if (!edges.some(e => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              sourceId: `file:${normRel}`,
              targetId: `file:${resolved}`,
              type: 'import',
              evidenceLine: line,
              evidenceSnippet: lines[line - 1]?.trim() || `import from '${spec}';`,
              resolved: 'resolved',
            });
          }
        }
      }

      // 2. Functions & Methods
      let fnName: string | undefined;
      let fnNode: ts.Node | undefined;
      let isMethod = false;
      let enclosingScope: string | undefined;

      // Helper to find enclosing class or object
      function getEnclosingScope(n: ts.Node): string | undefined {
        let parent = n.parent;
        while (parent && !ts.isSourceFile(parent)) {
          if (ts.isClassDeclaration(parent) && parent.name) {
            return parent.name.text;
          }
          if (ts.isClassExpression(parent) && parent.name) {
            return parent.name.text;
          }
          if (
            ts.isVariableDeclaration(parent) &&
            ts.isIdentifier(parent.name) &&
            parent.initializer &&
            ts.isObjectLiteralExpression(parent.initializer)
          ) {
            return parent.name.text;
          }
          parent = parent.parent;
        }
        return undefined;
      }

      if (ts.isFunctionDeclaration(node) && node.name) {
        fnName = node.name.text;
        fnNode = node;
      } else if (ts.isMethodDeclaration(node) && node.name) {
        fnName = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sourceFile);
        fnNode = node;
        isMethod = true;
        enclosingScope = getEnclosingScope(node);
      } else if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
      ) {
        fnName = node.name.text;
        fnNode = node.initializer;
      } else if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
      ) {
        fnName = node.name.text;
        fnNode = node.initializer;
        isMethod = true;
        enclosingScope = getEnclosingScope(node);
      }

      if (fnName && fnNode) {
        const qualifiedName = enclosingScope ? `${enclosingScope}.${fnName}` : fnName;
        const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const funcGraphNode: GraphNode = {
          id: `fn:${normRel}:${qualifiedName}`,
          type: 'function',
          name: qualifiedName,
          filePath: normRel,
          startLine: startPos.line + 1,
          endLine: endPos.line + 1,
          callerIds: [],
          calleeIds: [],
        };

        nodes.push(funcGraphNode);
        functionNodesMap.set(funcGraphNode.id, funcGraphNode);
        functions.push({
          name: fnName,
          qualifiedName,
          enclosingScope,
          isMethod,
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
    const normRel = scanned.relativePath.replace(/\\/g, '/');
    const lines = scanned.content.split('\n');

    for (const fnInfo of functions) {
      function findCalls(node: ts.Node) {
        if (ts.isCallExpression(node)) {
          const callLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          const snippet = lines[callLine - 1]?.trim() || node.getText(sourceFile);

          let calledName: string | undefined;
          let isPropertyCall = false;
          let receiverObj: string | undefined;

          if (ts.isIdentifier(node.expression)) {
            calledName = node.expression.text;
          } else if (ts.isPropertyAccessExpression(node.expression)) {
            isPropertyCall = true;
            calledName = node.expression.name.text;
            receiverObj = node.expression.expression.getText(sourceFile);
          }

          if (calledName) {
            let targetFnNode: GraphNode | undefined;

            if (isPropertyCall && receiverObj) {
              // --- Property / Method Call Resolution (e.g. obj.method() or this.method()) ---
              
              // 1. `this.methodName()` inside a class
              if (receiverObj === 'this' && fnInfo.enclosingScope) {
                const targetId = `fn:${normRel}:${fnInfo.enclosingScope}.${calledName}`;
                targetFnNode = functionNodesMap.get(targetId);
              }

              // 2. Namespace call (e.g. `import * as api from './api'; api.fetch()`)
              if (!targetFnNode) {
                const nsImp = imports.find(i => i.isNamespace && i.localName === receiverObj);
                if (nsImp && nsImp.resolvedFilePath) {
                  const targetId = `fn:${nsImp.resolvedFilePath}:${calledName}`;
                  targetFnNode = functionNodesMap.get(targetId);
                }
              }

              // 3. Local class / object method call (e.g. `Admin.delete()` or `userService.getUser()`)
              if (!targetFnNode) {
                const localQualified = `${receiverObj}.${calledName}`;
                const targetId = `fn:${normRel}:${localQualified}`;
                targetFnNode = functionNodesMap.get(targetId);
              }

              // 4. Imported class / object method call (e.g. `import { Admin } from './models'; Admin.delete()`)
              if (!targetFnNode) {
                const classImp = imports.find(i => i.localName === receiverObj);
                if (classImp && classImp.resolvedFilePath) {
                  const targetId = `fn:${classImp.resolvedFilePath}:${classImp.exportedName}.${calledName}`;
                  targetFnNode = functionNodesMap.get(targetId);
                }
              }

              // IMPORTANT: Do NOT fall back to global free-standing functions for property access!
              // That fixes Probe 08 (object method nối nhầm hàm độc lập).
            } else {
              // --- Direct / Unqualified Function Call Resolution (e.g. `myFunc()`) ---

              // 1. Check local top-level function in same file
              const localFn = functions.find(f => !f.isMethod && f.name === calledName);
              if (localFn && localFn.node.id !== fnInfo.node.id) {
                targetFnNode = localFn.node;
              }

              // 2. Check imported function (with ALIAS support!)
              if (!targetFnNode) {
                const imp = imports.find(i => i.localName === calledName);
                if (imp && imp.resolvedFilePath) {
                  // Resolve using the original exportedName, NOT the local alias!
                  // Fixes Probe 08 (Import alias unresolved).
                  const targetName = imp.exportedName === 'default' ? calledName : imp.exportedName;
                  const targetId = `fn:${imp.resolvedFilePath}:${targetName}`;
                  targetFnNode = functionNodesMap.get(targetId);

                  // If not found by exact name and exportedName is 'default', find any default in target file
                  if (!targetFnNode && imp.exportedName === 'default') {
                    const matchInFile = Array.from(functionNodesMap.values()).find(
                      fn => fn.filePath === imp.resolvedFilePath && (fn.name === 'default' || !fn.name.includes('.'))
                    );
                    if (matchInFile) targetFnNode = matchInFile;
                  }
                }
              }

              // 3. Check globally across other files if unique AND is a free-standing function
              if (!targetFnNode) {
                const matches = Array.from(functionNodesMap.values()).filter(
                  fn => fn.name === calledName && !fn.name.includes('.')
                );
                if (matches.length === 1) {
                  targetFnNode = matches[0];
                }
              }
            }

            if (targetFnNode) {
              // Connect caller and callee
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
                'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
                'require', 'import',
              ].includes(calledName);

              if (!isCommonBuiltin) {
                unresolvedCalls.push({
                  callerId: fnInfo.node.id,
                  name: calledName,
                  line: callLine,
                  filePath: normRel,
                  reason: `Call to '${isPropertyCall ? `${receiverObj}.${calledName}` : calledName}' could not be statically resolved to a declaration`,
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

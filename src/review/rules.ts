import ts from 'typescript';
import type { Finding } from './types.js';
import type { AstAnalysisResult } from './ast.js';
import type { ScannedFile } from './scanner.js';

export function runRules(files: ScannedFile[], astResult: AstAnalysisResult): Finding[] {
  const findings: Finding[] = [];
  let findingCounter = 1;

  function nextId(prefix: string): string {
    return `find-${prefix}-${String(findingCounter++).padStart(2, '0')}`;
  }

  for (const file of files) {
    const sourceFile = astResult.sourceFiles.get(file.relativePath);
    if (!sourceFile) continue;

    const lines = file.content.split('\n');

    // Helper to find enclosing function node id
    function getEnclosingFunctionId(pos: number): string | undefined {
      const line = sourceFile!.getLineAndCharacterOfPosition(pos).line + 1;
      for (const node of astResult.nodes) {
        if (node.type === 'function' && node.filePath === file.relativePath) {
          if (line >= node.startLine && line <= node.endLine) {
            return node.id;
          }
        }
      }
      return undefined;
    }

    const isTestFile = /(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.[a-z]+$/i.test(file.relativePath);
    if (isTestFile) continue; // Skip test files from static production issue rules

    // Helper to find variable initializer scoped to current block/function
    function findScopedInitializer(ident: ts.Identifier, fromNode: ts.Node): ts.Expression | undefined {
      let current: ts.Node | undefined = fromNode;
      while (current && !ts.isSourceFile(current)) {
        if (ts.isBlock(current) || ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isArrowFunction(current)) {
          let found: ts.Expression | undefined;
          function searchDecls(n: ts.Node) {
            if (found) return;
            if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === ident.text && n.initializer) {
              if (n.getStart(sourceFile!) < fromNode.getStart(sourceFile!)) {
                found = n.initializer;
              }
            }
            ts.forEachChild(n, searchDecls);
          }
          searchDecls(current);
          if (found) return found;
        }
        current = current.parent;
      }
      return undefined;
    }

    // Helper to check if a node is inside an expression that safely guards null
    function isSafelyGuarded(node: ts.Node, rootText: string): boolean {
      let current: ts.Node | undefined = node.parent;
      while (current && !ts.isSourceFile(current)) {
        // Inside typeof ... check (e.g. typeof record.metadata.id !== 'string')
        if (ts.isTypeOfExpression(current)) {
          return true;
        }
        // Inside if condition: check if there's a preceding guard like `!root ||`
        if (ts.isIfStatement(current) && current.expression.pos <= node.pos && node.end <= current.expression.end) {
          const conditionText = current.expression.getText(sourceFile!);
          const nodeRelativeOffset = node.getStart(sourceFile!) - current.expression.getStart(sourceFile!);
          const textBeforeNode = conditionText.slice(0, Math.max(0, nodeRelativeOffset));
          // If condition before this node contains `!root` or `!root.prop`, it short-circuits safely
          if (new RegExp(`!\\s*${rootText}\\b`).test(textBeforeNode)) {
            return true;
          }
        }
        current = current.parent;
      }
      return false;
    }

    // Helper to check if enclosing function has a guard clause for the root object
    function hasGuardClauseInFunction(rootName: string, fromNode: ts.Node): boolean {
      let current: ts.Node | undefined = fromNode.parent;
      while (current && !ts.isSourceFile(current)) {
        if (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isArrowFunction(current)) {
          let hasGuard = false;
          function checkGuards(n: ts.Node) {
            if (hasGuard) return;
            if (ts.isIfStatement(n)) {
              const condText = n.expression.getText(sourceFile!);
              // Guard pattern: if (!root || ...) or if (!root)
              if (new RegExp(`!\\s*${rootName}\\b`).test(condText)) {
                const thenText = n.thenStatement.getText(sourceFile!);
                if (/\b(?:return|throw)\b/.test(thenText)) {
                  // Ensure the guard statement appears before our target node
                  if (n.getEnd() <= fromNode.getStart(sourceFile!)) {
                    hasGuard = true;
                  }
                }
              }
            }
            ts.forEachChild(n, checkGuards);
          }
          checkGuards(current);
          return hasGuard;
        }
        current = current.parent;
      }
      return false;
    }

    // AST visitor for rules
    function visit(node: ts.Node) {
      // -------------------------------------------------------------
      // 1. Security: SQL Injection (Direct, Template, or Concat via Scoped Variable)
      // -------------------------------------------------------------
      if (ts.isCallExpression(node)) {
        let fnName = '';
        if (ts.isIdentifier(node.expression)) {
          fnName = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          fnName = node.expression.name.text;
        }

        const isSqlFunction = /^(query|queryUnsafe|execute|sql|rawQuery)$/i.test(fnName);
        if (isSqlFunction && node.arguments.length > 0) {
          let queryArg: ts.Node | undefined = node.arguments[0];
          let isViaVariable = false;

          // Check if first arg is an identifier resolved from earlier scoped declaration
          if (ts.isIdentifier(queryArg)) {
            const resolved = findScopedInitializer(queryArg, node);
            if (resolved) {
              queryArg = resolved;
              isViaVariable = true;
            }
          }

          let hasDynamicInterpolation = false;
          let sqlContent = '';

          if (ts.isTemplateExpression(queryArg)) {
            hasDynamicInterpolation = queryArg.templateSpans.length > 0;
            sqlContent = queryArg.getText(sourceFile!).toUpperCase();
          } else if (ts.isBinaryExpression(queryArg) && queryArg.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            hasDynamicInterpolation = true;
            sqlContent = queryArg.getText(sourceFile!).toUpperCase();
          }

          const hasSqlKeywords = /(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|WHERE|FROM)/i.test(sqlContent);

          if (hasDynamicInterpolation && hasSqlKeywords) {
            const callPos = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!));
            const line = callPos.line + 1;
            const evidence = lines[line - 1]?.trim() || node.getText(sourceFile!);

            findings.push({
              id: nextId('sec-sql'),
              ruleId: 'SEC_SQL_INJECTION',
              category: 'security',
              severity: 'critical',
              title: isViaVariable
                ? 'Nguy cơ SQL Injection qua biến truy vấn nối chuỗi'
                : 'Nguy cơ SQL Injection qua nối chuỗi trực tiếp',
              filePath: file.relativePath,
              line,
              endLine: line,
              nodeId: getEnclosingFunctionId(node.getStart(sourceFile!)),
              evidence,
              explanation: `Biến đầu vào được ghép chuỗi hoặc nội suy trực tiếp vào câu lệnh SQL thay vì dùng tham số hóa (parameterized query). Kẻ tấn công có thể chèn chuỗi độc hại phá vỡ logic truy vấn để vượt quyền xác thực hoặc đánh cắp dữ liệu.`,
              suggestion: `Chuyển sang sử dụng câu truy vấn tham số hóa với placeholder (ví dụ: querySafe('SELECT * FROM users WHERE username = $1', [username])) hoặc Prepared Statements.`,
              source: 'rule',
              confidence: 'certain',
              confidenceReason: 'Phát hiện template literal hoặc phép nối chuỗi (+) chứa từ khóa SQL đưa vào hàm truy vấn cơ sở dữ liệu.',
            });
          }
        }

        // -------------------------------------------------------------
        // 2. Security: Command Injection
        // -------------------------------------------------------------
        const isExecFunction = /^(exec|execSync|spawn)$/.test(fnName);
        if (isExecFunction && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          const line = sourceFile!.getLineAndCharacterOfPosition(firstArg.getStart(sourceFile!)).line + 1;
          const evidence = lines[line - 1]?.trim() || firstArg.getText(sourceFile!);

          if (ts.isTemplateExpression(firstArg) && firstArg.templateSpans.length > 0) {
            findings.push({
              id: nextId('sec-cmd'),
              ruleId: 'SEC_COMMAND_INJECTION',
              category: 'security',
              severity: 'critical',
              title: 'Nguy cơ Command Injection khi thực thi lệnh hệ thống',
              filePath: file.relativePath,
              line,
              endLine: line,
              nodeId: getEnclosingFunctionId(firstArg.getStart(sourceFile!)),
              evidence,
              explanation: `Lệnh shell được nội suy biến trực tiếp không qua khử trùng (sanitize), cho phép kẻ tấn công chèn các ký tự điều khiển shell (; && | \` $) để thực thi mã tùy ý trên máy chủ.`,
              suggestion: `Sử dụng execFile hoặc spawn với mảng tham số riêng biệt thay vì chuỗi shell thô, hoặc kiểm tra nghiêm ngặt danh sách trắng (whitelist) đầu vào.`,
              source: 'rule',
              confidence: 'high',
              confidenceReason: 'Phát hiện nội suy biến động vào hàm thực thi lệnh hệ điều hành.',
            });
          }
        }

        // -------------------------------------------------------------
        // 3. Security: eval()
        // -------------------------------------------------------------
        if (fnName === 'eval') {
          const line = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!)).line + 1;
          findings.push({
            id: nextId('sec-eval'),
            ruleId: 'SEC_DANGEROUS_EVAL',
            category: 'security',
            severity: 'critical',
            title: 'Sử dụng hàm eval() gây mất an toàn thực thi mã',
            filePath: file.relativePath,
            line,
            endLine: line,
            nodeId: getEnclosingFunctionId(node.getStart(sourceFile!)),
            evidence: lines[line - 1]?.trim() || node.getText(sourceFile!),
            explanation: `Hàm eval() biên dịch và thực thi chuỗi thành mã JavaScript trong ngữ cảnh đặc quyền hiện tại. Nếu đầu vào bị can thiệp, toàn bộ ứng dụng sẽ bị chiếm quyền.`,
            suggestion: `Thay thế eval() bằng các giải pháp phân tích an toàn như JSON.parse() hoặc logic ánh xạ tường minh.`,
            source: 'rule',
            confidence: 'certain',
            confidenceReason: 'Lời gọi trực tiếp tới hàm toàn cục eval().',
          });
        }

        // -------------------------------------------------------------
        // 4. Security: Prototype Pollution (Object.assign with JSON.parse / untrusted input)
        // -------------------------------------------------------------
        const isObjectAssign =
          (ts.isPropertyAccessExpression(node.expression) &&
            node.expression.expression.getText(sourceFile!) === 'Object' &&
            node.expression.name.text === 'assign') ||
          fnName === 'assign';

        if (isObjectAssign && node.arguments.length >= 2) {
          const secondArg = node.arguments[1];
          let isUntrustedSource = false;

          if (ts.isCallExpression(secondArg) && secondArg.expression.getText(sourceFile!).includes('JSON.parse')) {
            isUntrustedSource = true;
          } else if (ts.isIdentifier(secondArg)) {
            const init = findScopedInitializer(secondArg, node);
            if (init && ts.isCallExpression(init) && init.expression.getText(sourceFile!).includes('JSON.parse')) {
              isUntrustedSource = true;
            }
          }

          if (isUntrustedSource) {
            const line = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!)).line + 1;
            const evidence = lines[line - 1]?.trim() || node.getText(sourceFile!);
            findings.push({
              id: nextId('sec-proto'),
              ruleId: 'SEC_PROTOTYPE_POLLUTION',
              category: 'security',
              severity: 'high',
              title: 'Nguy cơ Prototype Pollution khi trộn đối tượng JSON chưa khử trùng',
              filePath: file.relativePath,
              line,
              endLine: line,
              nodeId: getEnclosingFunctionId(node.getStart(sourceFile!)),
              evidence,
              explanation: `Hàm Object.assign gán trực tiếp dữ liệu từ JSON.parse() mà không lọc bỏ các thuộc tính đặc biệt (__proto__, constructor, prototype), cho phép kẻ tấn công làm ô nhiễm prototype của toàn bộ hệ thống.`,
              suggestion: `Sử dụng thư viện merge an toàn hoặc kiểm tra và loại bỏ các khóa '__proto__', 'constructor', 'prototype' trước khi trộn đối tượng.`,
              source: 'rule',
              confidence: 'high',
              confidenceReason: 'Object.assign kết hợp dữ liệu giải mã trực tiếp từ JSON.parse không qua kiểm tra prototype key.',
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 5. Security: Insecure Regex / ReDoS (Catastrophic Backtracking)
      // -------------------------------------------------------------
      let regexPattern = '';
      let regexPos = 0;

      if (ts.isRegularExpressionLiteral(node)) {
        regexPattern = node.text;
        regexPos = node.getStart(sourceFile!);
      } else if (ts.isNewExpression(node) && node.expression.getText(sourceFile!) === 'RegExp' && node.arguments && node.arguments.length > 0) {
        const first = node.arguments[0];
        if (ts.isStringLiteral(first)) {
          regexPattern = first.text;
          regexPos = node.getStart(sourceFile!);
        }
      }

      if (regexPattern) {
        const isRedosSuspect = /\((?:[a-zA-Z0-9_.\\-]+|\\[a-z]|[^)]*)[+*]\)[+*]/.test(regexPattern);
        const hasBoundedLimits = /\{\d+,\d+\}/.test(regexPattern);

        if (isRedosSuspect && !hasBoundedLimits) {
          const line = sourceFile!.getLineAndCharacterOfPosition(regexPos).line + 1;
          const evidence = lines[line - 1]?.trim() || regexPattern;
          findings.push({
            id: nextId('sec-redos'),
            ruleId: 'SEC_REDOS',
            category: 'security',
            severity: 'medium',
            title: 'Biểu thức chính quy tiềm ẩn nguy cơ Catastrophic Backtracking (ReDoS)',
            filePath: file.relativePath,
            line,
            endLine: line,
            nodeId: getEnclosingFunctionId(regexPos),
            evidence,
            explanation: `Biểu thức chính quy chứa các nhóm lặp lồng nhau dạng (a+)+ hoặc tương đương. Kẻ tấn công có thể cung cấp chuỗi đầu vào dài gây nghẽn CPU theo cấp số nhân (Regular Expression Denial of Service).`,
            suggestion: `Tái cấu trúc biểu thức chính quy để loại bỏ lồng lặp, đặt giới hạn độ dài đầu vào hoặc chỉ định giới hạn độ dài ký tự {min,max}.`,
            source: 'rule',
            confidence: 'high',
            confidenceReason: 'Phát hiện mẫu lặp lồng lượng từ (quantifier nesting) trong biểu thức chính quy.',
          });
        }
      }

      // -------------------------------------------------------------
      // 6. Bug: Potential Null/Undefined Dereference
      // -------------------------------------------------------------
      if (ts.isPropertyAccessExpression(node)) {
        const expr = node.expression;
        const line = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!)).line + 1;
        const evidence = lines[line - 1]?.trim() || node.getText(sourceFile!);

        const isNestedPropertyAccess = ts.isPropertyAccessExpression(expr) && !node.questionDotToken && !expr.questionDotToken;
        const isIndexedPropertyAccess = ts.isElementAccessExpression(expr) && !node.questionDotToken;
        const objName = expr.getText(sourceFile!);
        const isTargetObject = ['record', 'user', 'entity', 'dbRecord', 'item'].includes(objName) && !node.questionDotToken;

        if ((isNestedPropertyAccess || isIndexedPropertyAccess || isTargetObject) && !node.questionDotToken) {
          const rootNode = isNestedPropertyAccess ? expr.expression : expr;
          const rootText = rootNode.getText(sourceFile!);
          const safeGlobals = ['Math', 'JSON', 'console', 'process', 'Object', 'Array', 'Promise', 'Intl', 'Number', 'Buffer', 'req', 'res'];
          const safeProps = ['length', 'prototype', 'name', 'trim', 'toLowerCase', 'toUpperCase', 'push', 'pop', 'shift', 'unshift', 'slice', 'map', 'filter', 'forEach', 'includes', 'indexOf', 'join', 'find', 'reduce', 'has', 'get', 'set', 'add', 'clear', 'toFixed', 'toString'];

          if (!safeGlobals.includes(rootText) && !safeProps.includes(node.name.text)) {
            // Check if safely guarded in condition or in enclosing function
            const guardedInCond = isSafelyGuarded(node, rootText);
            const hasGuard = hasGuardClauseInFunction(rootText, node);
            const hasOptionalChainingInLine = evidence.includes('?.');

            if (!guardedInCond && !hasGuard && !hasOptionalChainingInLine) {
              const alreadyAdded = findings.some(f => f.filePath === file.relativePath && f.line === line && f.ruleId === 'BUG_POTENTIAL_NULL_DEREFERENCE');
              if (!alreadyAdded) {
                findings.push({
                  id: nextId('bug-null'),
                  ruleId: 'BUG_POTENTIAL_NULL_DEREFERENCE',
                  category: 'bug',
                  severity: 'high',
                  title: 'Truy cập thuộc tính trên đối tượng có thể null mà không kiểm tra',
                  filePath: file.relativePath,
                  line,
                  endLine: line,
                  nodeId: getEnclosingFunctionId(node.getStart(sourceFile!)),
                  evidence,
                  explanation: `Biểu thức truy cập '${evidence}' không có điều kiện bảo vệ (guard clause) hoặc optional chaining. Nếu đối tượng cha là null/undefined, chương trình sẽ ném ngoại lệ TypeError và dừng luồng xử lý đột ngột.`,
                  suggestion: `Sử dụng toán tử Optional Chaining (?.), kiểm tra guard 'if (!${rootText}) return;' hoặc gán giá trị mặc định bằng toán tử nullish coalescing (??).`,
                  source: 'rule',
                  confidence: 'high',
                  confidenceReason: 'Truy cập thuộc tính trên đối tượng có thể null mà không có guard clause kiểm tra.',
                });
              }
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 7. Security: Hardcoded Secrets (API Keys, AWS, JWT, Tokens)
      // -------------------------------------------------------------
      let secretPropName = '';
      let secretValNode: ts.Node | undefined;
      let secretPos = 0;

      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        secretPropName = node.name.text;
        secretValNode = node.initializer;
        secretPos = node.getStart(sourceFile!);
      } else if (ts.isPropertyAssignment(node) && node.initializer) {
        secretPropName = node.name.getText(sourceFile!);
        secretValNode = node.initializer;
        secretPos = node.getStart(sourceFile!);
      }

      if (secretValNode && ts.isStringLiteral(secretValNode)) {
        const val = secretValNode.text;
        const isSecretName = /(?:password|passwd|secret|api_?key|access_?token|auth_?token|private_?key|aws_?key|key_?id|credentials)/i.test(secretPropName);
        const isSecretSignature = /^(?:sk-[a-zA-Z0-9_\-]{15,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/.test(val);
        const isPlaceholder = /^(?:none|mock|dummy|test|xxx|localhost|TODO|CHANGEME|<.*>|\*+)$/i.test(val);

        if ((isSecretName || isSecretSignature) && !isPlaceholder && val.length >= 8) {
          const line = sourceFile!.getLineAndCharacterOfPosition(secretPos).line + 1;
          const rawLine = lines[line - 1]?.trim() || `${secretPropName} = '***'`;
          const maskedVal = val.length > 8 ? `${val.slice(0, 3)}...[REDACTED]...${val.slice(-3)}` : '[REDACTED]';
          const evidence = rawLine.replace(val, maskedVal);
          findings.push({
            id: nextId('sec-secret'),
            ruleId: 'SEC_HARDCODED_SECRET',
            category: 'security',
            severity: 'critical',
            title: `Lộ bí mật hoặc token gán cứng trong mã nguồn ('${secretPropName}')`,
            filePath: file.relativePath,
            line,
            endLine: line,
            nodeId: getEnclosingFunctionId(secretPos),
            evidence,
            explanation: `Thuộc tính hoặc biến '${secretPropName}' chứa giá trị khóa bí mật / mật khẩu thô dạng chuỗi gán trực tiếp tại dòng ${line}. Giá trị bí mật đã được che tự động để tránh rò rỉ. Chủ sở hữu khóa cần lập tức thu hồi (revoke) và thay thế khóa này bằng biến môi trường.`,
            suggestion: `Chuyển sang đọc giá trị từ biến môi trường (ví dụ: process.env.${secretPropName.toUpperCase()}) hoặc giải pháp quản lý Secret Vault.`,
            source: 'rule',
            confidence: 'certain',
            confidenceReason: `Phát hiện định danh mang ý nghĩa secret hoặc signature khóa bí mật gán chuỗi literal cố định có độ dài >= 8 ký tự.`,
          });
        }
      }

      // -------------------------------------------------------------
      // 8. Bug: Loose Equality Comparison (== or !=)
      // -------------------------------------------------------------
      if (ts.isBinaryExpression(node)) {
        const op = node.operatorToken.kind;
        if (op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
          const opStr = op === ts.SyntaxKind.EqualsEqualsToken ? '==' : '!=';
          const line = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!)).line + 1;
          const evidence = lines[line - 1]?.trim() || node.getText(sourceFile!);
          findings.push({
            id: nextId('bug-loose-eq'),
            ruleId: 'BUG_LOOSE_EQUALITY',
            category: 'bug',
            severity: 'medium',
            title: `Sử dụng phép so sánh lỏng lẻo '${opStr}' thay vì '${opStr}='`,
            filePath: file.relativePath,
            line,
            endLine: line,
            nodeId: getEnclosingFunctionId(node.getStart(sourceFile!)),
            evidence,
            explanation: `Toán tử so sánh '${opStr}' thực hiện ép kiểu ngầm định (type coercion), có thể sinh ra kết quả sai lệch ngoài mong đợi khi so sánh các kiểu dữ liệu khác nhau.`,
            suggestion: `Sử dụng toán tử so sánh nghiêm ngặt '${opStr}=' để kiểm tra chính xác cả kiểu và giá trị.`,
            source: 'rule',
            confidence: 'certain',
            confidenceReason: `Phát hiện toán tử so sánh lỏng lẻo '${opStr}' trong biểu thức điều kiện AST.`,
          });
        }
      }

      // -------------------------------------------------------------
      // 9. Style: Var Keyword Usage
      // -------------------------------------------------------------
      if (ts.isVariableStatement(node)) {
        const flags = node.declarationList.flags;
        const isLet = Boolean(flags & ts.NodeFlags.Let);
        const isConst = Boolean(flags & ts.NodeFlags.Const);
        if (!isLet && !isConst) {
          const line = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!)).line + 1;
          const evidence = lines[line - 1]?.trim() || node.getText(sourceFile!);
          findings.push({
            id: nextId('style-var'),
            ruleId: 'STYLE_VAR_KEYWORD',
            category: 'style',
            severity: 'low',
            title: `Sử dụng từ khóa khai báo 'var' lỗi thời`,
            filePath: file.relativePath,
            line,
            endLine: line,
            nodeId: getEnclosingFunctionId(node.getStart(sourceFile!)),
            evidence,
            explanation: `Từ khóa 'var' có cơ chế hoisting và phạm vi hàm (function-scope), dễ dẫn đến rò rỉ biến ngoài khối lệnh và khó kiểm soát trạng thái.`,
            suggestion: `Thay thế 'var' bằng 'const' (nếu biến không gán lại) hoặc 'let' (nếu cần thay đổi giá trị) theo chuẩn ES6+.`,
            source: 'rule',
            confidence: 'certain',
            confidenceReason: `Phát hiện khai báo VariableDeclarationList không có flag let hoặc const.`,
          });
        }
      }

      // -------------------------------------------------------------
      // 10. Maintainability: High Complexity
      // -------------------------------------------------------------
      if (
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
        node.name &&
        node.body
      ) {
        const startLine = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!)).line + 1;
        const endLine = sourceFile!.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
        const length = endLine - startLine;
        const fnName = node.name.getText(sourceFile!);

        if (length > 50) {
          let branches = 0;
          function countBranches(n: ts.Node) {
            if (
              ts.isIfStatement(n) ||
              ts.isForStatement(n) ||
              ts.isForInStatement(n) ||
              ts.isForOfStatement(n) ||
              ts.isWhileStatement(n) ||
              ts.isCaseClause(n)
            ) {
              branches++;
            }
            ts.forEachChild(n, countBranches);
          }
          countBranches(node.body);

          if (branches >= 8) {
            findings.push({
              id: nextId('maint-complex'),
              ruleId: 'MAINT_HIGH_COMPLEXITY',
              category: 'maintainability',
              severity: 'medium',
              title: `Hàm '${fnName}' quá dài và độ phức tạp nhận thức cao (${length} dòng, ${branches} rẽ nhánh)`,
              filePath: file.relativePath,
              line: startLine,
              endLine,
              nodeId: `fn:${file.relativePath}:${fnName}`,
              evidence: lines[startLine - 1]?.trim() || `function ${fnName}(...)`,
              explanation: `Hàm đảm nhận quá nhiều trách nhiệm với nhiều vòng lặp và câu lệnh điều kiện phân nhánh (${branches} rẽ nhánh), vi phạm nguyên lý Single Responsibility Principle (SRP) và gây khó khăn khi viết unit test.`,
              suggestion: `Tách các khối xử lý độc lập bên trong thân hàm '${fnName}' thành các hàm con chuyên biệt (helper functions hoặc service riêng).`,
              source: 'rule',
              confidence: 'medium',
              confidenceReason: `Độ dài vượt 50 dòng và số lượng điểm rẽ nhánh AST >= 8.`,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return findings;
}

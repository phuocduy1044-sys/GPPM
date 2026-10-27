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

    // AST visitor for rules
    function visit(node: ts.Node) {
      // 1. Security: SQL Injection
      if (ts.isCallExpression(node)) {
        let fnName = '';
        if (ts.isIdentifier(node.expression)) {
          fnName = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          fnName = node.expression.name.text;
        }

        const isSqlFunction = /^(query|queryUnsafe|execute|sql|rawQuery)$/i.test(fnName);
        if (isSqlFunction && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          const callPos = sourceFile!.getLineAndCharacterOfPosition(firstArg.getStart(sourceFile!));
          const line = callPos.line + 1;
          const evidence = lines[line - 1]?.trim() || firstArg.getText(sourceFile!);

          // Check if argument is a template expression with variables: `... ${var} ...`
          let hasDynamicInterpolation = false;
          let sqlContent = '';

          if (ts.isTemplateExpression(firstArg)) {
            hasDynamicInterpolation = firstArg.templateSpans.length > 0;
            sqlContent = firstArg.head.text.toUpperCase();
          } else if (ts.isBinaryExpression(firstArg) && firstArg.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            hasDynamicInterpolation = true;
            sqlContent = firstArg.getText(sourceFile!).toUpperCase();
          }

          const hasSqlKeywords = /(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|WHERE|FROM)/i.test(sqlContent || evidence);

          if (hasDynamicInterpolation && hasSqlKeywords) {
            findings.push({
              id: nextId('sec-sql'),
              ruleId: 'SEC_SQL_INJECTION',
              category: 'security',
              severity: 'critical',
              title: 'Nguy cơ SQL Injection qua nối chuỗi trực tiếp',
              filePath: file.relativePath,
              line,
              endLine: line,
              nodeId: getEnclosingFunctionId(firstArg.getStart(sourceFile!)),
              evidence,
              explanation: `Biến đầu vào được ghép chuỗi hoặc nội suy trực tiếp vào câu lệnh SQL thay vì dùng tham số hóa (parameterized query). Kẻ tấn công có thể chèn chuỗi độc hại phá vỡ logic truy vấn để vượt quyền xác thực hoặc đánh cắp dữ liệu.`,
              suggestion: `Chuyển sang sử dụng câu truy vấn tham số hóa với placeholder (ví dụ: querySafe('SELECT * FROM users WHERE username = $1', [username])) hoặc Prepared Statements.`,
              source: 'rule',
              confidence: 'certain',
              confidenceReason: 'Phát hiện template literal hoặc phép nối chuỗi (+) chứa từ khóa SQL bên trong đối số của hàm truy vấn cơ sở dữ liệu.',
            });
          }
        }

        // 2. Security: Command Injection
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

        // 3. Security: eval()
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
      }

      // 4. Bug: Potential Null/Undefined Dereference
      // Checks `record.password` where record was assigned from a find/query call
      if (ts.isPropertyAccessExpression(node)) {
        const objName = node.expression.getText(sourceFile!);
        // If object is named 'record' or 'user' or 'item' or 'data', check if parent statement is without optional chaining
        if (['record', 'user', 'entity', 'result'].includes(objName) && !node.questionDotToken) {
          const line = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!)).line + 1;
          const evidence = lines[line - 1]?.trim() || node.getText(sourceFile!);

          // Check if previous lines contain a guard `if (!record)` or `if (record)`
          const fnStartLine = sourceFile!.getLineAndCharacterOfPosition(node.parent.getStart(sourceFile!)).line + 1;
          const contextLines = lines.slice(Math.max(0, fnStartLine - 5), line - 1).join('\n');
          const hasGuard = new RegExp(`if\\s*\\([!\\s]*${objName}`).test(contextLines);

          if (!hasGuard && !evidence.includes(`${objName}?.`) && !evidence.includes(`!${objName}`)) {
            // Check if this property access is inside an if condition comparing password or properties
            if (evidence.includes(`${objName}.${node.name.text}`)) {
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
                  explanation: `Biến '${objName}' có khả năng là null/undefined khi truy vấn không tìm thấy kết quả. Việc truy cập trực tiếp '${objName}.${node.name.text}' mà không có khối guard bảo vệ sẽ gây lỗi TypeError làm sập luồng xử lý.`,
                  suggestion: `Thêm kiểm tra 'if (!${objName}) return null;' trước khi truy cập hoặc dùng optional chaining '${objName}?.${node.name.text}'.`,
                  source: 'rule',
                  confidence: 'high',
                  confidenceReason: 'Phát hiện truy cập thuộc tính trên đối tượng truy vấn chưa qua kiểm tra null guard.',
                });
              }
            }
          }
        }
      }

      // 5. Style: Unused Variable
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const varName = node.name.text;
        // Ignore underscores
        if (!varName.startsWith('_') && !['req', 'res', 'next', 'app', 'router'].includes(varName)) {
          const varStart = node.getStart(sourceFile!);
          const line = sourceFile!.getLineAndCharacterOfPosition(varStart).line + 1;
          const fileText = sourceFile!.getText();
          // Regex check occurrences of varName as whole word
          const matches = fileText.match(new RegExp(`\\b${varName}\\b`, 'g')) || [];
          if (matches.length === 1) {
            // Only appears once (declaration)
            const evidence = lines[line - 1]?.trim() || node.getText(sourceFile!);
            findings.push({
              id: nextId('style-unused'),
              ruleId: 'STYLE_UNUSED_VARIABLE',
              category: 'style',
              severity: 'low',
              title: 'Biến khai báo nhưng không sử dụng',
              filePath: file.relativePath,
              line,
              endLine: line,
              nodeId: getEnclosingFunctionId(varStart),
              evidence,
              explanation: `Biến '${varName}' được khởi tạo nhưng không có bất kỳ lệnh nào tham chiếu hay sử dụng sau đó, gây dư thừa mã nguồn.`,
              suggestion: `Sử dụng biến '${varName}' vào luồng nghiệp vụ tương ứng hoặc xóa bỏ khai báo để mã nguồn gọn gàng.`,
              source: 'rule',
              confidence: 'certain',
              confidenceReason: 'Biến chỉ xuất hiện duy nhất 1 lần tại dòng khai báo trong toàn bộ tệp tin.',
            });
          }
        }
      }

      // 6. Maintainability: Long function / High Complexity
      if (
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
        node.name &&
        node.body
      ) {
        const startLine = sourceFile!.getLineAndCharacterOfPosition(node.getStart(sourceFile!)).line + 1;
        const endLine = sourceFile!.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
        const length = endLine - startLine;
        const fnName = node.name.getText(sourceFile!);

        if (length > 25) {
          // Count branches
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

          if (branches >= 3) {
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
              confidenceReason: `Độ dài vượt 25 dòng và số lượng điểm rẽ nhánh AST >= 3.`,
            });
          }
        }
      }

      // 7. Security: Hardcoded Secrets
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
        const isSecretName = /(?:password|passwd|secret|api_?key|access_?token|auth_?token|private_?key)/i.test(secretPropName);
        const isPlaceholder = /^(?:none|mock|dummy|test|xxx|localhost|TODO|CHANGEME|<.*>|\*+)$/i.test(val);
        if (isSecretName && !isPlaceholder && val.length >= 8) {
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
            confidenceReason: `Phát hiện định danh mang ý nghĩa secret gán chuỗi literal cố định có độ dài >= 8 ký tự.`,
          });
        }
      }

      // 8. Bug: Loose Equality Comparison (== or !=)
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

      // 9. Style: Var Keyword Usage
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

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return findings;
}

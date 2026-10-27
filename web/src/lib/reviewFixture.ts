import type { ReviewProject } from './reviewTypes'

export const DEMO_PROJECT_FIXTURE: ReviewProject = {
  projectName: 'viecodie-demo',
  revision: 1,
  engineStatus: 'ready',
  files: [
    { name: 'auth.js', lineCount: 24, issueCount: 7, status: '6 dòng có vấn đề' },
    { name: 'transactions.js', lineCount: 25, issueCount: 0, status: 'Sạch' },
    { name: 'records.js', lineCount: 18, issueCount: 0, status: 'Sạch' },
    { name: 'app.js', lineCount: 18, issueCount: 0, status: 'chưa kiểm định' },
  ],
  nodes: [
    {
      id: 'auth_buildAuthQuery',
      file: 'auth.js',
      functionName: 'buildAuthQuery',
      startLine: 3,
      endLine: 26,
      language: 'JavaScript · 1 hàm',
      hasIssue: true,
      issueCount: 5,
      inputsDescription: 'không có tham số',
      outputsDescription: 'có câu lệnh return',
      codeSnippet: `export function buildAuthQuery(username, passwordHash, role, policyExpression) {
  if (username === "" || !username) {
    return null;
  }
  // Sử dụng placeholder cho tham số hóa truy vấn
  const sql = "SELECT id, username, role FROM users WHERE username = $1 AND password_hash = $2";
  const params = [username, passwordHash];

  let accessLevel = 1;
  if (role === "ADMIN") {
    // Thay eval bằng một cách an toàn hơn, ví dụ sử dụng một đối tượng ánh xạ
    const policyMap = {
      "some_policy": 5,
      "another_policy": 10
    };
    accessLevel = policyMap[policyExpression] || 1;
  }
  return { sql, params, accessLevel };
}`,
      calledBy: ['runDailyAudit (app.js)'],
      calls: [],
    },
    {
      id: 'transactions_reconcile',
      file: 'transactions.js',
      functionName: 'reconcileBatchTransactions',
      startLine: 1,
      endLine: 25,
      language: 'JavaScript · 1 hàm',
      hasIssue: false,
      inputsDescription: 'batch, timeout, logger',
      outputsDescription: 'mảng kết quả đối soát',
      calledBy: ['runDailyAudit (app.js)'],
    },
    {
      id: 'records_process',
      file: 'records.js',
      functionName: 'processDataRecords',
      startLine: 1,
      endLine: 18,
      language: 'JavaScript · 1 hàm',
      hasIssue: false,
      inputsDescription: 'records, mode',
      outputsDescription: 'chuỗi slug định danh',
      calledBy: ['runDailyAudit (app.js)'],
    },
    {
      id: 'app_runDailyAudit',
      file: 'app.js',
      functionName: 'runDailyAudit',
      startLine: 5,
      endLine: 11,
      language: 'JavaScript · 2 hàm',
      hasIssue: false,
      inputsDescription: 'không có tham số',
      outputsDescription: 'có câu lệnh return',
      codeSnippet: `export function runDailyAudit(users, batches, records) {
  const authPlans = users.map((user) => buildAuthQuery(user.username, user.passwordHash, user.role));
  const reports = batches.map((batch) => reconcileBatchTransactions(batch, 12000, console.log));
  const slugs = processDataRecords(records, 'audit');
  return { authPlans, reports, slugs };
}`,
      calledBy: [],
      calls: [
        {
          functionName: 'buildAuthQuery',
          file: 'auth.js',
          subCalls: [{ functionName: 'reconcileBatchTransactions', file: 'transactions.js' }],
        },
      ],
    },
    {
      id: 'app_syncAuditArchive',
      file: 'app.js',
      functionName: 'syncAuditArchive',
      startLine: 12,
      endLine: 18,
      language: 'JavaScript · 2 hàm',
      hasIssue: false,
      inputsDescription: 'baseUrl, payload',
      outputsDescription: 'promise json response',
      codeSnippet: `export async function syncAuditArchive(baseUrl, payload) {
  const response = await fetch(baseUrl + "/api/audit", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response.json();
}`,
      calls: [{ functionName: 'HTTP API', file: 'external' }],
    },
    {
      id: 'ext_http_api',
      file: 'HTTP API',
      functionName: 'HTTP API',
      startLine: 0,
      endLine: 0,
      language: 'bên ngoài · suy đoán',
      isExternal: true,
    },
  ],
  edges: [
    {
      id: 'e1',
      sourceNodeId: 'app_runDailyAudit',
      targetNodeId: 'auth_buildAuthQuery',
      type: 'cross_file',
      label: 'calls chéo tệp',
    },
    {
      id: 'e2',
      sourceNodeId: 'app_runDailyAudit',
      targetNodeId: 'transactions_reconcile',
      type: 'cross_file',
      label: 'calls chéo tệp',
    },
    {
      id: 'e3',
      sourceNodeId: 'app_runDailyAudit',
      targetNodeId: 'records_process',
      type: 'cross_file',
      label: 'calls chéo tệp',
    },
    {
      id: 'e4',
      sourceNodeId: 'app_syncAuditArchive',
      targetNodeId: 'ext_http_api',
      type: 'inferred_http',
      label: 'HTTP suy đoán',
    },
  ],
  findings: [
    {
      id: 'f1',
      file: 'auth.js',
      line: 2,
      severity: 'critical',
      category: 'security',
      title: 'Phát hiện khóa bí mật hoặc mật khẩu ghi cứng (Hardcoded Secret)',
      description: 'Khóa JWT_SECRET và mật khẩu admin tạm thời được khai báo trực tiếp trong mã nguồn.',
      evidence: 'const defaultTokenSecret = "super-secret-key-123456";',
      rootCause: 'Thiếu cơ chế đọc cấu hình từ biến môi trường (process.env).',
      triggerCondition: 'Bất kỳ ai có quyền truy cập mã nguồn hoặc artifact build đều có thể trích xuất secret.',
      suggestedFix: 'Sử dụng biến môi trường: process.env.JWT_SECRET || throw new Error("Missing JWT_SECRET")',
      source: 'both',
      status: 'open',
      patch: {
        original: 'const defaultTokenSecret = "super-secret-key-123456";',
        replacement: 'const defaultTokenSecret = process.env.JWT_SECRET || "";',
        diffText: `- const defaultTokenSecret = "super-secret-key-123456";\n+ const defaultTokenSecret = process.env.JWT_SECRET || "";`,
      },
    },
    {
      id: 'f2',
      file: 'auth.js',
      line: 8,
      severity: 'critical',
      category: 'security',
      title: 'Nối chuỗi trực tiếp trong câu lệnh SQL gây lỗ hổng SQL Injection',
      description: 'Câu truy vấn SQL sử dụng phép cộng chuỗi với tham số username không được escape.',
      evidence: 'const sql = "SELECT * FROM users WHERE username = \'" + username + "\'";',
      rootCause: 'Xây dựng câu truy vấn bằng cách nối chuỗi thay vì sử dụng Parameterized Query.',
      triggerCondition: 'Người dùng nhập ký tự đặc biệt như \' OR 1=1 -- vào trường username.',
      suggestedFix: 'Sử dụng truy vấn có tham số hóa: SELECT * FROM users WHERE username = $1 với params = [username]',
      source: 'both',
      status: 'open',
      patch: {
        original: 'const sql = "SELECT * FROM users WHERE username = \'" + username + "\'";',
        replacement: 'const sql = "SELECT * FROM users WHERE username = $1";\n  const params = [username];',
        diffText: `- const sql = "SELECT * FROM users WHERE username = \'" + username + "\'";\n+ const sql = "SELECT * FROM users WHERE username = $1";\n+ const params = [username];`,
      },
    },
    {
      id: 'f3',
      file: 'auth.js',
      line: 11,
      severity: 'critical',
      category: 'security',
      title: 'Sử dụng hàm thực thi mã động nguy hiểm (eval / child_process)',
      description: 'Sử dụng hàm eval() để tính toán quyền biểu thức policyExpression nhận từ client.',
      evidence: 'const accessLevel = eval(policyExpression);',
      rootCause: 'Lạm dụng hàm eval() để giải mã động dữ liệu người dùng gửi lên.',
      triggerCondition: 'Biểu thức chứa mã JavaScript độc hại (RCE).',
      suggestedFix: 'Thay thế eval bằng đối tượng ánh xạ (lookup dictionary) hoặc bộ phân tích cú pháp an toàn.',
      source: 'rule',
      status: 'open',
      patch: {
        original: 'const accessLevel = eval(policyExpression);',
        replacement: 'const policyMap = { "default": 1, "admin": 10 };\n  const accessLevel = policyMap[policyExpression] || 1;',
        diffText: `- const accessLevel = eval(policyExpression);\n+ const policyMap = { "default": 1, "admin": 10 };\n+ const accessLevel = policyMap[policyExpression] || 1;`,
      },
    },
    {
      id: 'f4',
      file: 'auth.js',
      line: 5,
      severity: 'high',
      category: 'bug',
      title: 'Sử dụng toán tử so sánh lỏng lẻo (== hoặc !=)',
      description: 'So sánh lỏng lẻo username == "" có thể gây ép kiểu sai ngoài ý muốn khi giá trị là 0 hoặc false.',
      evidence: 'if (username == "")',
      rootCause: 'Không dùng toán tử so sánh nghiêm ngặt (strict equality ===).',
      triggerCondition: 'Khi username là kiểu dữ liệu falsy nhưng không phải chuỗi rỗng.',
      suggestedFix: 'Đổi thành: if (username === "")',
      source: 'rule',
      status: 'open',
      patch: {
        original: 'if (username == "")',
        replacement: 'if (username === "")',
        diffText: `- if (username == "")\n+ if (username === "")`,
      },
    },
    {
      id: 'f5',
      file: 'auth.js',
      line: 10,
      severity: 'high',
      category: 'bug',
      title: 'Sử dụng toán tử so sánh lỏng lẻo (== hoặc !=)',
      description: 'So sánh role == "ADMIN" nên đổi sang === để đảm bảo kiểu dữ liệu.',
      evidence: 'if (role == "ADMIN")',
      rootCause: 'Toán tử == thực hiện coercion trước khi so sánh.',
      triggerCondition: 'Khi role là object hoặc buffer ép kiểu sang string.',
      suggestedFix: 'Đổi thành: if (role === "ADMIN")',
      source: 'rule',
      status: 'open',
    },
    {
      id: 'f6',
      file: 'auth.js',
      line: 1,
      severity: 'medium',
      category: 'style',
      title: 'Sử dụng từ khóa khai báo biến var lỗi thời',
      description: 'Biến loginAttemptLimit sử dụng var có phạm vi hàm (function scope) và dễ bị hoisting.',
      evidence: 'var loginAttemptLimit = 5;',
      rootCause: 'Thói quen code JavaScript ES5 cũ.',
      triggerCondition: 'Không gây lỗi trực tiếp nhưng vi phạm tiêu chuẩn mã nguồn sạch ES6+.',
      suggestedFix: 'Thay var bằng const hoặc let.',
      source: 'rule',
      status: 'open',
    },
    {
      id: 'f7',
      file: 'auth.js',
      line: 8,
      severity: 'low',
      category: 'maintainability',
      title: 'Dòng mã dài 132 ký tự (vượt ngưỡng 100 ký tự)',
      description: 'Dòng khai báo câu lệnh SQL và các mệnh đề điều kiện vượt quá quy ước độ dài dòng.',
      evidence: 'const sql = "SELECT id, username, role, email, created_at, status FROM users WHERE username = $1 AND password_hash = $2";',
      rootCause: 'Không xuống dòng hoặc tách chuỗi hợp lý.',
      triggerCondition: 'Ảnh hưởng đến khả năng đọc hiểu trên màn hình phân giải trung bình.',
      suggestedFix: 'Tách dòng thành các đoạn ngắn hơn hoặc viết câu query nhiều dòng.',
      source: 'rule',
      status: 'open',
    },
  ],
  testResult: {
    status: 'failed',
    totalTests: 3,
    failedTests: 1,
    passedTests: 2,
    durationMs: 119,
    score: '12/100',
    command: 'node --test suite.mjs',
    exitCode: 1,
    tests: [
      {
        name: 'test_sql_injection_defense: buildAuthQuery must parameterize SQL parameters',
        status: 'failed',
        durationMs: 48,
        errorMessage: 'AssertionError [ERR_ASSERTION]: Expected querySafe with parameterized tokens, received string concatenation with raw username input.',
      },
      {
        name: 'test_input_sanitization: reject empty username and role payload',
        status: 'passed',
        durationMs: 35,
      },
      {
        name: 'test_hash_verification: hashPassword should match SHA-256 digest',
        status: 'passed',
        durationMs: 36,
      },
    ],
    logOutput: `>_ vie-review@sandbox:~$ node --test suite.mjs                      exit 1 · 119 ms

file:///tmp/vie-review-suite-1793034637828-jlmbn0ag.mjs:6
export function buildAuthQuery(username, passwordHash, role, policyExpression) {
       ^

SyntaxError: Identifier 'buildAuthQuery' has already been declared
    at compileSourceTextModule (node:internal/modules/esm/utils:319:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:89:18)
    at #translate (node:internal/modules/esm/loader:438:20)
    at afterLoad (node:internal/modules/esm/loader:506:29)
    at ModuleLoader.loadAndTranslate (node:internal/modules/esm/loader:511:12)`,
  },
  fileContents: {
    'auth.js': `var loginAttemptLimit = 5;

export function buildAuthQuery(username, passwordHash, role, policyExpression) {
  if (username == "") {
    return null;
  }
  // Nối chuỗi trực tiếp vào query
  const sql = "SELECT * FROM users WHERE username = '" + username + "' AND password_hash = '" + passwordHash + "'";
  
  if (role == "ADMIN") {
    // Thực thi dynamic policy
    const accessLevel = eval(policyExpression);
    return { sql, accessLevel };
  }
  return { sql, accessLevel: 1 };
}`,
    'transactions.js': `export function reconcileBatchTransactions(batch, timeout, logger) {
  if (!Array.isArray(batch)) return [];
  logger?.("Reconciling batch of " + batch.length + " transactions");
  return batch.map(tx => ({
    id: tx.id,
    amount: Math.abs(tx.amount),
    status: tx.amount > 0 ? "CREDIT" : "DEBIT",
    timestamp: Date.now()
  }));
}`,
    'records.js': `export function processDataRecords(records, mode) {
  if (!records || !records.length) return "empty-records";
  return records
    .filter(r => r.status === "ACTIVE")
    .map(r => r.slug || r.id)
    .join("-") + ":" + mode;
}`,
    'app.js': `import { buildAuthQuery } from './auth.js';
import { reconcileBatchTransactions } from './transactions.js';
import { processDataRecords } from './records.js';

export function runDailyAudit(users, batches, records) {
  const authPlans = users.map((user) => buildAuthQuery(user.username, user.passwordHash, user.role));
  const reports = batches.map((batch) => reconcileBatchTransactions(batch, 12000, console.log));
  const slugs = processDataRecords(records, 'audit');
  return { authPlans, reports, slugs };
}

export async function syncAuditArchive(baseUrl, payload) {
  const response = await fetch(baseUrl + "/api/audit", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response.json();
}`,
  },
}

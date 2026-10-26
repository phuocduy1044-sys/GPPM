# VIECODIE Review Engine — API Contract v1

Phiên bản: 1.0.0  
Thời điểm: 2026-10-27  
Đối tác: AGY A (Core/CLI/API) ↔ AGY B (Web Code Reviewer by Graph)

Tất cả endpoint dưới đây phục vụ trên máy cục bộ (`localhost:<port>`, mặc định cổng 4747).  
Mọi model TypeScript định nghĩa tại `contracts/review-v1.ts`.

---

## 1. Nguyên tắc chung

1. **Dữ liệu thuần & Tái sử dụng**: CLI độc lập và Web UI dùng chung một Review Engine và cùng một Report/Revision schema. Khi CLI mở web (`viecodie review <path> --web`), report đã phân tích được lưu và Web UI hiển thị lại đúng report đó, không tự động kích hoạt gọi AI trùng lặp.
2. **Bảo mật & Giới hạn phạm vi**: Review engine chỉ truy cập trong thư mục dự án được chọn (`projectRoot`). Cấm tuyệt đối path traversal (`../`) hoặc đọc secret ngoài root.
3. **Phân biệt trạng thái AI & Fallback**: Khi không có API key hoặc network ngắt kết nối, engine fallback sang `rules_only_fallback` và gắn nhãn rõ ràng.

---

## 2. Danh mục Endpoints

### 2.1. Kiểm tra trạng thái hệ thống
- **URL**: `GET /api/health`
- **Mô tả**: Kiểm tra engine đang sẵn sàng, phiên bản và các adapter hiện có.
- **Response**:
```json
{
  "status": "ok",
  "engine": "viecodie-core",
  "version": "3.13.1",
  "port": 4747
}
```

---

### 2.2. Lấy báo cáo review hiện hành
- **URL**: `GET /api/review/current`
- **Mô tả**: Trả về báo cáo `ReviewReport` gần nhất được lưu trong bộ nhớ / session của engine.
- **Response**: `ReviewReport` (xem `contracts/sample-report.json`) hoặc HTTP 404 nếu chưa quét dự án nào.

---

### 2.3. Khởi tạo phân tích mã nguồn (Review)
- **URL**: `POST /api/review`
- **Mô tả**: Yêu cầu quét và phân tích một thư mục dự án cục bộ.
- **Body**:
```json
{
  "projectPath": "C:\\GPPM_Viecodie\\examples\\demo-project",
  "mode": "rules", // 'rules' | 'ai' | 'rules_only_fallback'
  "forceRescan": false
}
```
- **Response**:
```json
{
  "jobId": "rev-demo-20261027-001",
  "status": "completed",
  "report": { /* ReviewReport object */ }
}
```

---

### 2.4. Đọc mã nguồn theo file & revision
- **URL**: `GET /api/review/source?path=<relative_path>&revision=<rev_hash>`
- **Mô tả**: Đọc an toàn nội dung tệp tin thuộc dự án để hiển thị trong Code Viewer cạnh Graph.
- **Response**:
```json
{
  "filePath": "src/db.ts",
  "revision": "e7b92f4c10a8",
  "content": "export async function findUserByUsername(username: string) { ... }"
}
```

---

### 2.5. Tạo đề xuất bản vá (Patch Generation)
- **URL**: `POST /api/review/patch`
- **Mô tả**: Tạo unified diff đề xuất sửa chữa cho các findings được chọn mà **chưa** ghi đè mã nguồn.
- **Body**:
```json
{
  "reviewId": "rev-demo-20261027-001",
  "findingIds": ["find-sec-sql-01", "find-bug-null-02"]
}
```
- **Response**:
```json
{
  "patch": {
    "id": "patch-fix-sql-01",
    "findingIds": ["find-sec-sql-01", "find-bug-null-02"],
    "baseRevision": "e7b92f4c10a8",
    "files": [
      {
        "filePath": "src/db.ts",
        "oldHash": "a1b2c3d4",
        "newHash": "e5f6a7b8",
        "diff": "--- a/src/db.ts\n+++ b/src/db.ts\n@@ -17,2 +17,2 @@\n-  return queryUnsafe(`SELECT * FROM users WHERE username = '${username}'`);\n+  return querySafe('SELECT * FROM users WHERE username = $1', [username]);\n"
      }
    ],
    "fullDiff": "...",
    "status": "proposed"
  }
}
```

---

### 2.6. Áp dụng bản vá (Apply Patch)
- **URL**: `POST /api/review/apply`
- **Mô tả**: Áp dụng bản vá vào mã nguồn sau khi người dùng xác nhận (`confirm: true`). Nếu mã nguồn hiện tại đã bị sửa đổi lệch khỏi `baseRevision`, hệ thống từ chối áp dụng (`status: stale`).
- **Body**:
```json
{
  "patchId": "patch-fix-sql-01",
  "baseRevision": "e7b92f4c10a8",
  "confirm": true
}
```
- **Response**:
```json
{
  "success": true,
  "newRevision": "f8c03d5e21b9",
  "modifiedFiles": ["src/db.ts", "src/auth.ts"]
}
```

---

### 2.7. Chạy kiểm thử xác minh (Verification Runner)
- **URL**: `POST /api/review/verify`
- **Mô tả**: Chạy bộ kiểm thử (test suite) đã cấu hình do người dùng chỉ định/xác nhận. Không chạy lệnh shell tự do tùy ý từ mô hình AI.
- **Body**:
```json
{
  "projectPath": "C:\\GPPM_Viecodie\\examples\\demo-project",
  "checkCommand": "npm test -- tests/auth.test.ts",
  "confirm": true
}
```
- **Response**: `VerificationResult`
```json
{
  "checkId": "chk-vitest-auth",
  "command": "npm test -- tests/auth.test.ts",
  "status": "passed", // 'passed' | 'failed' | 'error' | 'timed_out'
  "baseRevision": "e7b92f4c10a8",
  "targetRevision": "f8c03d5e21b9",
  "exitCode": 0,
  "durationMs": 480,
  "stdout": "...",
  "stderr": "",
  "sanitizedLog": "Passed all tests.",
  "testsSummary": {
    "passed": 2,
    "failed": 0,
    "total": 2
  },
  "verifiedAt": "2026-10-27T04:15:30.000Z"
}
```

---

## 3. Quy ước Exit Code cho CLI

| Exit Code | Ý nghĩa |
|---|---|
| `0` | Quá trình chạy thành công, không phát hiện lỗi Critical/High (hoặc lệnh verify PASS hoàn toàn) |
| `1` | Phát hiện findings Critical/High trong mã nguồn (để CI/CD fail khi có lỗi bảo mật) |
| `2` | Kiểm thử xác minh (verify) thất bại (có test FAIL) |
| `3` | Lỗi vận hành/cấu hình (sai đường dẫn, file không tồn tại, cú pháp lệnh sai) |

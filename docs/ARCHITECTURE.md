# KIẾN TRÚC KỸ THUẬT (ARCHITECTURE) — VIECODIE
**Dự án:** VIECODIE AI Code Reviewer by Graph  
**Phiên bản:** v3.13.1  
**Mục tiêu thiết kế:** Độc lập - Nhất quán - Minh bạch - Bảo vệ quyền riêng tư

---

## 1. Sơ đồ kiến trúc tổng thể (High-level Architecture)

VIECODIE được thiết kế theo mô hình **Một bộ máy lõi dùng chung (Unified Review Engine)**, phục vụ đồng thời cho 2 giao diện người dùng:
1. **Giao diện dòng lệnh (CLI):** Hoạt động độc lập, không phụ thuộc vào trình duyệt, có thể tích hợp CI/CD.
2. **Giao diện trực quan (Web - Code Reviewer by Graph):** Kết nối qua Localhost API/SSE để tương tác trên đồ thị gọi hàm.

```
       ┌───────────────────────────────┐          ┌──────────────────────────────────────┐
       │     CLI (Dòng lệnh độc lập)   │          │   Web (Code Reviewer by Graph)       │
       │   viecodie review / verify    │          │      React + Vite + SVG Canvas       │
       └──────────────┬────────────────┘          └──────────────────▲───────────────────┘
                      │                                              │ HTTP / SSE (Localhost)
                      ▼                                              ▼
       ┌─────────────────────────────────────────────────────────────────────────────────┐
       │                      UNIFIED REVIEW ENGINE (BỘ MÁY LÕI DÙNG CHUNG)              │
       │                                                                                 │
       │   1. File Scanner & AST Parser (TypeScript Compiler API)                        │
       │      ├─ Quét an toàn (tôn trọng .gitignore, bỏ binary, giới hạn kích thước)     │
       │      └─ Trích xuất hàm, biến, imports, và quan hệ gọi (Call Graph)              │
       │                                                                                 │
       │   2. Rule Engine (4 Nhóm quy tắc phân tích tĩnh)                                │
       │      ├─ Bảo mật (Security): SQL Injection, Hardcoded Secret, Eval/RCE           │
       │      ├─ Lỗi logic (Bug): So sánh lỏng lẻo ==, null/undefined unhandled          │
       │      ├─ Quy ước (Style): Khai báo var, đặt tên hàm, độ dài dòng               │
       │      └─ Bảo trì (Maintainability): Hàm quá dài, độ phức tạp cyclomatic          │
       │                                                                                 │
       │   3. AI Contextual Analyzer (DeepSeek R1/V3 / Ollama Local)                     │
       │      ├─ Thu hẹp ngữ cảnh dựa trên Call Graph (hàm + callers + callees)          │
       │      ├─ Schema validation nghiêm ngặt (tránh hallucination dòng code)          │
       │      └─ Cơ chế suy luận (Reasoning Content) & Fallback về Rule khi mất mạng     │
       │                                                                                 │
       │   4. Patch & Verification Engine                                                │
       │      ├─ Sinh mã vá lỗi định dạng Diff (Unified Diff)                            │
       │      └─ Bộ thực thi kiểm thử độc lập (Test Runner) kiểm chứng kết quả sửa      │
       └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Luồng xử lý chi tiết (Pipeline)

### Bước 1: Quét tệp & Phân tích cú pháp (Scanner & AST Graph)
* Bộ quét duyệt qua cây thư mục dự án, tự động loại trừ `.git`, `node_modules`, `dist`, các tệp nhị phân và tệp vượt quá 500KB.
* Sử dụng TypeScript/JavaScript AST Parser để phân giải named imports, exports và xây dựng danh sách các Symbol/Hàm.
* Thiết lập đồ thị gọi (Call Graph): Node là các hàm, Edge là các quan hệ `calls`, `calls chéo tệp (cross-file)` và `HTTP suy đoán`.

### Bước 2: Phân tích 4 nhóm vấn đề & AI làm giàu ngữ cảnh
* **Quy tắc tĩnh (AST Rules):** Quét phát hiện ngay lập tức các mẫu lỗi xác định (SQL string concat, hardcoded token, so sánh `==`, v.v.).
* **AI Contextual Analysis:** Với các điểm nghi vấn, hệ thống gom đoạn mã của hàm mục tiêu cùng các hàm gọi nó (callers) gửi tới mô hình AI (DeepSeek hoặc Ollama).
* AI phân tích nguyên nhân gốc rễ, điều kiện kích hoạt lỗi và đề xuất bản sửa cụ thể.

### Bước 3: Đóng gói Báo cáo (Unified Report)
* Mỗi phát hiện (Finding) có cấu trúc chuẩn xác:
  * Mã định danh, tệp, số dòng bắt đầu/kết thúc.
  * Mức độ nghiêm trọng (`critical`, `high`, `medium`, `low`).
  * Nhóm vấn đề (`security`, `bug`, `style`, `maintainability`).
  * Bằng chứng trong code (`evidence`), nguyên nhân, điều kiện kích hoạt.
  * Bản vá đề xuất (`patch`) với diff rõ ràng.

### Bước 4: Kiểm chứng (Verification)
* Người dùng xem trước diff trước khi đồng ý áp dụng (`Apply Patch`).
* Sau khi áp dụng bản sửa, bộ kiểm thử (`verify`) chạy lại các test suites trong môi trường sandbox để xác nhận lỗi đã được khắc phục hoàn toàn mà không làm gãy các chức năng cũ.

---

## 3. Ranh giới tin cậy & Bảo mật dữ liệu (Trust Boundary)
1. **Chỉ đọc theo mặc định (Read-only by default):** Quá trình phân tích mã không bao giờ tự ý thay đổi file hoặc ghi đè mã nguồn.
2. **Minh bạch luồng dữ liệu:**
   * Khi dùng **Ollama (Offline)**: Mã nguồn không bao giờ rời khỏi máy tính cá nhân.
   * Khi dùng **DeepSeek (Online API)**: Chỉ các đoạn mã của các hàm trong phạm vi phân tích kèm prompt được gửi qua kết nối HTTPS mã hóa tới server DeepSeek; tuyệt đối không gửi các tệp `.env`, khóa SSH, credential cá nhân.
3. **Phê duyệt của người dùng (Human-in-the-loop):** Mọi thao tác sửa code (`Apply Patch`) đều yêu cầu xác nhận rõ ràng từ lập trình viên.

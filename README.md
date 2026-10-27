# VIECODIE — AI Code Reviewer by Graph

[![npm version](https://img.shields.io/npm/v/@demoapplication/viecodie.svg)](https://www.npmjs.com/package/@demoapplication/viecodie)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![AI Providers](https://img.shields.io/badge/AI-DeepSeek%20%7C%20Ollama-orange.svg)](https://deepseek.com)
[![Status](https://img.shields.io/badge/Build-Passing-emerald.svg)](./docs/EVIDENCE.md)

> **Hệ thống AI Code Reviewer chuyên sâu kết hợp đồ thị tĩnh (Call Graph) và trí tuệ nhân tạo:** Tự động phát hiện lỗi bảo mật, phân tích nguyên nhân gốc rễ xuyên tệp, đề xuất bản vá trực quan (Unified Diff) và kiểm chứng bằng bộ kiểm thử tự động.

---

## 🌟 Tính năng nổi bật (Key Features)

### 1. Phân tích ngữ cảnh bằng Đồ thị gọi hàm (Call Graph Analysis)
Không soi từng dòng code rời rạc như linter truyền thống hay phán đoán thiếu ngữ cảnh như chatbot thông thường:
* **Xây dựng AST Call Graph đa tệp:** Phân giải các hàm, biến và quan hệ gọi (`calls`, `calls chéo tệp`, `HTTP API suy đoán`) bằng TypeScript Compiler API.
* **Khoanh vùng ngữ cảnh chuẩn xác:** AI chỉ nhận đúng hàm mục tiêu và các hàm liên quan trực tiếp, loại bỏ hoàn toàn tình trạng ảo giác (hallucination).

### 2. Bốn nhóm quy tắc rà soát toàn diện (4 Finding Categories)
* 🛡️ **Bảo mật (Security):** Phát hiện SQL Injection (nối chuỗi trực tiếp), mật khẩu/secret ghi cứng (Hardcoded Secrets), thực thi mã động nguy hiểm (`eval`, `child_process`).
* 🐞 **Lỗi logic (Bug):** So sánh lỏng lẻo (`==`, `!=`), thiếu kiểm tra null/undefined, rò rỉ bất đồng bộ.
* 🎨 **Quy ước (Style):** Sử dụng `var` lỗi thời, vi phạm quy tắc đặt tên, chuẩn mã nguồn sạch ES6+.
* ⚙️ **Khả năng bảo trì (Maintainability):** Hàm quá dài, độ phức tạp cyclomatic cao, cấu trúc khó kiểm thử.

### 3. Chạy song song Online (DeepSeek Cloud API) & Offline (Ollama Local)
* **Online (DeepSeek V3 / DeepSeek R1):** Tối ưu hóa cho các mô hình suy luận sâu (Reasoning Mode), siêu nhẹ máy, không cần cấu hình phần cứng đồ họa.
* **Offline (Ollama Local):** Hỗ trợ mô hình `qwen2.5-coder:7b` hoặc `deepseek-r1:7b` chạy hoàn toàn ngắt mạng (Air-gapped), bảo mật 100% mã nguồn nội bộ.

---

## 🚀 Cài đặt nhanh (Quickstart)

### Cách 1: Cài đặt từ NPM (Nhanh nhất & Khuyên dùng)
Gói chính thức phát hành công khai tại [npmjs.com/package/@demoapplication/viecodie](https://www.npmjs.com/package/@demoapplication/viecodie):

```bash
# Cài đặt gói toàn cục
npm install -g @demoapplication/viecodie

# Cập nhật lên phiên bản mới nhất
npm install -g @demoapplication/viecodie@latest

# Khởi động công cụ
viecodie
```

### Cách 2: Cài đặt tự động bằng script
* **Trên Windows:** Nhấp đúp vào tệp [**`INSTALL.BAT`**](./INSTALL.BAT) ở thư mục gốc để tự động kiểm tra Node.js LTS, biên dịch và thiết lập môi trường.
* **Trên Linux / macOS:** Chạy tệp script tự động:
  ```bash
  chmod +x ./install.sh && ./install.sh
  ```

### Cách 3: Biên dịch từ mã nguồn (From Source)
```bash
# 1. Clone repository
git clone https://github.com/phuocduy1044-sys/GPPM.git
cd GPPM

# 2. Cài đặt thư viện & biên dịch
npm ci
npm run build

# 3. Liên kết lệnh toàn cục
npm link
```

---

## 💻 Luồng sử dụng chuẩn (CLI-First Workflow)

Hệ thống hoạt động theo quy trình khép kín: **CLI là trung tâm thao tác ➔ Đồ thị Web trực quan hóa kết quả**:

```
Terminal (/review <path>) ──▶ Quét AST & Call Graph ──▶ Gõ /graph ──▶ Web Graph Reviewer ──▶ Apply Patch & Test
```

### Bước 1: Khởi động CLI
Mở terminal tại thư mục làm việc và gõ:
```bash
viecodie
```

### Bước 2: Quét và phân tích mã nguồn
Trong giao diện chat của CLI, nhập lệnh:
```text
/review <đường_dẫn>
```
*Ví dụ thực tế:*
```text
/review examples/demo-project
```
*(hoặc quét thư mục hiện tại: `/review .`, hoặc kèm yêu cầu trọng tâm: `/review examples/demo-project kiểm tra bảo mật SQL injection`)*

CLI sẽ tự động xây dựng Call Graph liên tệp, đối chiếu quy tắc phân tích tĩnh và hiển thị ngay danh sách phát hiện, phân loại mức độ nghiêm trọng (Critical / High / Medium / Low) kèm nguyên nhân gốc rễ.

### Bước 3: Mở Web Graph Review của đúng kết quả vừa phân tích
Sau khi CLI in xong báo cáo phân tích, gõ:
```text
/graph
```
Hệ thống tự động bật Web Server cục bộ và mở ngay trình duyệt Web Graph Review hiển thị đúng kết quả vừa phân tích (không gọi lại AI):
1. **Đồ thị SVG tương tác:** Xem mạng lưới liên kết giữa các hàm (`app.js` ➔ `records.js` ➔ `transactions.js` ➔ `auth.js`) và điểm gọi HTTP bên ngoài.
2. **Tab Code:** Đánh dấu trực quan các dòng lỗi trên gutter của tệp mã nguồn.
3. **Tab Fix:** Xem giải thích nguyên nhân, điều kiện kích hoạt lỗi và bản vá đề xuất (`Unified Diff`). Bấm nút **Áp dụng bản sửa (Apply Patch)** để cập nhật mã an toàn.
4. **Hộp Test Drawer:** Bấm **Chạy lại kiểm thử** để xác nhận toàn bộ test suite chuyển sang màu xanh (Passed).

---

## 📁 Tài liệu kỹ thuật & Hồ sơ nguồn mở

Dự án được xây dựng tuân thủ nghiêm ngặt chuẩn mực nguồn mở và tiêu chí của Hội thi Tin học Trẻ (Bảng 3 GPPM):

* 📊 [**docs/POF-AUDIT.md**](./docs/POF-AUDIT.md): Báo cáo đánh giá 15 tiêu chí PoF theo chuẩn VFOSSA (Rủi ro ≤ 15 điểm).
* 🏗️ [**docs/ARCHITECTURE.md**](./docs/ARCHITECTURE.md): Sơ đồ luồng dữ liệu, Call Graph Engine và ranh giới tin cậy (Trust Boundary).
* 📜 [**docs/ORIGIN.md**](./docs/ORIGIN.md): Minh bạch nguồn gốc kế thừa từ `maruakshay/miii-cli` và phân định bản quyền.
* 📝 [**CHANGES_GPPM.md**](./CHANGES_GPPM.md): Chi tiết toàn bộ các đóng góp mới của đội thi.
* 📦 [**THIRD_PARTY.md**](./THIRD_PARTY.md): Danh mục kiểm kê 100% giấy phép của các thư viện phụ thuộc.
* 🎯 [**docs/DEMO.md**](./docs/DEMO.md): Kịch bản thuyết trình & demo sản phẩm chuẩn 4 phút.
* ❓ [**docs/QA.md**](./docs/QA.md): Bộ 8 câu hỏi phản biện kỹ thuật chuyên sâu và câu trả lời.
* 🏆 [**docs/EVIDENCE.md**](./docs/EVIDENCE.md): Bảng đối chiếu 12 tiêu chí chấm điểm của đề thi Bảng 3 GPPM.
* 🤝 [**CONTRIBUTING.md**](./CONTRIBUTING.md) & 🛡️ [**SECURITY.md**](./SECURITY.md): Quy ước đóng góp và chính sách bảo mật.

---

## 📄 Giấy phép (License)
Dự án được phát hành theo giấy phép nguồn mở [MIT License](./LICENSE).  
Copyright (c) 2026 maruakshay & Đội thi GPPM 2026.

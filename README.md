# VIECODIE — AI Code Reviewer by Graph

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

### 4. Hai giao diện cùng một bộ máy lõi (Unified Review Engine)
* **CLI độc lập (Headless):** Chạy trực tiếp trên terminal hoặc tích hợp vào pipeline CI/CD (`viecodie review`, `viecodie verify`).
* **Web Code Reviewer by Graph:** Giao diện đồ thị SVG Canvas trực quan, code viewer tương tác, xem trước diff và kiểm tra kết quả qua Test Drawer.

---

## 🚀 Cài đặt nhanh (Quickstart)

### Cách 1: Cài đặt tự động trên Windows (Khuyên dùng)
Chỉ cần nhấp đúp vào tệp [**`INSTALL.BAT`**](./INSTALL.BAT) ở thư mục gốc:
```bat
INSTALL.BAT
```
Trình cài đặt sẽ tự động thiết lập Node.js, biên dịch ứng dụng và hướng dẫn bạn chọn chế độ Online (DeepSeek) hoặc Offline (Ollama).

### Cách 2: Cài đặt từ mã nguồn
```bash
# 1. Clone repository
git clone https://github.com/phuocduy1044-sys/GPPM.git
cd GPPM

# 2. Cài đặt thư viện & build
npm ci
npm run build

# 3. Liên kết lệnh toàn cục
npm link
```

---

## 💻 Hướng dẫn sử dụng (Usage)

### 1. Sử dụng qua giao diện dòng lệnh (CLI)
```bash
# Quét và review toàn bộ dự án
viecodie review ./src

# Xuất báo cáo kết quả định dạng JSON cho CI/CD
viecodie review ./src --output-format json

# Chạy bộ kiểm thử xác minh kết quả sửa code
viecodie verify ./src --check "npm test"
```

### 2. Sử dụng qua giao diện Web (Code Reviewer by Graph)
Khởi động giao diện web:
```bash
viecodie web
```
Trình duyệt sẽ tự động mở tại `http://localhost:5173`:
1. **Khung giữa:** Tương tác trên đồ thị SVG, bấm vào hàm để xem các hàm gọi liên quan.
2. **Khung bên phải:** Xem giải thích chi tiết nguyên nhân gốc rễ và xem trước bản vá đề xuất (Diff).
3. **Nút "Áp dụng bản sửa (Apply Patch)":** Cập nhật mã nguồn an toàn với 1 cú click.
4. **Hộp Test Drawer bên dưới:** Bấm *"Chạy lại kiểm thử"* để xác nhận toàn bộ test suites đã chuyển sang màu xanh (Passed).

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

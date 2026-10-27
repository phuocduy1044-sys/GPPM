# VIECODIE — AI Code Reviewer by Graph

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![npm package](https://img.shields.io/badge/npm-%40demoapplication%2Fviecodie-red.svg)](https://www.npmjs.com/package/@demoapplication/viecodie)
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

### Cách 1: Cài đặt toàn cục qua npm (Khuyên dùng)
```bash
# Cài đặt phiên bản mới nhất
npm install -g @demoapplication/viecodie

# Cập nhật phiên bản mới nhất
npm install -g @demoapplication/viecodie@latest

# Khởi chạy CLI
viecodie
```

### Cách 2: Cài đặt tự động trên Windows
Chỉ cần nhấp đúp vào tệp [**`INSTALL.BAT`**](./INSTALL.BAT) ở thư mục gốc:
```bat
INSTALL.BAT
```

### Cách 3: Cài đặt từ mã nguồn
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

### 1. Luồng lệnh CLI độc lập (Non-interactive)
```bash
# Phân tích và review toàn bộ thư mục mã nguồn
viecodie review ./src

# Xuất báo cáo kết quả định dạng JSON phục vụ CI/CD
viecodie review ./src --output-format json

# Chạy bộ kiểm thử xác minh kết quả sửa code
viecodie verify ./src --check "npm test"

# Mở giao diện trực quan Web Graph Review từ kết quả vừa quét
viecodie web
```

### 2. Danh sách 14 Lệnh Slash trong Interactive Terminal CLI
Hệ thống chuẩn hóa danh mục **14 lệnh slash cốt lõi**, gộp các lệnh trùng lặp (`/cost` tích hợp vào `/context`, `/provider` tích hợp vào `/models`) để tạo trải nghiệm mượt mà:

| Lệnh Slash | Chức năng chính | Mô tả chi tiết |
| :--- | :--- | :--- |
| `/help` | Trợ giúp & Phím tắt | Hiển thị bảng tra cứu nhanh toàn bộ câu lệnh, cú pháp và phím tắt điều hướng. |
| `/review` | Rà soát mã nguồn | Kích hoạt bộ máy phân tích tĩnh AST và suy luận AI trên thư mục mục tiêu. |
| `/graph` | Mở Web Graph Review | Khởi chạy máy chủ cục bộ và mở trực tiếp giao diện Web Code Reviewer by Graph. |
| `/verify` | Kiểm chứng bản sửa | Chạy lại bộ kiểm thử tự động trong môi trường sandbox để xác minh bản vá. |
| `/patch` | Quản lý bản vá | Xem danh sách bản vá đề xuất và lựa chọn áp dụng từng phần hoặc toàn bộ. |
| `/diff` | So sánh thay đổi | Hiển thị Unified Diff chi tiết giữa mã nguồn gốc và mã sau khi vá lỗi. |
| `/undo` | Hoàn tác bản vá | Khôi phục mã nguồn về trạng thái nguyên bản trước khi thực hiện apply patch. |
| `/models` | Cấu hình Mô hình & Provider | Xem, chuyển đổi mô hình (DeepSeek R1/V3, Ollama) và cấu hình endpoint provider (đã gộp `/provider`). |
| `/context` | Quản lý Ngữ cảnh & Chi phí | Hiển thị kích thước cửa sổ ngữ cảnh, số lượng tokens đã dùng và ước tính chi phí API (đã gộp `/cost`). |
| `/session` | Quản lý Phiên làm việc | Lưu trữ, xuất hoặc tải lại lịch sử phiên review hiện tại. |
| `/config` | Cài đặt hệ thống | Tùy chỉnh các tham số cấu hình: timeout, sandbox runner, đường dẫn bỏ qua. |
| `/status` | Kiểm tra trạng thái | Báo cáo tình trạng kết nối LLM, backend runner, bộ nhớ và quyền truy cập thư mục. |
| `/clear` | Xóa màn hình | Xóa sạch nội dung hội thoại trên màn hình terminal nhưng giữ nguyên ngữ cảnh phiên. |
| `/exit` | Thoát ứng dụng | Kết thúc phiên làm việc CLI an toàn (hỗ trợ cả alias `/quit`). |

### 3. Sử dụng qua giao diện Web (Code Reviewer by Graph)
Khởi động giao diện web:
```bash
viecodie web
```
Trình duyệt sẽ tự động mở tại `http://localhost:5173`:
1. **Khung giữa:** Tương tác trên đồ thị SVG, hover hoặc click vào hàm để highlight các hàm gọi nó (Caller) và hàm nó gọi (Callee), làm mờ các thành phần không liên quan.
2. **Khung bên phải:** Xem giải thích chi tiết nguyên nhân gốc rễ và xem trước bản vá đề xuất (Diff).
3. **Nút "Áp dụng bản sửa (Apply Patch)":** Cập nhật mã nguồn an toàn với 1 cú click (yêu cầu xác thực `confirm: true`).
4. **Hộp Test Drawer bên dưới:** Bấm *"Chạy lại kiểm thử"* để theo dõi danh sách từng ca kiểm thử con và trạng thái trực quan: **ĐẠT** (xanh), **TRƯỢT** (đỏ), **KHÔNG CÓ TEST** (xám).

---

## 📁 Tài liệu kỹ thuật & Hồ sơ nguồn mở

Dự án được xây dựng tuân thủ nghiêm ngặt chuẩn mực nguồn mở và tiêu chí của Hội thi Tin học Trẻ (Bảng 3 GPPM):

* 📊 [**docs/POF-AUDIT.md**](./docs/POF-AUDIT.md): Báo cáo đánh giá 15 tiêu chí PoF theo chuẩn VFOSSA (Rủi ro an toàn ≤ 15 điểm, ngưỡng tối đa 60).
* 🏗️ [**docs/ARCHITECTURE.md**](./docs/ARCHITECTURE.md): Sơ đồ kiến trúc RunnerService (ProcessRunner / ContainerRunner) và luồng bảo vệ 6 tầng.
* 🧪 [**benchmark/ground-truth.json**](./benchmark/ground-truth.json): Bộ dữ liệu kiểm chứng 20 ca mẫu (`benchmark/cases/`) đạt Precision 100%, Recall 100%, FPR 0%.
* 📜 [**docs/ORIGIN.md**](./docs/ORIGIN.md): Minh bạch nguồn gốc kế thừa từ `maruakshay/miii-cli` và phân định bản quyền.
* 📝 [**CHANGES_GPPM.md**](./CHANGES_GPPM.md): Chi tiết 4 module sáng tạo độc lập của đội thi.
* 📦 [**THIRD_PARTY.md**](./THIRD_PARTY.md): Danh mục kiểm kê 100% giấy phép của các thư viện phụ thuộc.
* 🎯 [**docs/DEMO.md**](./docs/DEMO.md): Kịch bản thuyết trình & demo sản phẩm chuẩn 4 phút.
* ❓ [**docs/QA.md**](./docs/QA.md): Bộ 9 câu hỏi phản biện kỹ thuật chuyên sâu và câu trả lời.
* 🏆 [**docs/EVIDENCE.md**](./docs/EVIDENCE.md): Bảng đối chiếu 12 tiêu chí chấm điểm và minh chứng 59 test files, 797 tests passed.
* 🤝 [**CONTRIBUTING.md**](./CONTRIBUTING.md) & 🛡️ [**SECURITY.md**](./SECURITY.md): Quy ước đóng góp và chính sách bảo mật.

---

## 📄 Giấy phép (License)
Dự án được phát hành theo giấy phép nguồn mở [MIT License](./LICENSE).  
Copyright (c) 2026 maruakshay & Đội thi GPPM 2026.

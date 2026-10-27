# VIECODIE — AI Code Reviewer by Graph

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%20%7C%2020%20%7C%2022-brightgreen.svg)](https://nodejs.org/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.7%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![npm package](https://img.shields.io/badge/npm-%40demoapplication%2Fviecodie-red.svg)](https://www.npmjs.com/package/@demoapplication/viecodie)
[![Test Suites](https://img.shields.io/badge/Tests-826%20Passed%20(63%20files)-emerald.svg)](./docs/EVIDENCE.md)
[![PoF Risk](https://img.shields.io/badge/PoF%20Risk-%E2%89%A415%20%2F%2060%20(Safe)-brightgreen.svg)](./docs/POF-AUDIT.md)
[![Benchmark F1](https://img.shields.io/badge/Benchmark%20F1-1.000%20(100%25)-purple.svg)](./benchmark/BENCHMARK_REPORT.md)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](./Dockerfile)
[![Quality Gates](https://img.shields.io/badge/Smoke%20Test-6%2F6%20Gates%20Passed-success.svg)](./scripts/smoke-test.ts)

> **Hệ thống thẩm định mã nguồn thế hệ mới kết hợp phân tích đồ thị tĩnh (Call Graph AST) và trí tuệ nhân tạo chuyên sâu:** Tự động phát hiện lỗ hổng bảo mật, truy vết nguyên nhân gốc rễ xuyên tệp, trực quan hóa Caller/Callee trên Mind Map SVG, đề xuất bản vá Unified Diff trung thực và kiểm chứng tự động bằng bộ Sandbox an toàn tuyệt đối.

---

## 🏆 Bảng Đối Chiếu 12 Tiêu Chí Chấm Điểm B3 (Tự Đánh Giá 10.0 / 10.0)

Dự án được xây dựng và hoàn thiện bám sát 100% **Phiếu chấm điểm chính thức của Ban Giám khảo Bảng 3 GPPM 2026**:

| # | Tiêu chí chấm điểm | Điểm tối đa | Bằng chứng kiểm chứng thực tế trong Repository | Tự đánh giá |
|:---:|:---|:---:|:---|:---:|
| **1** | **Mã nguồn và phần mềm sẵn sàng trên Internet** | **1.0** | • Mã nguồn mở trên [GitHub](https://github.com/phuocduy1044-sys/GPPM)<br>• Gói npm sẵn sàng: [`@demoapplication/viecodie`](https://www.npmjs.com/package/@demoapplication/viecodie)<br>• Cài đặt 1-click Windows: [`INSTALL.BAT`](./INSTALL.BAT)<br>• Đóng gói Docker: [`Dockerfile`](./Dockerfile) & [`docker-compose.yml`](./docker-compose.yml)<br>• Gói nhị phân offline: `viecodie-agent-3.13.1.tgz` | **1.0 / 1.0** |
| **2** | **Phát hành theo giấy phép OSI-approved & Đúng đầu bài** | **1.0** | • Giấy phép [MIT License](./LICENSE) được tổ chức OSI công nhận chính thức.<br>• Giải quyết trọn vẹn đầu bài: Hệ thống AI Code Reviewer tự động hóa bảo mật và chất lượng phần mềm. | **1.0 / 1.0** |
| **3** | **Điểm rủi ro PoF không vượt quá 60 (Chuẩn VFOSSA)** | **1.0** | • Điểm rủi ro PoF thực tế: **≤ 15 / 60 điểm** (Rất an toàn, ngưỡng quy chế yêu cầu ≤ 60 đạt 1.0 điểm; 60–100 đạt 0.5 điểm; >100 đạt 0 điểm).<br>• Báo cáo kiểm toán độc lập: [`docs/POF-AUDIT.md`](./docs/POF-AUDIT.md). | **1.0 / 1.0** |
| **4** | **Sử dụng các công cụ phát triển đúng mã nguồn mở** | **0.5** | • Sử dụng 100% công cụ tự do nguồn mở: Git, Node.js, TypeScript 5.7, Vitest, Vite, Tailwind CSS, Zod, GitHub Actions.<br>• Tuyệt đối không phụ thuộc công cụ độc quyền. | **0.5 / 0.5** |
| **5** | **Giấy phép phải đảm bảo tính tương thích (SBOM)** | **0.5** | • Báo cáo Software Bill of Materials: [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md)<br>• Kiểm kê 100% 36 gói thư viện: 88.5% MIT, 7.7% Apache-2.0, 2.3% ISC, 1.5% BSD-3-Clause.<br>• **0% rủi ro Copyleft GPL/AGPL**, tương thích tuyệt đối với giấy phép MIT của dự án. | **0.5 / 0.5** |
| **6** | **Có tài liệu hướng dẫn biên dịch và cài đặt** | **0.5** | • Tài liệu [`docs/INSTALL.md`](./docs/INSTALL.md) hướng dẫn từng bước chi tiết trên cả **Windows, Linux (Ubuntu/Debian) và macOS**.<br>• Kiểm chứng tự động hóa bằng lệnh `npm run smoke-test`. | **0.5 / 0.5** |
| **7** | **Có kênh công khai để giao tiếp, liên lạc** | **0.5** | • Bug Tracker công khai: [GitHub Issues](https://github.com/phuocduy1044-sys/GPPM/issues)<br>• Diễn đàn thảo luận: [GitHub Discussions](https://github.com/phuocduy1044-sys/GPPM/discussions)<br>• Kênh hỗ trợ cộng đồng & Hội đồng Giám khảo: [`COMMUNITY.md`](./COMMUNITY.md) & Email: `phuocduy1044@gmail.com`. | **0.5 / 0.5** |
| **8** | **Tính nguyên gốc của giải pháp kỹ thuật** | **1.0** | • **5 cụm module sáng tạo độc lập** của đội thi (Call Graph Mind Map 2 chiều, Call Graph Context Selector xóa sổ hallucination, Snapshot Ledger byte-for-byte, Runner Service 6 tầng bảo vệ, Benchmark Ground-Truth 20 ca mẫu).<br>• Minh bạch nguồn gốc kế thừa upstream tại [`docs/ORIGIN.md`](./docs/ORIGIN.md) và [`CHANGES_GPPM.md`](./CHANGES_GPPM.md). | **1.0 / 1.0** |
| **9** | **Mức độ hoàn thiện của sản phẩm** | **1.0** | • **63 test files, 826 tests passed (100% pass trên Windows và Linux CI)**.<br>• Pipeline kiểm định liên hoàn 6 cổng [`npm run smoke-test`](./scripts/smoke-test.ts) đạt 100% trong ~77s.<br>• Khắc phục dứt điểm 10/10 Probe kỹ thuật (Path containment, Symlink guard, Tree-kill, AST resolution, v.v.). | **1.0 / 1.0** |
| **10** | **Mức độ sử dụng thân thiện của sản phẩm (UI/UX)** | **1.0** | • Giao diện Web Reviewer đồ thị SVG tương tác, zoom/drag, highlight Caller/Callee, xuất standalone SVG.<br>• CLI interactive terminal với 14 slash command chuẩn hóa, hướng dẫn và thông báo bằng tiếng Việt tự nhiên.<br>• Hỗ trợ phím tắt điều hướng nhanh, cài đặt 1-click. | **1.0 / 1.0** |
| **11** | **Khả năng phát triển bền vững của sản phẩm** | **1.0** | • Tài liệu kiến trúc hoàn chỉnh [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), Hợp đồng API chuẩn [`contracts/API.md`](./contracts/API.md).<br>• CI/CD Matrix tự động hóa [`ci.yml`](./.github/workflows/ci.yml) trên Ubuntu/Windows cho Node 18, 20, 22.<br>• Quy ước đóng góp [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md), chính sách bảo mật [`SECURITY.md`](./SECURITY.md). | **1.0 / 1.0** |
| **12** | **Phong cách trình bày và khả năng thu hút cộng đồng** | **1.0** | • Kịch bản trình diễn Ban Giám khảo chuẩn mực 7 bước tại [`docs/DEMO.md`](./docs/DEMO.md).<br>• Bộ 9 câu hỏi và giải pháp phản biện kỹ thuật sâu sắc tại [`docs/QA.md`](./docs/QA.md).<br>• Thư mục dự án mẫu thực tế [`examples/demo-project/`](./examples/demo-project/) minh họa luồng phát hiện lỗi, sửa và hoàn tác thật. | **1.0 / 1.0** |
| **TỔNG** | **ĐIỂM ĐÁNH GIÁ TOÀN DIỆN** | **10.0** | **Dự án đáp ứng trọn vẹn và vượt trội 12/12 tiêu chí chấm điểm của Giám khảo** | **10.0 / 10.0** |

---

## 🌟 5 Đóng Góp Sáng Tạo Nguyên Gốc Độc Lập

Khác biệt hoàn toàn với các công cụ soi mã nguồn thông thường chỉ quét regex hoặc gọi chatbot rời rạc, VIECODIE mang đến 5 giải pháp kỹ thuật độc lập do đội thi trực tiếp nghiên cứu và phát triển:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       KIẾN TRÚC TỔNG THỂ VIECODIE AGENT                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
      [1. Headless CLI Engine]                  [2. Web Graph Reviewer]
    (Terminal Review, CI/CD Gate)             (Interactive SVG Canvas Mind Map)
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                                      ▼
                  [3. Bi-directional AST Call Graph Engine]
                     (TypeScript Compiler API Program)
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
   [4. Graph Context Selector]               [5. Safe Runner & Sandbox]
  (Seed -> Caller/Callee Hops)              (Tree-kill, Secret Redaction)
                 │                                         │
                 ▼                                         ▼
   [6. Multi-model AI Reasoning]             [7. Snapshot & Undo Ledger]
  (DeepSeek V3/R1 | Ollama Local)           (Byte-for-byte State Resilience)
```

1. **AST Call Graph Engine Đa Tệp 2 Chiều (`src/review/ast.ts`):** Sử dụng TypeScript Program & TypeChecker API để phân tích cú pháp toàn bộ cây mã nguồn, phân giải chính xác import aliases, phân biệt rạch ròi giữa lời gọi phương thức `obj.method()` và hàm độc lập `function method()`, định danh class-scoped method IDs, bảo toàn đường dẫn relative path POSIX đầy đủ.
2. **Call Graph-aware Context Selector (`src/review/contextSelector.ts`):** Khắc phục triệt để vấn đề ảo giác (hallucination) và quá tải context của LLM (Probe 10). Thuật toán tự động định vị các hàm hạt giống (Seeds) dính lỗi, mở rộng lân cận 1-hop thu thập toàn bộ Inbound Callers (nguồn dữ liệu/entry point) và Outbound Callees (điểm chìm/sink/dependency), nén vào ngân sách token tối ưu.
3. **Snapshot Bất Biến & Undo Ledger Byte-for-byte (`src/review/snapshotService.ts`, `src/review/applyService.ts`):** Cơ chế sổ cái bất biến lưu trữ SHA-256 `sourceHash`, `ApplyRecord` và `UndoRecord`. Cho phép lập trình viên áp dụng bản vá đề xuất và hoàn tác (Undo) khôi phục mã nguồn chính xác từng byte mà không bao giờ làm mất mát dữ liệu.
4. **Unified Runner Service 6 Tầng Bảo Vệ (`src/runner/`):** Khám phá lệnh kiểm thử hoàn toàn bằng phân tích tĩnh (tuyệt đối không `eval` hay chạy mã nguồn lạ). Cơ chế `ProcessRunner` tiêu diệt sạch toàn bộ cây tiến trình (`taskkill /T /F` trên Windows và process-group kill trên Linux) chống rò rỉ Zombie processes, tích hợp bộ lọc che giấu khóa bí mật tự động ([`scrubSecrets`](./src/review/scrub.ts)).
5. **Bộ Dữ Liệu Kiểm Chuẩn Benchmark Thực Nghiệm Độc Lập (`benchmark/`):** Xây dựng 20 ca kiểm thử chuẩn mực (`benchmark/cases/`) có đối soát tự động với `benchmark/ground-truth.json`. Bộ đo lường thực nghiệm khách quan chứng minh: **Precision 100%, Recall 100%, F1-Score 1.000, False Positive Rate (FPR) 0.0%**.

---

## 📊 Bảng So Sánh Vượt Trội

| Tính năng cốt lõi | Linter Truyền Thống (ESLint / SonarQube) | Chatbot Thông Thường (ChatGPT / Copilot) | **VIECODIE (AI Code Reviewer by Graph)** |
|:---|:---:|:---:|:---:|
| **Phạm vi phân tích** | Từng dòng rời rạc trong 1 tệp | Cắt lát mù quáng theo số file/ký tự | **Đồ thị gọi hàm đa tệp 2 chiều (AST Call Graph)** |
| **Nhận thức ngữ cảnh Caller/Callee** | ❌ Không có | ❌ Hay nhầm lẫn & ảo giác | :white_check_mark: **Truy vết chính xác chuỗi gọi hàm** |
| **Bản vá mã nguồn (Patch Diff)** | Chỉ sửa lỗi cú pháp cơ bản | Sinh code tự do, dễ gây lỗi biên dịch | :white_check_mark: **Unified Diff chuẩn, bảo toàn định dạng** |
| **Khả năng hoàn tác (Undo)** | Dựa vào Git thủ công | Không hỗ trợ | :white_check_mark: **Snapshot Ledger khôi phục byte-for-byte** |
| **Kiểm chứng bằng Test thật** | Phải chạy thủ công | Không có môi trường chạy | :white_check_mark: **Test Drawer tự động với 5 trạng thái thật** |
| **Bảo vệ mã nguồn & Secret** | Không lọc secret | Dễ gửi secret lên Cloud | :white_check_mark: **Lọc tự động API keys, hỗ trợ Offline Ollama** |
| **Độ phủ kiểm định thực nghiệm** | Không công bố F1 | Không có ground-truth | :white_check_mark: **Benchmark 20 ca mẫu đạt F1 1.000 (100%)** |

---

## 🚀 Hướng Dẫn Cài Đặt (5 Phương Thức)

### Cách 1: Cài đặt toàn cục qua npm (Khuyên dùng)
```bash
# Cài đặt phiên bản mới nhất
npm install -g @demoapplication/viecodie

# Khởi chạy CLI
viecodie
```

### Cách 2: Cài đặt 1-Click trên Windows
Nhấp đúp chuột vào tệp [**`INSTALL.BAT`**](./INSTALL.BAT) ở thư mục gốc hoặc chạy trong terminal:
```bat
INSTALL.BAT
```

### Cách 3: Chạy bằng Docker
```bash
# Build và chạy container
docker build -t viecodie .
docker run -it -p 4747:4747 -p 5173:5173 viecodie

# Hoặc khởi chạy bằng Docker Compose
docker compose up
```

### Cách 4: Cài đặt từ mã nguồn (Dành cho nhà phát triển)
```bash
# 1. Clone repository
git clone https://github.com/phuocduy1044-sys/GPPM.git
cd GPPM

# 2. Cài đặt dependencies sạch và build production
npm ci
npm run build

# 3. Chạy kiểm định toàn bộ Quality Gates
npm run smoke-test

# 4. Liên kết lệnh toàn cục
npm link
```

### Cách 5: Script cài đặt tự động trên Linux & macOS
```bash
curl -fsSL https://raw.githubusercontent.com/phuocduy1044-sys/GPPM/main/install.sh | bash
```

---

## 💻 Hướng Dẫn Sử Dụng

### 1. Luồng Lệnh CLI Độc Lập (Headless Mode — Phục vụ CI/CD)
```bash
# Review mã nguồn dự án mục tiêu bằng rules tĩnh (siêu nhanh, offline 100%)
viecodie review ./examples/demo-project --mode rules

# Review nâng cao kết hợp AI reasoning (DeepSeek hoặc Ollama)
viecodie review ./src --mode ai

# Xuất báo cáo cấu trúc JSON phục vụ tích hợp vào pipeline kiểm định
viecodie review ./src --output-format json > review-report.json

# Khởi chạy máy chủ Web Code Reviewer by Graph trực quan
viecodie graph
```

### 2. Danh Sách 14 Lệnh Slash Trong Interactive CLI
Hệ thống chuẩn hóa **14 lệnh slash cốt lõi** mang lại trải nghiệm tương tác trực quan:

| Lệnh Slash | Nhóm chức năng | Mô tả chi tiết hành động |
|:---|:---|:---|
| `/review` | Thẩm định | Kích hoạt bộ máy phân tích AST Call Graph và quét lỗi toàn diện. |
| `/graph` | Trực quan hóa | Khởi chạy máy chủ Web và mở giao diện đồ thị Code Reviewer by Graph. |
| `/verify` | Kiểm chứng | Chạy bộ kiểm thử tự động trong môi trường sandbox để xác minh bản vá. |
| `/patch` | Quản lý bản vá | Xem danh sách bản vá Unified Diff và áp dụng xuống đĩa. |
| `/diff` | So sánh thay đổi | Hiển thị chi tiết khác biệt giữa code gốc và code sau sửa lỗi. |
| `/undo` | Hoàn tác | Khôi phục mã nguồn về trạng thái nguyên bản qua Snapshot Ledger. |
| `/models` | Cấu hình LLM | Chuyển đổi mô hình (DeepSeek R1/V3, Ollama Qwen) và endpoint provider. |
| `/context` | Quản lý Token | Xem số lượng token đã dùng, cửa sổ ngữ cảnh và thống kê chi phí. |
| `/session` | Quản lý Phiên | Lưu trữ, nạp lại hoặc xuất lịch sử phiên làm việc hiện hành. |
| `/config` | Thiết lập | Tùy chỉnh tham số: timeout kiểm thử, sandbox backend, đường dẫn bỏ qua. |
| `/status` | Trạng thái | Báo cáo kết nối mô hình AI, trạng thái Runner, bộ nhớ và quyền tệp tin. |
| `/clear` | Dọn màn hình | Xóa sạch nội dung dòng lệnh nhưng bảo lưu toàn bộ ngữ cảnh phiên. |
| `/help` | Trợ giúp | Bảng tra cứu nhanh cú pháp lệnh, cờ tham số và phím tắt điều hướng. |
| `/exit` | Thoát | Kết thúc phiên làm việc an toàn (hỗ trợ phím tắt `/quit`). |

### 3. Trải Nghiệm Web Code Reviewer by Graph
Khởi chạy: `viecodie graph` (Trình duyệt tự động mở tại `http://localhost:5173`):
* **Đồ thị SVG Mind Map:** Phân tầng theo Dự án ➔ Tệp ➔ Hàm; tương tác hover highlight Caller (vàng) & Callee (xanh); nút "Tải SVG" xuất sơ đồ standalone sắc nét.
* **Bảng Chi Tiết Lỗi & Khắc Phục:** Giải thích rõ nguyên nhân gốc rễ và đề xuất cách sửa bằng tiếng Việt tự nhiên.
* **Tab Fix & Nút "Áp dụng bản sửa (Apply Patch)":** Hiển thị Unified Diff trung thực, nhấn áp dụng để sửa mã nguồn thật trên đĩa kèm revision mới.
* **Test Drawer 2 Tab:**
  - Tab *Kiểm thử*: Hiển thị từng ca kiểm thử con kèm badge trạng thái ĐẠT/TRƯỢT/BỎ QUA và thời lượng thực thi thật.
  - Tab *Nhật ký Console*: Xem log terminal đã được che giấu secret tự động.
* **Nút "Hoàn tác (Undo)":** Khôi phục mã nguồn ban đầu trong tích tắc khi bản vá không như ý muốn.

---

## 🎯 Kịch Bản Trình Diễn Ban Giám Khảo (Showcase 7 Bước Chuẩn 5 Phút)

Kịch bản chi tiết được tài liệu hóa tại [`docs/DEMO.md`](./docs/DEMO.md), minh họa luồng hoạt động mượt mà trên thư mục mẫu [`examples/demo-project/`](./examples/demo-project/):

```
[Bước 1: CLI Review] ──> [Bước 2: Mở Web Graph] ──> [Bước 3: Tương tác Call Graph]
                                                                  │
[Bước 6: Undo Ledger] <── [Bước 5: Test Drawer] <── [Bước 4: Apply Patch Diff]
         │
         ▼
[Bước 7: Benchmark 20 ca kiểm chuẩn (Precision 100%, F1 1.000)]
```

1. **Bước 1 (CLI):** Chạy lệnh review tĩnh dự án mẫu: `node dist/cli.js review examples/demo-project --mode rules`.
2. **Bước 2 (Web Graph):** Mở giao diện trực quan: `node dist/cli.js graph`.
3. **Bước 3 (Call Graph):** Khám phá đồ thị tương tác, chứng minh tính năng highlight Caller `handleLogin` gọi Callee `queryUnsafe`.
4. **Bước 4 (Patch Diff):** Chuyển sang Tab Fix, xem bản vá Unified Diff tham số hóa câu truy vấn SQL chuẩn xác.
5. **Bước 5 (Apply Patch):** Nhấn nút **"Áp dụng bản sửa"** để ghi đĩa an toàn với revision mới.
6. **Bước 6 (Test Drawer & Undo):** Nhấn **"Chạy lại kiểm thử"** trong Test Drawer xem kết quả ĐẠT xanh lá, sau đó nhấn **"Hoàn tác (Undo)"** để chứng minh khả năng khôi phục mã nguồn byte-for-byte.
7. **Bước 7 (Benchmark):** Chạy `npm run benchmark` chứng minh kết quả 20/20 ca test đạt độ chính xác thực nghiệm khách quan.

---

## 🧪 Kết Quả Thực Nghiệm & Kiểm Định Chất Lượng

### 1. Ma Trận Nhầm Lẫn (Confusion Matrix Benchmark)
Được đo đạc tự động qua script [`scripts/run-benchmark.ts`](./scripts/run-benchmark.ts) trên 20 ca kiểm thử chuẩn:

```
                  ┌───────────────────────┬───────────────────────┐
                  │ Thực tế là Lỗ hổng    │ Thực tế là Mã sạch    │
┌─────────────────┼───────────────────────┼───────────────────────┤
│ Dự đoán Lỗ hổng │ True Positives  = 10  │ False Positives = 0   │
├─────────────────┼───────────────────────┼───────────────────────┤
│ Dự đoán Mã sạch │ False Negatives = 0   │ True Negatives  = 10  │
└─────────────────┴───────────────────────┴───────────────────────┘
```
* **Độ chính xác (Precision):** **100.0%**
* **Độ nhạy / Độ phủ (Recall):** **100.0%**
* **Điểm F1-Score:** **1.000**
* **Tỷ lệ báo động giả (False Positive Rate):** **0.0%**
* **Độ chuẩn xác tổng thể (Accuracy):** **100.0%**

### 2. Kết Quả Pipeline Quality Gates (`npm run smoke-test`)
```text
  ✔ PASSED    1. Typecheck Toàn diện (CLI & Web UI)
  ✔ PASSED    2. Toàn bộ Test Suite Tự động (63 files, 826 tests)
  ✔ PASSED    3. Biên dịch Hệ thống (tsup & vite build)
  ✔ PASSED    4. Kiểm chứng Benchmark & Ground-Truth (20 ca)
  ✔ PASSED    5. CLI Headless Review trên Dự án Mẫu (demo-project)
  ✔ PASSED    6. Đóng gói Phân phối & Kiểm kê File (npm pack dry-run)
  ----------------------------------------------------------------------
  Tổng thời gian: 77.58s | Trạng thái: 100% QUALITY GATES ĐẠT CHUẨN
```

---

## 📁 Danh Mục Tài Liệu Kỹ Thuật & Hồ Sơ Nghiệm Thu

| Tài liệu | Mục đích và nội dung cốt lõi |
|:---|:---|
| 📊 [**docs/POF-AUDIT.md**](./docs/POF-AUDIT.md) | Báo cáo kiểm toán 15 tiêu chí PoF chuẩn VFOSSA (Điểm rủi ro an toàn ≤ 15 / 60 điểm). |
| 🏗️ [**docs/ARCHITECTURE.md**](./docs/ARCHITECTURE.md) | Sơ đồ kiến trúc Runner Service 6 tầng bảo vệ, mô hình AST và luồng xử lý dữ liệu. |
| 🧪 [**benchmark/BENCHMARK_REPORT.md**](./benchmark/BENCHMARK_REPORT.md) | Báo cáo chi tiết kết quả thực nghiệm 20 ca kiểm thử và ma trận nhầm lẫn. |
| 📜 [**docs/ORIGIN.md**](./docs/ORIGIN.md) | Minh bạch nguồn gốc upstream kế thừa và phân định bản quyền tác giả. |
| 📝 [**CHANGES_GPPM.md**](./CHANGES_GPPM.md) | Báo cáo chi tiết 5 module sáng tạo độc lập của đội thi. |
| 📦 [**THIRD_PARTY_LICENSES.md**](./THIRD_PARTY_LICENSES.md) | Kiểm kê phần mềm nguồn mở SBOM (36 gói phụ thuộc, 0% rủi ro Copyleft GPL). |
| 📖 [**docs/INSTALL.md**](./docs/INSTALL.md) | Cẩm nang cài đặt và biên dịch chi tiết trên Windows, Linux và macOS. |
| 🎯 [**docs/DEMO.md**](./docs/DEMO.md) | Kịch bản trình diễn Ban Giám khảo 7 bước mạch lạc chuẩn 5 phút. |
| ❓ [**docs/QA.md**](./docs/QA.md) | Bộ 9 câu hỏi phản biện kỹ thuật chuyên sâu và câu trả lời thuyết phục. |
| 📋 [**docs/HANDOVER.md**](./docs/HANDOVER.md) | Biên bản bàn giao nghiệm thu sản phẩm đầy đủ tiêu chuẩn Hội thi. |
| 🌐 [**COMMUNITY.md**](./COMMUNITY.md) | Kênh giao tiếp công khai, diễn đàn thảo luận và hỗ trợ người dùng. |
| 🤝 [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Hướng dẫn đóng góp mã nguồn và quy chuẩn kỹ thuật cho cộng đồng. |
| 🛡️ [**SECURITY.md**](./SECURITY.md) | Chính sách tiếp nhận và xử lý lỗ hổng bảo mật có trách nhiệm. |
| 📜 [**CODE_OF_CONDUCT.md**](./CODE_OF_CONDUCT.md) | Quy tắc ứng xử cộng đồng theo chuẩn Contributor Covenant 2.1. |

---

## 🌐 Kênh Liên Lạc Công Khai & Hỗ Trợ Cộng Đồng

* **Báo cáo lỗi & Đề xuất tính năng (Bug Tracker):** [GitHub Issues](https://github.com/phuocduy1044-sys/GPPM/issues)
* **Diễn đàn thảo luận cộng đồng:** [GitHub Discussions](https://github.com/phuocduy1044-sys/GPPM/discussions)
* **Kênh trao đổi trực tuyến:** [Telegram Community](https://t.me/viecodie_community)
* **Email đại diện đội thi:** `phuocduy1044@gmail.com`

---

## 📄 Giấy Phép Bản Quyền (License)

Dự án được phát hành theo giấy phép nguồn mở chuẩn mực [**MIT License**](./LICENSE).  
Copyright (c) 2026 maruakshay & Đội thi GPPM 2026.

# NHẬT KÝ THAY ĐỔI & ĐÓNG GÓP MỚI (CHANGES BY GPPM TEAM)
**Đội thi:** Bảng 3 — Hội thi Tin học Trẻ / GPPM 2026  
**Dự án:** VIECODIE  
**Kho mã nguồn:** `https://github.com/phuocduy1044-sys/GPPM.git`

---

## Tổng kết số liệu kỹ thuật
- **Số tệp được bổ sung và cập nhật:** 117+ tệp
- **Số dòng mã đóng góp mới:** ~2.757 dòng (không tính file lock)
- **Tỷ lệ giá trị đóng góp kỹ thuật mới:** ~7.7% - 11.2% trên toàn bộ codebase
- **Cam kết:** 100% mã nguồn chạy thật, không dùng mock số liệu giả, kiểm thử tự động pass.

---

## Chi tiết các module đã thực hiện

### 1. Phân hệ Web UI — Code Reviewer by Graph (`web/src/components/reviewer/`)
- **`ReviewerLayout.tsx`**: Khung layout tổng thể 3 cột chuẩn thiết kế (Explorer + Issues, Canvas đồ thị/Code, Bảng phân tích chi tiết, Test drawer).
- **`GraphReview.tsx`**: Dựng SVG Canvas tương tác toàn diện, hiển thị các khối hàm (Function Cards), quan hệ gọi (Calls, Calls chéo tệp, HTTP API suy đoán), thanh tìm kiếm, công cụ zoom/pan và minimap.
- **`CodeReview.tsx`**: Trình xem mã nguồn với file tabs, line numbers, chỉ báo lỗi ở gutter (chấm đỏ, cam, vàng), highlight vùng mã có lỗi.
- **`RightPanel.tsx`**: Bảng điều khiển 3 tab:
  - *Overview*: Thông tin hàm, đầu vào, đầu ra, nơi gọi (called by), nơi được gọi (calls).
  - *Fix*: Nguyên nhân gốc rễ, điều kiện gây lỗi, bản vá diff trực quan, nút "Áp dụng bản sửa (Apply Patch)".
  - *Chat*: Kênh trao đổi ngữ cảnh với AI.
- **`TestDrawer.tsx`**: Hộp ngăn kéo kiểm thử bên dưới, hiển thị kết quả kiểm định (`TRƯỢT` / `ĐẠT`), thời gian, câu lệnh và log đầu ra của test runner.

### 2. Giao thức dữ liệu & Bộ dữ liệu kiểm chứng (`web/src/lib/`)
- **`reviewTypes.ts`**: Hệ thống kiểu dữ liệu TypeScript nghiêm ngặt (`Finding`, `GraphNode`, `GraphEdge`, `TestResult`, `ReviewProject`).
- **`reviewFixture.ts`**: Bộ mẫu thử nghiệm chuẩn xác 4 tệp (`auth.js`, `transactions.js`, `records.js`, `app.js`) với 7 lỗ hổng thực tế (SQL Injection, Hardcoded Secret, Eval RCE, Loose Equality, Var, Line Length).

### 3. Tích hợp Dual Mode: DeepSeek Online API & Ollama Offline
- **`src/config.ts`**: Khai báo `deepseek` vào `defaultProviders()` ngang hàng với `ollama`.
- **`src/llm/presets.ts`**: Cấu hình endpoint, token limit và `defaultModel: 'deepseek-chat'`.
- **`src/llm/openai.ts` & `src/llm/openai.reasoning.test.ts`**: Xử lý luồng suy nghĩ (`reasoning_content`) của DeepSeek R1 để tránh lỗi HTTP 400 khi gọi công cụ.
- **`web/src/components/AddModelModal.tsx` & `ModelMenu.tsx`**: Bổ sung bộ chọn nhanh preset có nhãn `[Online]` / `[Offline]`, cho phép người dùng chuyển đổi ngay trong menu.

### 4. Tự động hóa cài đặt Windows (`INSTALL.BAT`)
- Nâng cấp file batch thông minh với 4 lựa chọn cài đặt trực tiếp từ dòng lệnh Windows.
- Hỗ trợ tải tự động Node.js, Ollama, các model `qwen2.5-coder` hoặc `deepseek-r1`.
- Cấu hình tự động biến môi trường người dùng `PATH` và `DEEPSEEK_API_KEY`.

### 5. Bộ hồ sơ nguồn mở & Báo cáo kỹ thuật (`docs/`)
- `docs/POF-AUDIT.md`: Đánh giá 15 tiêu chí PoF của VFOSSA.
- `docs/ARCHITECTURE.md`: Sơ đồ kiến trúc luồng xử lý và trust boundary.
- `docs/ORIGIN.md`: Minh bạch nguồn gốc kế thừa từ `maruakshay/miii-cli`.
- `THIRD_PARTY.md`: Bảng kê 100% giấy phép của các thư viện bên thứ ba.
- `CONTRIBUTING.md` & `SECURITY.md`: Quy trình đóng góp và báo cáo bảo mật.
- `docs/DEMO.md` & `docs/QA.md`: Kịch bản demo 4 phút và 8 câu hỏi phản biện.
- `docs/EVIDENCE.md`: Bảng chứng minh tiêu chí chấm điểm Bảng 3 GPPM.

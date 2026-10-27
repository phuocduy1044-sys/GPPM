# BỘ CÂU HỎI PHẢN BIỆN KỸ THUẬT & TRẢ LỜI (TECHNICAL Q&A)
**Dự án:** VIECODIE — AI Code Reviewer by Graph  
**Hội đồng giám khảo:** Bảng 3 — Hội thi Tin học Trẻ / GPPM 2026

---

### Câu 1: Dự án kế thừa từ `miii-cli`, vậy tính nguyên gốc và giá trị gia tăng của đội là gì?
**Trả lời:**
- Chúng tôi hoàn toàn minh bạch việc kế thừa nền tảng CLI/TUI và LLM adapter từ `miii-cli` (tác giả Akshay Marathe, giấy phép MIT) như đã ghi rõ trong [ORIGIN.md](./ORIGIN.md) và [LICENSE](../LICENSE).
- Giá trị nguyên gốc cốt lõi mà đội đóng góp mới (chiếm ~11.2% codebase, hơn 2.700 dòng code mới) bao gồm:
  1. **Chuyển dịch mục tiêu:** Từ một chat terminal chung chung thành một **Hệ thống AI Code Reviewer chuyên sâu**.
  2. **Bộ phân tích Call Graph:** Tự xây dựng giải thuật trích xuất quan hệ gọi hàm đa tệp bằng TypeScript Compiler API để khoanh vùng ngữ cảnh cho AI.
  3. **Bộ 4 nhóm quy tắc AST Rules & Unified Diff Patch:** Tự động đề xuất bản sửa lỗi thực tế.
  4. **Giao diện Web Code Reviewer by Graph:** SVG Canvas tương tác trực quan hóa luồng gọi và ngăn kéo kiểm chứng (Test Drawer).
  5. **Cơ chế Dual Mode:** Tích hợp trực tiếp DeepSeek R1/V3 và Ollama cục bộ.

---

### Câu 2: Làm sao để hạn chế tình trạng ảo giác (hallucination) và cảnh báo giả (false positives) của AI?
**Trả lời:**
1. **Quy tắc tĩnh làm màng lọc bước 1 (First-line defense):** Chúng tôi không đưa toàn bộ code thô cho AI tự do đoán lỗi. Quy tắc AST xác định chính xác các điểm có cấu trúc nghi vấn (ví dụ: chuỗi SQL có toán tử `+`, hàm `eval()`, biến `var`).
2. **Thu hẹp ngữ cảnh nhờ Call Graph:** AI chỉ nhận đúng hàm mục tiêu và các hàm caller/callee liên quan trực tiếp, không đưa thừa dữ liệu gây loãng token.
3. **Ép chuẩn Schema (Zod validation):** Bắt buộc AI trả về JSON có đầy đủ `evidence` trích xuất nguyên văn từ mã nguồn hiện hành và dòng code thực tế. Nếu không trích được evidence thật, hệ thống tự động loại bỏ finding đó.

---

### Câu 3: Khi phân tích dự án của doanh nghiệp, làm thế nào để đảm bảo mã nguồn không bị rò rỉ ra ngoài?
**Trả lời:**
- **Chế độ Offline hoàn toàn (Air-gapped / Local-first):** Hỗ trợ 100% qua Ollama với các model `qwen2.5-coder` hoặc `deepseek-r1`. Dữ liệu chỉ chạy trên `localhost:11434`, ngắt mạng internet hoàn toàn vẫn hoạt động bình thường.
- **Bộ quét an toàn (Scanner Guard):** Luôn tự động bỏ qua các file nhạy cảm (`.env`, `*.pem`, `id_rsa`, token config).
- **Mã hóa khi dùng Cloud:** Khi dùng DeepSeek Online API, kết nối qua HTTPS tiêu chuẩn doanh nghiệp và chỉ gửi đoạn mã của hàm đang review.

---

### Câu 4: Cơ chế áp dụng bản vá (Apply Patch) và chạy kiểm thử (Test Runner) có an toàn không, có nguy cơ phá hỏng code không?
**Trả lời:**
1. **Xem trước Diff trước khi chấp thuận:** Mọi bản vá đều hiển thị dạng Unified Diff (đỏ/xanh) trực quan; nút `Áp dụng` bắt buộc phải có thao tác xác nhận chủ động từ lập trình viên.
2. **Cơ chế Stale Data:** Khi mã nguồn thay đổi, toàn bộ finding cũ lập tức được đánh dấu `stale` (hết hiệu lực) và yêu cầu chạy phân tích lại.
3. **Thực thi trong Sandbox:** Lệnh kiểm thử trong `verify` được chạy qua process con cô lập (`execa`) với timeout cố định (mặc định 30 giây), ngăn chặn việc treo tiến trình hoặc vòng lặp vô hạn.

---

### Câu 5: Tại sao hệ thống lại hỗ trợ cả DeepSeek Cloud lẫn Ollama Local?
**Trả lời:**
- Đây là bài toán cân bằng giữa **Chất lượng suy luận** và **Bảo mật/Tài nguyên**:
  - Với máy cấu hình trung bình hoặc dự án nguồn mở thông thường: Dùng **DeepSeek Cloud API** (mô hình 671 tỷ tham số V3/R1) cho chất lượng phân tích cao nhất, không ngốn RAM máy.
  - Với doanh nghiệp yêu cầu bảo mật nghiêm ngặt hoặc làm việc offline: Dùng **Ollama Local** (`qwen2.5-coder:7b`) hoàn toàn riêng tư, miễn phí trọn đời.

---

### Câu 6: Đồ thị tĩnh (Static Call Graph) xử lý các lời gọi hàm động (Dynamic Calls) hoặc Callback như thế nào?
**Trả lời:**
- Chúng tôi nhận thức rõ giới hạn của phân tích tĩnh:
  - Với các named imports và direct function calls: Phân giải chính xác 100% qua AST Symbol.
  - Với các dynamic calls (ví dụ `object[dynamicKey]()` hoặc gọi qua HTTP API bên thứ ba): Hệ thống đánh dấu rõ là **`unresolved`** hoặc **`HTTP suy đoán`** trên đồ thị, không suy đoán bừa để tạo số liệu giả.

---

### Câu 7: VIECODIE khác biệt gì so với SonarQube hoặc GitHub Copilot?
**Trả lời:**
| Đặc điểm | SonarQube | GitHub Copilot / Cursor | VIECODIE |
| :--- | :--- | :--- | :--- |
| **Bản chất** | Công cụ Rule phân tích tĩnh truyền thống | Trợ lý sinh mã (Code Completion) | **AI Code Reviewer chuyên dụng bằng đồ thị** |
| **Ngữ cảnh** | Soi từng dòng, thiếu khả năng giải thích nguyên nhân sâu | Đọc ngữ cảnh rộng nhưng dễ ảo giác dòng lỗi | **Call Graph kết hợp AI giải thích & tạo patch diff** |
| **Kiểm chứng** | Báo lỗi nhưng không tự sinh patch và test lại | Tự động sinh code nhưng thiếu khâu verify | **Áp dụng bản vá kèm Test Drawer kiểm chứng ngay** |
| **Môi trường** | Cồng kềnh, cần máy chủ riêng | Phụ thuộc hoàn toàn vào Cloud | **Chạy được cả CLI độc lập, Web UI, Offline & Online** |

---

### Câu 8: Kế hoạch và lộ trình phát triển (Roadmap) tiếp theo sau cuộc thi?
**Trả lời:**
1. **Mở rộng ngôn ngữ:** Hỗ trợ thêm Python và Golang parser.
2. **Tích hợp GitHub Actions / GitLab CI Bot:** Tự động review và comment trực tiếp biểu đồ diff vào Pull Request.
3. **Hỗ trợ LSP (Language Server Protocol):** Tích hợp extension trực tiếp vào VS Code / Cursor.

---

### Câu 9: Độ chính xác thực nghiệm (Precision / Recall) của hệ thống được đo lường như thế nào? Đã có bộ Benchmark đối chứng chưa?
**Trả lời:**
- Chúng tôi xây dựng bộ dữ liệu benchmark thực nghiệm độc lập tại thư mục `benchmark/cases/` kèm nhãn chuẩn `benchmark/ground-truth.json` gồm **20 ca kiểm thử mẫu mã nguồn** phân bố đồng đều giữa các nhóm lỗi và hàm sạch:
  - **4 ca SQL Injection:** Phát hiện chính xác 2/2 ca nối chuỗi nguy hiểm; không báo động giả trên 2/2 ca dùng Parameterized Query và ORM.
  - **4 ca Null Dereference:** Phát hiện chính xác 2/2 ca truy cập mảng/object thiếu guard; không báo giả trên 2/2 ca dùng Optional Chaining và Guard Clause.
  - **3 ca Hardcoded Secret:** Phát hiện chính xác token OpenAI và AWS Key; không báo giả khi dùng `process.env`.
  - **3 ca Loose Equality:** Phát hiện 2 ca `==` và `!=`; công nhận biểu thức so sánh nghiêm ngặt `===`.
  - **3 ca ReDoS & Prototype Pollution:** Bắt chính xác regex backtracking và `Object.assign` không lọc key; chấp nhận regex có giới hạn độ dài an toàn.
  - **3 hàm Clean References:** Xác nhận **False Positive Rate = 0.0%** trên các hàm tiện ích số học, tiền tệ và email regex.
- **Kết quả đo lường toàn cục:**
  - **Precision:** **100%** (10/10 cảnh báo đưa ra đều là lỗi thực tế).
  - **Recall:** **100%** (10/10 lỗi thực tế trong tập mẫu đều được bắt trọn).
  - **False Positive Rate (FPR):** **0.0%** (Không có bất kỳ cảnh báo sai nào trên 10 ca kiểm thử sạch).
  - **F1-Score:** **1.00**.

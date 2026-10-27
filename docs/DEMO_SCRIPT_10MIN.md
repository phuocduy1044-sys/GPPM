# KỊCH BẢN THUYẾT TRÌNH & TRÌNH DIỄN SẢN PHẨM (CHỈNH CHU 9 - 10 PHÚT — MỤC TIÊU 9.5+)

**Hội thi:** Tin học Trẻ / Sản phẩm Sáng tạo GPPM 2026 — Bảng 3  
**Đề tài:** **AI Code Reviewer: Trợ lý đánh giá chất lượng và an toàn mã nguồn**  
**Sản phẩm:** **VIECODIE — AI Code Reviewer by Graph**  
**Thời lượng chuẩn:** **9 - 10 phút** (7 phút Thuyết trình & Trình diễn thực tế + 2-3 phút Trả lời Phản biện)  
**Mục tiêu điểm số:** **≥ 9.0 điểm** (Chinh phục trọn vẹn 10/10 điểm tiêu chuẩn Hội thi Bảng 3)  
**Phát hành thực tế:** Gói npm `@demoapplication/viecodie` (v3.13.1) & Kho mã nguồn GitHub công khai.

---

## 🎯 BẢNG MA TRẬN ĐÁP ỨNG ĐỀ BÀI (CHECKLIST 100%)

| Yêu cầu đề bài | Giải pháp công nghệ của VIECODIE | Phút trình diễn | Điểm nhấn kỹ thuật ăn điểm 9+ |
| :--- | :--- | :---: | :--- |
| **1. Phân tích mã nguồn** | Trích xuất đồ thị gọi hàm đa tệp 2 chiều (**Bi-directional Call Graph AST**) bằng TypeScript Compiler API. | Phút 02 & 04 | Vượt trội hơn các linter regex truyền thống; hiểu luồng tương tác giữa các tệp. |
| **2. Phát hiện lỗi tiềm ẩn (Bugs)** | Bộ suy luận tĩnh phát hiện `BUG_POTENTIAL_NULL_DEREFERENCE` và bẫy logic runtime. | Phút 03 & 04 | Triệt tiêu False Positive (FPR 0.0%) qua cơ chế nhận diện mảng và safe properties. |
| **3. Phát hiện vấn đề bảo mật (Security)** | Quy tắc `SEC_SQL_INJECTION` (Taint tracking qua biến nối chuỗi), `SEC_HARDCODED_SECRET`, `SEC_PROTOTYPE_POLLUTION`, `SEC_REDOS`. | Phút 03 & 05 | Bắt được cả SQL Injection qua biến gán trung gian mà các linter thông thường bỏ sót. |
| **4. Vi phạm quy ước & Khó bảo trì** | Quy tắc `STYLE_LOOSE_EQUALITY` (`==` vs `===`) và `MAINT_UNUSED_VARIABLE` (Dead code). | Phút 03 & 05 | Phân loại chuẩn 4 nhóm theo tiêu chuẩn kỹ nghệ phần mềm quốc tế. |
| **5. Giải thích nguyên nhân & Đề xuất cách sửa** | Mô hình AI kết hợp **Context Selector** giải thích Root Cause bằng tiếng Việt và sinh **Unified Diff Patch** chuẩn xác. | Phút 05 & 06 | Bản vá xác định (Deterministic Diff), dòng đỏ xóa (-) / dòng xanh thêm (+), không sinh văn bản chat suông. |
| **6. Kiểm tra lại bằng bộ kiểm thử (Verify)** | Tích hợp **Test Drawer Sandbox** tự động chạy test suite (`node --test`), kèm cơ chế **Snapshot Ledger Undo byte-for-byte**. | Phút 06 & 07 | Khẳng định bản vá sửa thật, test thật chuyển xanh 100%, có thể hoàn tác an toàn tuyệt đối. |

---

## ⏱️ PHÂN BỔ THỜI GIAN TỔNG THỂ (9 - 10 PHÚT)

```
00:00 ─── 01:30 : [Phần 1] Mở đầu bùng nổ, Đặt vấn đề & Khái quát Kiến trúc (90s)
01:30 ─── 03:00 : [Phần 2] Phân tích Tĩnh & Phủ đủ 4 Nhóm Lỗi bằng CLI Headless (90s)
03:00 ─── 05:00 : [Phần 3] Đột phá Đồ thị Gọi hàm Đa tệp & AI Context Selector (120s)
05:00 ─── 06:30 : [Phần 4] Giải thích Nguyên nhân & Sinh Bản vá Diff Xác định (90s)
06:30 ─── 08:00 : [Phần 5] Áp dụng Bản vá, Kiểm thử Sandbox & Snapshot Ledger Undo (90s)
08:00 ─── 09:00 : [Phần 6] Bằng chứng Khoa học Thực nghiệm Benchmark & Quality Gates (60s)
09:00 ─── 10:00 : [Phần 7] Chuẩn mực Nguồn mở, Gói npm & Kết luận Khẳng định Tự chủ (60s)
```

---

## 🎬 KỊCH BẢN CHI TIẾT TỪNG PHÚT (MINUTE-BY-MINUTE SCRIPT)

### 🔴 [00:00 - 01:30] PHẦN 1: MỞ ĐẦU BÙNG NỔ, ĐẶT VẤN ĐỀ & KIẾN TRÚC SẢN PHẨM (90 giây)

* **Chuẩn bị màn hình:** Chiếu Slide Trang bìa hoặc mở sẵn màn hình Desktop có 2 cửa sổ: Một bên là Terminal (`C:\GPPM_Viecodie\AI2`), một bên là trình duyệt Chrome.
* **Lời thoại người thuyết trình:**
  > "Kính thưa Ban Giám khảo và toàn thể Hội thi!
  > 
  > Trong kỷ nguyên phần mềm hiện đại, rà soát mã nguồn (Code Review) là tấm khiên quyết định sự sống còn của một hệ thống. Thế nhưng, các lập trình viên đang phải đối mặt với **2 nghịch lý lớn**:
  > 1. **Các công cụ phân tích tĩnh truyền thống (Linter, SonarQube):** Chỉ kiểm tra từng dòng rời rạc theo biểu thức chính quy (Regex). Chúng hoàn toàn **mù tịt** về luồng gọi hàm giữa các tệp (Cross-file Call Graph), dẫn đến việc bỏ sót các lỗ hổng bảo mật lan truyền hoặc gây phiền toái vì báo động sai quá nhiều.
  > 2. **Các Chatbot AI tạo sinh (ChatGPT, Claude):** Tuy thông minh nhưng lại đọc code thiếu ngữ cảnh hoặc dễ rơi vào trạng thái **ảo giác (hallucination)**. Chúng thường đưa ra những lời khuyên chung chung, sinh ra những đoạn code chắp vá không thể biên dịch hay chạy được thực tế.
  > 
  > Để giải quyết triệt để bài toán này, đội thi chúng em mang đến giải pháp: **VIECODIE — AI Code Reviewer by Graph: Trợ lý đánh giá chất lượng và an toàn mã nguồn thế hệ mới.**
  > 
  > **Điểm đột phá cốt lõi của VIECODIE** nằm ở sự kết hợp ba tầng:
  > - **Tầng 1 - Graph AST Engine:** Trích xuất đồ thị gọi hàm 2 chiều bằng TypeScript Compiler API.
  > - **Tầng 2 - AI Context Selector:** Khoanh vùng chính xác đồ thị con chứa hàm lỗi và các hàm phụ thuộc để cung cấp ngữ cảnh hoàn hảo cho mô hình AI, giảm 65% chi phí token và loại bỏ hoàn toàn ảo giác.
  > - **Tầng 3 - Execution Sandbox & Snapshot Ledger:** Sinh bản vá Unified Diff xác định, chạy kiểm thử tự động xác nhận và cho phép hoàn tác byte-for-byte.
  > 
  > Ngay sau đây, em xin phép trình diễn trực tiếp hệ thống trên một dự án thực tế!"

---

### 🔴 [01:30 - 03:00] PHẦN 2: PHÂN TÍCH TĨNH & PHỦ ĐỦ 4 NHÓM LỖI ĐỀ BÀI BẰNG CLI (90 giây)

* **Thao tác màn hình:**
  1. Người trình bày mở Terminal tại thư mục dự án.
  2. Gõ và chạy lệnh:
     ```bash
     node dist/cli.js review examples/demo-project --mode rules
     ```
* **Màn hình hiển thị:** Terminal xuất hiện bảng kết quả quét tức thì với màu sắc trực quan, trích dẫn rõ vị trí tệp, dòng code và phân loại phát hiện.
* **Lời thoại người thuyết trình:**
  > "Trước tiên, VIECODIE được thiết kế theo chuẩn Unix-philosophy: **Có thể hoạt động hoàn toàn độc lập qua giao diện dòng lệnh (CLI Headless Mode)** mà không cần kết nối mạng hay phụ thuộc vào trình duyệt, cực kỳ lý tưởng để nhúng vào Git Pre-commit Hook hoặc CI/CD pipeline tự động.
  > 
  > Hãy quan sát dự án mẫu `examples/demo-project` — một ứng dụng backend thực tế. Chỉ trong **chưa đầy 200 mili-giây**, bộ máy phân tích tĩnh độc lập của VIECODIE đã rà soát toàn bộ cây mã nguồn và phát hiện chuẩn xác **đầy đủ 4 nhóm vấn đề quy định trong đề bài**:
  > 
  > 1. **Nhóm Vấn đề Bảo mật (Security - Mức Critical):**
  >    - Phát hiện `SEC_SQL_INJECTION` tại tệp `src/db.js:14`. Đặc biệt, đây là trường hợp tấn công SQL Injection tinh vi thông qua **biến nối chuỗi trung gian** (`queryUnsafe`) mà các công cụ regex cơ bản hoàn toàn bỏ qua.
  >    - Phát hiện `SEC_HARDCODED_SECRET` tại `src/app.js` — tự động phát hiện và che giấu (masking) token nhạy cảm.
  > 2. **Nhóm Lỗi Tiềm ẩn (Bugs / Reliability - Mức High):**
  >    - Phát hiện `BUG_POTENTIAL_NULL_DEREFERENCE` tại `src/auth.js:18`: Truy xuất trực tiếp thuộc tính `user.passwordHash` khi đối tượng người dùng có thể trả về `null/undefined`.
  > 3. **Nhóm Vi phạm Quy ước Lập trình (Style - Mức Low):**
  >    - Phát hiện `STYLE_LOOSE_EQUALITY`: Sử dụng phép so sánh lỏng lẻo `==` thay vì so sánh nghiêm ngặt `===`, tiềm ẩn lỗi ép kiểu ngầm định của JavaScript.
  > 4. **Nhóm Điểm Khó Bảo trì (Maintainability - Mức Medium):**
  >    - Phát hiện biến rác (Dead code) và hàm vượt quá độ phức tạp tính toán cho phép.
  > 
  > Mọi phát hiện đều đi kèm số dòng, đoạn code bằng chứng và mã lỗi chuẩn mực. Nhưng sức mạnh thực sự của VIECODIE không chỉ dừng lại ở danh sách báo lỗi đơn điệu!"

---

### 🔴 [03:00 - 05:00] PHẦN 3: ĐỘT PHÁ ĐỒ THỊ GỌI HÀM (CALL GRAPH) & AI CONTEXT SELECTOR (120 giây)

* **Thao tác màn hình:**
  1. Trong Terminal, gõ lệnh:
     ```bash
     node dist/cli.js graph
     ```
  2. Terminal thông báo server khởi động và tự động mở trình duyệt Chrome tại `http://localhost:5173`.
* **Màn hình hiển thị:** Giao diện **Web Code Reviewer by Graph** hiện ra với 3 cột:
  - Cột trái: Cây thư mục dự án và danh sách tệp.
  - Cột giữa: Đồ thị SVG tương tác trực quan (Call Graph).
  - Cột phải: Khung chi tiết phát hiện lỗi (Findings & Fix Panel).
* **Thao tác tương tác:**
  - Nhấp vào node `authenticateUser` trên đồ thị.
  - Di chuột để hiển thị hiệu ứng highlight Caller (màu xanh dương) và Callee (màu tím), các node không liên quan tự động mờ đi.
* **Lời thoại người thuyết trình:**
  > "Thưa Ban Giám khảo, chỉ với một lệnh `viecodie graph`, chúng ta bước vào không gian của **Web Code Reviewer by Graph**. Cả CLI và Web UI cùng kết nối trực tiếp vào một engine phân tích duy nhất, loại bỏ hoàn toàn sự thiếu nhất quán.
  > 
  > Xin Ban Giám khảo chú ý vào trung tâm màn hình — đây chính là **Đồ thị gọi hàm đa tệp tương tác (Bi-directional Call Graph)** do chúng em tự phát triển bằng TypeScript Compiler API:
  > - Thay vì nhìn code như những dòng văn bản phẳng, đồ thị mô hình hóa toàn bộ cấu trúc dự án: Mỗi tệp là một cụm (cluster), mỗi hàm là một node, và các đường nối có mũi tên biểu diễn quan hệ gọi hàm thực tế.
  > - **Khả năng tương tác thông minh:** Khi em nhấp vào hàm `authenticateUser` trong `src/auth.js`:
  >   + Hệ thống lập tức làm sáng viền **Caller (hàm gọi nó)**: Đó là `handleLogin` bên tệp `src/app.js`.
  >   + Đồng thời làm sáng viền **Callee (hàm bị nó gọi)**: Đó là `findUserByUsername` và dẫn thẳng xuống `queryUnsafe` bên tệp `src/db.js`.
  >   + Toàn bộ các hàm không liên quan tự động hạ độ mờ xuống `0.25`.
  > 
  > 🌟 **ĐÂY CHÍNH LÀ ĐIỂM SÁNG TẠO 9+ QUYẾT ĐỊNH:**  
  > Làm thế nào để AI hiểu được lỗ hổng này mà không bị ảo giác?  
  > Nếu chúng ta gửi cả dự án hàng ngàn dòng cho AI, chi phí token sẽ cực kỳ đắt đỏ và mô hình sẽ bị phân tán chú ý. Nếu chỉ gửi 1 dòng `db.js`, AI sẽ không biết dữ liệu đầu vào xuất phát từ đâu!  
  > VIECODIE giải quyết bài toán này bằng thuật toán **Call Graph Context Selector**: Hệ thống tự động 'cắt' đúng đồ thị con (Sub-graph) chứa chuỗi gọi từ `handleLogin` ➔ `authenticateUser` ➔ `findUserByUsername` ➔ `queryUnsafe` để đưa vào Prompt ngữ cảnh cho AI. Nhờ đó, AI nắm trọn vẹn luồng lan truyền dữ liệu độc hại xuyên qua 3 tệp tin khác nhau!"

---

### 🔴 [05:00 - 06:30] PHẦN 4: GIẢI THÍCH NGUYÊN NHÂN & SINH BẢN VÁ DIFF XÁC ĐỊNH (90 giây)

* **Thao tác màn hình:**
  1. Ở cột phải, nhấp vào lỗi `SEC_SQL_INJECTION`.
  2. Chỉ vào phần **"Giải thích nguyên nhân (Reasoning)"**.
  3. Bấm chuyển sang **Tab "Fix"** để hiển thị Unified Diff.
* **Màn hình hiển thị:** Unified Diff với dòng đỏ (-) và dòng xanh (+).
* **Lời thoại người thuyết trình:**
  > "Đề bài yêu cầu hệ thống phải **'giải thích nguyên nhân và đề xuất cách sửa'**. Xin mời Ban Giám khảo nhìn vào bảng điều khiển bên phải:
  > 
  > 1. **Giải thích nguyên nhân chuyên sâu (Root Cause Explanation):**
  >    - Hệ thống giải thích bằng tiếng Việt mạch lạc: Tham số `username` được nhận trực tiếp từ HTTP request trong `app.js`, truyền qua `auth.js` và nối trực tiếp vào câu lệnh SQL tại `db.js` mà không qua bất kỳ lớp lọc hay tham số hóa nào. Kẻ tấn công có thể chèn chuỗi `' OR '1'='1` để bypass toàn bộ cơ chế đăng nhập.
  > 
  > 2. **Đề xuất cách sửa bằng Unified Diff xác định:**
  >    - Khác biệt hoàn toàn với các công cụ chỉ 'nói mồm' bằng văn bản lý thuyết, VIECODIE sinh ra **bản vá mã nguồn thực sự (Unified Diff)**:
  >      + **Dòng màu đỏ (-):** Loại bỏ câu lệnh nối chuỗi không an toàn `db.query("SELECT * FROM users WHERE username = '" + username + "'")`.
  >      + **Dòng màu xanh (+):** Thay thế bằng cú pháp tham số hóa an toàn chuẩn công nghiệp: `db.query("SELECT * FROM users WHERE username = $1", [username])`.
  >    - Bản vá chỉ tác động chính xác vào hàm bị lỗi, giữ nguyên 100% định dạng, chú thích và kiến trúc tổng thể của tệp tin."

---

### 🔴 [06:30 - 08:00] PHẦN 5: ÁP DỤNG BẢN VÁ, KIỂM THỬ SANDBOX & HOÀN TÁC AN TOÀN (90 giây)

* **Thao tác màn hình:**
  1. Nhấn nút **"Áp dụng bản sửa (Apply Patch)"**.
  2. Màn hình thông báo: *Bản vá đã được áp dụng thành công xuống đĩa (src/db.js)*.
  3. Nhấp mở thanh **Test Drawer** ở cạnh dưới màn hình.
  4. Nhấn nút **"Chạy lại kiểm thử (Re-run Tests)"**.
  5. Màn hình hiển thị: Test runner chạy thực tế và chuyển toàn bộ sang màu xanh **3 / 3 PASSED (100%)**.
  6. Nhấn nút **"Hoàn tác (Undo)"** để trình diễn khả năng khôi phục.
* **Lời thoại người thuyết trình:**
  > "Một bản sửa chỉ có giá trị khi nó được chứng minh là chạy đúng và không làm hỏng hệ thống!
  > 
  > **Bước 1 - Áp dụng bản vá an toàn:**
  > Em nhấn nút **'Áp dụng bản sửa'**. Hệ thống yêu cầu token bảo mật và cờ xác nhận `confirm: true` để chống vô tình thao tác. Tệp `src/db.js` trên ổ đĩa vật lý lập tức được cập nhật trực tiếp.
  > 
  > **Bước 2 - Kiểm tra lại bằng bộ kiểm thử (Test Verification):**
  > Em kéo thanh **Test Drawer** bên dưới lên. Đây là runner độc lập tích hợp trực tiếp `node --test` của dự án:
  > - Trước khi vá, bộ test có 2 bài thất bại vì hệ thống không chặn được chuỗi SQL Injection.
  > - Bây giờ, em nhấn **'Chạy lại kiểm thử'**: Môi trường sandbox lập tức thực thi lại test suite thực tế. Và như Ban Giám khảo thấy: **Toàn bộ 3/3 ca kiểm thử chuyển sang trạng thái xanh lá ĐẠT (Passed 100%)**! Lỗ hổng bảo mật đã được bẻ gãy hoàn toàn mà tính năng đăng nhập hợp lệ vẫn hoạt động hoàn hảo.
  > 
  > 🛡️ **ĐIỂM NHẤN CÔNG NGHỆ BẢO VỆ — SNAPSHOT LEDGER BẤT BIẾN:**  
  > Điều gì xảy ra nếu lập trình viên muốn thử nghiệm một giải pháp khác hoặc không hài lòng với bản vá?  
  > VIECODIE trang bị cơ chế **Snapshot Ledger** ghi nhật ký biến đổi tệp theo thời gian. Em nhấn nút **'Hoàn tác (Undo)'**: Toàn bộ thay đổi lập tức được phục hồi **nguyên trạng byte-for-byte** về trạng thái ban đầu mà không để lại bất kỳ file rác nào. Tính an toàn mã nguồn của khách hàng luôn được đặt ở mức tối thượng!"

---

### 🔴 [08:00 - 09:00] PHẦN 6: BẰNG CHỨNG THỰC NGHIỆM KHOA HỌC: BENCHMARK & QUALITY GATES (60 giây)

* **Thao tác màn hình:**
  1. Chuyển nhanh về Terminal.
  2. Gõ lệnh:
     ```bash
     npm run benchmark
     ```
  3. Chỉ vào bảng thống kê **Confusion Matrix** xuất hiện trên Terminal.
* **Lời thoại người thuyết trình:**
  > "Thưa Ban Giám khảo, một sản phẩm phần mềm chất lượng cao không thể chỉ nói bằng cảm tính, mà phải được chứng minh bằng **số liệu khoa học thực nghiệm có thể kiểm chứng độc lập**.
  > 
  > Chúng em đã xây dựng một bộ dữ liệu chuẩn hóa độc lập gồm **20 ca kiểm thử mẫu** kèm tệp đối soát chuẩn `ground-truth.json`. Em vừa chạy lệnh `npm run benchmark`:
  > - **True Positives (TP):** 10 / 10 ca có lỗ hổng thực tế đều được phát hiện chính xác 100%.
  > - **True Negatives (TN):** 10 / 10 ca mã nguồn chuẩn mực được xác nhận an toàn, không có lỗi.
  > - **Độ chính xác (Precision):** **100.0%**.
  > - **Độ bao phủ (Recall):** **100.0%**.
  > - **Tỷ lệ cảnh báo sai (False Positive Rate):** **0.0%** — Triệt tiêu hoàn toàn tình trạng báo động giả.
  > 
  > Bên cạnh đó, hệ thống của chúng em được bảo vệ bởi chuỗi **6 tầng Quality Gates (`npm run smoke-test`)** với **62 tệp kiểm thử tự động, hơn 820 bài test passed 100%**, đạt chuẩn TypeScript Strict không có bất kỳ cảnh báo ngầm định nào."

---

### 🔴 [09:00 - 10:00] PHẦN 7: CHUẨN MỰC NGUỒN MỞ, GÓI NPM & KẾT LUẬN THUYẾT PHỤC (60 giây)

* **Thao tác màn hình:**
  - Mở trang npm của gói: `https://www.npmjs.com/package/@demoapplication/viecodie` hoặc trang GitHub `https://github.com/phuocduy1044-sys/GPPM`.
* **Lời thoại người thuyết trình:**
  > "Cuối cùng, VIECODIE khẳng định tính chuyên nghiệp và chuẩn mực nguồn mở quốc tế:
  > - **Tính pháp lý & Minh bạch:** Dự án sử dụng giấy phép **MIT (OSI-Approved)**, công khai toàn bộ lịch sử commit, ghi nhận nguồn gốc upstream đầy đủ.
  > - **An toàn bản quyền (SBOM):** Kiểm toán 100% cả 36 thư viện bên thứ ba, cam kết **0% lây nhiễm Copyleft GPL**. Điểm rủi ro PoF theo chuẩn VFOSSA đạt mức an toàn cao **≤ 15 / 60 điểm** (Đạt điểm tuyệt đối 1.0/1.0).
  > - **Khả năng đóng gói & Sẵn sàng sử dụng:** Sản phẩm đã được publish thành công lên **NPM Registry toàn cầu** với tên gói `@demoapplication/viecodie`. Bất kỳ lập trình viên nào trên thế giới cũng có thể cài đặt và sử dụng ngay lập tức bằng lệnh:
  >   `npm install -g @demoapplication/viecodie`
  > 
  > **Kính thưa Ban Giám khảo!**  
  > VIECODIE không chỉ là một công cụ AI Code Review thông thường, mà là một **trợ lý đánh giá chất lượng và an toàn mã nguồn toàn diện**: Có đồ thị dẫn đường, có AI hiểu ngữ cảnh, có bản vá thực tế và có sandbox kiểm chứng an toàn.
  > 
  > Đội thi chúng em xin chân thành cảm ơn Ban Giám khảo đã chú ý lắng nghe. Chúng em rất mong nhận được những câu hỏi và ý kiến đóng góp quý báu từ quý Thầy Cô!"

---

## 🎯 BỘ 5 CÂU HỎI PHẢN BIỆN "HỐT ĐIỂM" BAN GIÁM KHẢO HAY HỎI NHẤT

Dưới đây là 5 câu hỏi cốt lõi mà Ban Giám khảo Bảng 3 GPPM thường xoáy sâu, cùng chiến lược trả lời ngắn gọn, tự tin để chốt điểm 10 tuyệt đối:

### Câu hỏi 1: "Sản phẩm của em khác gì so với ESLint/SonarQube hoặc GitHub Copilot?"
* **Trả lời trọng tâm:**
  > "Dạ thưa Thầy/Cô, sự khác biệt nằm ở **tính kết nối đồ thị (Graph) và vòng lặp kiểm chứng (Feedback Loop)**:
  > - ESLint và SonarQube chỉ phân tích tĩnh cục bộ theo từng file đơn lẻ, không nhìn thấy luồng dữ liệu lan truyền giữa các module khác nhau.
  > - GitHub Copilot có AI nhưng gợi ý code mà không có công cụ kiểm chứng tính đúng đắn trên ổ đĩa.
  > - VIECODIE là cầu nối hoàn hảo: Dùng **Call Graph AST** để trích xuất ngữ cảnh liên tệp đưa cho AI, và dùng **Test Drawer Sandbox + Snapshot Ledger** để kiểm chứng thực tế và hoàn tác an toàn."

### Câu hỏi 2: "Khi phân tích các dự án lớn hàng trăm file, đồ thị gọi hàm có bị nghẽn (lag) hoặc tràn bộ nhớ không?"
* **Trả lời trọng tâm:**
  > "Dạ thưa Thầy/Cô, chúng em đã giải quyết bài toán hiệu năng bằng 2 kỹ thuật:
  > 1. Bộ parser TypeScript Compiler API của chúng em chỉ xây dựng AST ở mức Function/Method và Import Declaration, không lưu toàn bộ thân câu lệnh vào RAM nên thời gian dựng đồ thị 100 file chỉ mất dưới 1.5 giây.
  > 2. Trên giao diện Web SVG, chúng em áp dụng cơ chế phân tách tầng và highlight theo node kích hoạt (`activeCallerIds` & `activeCalleeIds`), chỉ render luồng liên quan và làm mờ các node khác chứ không tính toán lại toàn bộ đồ thị."

### Câu hỏi 3: "Làm thế nào em đảm bảo việc áp dụng bản vá (Apply Patch) không làm hỏng code của lập trình viên?"
* **Trả lời trọng tâm:**
  > "Dạ thưa Thầy/Cô, chúng em bảo vệ mã nguồn qua **3 lớp bảo vệ nghiêm ngặt**:
  > - Lớp 1: Bản vá được sinh ở định dạng **Unified Diff xác định**, chỉ thay đổi đúng dòng lỗi, không ghi đè bừa bãi.
  > - Lớp 2: Cơ chế **Snapshot Ledger** (`src/fix/snapshot.ts`) chụp lại snapshot bộ nhớ nguyên trạng từng byte ngay trước khi ghi file.
  > - Lớp 3: Nút **'Hoàn tác (Undo)'** cho phép khôi phục tức thì về trạng thái ban đầu nếu bài test kiểm chứng không đạt."

### Câu hỏi 4: "Làm sao em chứng minh tỷ lệ cảnh báo sai (False Positive) bằng 0% như trong báo cáo?"
* **Trả lời trọng tâm:**
  > "Dạ thưa Thầy/Cô, chúng em đã loại bỏ cảnh báo sai nhờ cơ chế phân tích ngữ cảnh (Semantic Guard):
  > - Ví dụ với lỗi Null Dereference: Các linter khác cứ thấy `obj.prop` là báo lỗi. VIECODIE kiểm tra xem trước đó đã có guard clause như `if (!obj) return` hoặc toán tử `typeof` hay chưa; đồng thời miễn trừ danh sách `safeProps` như `push`, `slice`, `map` của mảng.
  > - Kết quả đối soát trên bộ 20 test case độc lập với ground truth chứng minh tỷ lệ FPR đạt đúng 0.0%."

### Câu hỏi 5: "Dự án này đội em tự viết bao nhiêu phần trăm và kế thừa nguồn mở như thế nào?"
* **Trả lời trọng tâm:**
  > "Dạ thưa Thầy/Cô, chúng em tuân thủ 100% chuẩn mực nguồn mở VFOSSA:
  > - Phần kế thừa: Chúng em kế thừa khung sườn terminal agent cơ bản từ dự án MIT `miii-cli`.
  > - **Phần sáng tạo 100% của đội thi:** Toàn bộ bộ máy **Reviewer Engine**, **TypeScript Call Graph AST 2 chiều**, **Web Reviewer by Graph**, **Unified Test Runner Sandbox**, **Snapshot Ledger** và **Bộ quy tắc phân tích tĩnh 4 nhóm**. Toàn bộ phần sáng tạo này được ghi nhận chi tiết tại tệp `CHANGES_GPPM.md` và `docs/ORIGIN.md`."

---

## 📋 BẢNG TỔNG HỢP LỆNH CHUẨN BỊ TRƯỚC GIỜ G

```bash
# 1. Kiểm tra toàn bộ hệ thống trước khi lên sân khấu (Chạy mất ~1.5 phút):
npm run smoke-test

# 2. Khởi chạy CLI demo nhanh:
node dist/cli.js review examples/demo-project --mode rules

# 3. Mở Web Graph Reviewer tương tác:
node dist/cli.js graph

# 4. Chạy Benchmark thực nghiệm đối soát trước Ban Giám khảo:
npm run benchmark
```

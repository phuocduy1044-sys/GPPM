# 📑 KỊCH BẢN & NỘI DUNG THUYẾT TRÌNH DỰ ÁN VIECODIE (TỪ A - Z)
**Chủ đề:** VIECODIE — Nền tảng CLI & Web AI Code Reviewer bằng Đồ thị Gọi hàm (Call Graph)  
**Thời lượng đề xuất:** 5 - 10 phút (kèm Live Demo thực tế)  
**Tác giả:** Đội ngũ phát triển VIECODIE  

---

## 📌 PHẦN 1: TỔNG QUAN BÀI THUYẾT TRÌNH (EXECUTIVE PITCH)

* **Tên sản phẩm:** **VIECODIE (CLI & Web Graph)**
* **Slogan:** *"Review mã nguồn chuẩn xác theo luồng gọi hàm — Vá lỗi tự động — Kiểm chứng tức thì"*
* **Định vị sản phẩm:** Công cụ hỗ trợ lập trình viên (Developer Tool) và tích hợp CI/CD, kết hợp giải thuật **phân tích tĩnh đồ thị gọi hàm (Call Graph via AST)** và **trí tuệ nhân tạo (Dual AI: DeepSeek R1/V3 + Ollama Local)** để phát hiện lỗi bảo mật, phân tích nguyên nhân gốc rễ và tự động sinh bản vá (Unified Diff) được kiểm chứng bằng test suite thực tế.
* **Quy trình làm việc cốt lõi (CLI-First Workflow):**
  $$\text{CLI (/review)} \xrightarrow{\text{quét AST \& sinh Call Graph}} \text{Phát hiện lỗ hổng \& tạo bản vá} \xrightarrow{\text{lệnh /graph}} \text{Mở Web Graph trực quan} \xrightarrow{\text{Kiểm chứng Test}}$$

---

## 🖥️ PHẦN 2: CHI TIẾT 12 SLIDES THUYẾT TRÌNH CHUẨN HỘI THI (SLIDE DECK OUTLINE)

### SLIDE 1: BÌA BÁO CÁO (TITLE SLIDE)
* **Tiêu đề lớn:** **VIECODIE — AI CODE REVIEWER BY GRAPH**
* **Tiêu đề phụ:** Nền tảng phân tích mã nguồn, dựng đồ thị hàm liên tệp và kiểm chứng bản sửa lỗi tự động
* **Thông tin:**
  - Hội thi: Tin học Trẻ / Giải pháp Phần mềm (GPPM)
  - Đội thi / Tác giả: ...
  - Phiên bản: `v3.13.1` (Giấy phép MIT minh bạch)
* **Hình ảnh minh họa:** Logo VIECODIE, giao diện Terminal hiện đại bên cạnh Đồ thị SVG tương tác.

---

### SLIDE 2: BỐI CẢNH & BÀI TOÁN THỰC TIẾN (THE PAIN POINTS)
* **Thực trạng ngành công nghệ phần mềm:**
  - 85% lỗ hổng bảo mật và lỗi logic phát sinh do tương tác chéo giữa các module/hàm, không nằm ở một dòng code đơn lẻ.
  - Quá trình Code Review thủ công tốn từ 20% - 35% thời gian của Senior Developer.
* **Hạn chế của công cụ hiện nay:**
  1. **Linter truyền thống (ESLint, SonarQube cơ bản):** Chỉ soi từng tệp rời rạc theo regex/cú pháp cục bộ, sinh ra quá nhiều cảnh báo rác (False Positives) và **không hiểu luồng dữ liệu liên tệp**.
  2. **Chatbot AI thông thường (ChatGPT, Copilot web):** Code bị cắt khúc, AI thiếu ngữ cảnh toàn cục dẫn đến **"ảo giác" (Hallucination)**, bịa đặt lỗi hoặc sửa chỗ này làm gãy chỗ khác.
  3. **Nguy cơ rò rỉ dữ liệu:** Doanh nghiệp e ngại tải toàn bộ source code nội bộ lên các máy chủ AI đám mây bên thứ ba.
* **Câu hỏi đặt ra:** *Làm sao để có một công cụ review vừa hiểu sâu luồng gọi hàm, vừa có trí tuệ nhân tạo giải thích nguyên nhân, vừa chạy được offline bảo mật, lại gắn liền với terminal hàng ngày của lập trình viên?*

---

### SLIDE 3: GIẢI PHÁP ĐỘT PHÁ — VIECODIE CLI (THE SOLUTION)
* **Triết lý "CLI-First, Graph-Driven":**
  - **Terminal là trung tâm:** Lập trình viên không cần rời khỏi môi trường làm việc quen thuộc. Mọi thao tác bắt đầu từ dòng lệnh.
  - **Đồ thị dẫn đường (Graph-Guided):** Trích xuất mạng lưới liên kết giữa File $\rightarrow$ Function $\rightarrow$ Calls. AI chỉ đọc đúng lát cắt ngữ cảnh cần thiết.
  - **Vá lỗi và kiểm chứng (Verify-in-the-Loop):** Không chỉ đưa ra lời khuyên suông, VIECODIE sinh bản vá `Unified Diff` và kích hoạt bộ test tự động ngay lập tức để xác thực mã sau sửa có thực sự chạy đúng không.
* **3 Trụ cột cốt lõi:**
  1. ⚡ **Tốc độ cực nhanh:** Quét và dựng AST đồ thị chỉ trong vài mili-giây.
  2. 🛡️ **Bảo mật tuyệt đối:** Lựa chọn chạy 100% Offline với Ollama hoặc Hybrid qua DeepSeek API.
  3. 🔗 **Đồng bộ CLI & Web:** Phiên làm việc duy nhất, dùng chung bộ nhớ và cache báo cáo, không bắt chọn lại thư mục hay gọi lại AI tốn kém.

---

### SLIDE 4: KIẾN TRÚC KỸ THUẬT HỆ THỐNG (SYSTEM ARCHITECTURE)
* **Sơ đồ phân tầng:**
  1. **Tầng Giao diện (Presentation Layer):**
     - **CLI Engine:** Xây dựng trên React/Ink, giao diện TUI phong cách pale palette, hỗ trợ phím tắt, tìm kiếm lệnh và gõ tiếng Việt Unicode Telex/VNI chuẩn hóa NFC.
     - **Web UI:** React 19 + Vite + Tailwind CSS + Tabler Icons, canvas đồ thị SVG tương tác cao, mượt mà ở 60fps.
  2. **Tầng Phân tích & Đồ thị (Review & AST Graph Core):**
     - TypeScript Compiler API phân tích AST tĩnh.
     - Thuật toán trích xuất Call Graph & Cross-file Call Resolver.
     - Bộ 4 nhóm quy tắc thẩm định chuyên sâu (Security, Bug, Style, Maintainability).
  3. **Tầng Trí tuệ nhân tạo (AI Orchestrator):**
     - Dual AI: DeepSeek R1/V3 (Online) & Ollama Local (Offline).
     - Parser Zod schema ép kiểu chặt chẽ, chống Hallucination.
  4. **Tầng Thực thi & Kiểm chứng (Execution & Sandbox Layer):**
     - Engine áp bản vá (Unified Diff Patcher).
     - Test Runner thực thi trong subprocess cô lập có timeout và bộ lọc log sạch (Secret Redaction).

---

### SLIDE 5: GIẢI THUẬT CALL GRAPH & BỘ QUY TẮC AST RULES
* **Cơ chế dựng Call Graph liên tệp:**
  - Quét cấu trúc module, phân giải các câu lệnh `import` / `export`.
  - Định vị tọa độ từng hàm (`fn:src/auth.js:authenticateUser`).
  - Lập bản đồ liên kết 2 chiều: `calledBy` (ai gọi hàm này) và `calls` (hàm này gọi những ai).
* **Bộ quy tắc thẩm định tiêu biểu:**
  - 🔴 **SQL Injection (`SEC_SQL_INJECTION`):** Bắt lỗi nối chuỗi trong đối số các hàm query DB.
  - 🔴 **Hardcoded Secrets (`SEC_HARDCODED_SECRET`):** Phát hiện chuỗi API Key/Token gán cứng trong code.
  - 🔴 **Thực thi mã nguy hiểm (`SEC_DANGEROUS_EVAL`):** Ngăn chặn hàm `eval()` tạo lỗ hổng RCE.
  - 🟠 **Tiềm ẩn Null Pointer (`BUG_POTENTIAL_NULL_DEREFERENCE`):** Truy cập sâu thuộc tính không kiểm tra null/undefined.
  - 🟡 **So sánh lỏng lẻo (`BUG_LOOSE_EQUALITY`):** Dùng `==` thay vì `===`.
  - 🔵 **Cú pháp lỗi thời (`STYLE_VAR_KEYWORD`):** Khai báo bằng `var` thay vì `const/let`.

---

### SLIDE 6: CHIẾN LƯỢC TRÍ TUỆ NHÂN TẠO KÉP (DUAL AI STRATEGY)
* **Tại sao phải là "AI Kép"?**
  - **Chế độ Online (DeepSeek R1/V3 Cloud):** Dành cho các dự án cần khả năng lý luận (reasoning) mạnh mẽ nhất, mô hình 671B tham số phân tích sâu nguyên nhân gốc rễ (Root Cause Analysis).
  - **Chế độ Offline (Ollama Local - Qwen2.5-Coder / DeepSeek-R1 7B):** Dành cho ngân hàng, cơ quan nhà nước, môi trường cách ly internet (Air-gapped). Dữ liệu 100% nằm trong máy, không một byte nào lọt ra ngoài.
* **Cơ chế Rules-Only Fallback:** Nếu mất mạng hoặc AI bị gián đoạn, hệ thống tự động chạy chế độ fallback bằng AST rules, vẫn báo cáo đầy đủ lỗ hổng, tuyệt đối không bị treo hoặc crash.

---

### SLIDE 7: BẢO MẬT DOANH NGHIỆP & CHỐNG RÒ RỈ API KEY / TOKEN
* **Bảo vệ khóa bí mật (API Key Security):**
  - AI API Key chỉ lưu ở backend máy lập trình viên (`~/.viecodie/config.json`).
  - Tuyệt đối **không trả API key về frontend** qua bất kỳ endpoint API hay gói JavaScript nào. Endpoint cấu hình chỉ trả về `hasKey: true`.
  - Cơ chế **Secret Redaction**: Khi phát hiện mã nguồn có chứa API key, hệ thống tự động che lại dạng `sk_...[REDACTED]...def`, chỉ chỉ ra dòng/tệp bị lộ để chủ sở hữu đổi khóa, không lặp lại khóa trong log hay báo cáo.
* **Xác thực phiên CLI $\leftrightarrow$ Web an toàn:**
  - Token phiên trao đổi qua HTTP Loopback nội bộ (`127.0.0.1`), không in công khai ra terminal.
  - Sử dụng Cookie an toàn `viecodie-session` (`SameSite=Strict; Path=/`) giúp người dùng mở link mượt mà không cần copy token thủ công mà vẫn đảm bảo an toàn, chặn 100% truy cập trái phép từ bên ngoài (chặn lỗi 401).

---

### SLIDE 8: LUỒNG TRẢI NGHIỆM THỰC TẾ (LIVE DEMO WORKFLOW)
* **Kịch bản 4 bước thần tốc:**
  1. **Bước 1: Quét trong terminal (`/review`):**
     - Chỉ mất ~1ms - 5ms để quét xong dự án mẫu.
     - CLI hiển thị bảng tổng quan trực quan: 3 Critical, 1 Medium, 1 Low.
  2. **Bước 2: Mở đồ thị trực quan (`/graph`):**
     - Singleton Web Server tái sử dụng tức thì cổng localhost.
     - Trình duyệt tự mở đúng phiên bản review, không chọn lại thư mục.
  3. **Bước 3: Trải nghiệm trên Web:**
     - Đồ thị SVG tương tác: Click node để làm sáng luồng gọi hàm.
     - Xem mã nguồn với chấm cảnh báo lỗi trên từng dòng (Gutter).
     - Xem đề xuất sửa dạng Unified Diff.
  4. **Bước 4: Sửa và Xác minh (Apply & Verify):**
     - Bấm **"Áp dụng bản sửa"**: Mã nguồn được vá tự động.
     - Bấm **"Chạy lại kiểm thử"**: Test runner chạy lại trong 90ms $\rightarrow$ Chuyển sang xanh **ĐẠT (Passed 100%)**.

---

### SLIDE 9: BẢNG SO SÁNH NĂNG LỰC CẠNH TRANH
| Tiêu chí | Linter truyền thống (ESLint, Sonar) | Chatbot AI (ChatGPT, Copilot Chat) | **VIECODIE (CLI & Web)** |
| :--- | :---: | :---: | :---: |
| **Hiểu luồng gọi hàm liên tệp** | ❌ Từng file rời rạc | ⚠️ Giới hạn context window | ✅ **Dựng Call Graph đầy đủ** |
| **Giải thích nguyên nhân gốc rễ** | ❌ Chỉ báo mã lỗi | ✅ Giải thích tốt | ✅ **AI giải thích có dẫn chứng** |
| **Chống ảo giác (Hallucination)** | ✅ 100% chính xác cú pháp | ❌ Thường xuyên bịa lỗi | ✅ **AST lọc trước + Schema ép kiểu** |
| **Khả năng chạy Offline** | ✅ Chạy offline | ❌ Phụ thuộc 100% cloud | ✅ **100% Offline với Ollama** |
| **Tự động vá lỗi & Kiểm chứng** | ⚠️ Chỉ fix lỗi format cơ bản | ❌ Phải copy paste thủ công | ✅ **Sinh Diff + Chạy Test xác minh** |
| **Môi trường làm việc** | CLI / IDE | Trình duyệt / Sidebar IDE | ✅ **CLI-first đồng bộ Web Graph** |

---

### SLIDE 10: TÍNH NGUYÊN GỐC & MINH BẠCH BẢN QUYỀN (VFOSSA POF)
* **Tính kế thừa minh bạch:**
  - Kế thừa nền tảng CLI/TUI và LLM streaming từ `miii-cli` (tác giả Akshay Marathe, giấy phép MIT chuẩn mở).
* **Đóng góp mới cốt lõi của đội ngũ (chiếm hơn 2.700 dòng mã mới):**
  1. Chuyển dịch toàn bộ mục tiêu từ Chatbot dòng lệnh thông thường thành **Hệ thống AI Code Reviewer chuyên sâu**.
  2. Xây dựng mới hoàn toàn bộ parser Call Graph đa tệp (`src/review/ast.ts`).
  3. Xây dựng mới bộ quy tắc AST Rules & Unified Diff Patcher (`src/review/rules.ts`, `patch.ts`).
  4. Xây dựng mới giao diện **Web Code Reviewer by Graph** với SVG Layout tương tác động 100% (`web/src/components/reviewer/`).
  5. Đạt chứng chỉ kiểm thử: **53 test files (738 tests passed / 0 failed)**.

---

### SLIDE 11: LỘ TRÌNH PHÁT TRIỂN & KHẢ NĂNG ỨNG DỤNG (ROADMAP)
* **Giai đoạn hiện tại (v3.13.1):** Hỗ trợ toàn diện JavaScript/TypeScript, tích hợp CLI slash commands, Web Graph và Dual AI.
* **Giai đoạn tiếp theo:**
  - Mở rộng đa ngôn ngữ: Python (AST via Python standard lib), Golang, Rust.
  - Tích hợp Git Hook (`pre-commit`, `pre-push` review tự động).
  - Xuất plugin GitHub Action / GitLab CI để chặn tự động các Pull Request có lỗ hổng bảo mật nghiêm trọng.

---

### SLIDE 12: TỔNG KẾT & KÊU GỌI HÀNH ĐỘNG (CONCLUSION & Q&A)
* **Thông điệp cốt lõi:** *"VIECODIE không thay thế lập trình viên, mà trao cho lập trình viên một trợ lý thẩm định mã nguồn thông minh, chính xác, bảo mật và tốc độ cao."*
* **Mã nguồn dự án:** Đã đóng gói chuẩn `npm` package toàn cục, mã nguồn mở đẩy đủ trên GitHub.
* **Lời cảm ơn:** Chân thành cảm ơn Ban Giám khảo và Hội đồng chuyên môn! Sẵn sàng bước vào phần Hỏi & Đáp (Q&A).

---

## 🎙️ PHẦN 3: KỊCH BẢN NÓI CHI TIẾT (SPEAKER NOTES - DÀNH CHO NGƯỜI THUYẾT TRÌNH)

> *(Thời lượng: 5 phút — Giọng điệu tự tin, đĩnh đạc, tốc độ vừa phải, nhấn mạnh vào các từ khóa công nghệ)*

### [00:00 - 01:00] Mở đầu & Nêu vấn đề
"Kính thưa Ban Giám khảo và toàn thể hội đồng!  
Trong quy trình phát triển phần mềm hiện đại, có một câu nói nổi tiếng: *'Code viết ra chỉ mất vài giờ, nhưng tìm và sửa lỗi có thể mất nhiều tuần'*.  
Hiện nay, khi thực hiện Code Review, các lập trình viên thường bị kẹt giữa hai thái cực: Một bên là các công cụ Linter truyền thống như ESLint hay SonarQube — chúng chạy nhanh nhưng rất 'mù quáng', chỉ soi từng dòng rời rạc mà không hiểu được luồng gọi hàm giữa các tệp tin. Một bên là các Chatbot AI như ChatGPT hay Copilot — tuy thông minh nhưng lại dễ 'ảo giác', bịa đặt ra lỗi hoặc sửa xong làm hỏng logic hệ thống vì không có ngữ cảnh toàn cục.  
Để giải quyết bài toán cốt lõi này, đội chúng em đã nghiên cứu và phát triển: **VIECODIE — Nền tảng AI Code Reviewer bằng Đồ thị Gọi hàm (Call Graph)**."

### [01:00 - 02:15] Kiến trúc giải pháp & Điểm đột phá
"Điểm đột phá của VIECODIE nằm ở mô hình **'CLI-First, Graph-Driven'**:  
Thứ nhất, chúng em không ném toàn bộ mã nguồn thô cho AI một cách vô tội vạ. Bộ máy AST Parser của VIECODIE phân tích cú pháp tĩnh ở cấp độ mili-giây, dựng nên một **Đồ thị Gọi hàm (Call Graph)** hoàn chỉnh: Hàm nào gọi hàm nào, tệp nào phụ thuộc vào tệp nào. Nhờ vậy, khi phát hiện một lỗ hổng, AI nhận được đúng lát cắt ngữ cảnh của luồng thực thi, loại bỏ hoàn toàn tình trạng ảo giác.  
Thứ hai, VIECODIE là hệ thống **Trí tuệ nhân tạo kép (Dual AI)**. Nếu cần lý luận sâu sắc, hệ thống kết nối đám mây với DeepSeek R1/V3. Nhưng nếu làm việc trong doanh nghiệp tài chính hoặc môi trường cách ly mạng, VIECODIE có thể chạy **hoàn toàn Offline 100% thông qua Ollama Local**, đảm bảo không một dòng code nào bị gửi ra ngoài internet.  
Thứ ba, hệ thống có cơ chế **Verify-in-the-Loop**: Tự động sinh bản vá chuẩn Unified Diff và kích hoạt bộ test tự động ngay lập tức để chứng minh code đã sửa chạy đúng."

### [02:15 - 04:00] Thao tác Live Demo thực tế
*(Người thuyết trình chuyển màn hình sang Terminal)*  
"Sau đây, em xin phép demo trực tiếp sản phẩm trên máy:  
Tại thư mục một dự án thực tế, em chỉ cần gõ lệnh khởi động `viecodie`.  
Ngay trong dòng lệnh, em gõ lệnh slash:  
👉 `/review`  
Chỉ mất **chưa đầy 5 mili-giây**, bộ quét AST đã phân tích xong toàn bộ tệp, dựng đồ thị hàm và báo cáo ngay 5 vấn đề nghiêm trọng: Từ lỗ hổng SQL Injection do nối chuỗi, sử dụng hàm eval nguy hiểm, cho đến việc lộ API key gán cứng trong mã nguồn. Đặc biệt, Ban Giám khảo có thể thấy khóa bí mật đã được hệ thống tự động che lại dưới dạng `[REDACTED]` để chống rò rỉ thông tin nhạy cảm.  

Tiếp theo, em muốn quan sát đồ thị trực quan. Em không cần mở trình duyệt, không cần chọn lại thư mục, chỉ cần gõ:  
👉 `/graph`  
Ngay lập tức, server localhost được khởi động an toàn với cơ chế session cookie và mở thẳng giao diện **Web Code Reviewer by Graph**.  
*(Chỉ vào màn hình trình duyệt)*  
Toàn bộ đồ thị SVG hiển thị sống động: luồng gọi từ `app.js` sang `auth.js` và `db.js`. Bấm vào hàm lỗi, thanh Gutter đánh dấu chính xác dòng code vi phạm.  
Tại tab Fix bên phải, em xem bản vá đề xuất và bấm nút **'Áp dụng bản sửa (Apply Patch)'**. Mã nguồn được cập nhật tức thì.  
Cuối cùng, em bấm nút **'Chạy lại kiểm thử'** ở Test Drawer bên dưới — chỉ trong 90 mili-giây, bộ test chạy xong và trả về kết quả xanh: **ĐẠT (Passed 100%)**!"

### [04:00 - 05:00] Tính minh bạch & Kết luận
"Toàn bộ dự án tuân thủ nghiêm ngặt chuẩn minh bạch mã nguồn mở VFOSSA PoF, giấy phép MIT và có hệ thống kiểm thử tự động đạt chuẩn **738/738 tests passed**.  
VIECODIE mang lại giá trị thực tiễn to lớn: Giúp lập trình viên tự tin hơn trước khi commit, giúp Tech Lead tiết kiệm 50% thời gian review, và giúp doanh nghiệp bảo vệ mã nguồn tuyệt đối.  
Em xin chân thành cảm ơn Ban Giám khảo và rất mong nhận được những câu hỏi phản biện!"

---

## 🛠️ PHẦN 4: HƯỚNG DẪN THAO TÁC LIVE DEMO (STEP-BY-STEP CHEATSHEET)

| Bước | Lệnh thực hiện | Kết quả hiển thị trên màn hình | Điểm cần nhấn mạnh với Ban Giám khảo |
| :---: | :--- | :--- | :--- |
| **1** | `cd C:\GPPM_Viecodie\test-project`<br>`viecodie` | Banner khởi động VIECODIE trong terminal, trạng thái model sẵn sàng. | Giao diện TUI Ink cực đẹp, mượt, hỗ trợ bộ gõ tiếng Việt Telex/VNI không bị chớp nháy. |
| **2** | Gõ `/review` | Báo cáo phân tích hiện ra tức thì trong ~1ms: Bắt 5 lỗi (SQLi, Hardcoded Secret, eval, loose equality, var). | Tốc độ quét cực nhanh; chuỗi API Key bị lộ được tự động che `[REDACTED]` an toàn. |
| **3** | Gõ `/graph` | In liên kết sạch `http://localhost:4747/`, trình duyệt tự động bật mở giao diện Web Graph Review. | Tự động đồng bộ đúng dự án hiện tại, không bắt chọn lại folder, không gọi lại AI tốn token. |
| **4** | Trên Web: Click vào node `authenticateUser` | Đồ thị làm sáng (highlight) các cạnh nối tới `db.js`, tab Code tự cuộn đến đúng dòng có chấm cảnh báo đỏ. | Trực quan hóa Call Graph liên tệp, giúp lập trình viên hiểu ngay ai gọi hàm này và mức độ ảnh hưởng. |
| **5** | Click nút **Áp dụng bản sửa** $\rightarrow$ Click **Chạy lại kiểm thử** | Patch được áp dụng; ngăn kéo Test Drawer chạy `npm test` và báo `ĐẠT (Passed 100%)`. | Quy trình khép kín: Phát hiện $\rightarrow$ Giải thích $\rightarrow$ Vá lỗi $\rightarrow$ Kiểm chứng bằng test thực tế. |

---

## ❓ PHẦN 5: BỘ CÂU HỎI PHẢN BIỆN "HÓC BÚA" CỦA GIÁM KHẢO & CÂU TRẢ LỜI "GHI ĐIỂM"

### 💡 Câu 1: Làm thế nào VIECODIE dám khẳng định AI không bị "ảo giác" (hallucination) khi phán đoán lỗi?
> **Trả lời:**  
> "Dạ thưa Ban Giám khảo, chúng em giải quyết vấn đề ảo giác bằng **Kiến trúc phòng thủ 3 lớp (3-Tier Guard)**:  
> 1. **Lớp 1 - AST Rules làm màng lọc cứng:** Chúng em không đưa code tự do cho AI đoán mò. Bộ phân tích AST tĩnh của TypeScript Compiler API quét và xác định trước các điểm nghi vấn cụ thể (ví dụ: toán tử nối chuỗi `+` nằm trong hàm `query`, sự xuất hiện của `eval`).  
> 2. **Lớp 2 - Thu hẹp ngữ cảnh bằng Call Graph:** Thay vì gửi toàn bộ repo làm loãng context, hệ thống chỉ trích xuất đúng hàm nghi vấn kèm các hàm caller/callee liên quan trực tiếp.  
> 3. **Lớp 3 - Kiểm chứng Schema bằng Zod:** Bắt buộc AI phản hồi theo định dạng JSON có trường `evidence` trích xuất nguyên văn dòng code thực tế trong file. Nếu AI bịa ra một dòng code không tồn tại trong source code thật, hệ thống tự động hủy bỏ cảnh báo đó."

---

### 💡 Câu 2: Doanh nghiệp rất sợ lộ lọt mã nguồn khi dùng AI. VIECODIE bảo vệ dữ liệu khách hàng như thế nào?
> **Trả lời:**  
> "Dạ, chúng em thiết kế bảo mật theo nguyên lý **Privacy-by-Design**:  
> - **Chế độ Offline tuyệt đối:** Khi chọn cấu hình Ollama (`qwen2.5-coder`), toàn bộ mã nguồn chỉ chạy trên máy localhost qua cổng `11434`. Hệ thống hoạt động bình thường ngay cả khi rút toàn bộ dây mạng internet.  
> - **Chống rò rỉ Secret & API Key:** Mọi API key lưu trong config máy local, không bao giờ gửi về web frontend. Nếu mã nguồn dự án bị lập trình viên lỡ tay gán cứng token, quy tắc `SEC_HARDCODED_SECRET` tự động che chuỗi secret thành `[REDACTED]` trước khi ghi log hay đưa vào báo cáo.  
> - **Chế độ Rules-only:** Nếu không muốn dùng bất kỳ model AI nào, người dùng có thể chạy thuần túy chế độ AST Rules, tốc độ chỉ tính bằng mili-giây mà không hề tiêu tốn tài nguyên mạng."

---

### 💡 Câu 3: Tính nguyên gốc và phần đóng góp mới của đội thi là gì so với dự án gốc `miii-cli`?
> **Trả lời:**  
> "Dạ thưa Ban Giám khảo, chúng em tuân thủ 100% tinh thần minh bạch nguồn mở chuẩn VFOSSA PoF:  
> - Chúng em kế thừa từ `miii-cli` phần khung vỏ Terminal UI (React/Ink) và LLM streaming adapter cơ bản, có ghi nhận tác giả và giữ nguyên giấy phép MIT.  
> - **Phần sáng tạo và đóng góp mới của đội là hơn 2.700 dòng code cốt lõi**, bao gồm:  
>   1. Chuyển dịch toàn bộ mục đích từ một công cụ chat dòng lệnh thông thường thành **Hệ thống AI Code Reviewer chuyên sâu**.  
>   2. Tự thiết kế và lập trình bộ phân tích **Call Graph liên tệp** (`src/review/ast.ts`).  
>   3. Tự xây dựng **Bộ 4 nhóm quy tắc AST Rules & Unified Diff Patcher** (`rules.ts`, `patch.ts`).  
>   4. Tự thiết kế và xây dựng mới hoàn toàn giao diện **Web Code Reviewer by Graph** với SVG Canvas tương tác động (`web/src/components/reviewer/`).  
>   5. Đóng góp bộ kiểm thử tự động toàn diện đạt **738 tests passed**."

---

### 💡 Câu 4: Nếu mã nguồn bị thay đổi sau khi review thì hệ thống xử lý ra sao?
> **Trả lời:**  
> "Dạ, VIECODIE quản lý chặt chẽ theo **Mã băm phiên bản (Revision Hash)**:  
> - Mỗi lần review, hệ thống tính toán mã SHA hash từ cây thư mục nguồn.  
> - Nếu lập trình viên sửa file bên ngoài hoặc commit git mới, khi mở lại `/graph`, hệ thống ngay lập tức nhận diện trạng thái lệch phiên bản và bật cờ cảnh báo **'Dữ liệu cũ (Outdated)'** trên giao diện Web. Người dùng chỉ cần bấm nút 'Quét lại' hoặc gõ `/review` trong CLI để đồng bộ ngay mã mới nhất."

---

## 🏆 PHẦN 6: CHECKLIST TRƯỚC GIỜ LÊN SÂN KHẤU (PRE-FLIGHT CHECKLIST)

- [x] Đảm bảo đã cài đặt toàn cục bản mới nhất: `npm install -g viecodie-agent@3.13.1`.
- [x] Đã chuẩn bị sẵn thư mục test mẫu `C:\GPPM_Viecodie\test-project` (hoàn toàn nằm ngoài Git).
- [x] Mở sẵn 1 tab PowerShell/Terminal gõ sẵn lệnh `cd C:\GPPM_Viecodie\test-project`.
- [x] Kiểm tra file `~/.viecodie/config.json` có sẵn API key DeepSeek hoặc khởi động sẵn Ollama service.
- [x] Mở sẵn trình duyệt ở chế độ nền để khi `/graph` chạy, tab trình duyệt bật lên ngay lập tức.
- [x] Kiểm tra âm thanh, máy chiếu và tâm thế tự tin sẵn sàng làm chủ sân khấu!

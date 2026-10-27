# KỊCH BẢN THUYẾT TRÌNH & DEMO SẢN PHẨM (DEMO SCRIPT - 5 PHÚT)
**Hội thi:** Tin học Trẻ / Sản phẩm Sáng tạo GPPM 2026 — Bảng 3  
**Sản phẩm:** VIECODIE — AI Code Reviewer by Graph  
**Thời lượng chuẩn:** 5 phút  
**Mục tiêu:** Thể hiện trọn vẹn 7 bước mạch lạc chứng minh tính nguyên gốc kỹ thuật, năng lực phân tích đồ thị gọi hàm, bản vá diff xác định, cơ chế Snapshot Ledger hoàn tác an toàn và số liệu benchmark thực nghiệm 100%.

---

## 1. Chuẩn bị trước khi demo (Checklist 60 giây)
1. Mở sẵn cửa sổ Terminal tại thư mục gốc của dự án: `C:\GPPM_Viecodie\AI2`.
2. Kiểm tra bản build đã sẵn sàng: `npm run build` (hoặc đã biên dịch sẵn `dist/cli.js` và `dist/web/`).
3. Đảm bảo port `5173` sẵn sàng cho Web Reviewer.

---

## 2. Kịch bản Trình diễn 7 Bước Mạch lạc (Minute-by-minute Walkthrough)

### [00:00 - 00:45] Mở đầu & Đặt vấn đề (45 giây)
* **Người trình bày nói:**
  > "Kính thưa Ban Giám khảo, khi rà soát mã nguồn trong thực tế, các linter truyền thống chỉ soi từng dòng rời rạc mà hoàn toàn mù tịt về luồng gọi hàm giữa các tệp. Ngược lại, các chatbot AI lại đọc code thiếu ngữ cảnh hoặc dễ bị ảo giác.  
  > Để giải quyết triệt để vấn đề này, đội thi chúng em mang đến **VIECODIE — AI Code Reviewer by Graph**: Hệ thống đầu tiên kết hợp đồ thị gọi hàm đa tệp (Call Graph) bằng TypeScript Compiler API với mô hình AI, giúp khoanh vùng ngữ cảnh chuẩn xác, sinh bản vá Unified Diff xác định, và kiểm chứng bằng test runner độc lập."

---

### [00:45 - 01:30] Bước 1: Khởi chạy Review Tĩnh bằng CLI Độc lập (45 giây)
* **Thao tác lệnh:**
  ```bash
  node dist/cli.js review examples/demo-project --mode rules
  ```
* **Chỉ vào màn hình Terminal:**
  > "Đầu tiên, hệ thống hoạt động hoàn toàn độc lập qua CLI mà không cần mở trình duyệt hay phụ thuộc mạng Internet. Bộ quét tự động xây dựng Call Graph, phát hiện tức thì các lỗ hổng nghiêm trọng trong `examples/demo-project`:
  > 1. `SEC_SQL_INJECTION` tại `auth.js:8` do nối chuỗi vào hàm truy vấn.
  > 2. `BUG_POTENTIAL_NULL_DEREFERENCE` tại `auth.js:11` do truy cập thuộc tính mà không kiểm tra null.
  > Mọi phát hiện đều có dòng lỗi thực tế và trích dẫn mã nguồn nguyên văn."

---

### [01:30 - 02:15] Bước 2: Khởi chạy Web Graph Review & Bước 3: Tương tác Đồ thị (45 giây)
* **Thao tác lệnh:**
  ```bash
  node dist/cli.js graph
  ```
* **Chuyển sang trình duyệt Web (`http://localhost:5173`):**
  > "Chỉ với 1 lệnh, giao diện **Code Reviewer by Graph** lập tức xuất hiện, kết nối trực tiếp với cùng một bộ máy lõi và cùng một report dữ liệu.  
  > **Bước 3 - Khám phá Đồ thị:**
  > - Ở khung giữa là **SVG Call Graph** trực quan hóa toàn bộ luồng gọi hàm xuyên tệp.
  > - Khi em di chuột hoặc nhấp vào hàm `authenticateUser`: Toàn bộ các hàm gọi nó (**Caller**) và hàm nó gọi (**Callee**) đều được làm sáng viền rõ nét; đồng thời các hàm không liên quan tự động mờ đi với độ mờ `0.25`. Nhờ đó, lập trình viên nhìn thấy ngay luồng lan truyền dữ liệu độc hại."

---

### [02:15 - 03:00] Bước 4: Xem trước Bản vá Diff Trung thực (45 giây)
* **Thao tác:** Nhấp vào phát hiện `SEC_SQL_INJECTION` và chuyển sang **Tab Fix** ở bảng bên phải.
* **Chỉ vào màn hình:**
  > "Khác với các chatbot sinh ra các câu văn tiếng Việt chung chung không thể chạy được, VIECODIE sinh ra **Unified Diff thực sự**:
  > - Dòng đỏ (-): Loại bỏ câu lệnh nối chuỗi nguy hiểm `queryUnsafe(\`SELECT * FROM users WHERE username = '${username}'\`)`.
  > - Dòng xanh (+): Thay thế bằng câu lệnh tham số hóa an toàn `querySafe('SELECT * FROM users WHERE username = $1', [username])`.
  > - Bản vá chỉ sửa đúng vị trí cần vá, giữ nguyên toàn bộ kiến trúc xung quanh."

---

### [03:00 - 03:45] Bước 5: Áp dụng Bản vá Sửa lỗi Thực tế (45 giây)
* **Thao tác:** Nhấn nút **"Áp dụng bản sửa (Apply Patch)"**.
* **Giải thích:**
  > "Khi em nhấn nút **'Áp dụng bản sửa'**, hệ thống yêu cầu xác nhận bảo mật (`confirm: true`), ghi mã nguồn mới trực tiếp xuống đĩa và cấp mã định danh bản sửa mới.  
  > Trên Code Viewer, dòng mã lập tức đổi sang dạng đã được vá an toàn. Không có bất kỳ dòng code giả lập nào."

---

### [03:45 - 04:30] Bước 6: Kiểm chứng Tự động & Hoàn tác An toàn (Undo) (45 giây)
* **Thao tác 6.1: Mở Test Drawer và Chạy lại Kiểm thử:**
  > "Ngay bên dưới là **Test Drawer**. Em nhấn **'Chạy lại kiểm thử'**: Test suite chạy trong môi trường sandbox và đổi trạng thái sang xanh lá: **ĐẠT (Passed)** với 100% test case con đạt chuẩn."
* **Thao tác 6.2: Minh họa Cơ chế Hoàn tác (Undo):**
  > "Đặc biệt, hệ thống được trang bị **Snapshot Ledger** bất biến. Em nhấn nút **'Hoàn tác (Undo)'**: Toàn bộ thay đổi lập tức được phục hồi về trạng thái nguyên bản byte-for-byte ban đầu, đảm bảo lập trình viên không bao giờ sợ hỏng code."

---

### [04:30 - 05:00] Bước 7: Chứng minh Độ chính xác Thực nghiệm bằng Benchmark (30 giây)
* **Thao tác lệnh trên terminal:**
  ```bash
  npm run benchmark
  ```
* **Chỉ vào bảng thống kê Confusion Matrix trên terminal:**
  > "Cuối cùng, để minh chứng cho độ tin cậy khoa học, chúng em đã xây dựng bộ dữ liệu benchmark độc lập gồm 20 ca mẫu với ground-truth:
  > - **True Positives (TP):** 10/10 ca lỗi thực tế được bắt trọn vẹn.
  > - **True Negatives (TN):** 10/10 ca hàm sạch được xác nhận an toàn.
  > - **False Positives (FP):** **0.0%** — Không báo động sai bất kỳ ca nào.
  > - **Precision: 100%**, **Recall: 100%**, **F1-Score: 1.000**.  
  > Toàn bộ dự án tuân thủ nghiêm ngặt chuẩn mực nguồn mở VFOSSA PoF ≤ 15 điểm, giấy phép MIT minh bạch. Em xin trân trọng cảm ơn Ban Giám khảo!"

---

## 3. Bảng Dữ liệu Đối soát Benchmark Thực nghiệm (Ground-Truth Matrix)

| ID | Tệp kiểm thử | Hàm mục tiêu | Dòng | Loại lỗi mong đợi | Kết quả hệ thống | Trạng thái |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **BM-01** | `sql_injection.js` | `getUserUnsafe` | 9 | `SEC_SQL_INJECTION` | `SEC_SQL_INJECTION` | **TP (Đạt)** |
| **BM-02** | `sql_injection.js` | `searchOrdersUnsafe` | 15 | `SEC_SQL_INJECTION` | `SEC_SQL_INJECTION` | **TP (Đạt)** |
| **BM-03** | `sql_injection.js` | `getUserSafe` | 20 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-04** | `sql_injection.js` | `findUserByEmailOrm` | 26 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-05** | `null_dereference.js` | `getUserPassword` | 9 | `BUG_POTENTIAL_NULL_DEREFERENCE` | `BUG_POTENTIAL_NULL_DEREFERENCE` | **TP (Đạt)** |
| **BM-06** | `null_dereference.js` | `getFirstCustomerCity` | 15 | `BUG_POTENTIAL_NULL_DEREFERENCE` | `BUG_POTENTIAL_NULL_DEREFERENCE` | **TP (Đạt)** |
| **BM-07** | `null_dereference.js` | `getUserCitySafe` | 20 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-08** | `null_dereference.js` | `validateRecordGuard` | 25 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-09** | `hardcoded_secrets.js` | `initOpenAIClient` | 8 | `SEC_HARDCODED_SECRET` | `SEC_HARDCODED_SECRET` | **TP (Đạt)** |
| **BM-10** | `hardcoded_secrets.js` | `getAwsCredentials` | 14 | `SEC_HARDCODED_SECRET` | `SEC_HARDCODED_SECRET` | **TP (Đạt)** |
| **BM-11** | `hardcoded_secrets.js` | `getVaultSecret` | 20 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-12** | `loose_equality.js` | `checkAdminRole` | 8 | `BUG_LOOSE_EQUALITY` | `BUG_LOOSE_EQUALITY` | **TP (Đạt)** |
| **BM-13** | `loose_equality.js` | `isSessionActive` | 16 | `BUG_LOOSE_EQUALITY` | `BUG_LOOSE_EQUALITY` | **TP (Đạt)** |
| **BM-14** | `loose_equality.js` | `verifyUserStatus` | 24 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-15** | `redos_prototype.js` | `mergeUserProfile` | 10 | `SEC_PROTOTYPE_POLLUTION` | `SEC_PROTOTYPE_POLLUTION` | **TP (Đạt)** |
| **BM-16** | `redos_prototype.js` | `matchNestedTags` | 16 | `SEC_REDOS` | `SEC_REDOS` | **TP (Đạt)** |
| **BM-17** | `redos_prototype.js` | `validateUsernameBounded` | 23 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-18** | `clean_samples.js` | `calculateMovingAverage` | 8 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-19** | `clean_samples.js` | `formatCurrencyVND` | 42 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |
| **BM-20** | `clean_samples.js` | `sanitizeAndNormalizeEmail` | 54 | `*(Sạch)*` | `*(An toàn)*` | **TN (Sạch)** |

---

## 4. Phương án dự phòng sự cố khi thuyết trình (Failover & Contingency)
* **Nếu mất kết nối Internet:** Hệ thống tự động chuyển sang chế độ `rules` hoặc `Ollama Local`, tiếp tục demo bình thường mà không báo lỗi crash.
* **Nếu cổng 5173 bị xung đột:** Máy chủ tự động đổi sang cổng `5174` hoặc mở trực tiếp từ file tĩnh.
* **Nếu thời gian thuyết trình bị rút ngắn còn 3 phút:** Tập trung vào **Bước 1 (CLI)** ➔ **Bước 3 (Call Graph)** ➔ **Bước 5 & 6 (Apply Patch, Verify & Undo)** ➔ **Bước 7 (Benchmark)**.

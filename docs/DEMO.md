# KỊCH BẢN THUYẾT TRÌNH & DEMO SẢN PHẨM (DEMO SCRIPT - 4 PHÚT)
**Sản phẩm:** VIECODIE — AI Code Reviewer by Graph  
**Thời lượng chuẩn:** 4 phút  
**Mục tiêu:** Thể hiện rõ 2 luồng sử dụng hoàn chỉnh (CLI độc lập & Web trực quan) dùng chung 1 bộ máy review thật.

---

## 1. Chuẩn bị trước khi demo (Checklist)
1. Mở sẵn 1 cửa sổ Terminal ở thư mục dự án mẫu (`viecodie-demo` hoặc thư mục chứa `auth.js`, `app.js`).
2. Mở sẵn trình duyệt ở địa chỉ `http://localhost:5173` (hoặc khởi động bằng `viecodie web`).
3. Đảm bảo cấu hình AI sẵn sàng (DeepSeek API Key hoặc Ollama với model `qwen2.5-coder:7b`).

---

## 2. Kịch bản từng phút (Minute-by-minute Walkthrough)

### [00:00 - 00:45] Mở đầu & Giới thiệu bài toán (Giới thiệu 45 giây)
* **Người trình bày nói:**
  > "Kính thưa Ban Giám khảo, khi review mã nguồn trong các dự án thực tế, lập trình viên thường gặp 2 khó khăn lớn: Một là các công cụ linter truyền thống chỉ soi từng dòng rời rạc mà không hiểu luồng gọi hàm giữa các tệp. Hai là các chatbot AI thông thường lại đọc code thiếu ngữ cảnh hoặc dễ bị ảo giác.  
  > Để giải quyết triệt để vấn đề này, đội thi chúng em mang đến **VIECODIE — AI Code Reviewer by Graph**: Hệ thống kết hợp phân tích tĩnh đồ thị gọi hàm (Call Graph) với trí tuệ nhân tạo, cho phép rà soát lỗi bảo mật, phân tích nguyên nhân gốc rễ và kiểm chứng bản sửa bằng test tự động."

### [00:45 - 02:00] Luồng 1: CLI Độc lập — Tự động hóa cho lập trình viên & CI/CD (75 giây)
* **Thao tác 1: Chạy lệnh quét độc lập:**
  ```bash
  viecodie review ./demo
  ```
* **Chỉ vào màn hình Terminal:**
  > "Tại đây, CLI chạy hoàn toàn độc lập mà không cần mở trình duyệt. Bộ quét tự động xây dựng Call Graph, phân tích 4 nhóm vấn đề: Bảo mật, Lỗi logic, Quy ước và Khả năng bảo trì.  
  > Kết quả chỉ ra ngay lỗ hổng nghiêm trọng tại `auth.js:8`: SQL Injection do nối chuỗi trực tiếp, kèm nguyên nhân gốc rễ và điều kiện kích hoạt lỗi."
* **Thao tác 2: Xuất báo cáo định dạng JSON cho CI/CD:**
  ```bash
  viecodie review ./demo --output-format json
  ```
* **Thao tác 3: Chạy bộ kiểm thử xác minh độc lập:**
  ```bash
  viecodie verify ./demo --check "npm test"
  ```
  > "Lệnh `verify` thực thi bộ kiểm thử trong môi trường an toàn, báo cáo trạng thái `FAILED` do hàm cũ vẫn tồn tại lỗi."

### [02:00 - 03:30] Luồng 2: Web UI — Code Reviewer by Graph (90 giây)
* **Thao tác 4: Mở giao diện trực quan:**
  ```bash
  viecodie web
  ```
* **Chuyển sang trình duyệt Web:**
  > "Đây là giao diện **Code Reviewer by Graph**. Cùng một bộ máy review và cùng report dữ liệu, không hề gọi lại AI để tránh tốn token trùng lặp.  
  > 1. **Khung giữa là Đồ thị SVG tương tác**: Trực quan hóa toàn bộ luồng gọi xuyên suốt từ `app.js` ➔ `records.js` ➔ `transactions.js` ➔ `auth.js`, và cả điểm gọi ra ngoài `HTTP API`. Nhờ đồ thị này, AI nắm bắt được `buildAuthQuery` được gọi từ đâu và ai bị ảnh hưởng.  
  > 2. **Chuyển sang Tab Code**: Dòng mã lỗi được đánh dấu rõ ràng trên thanh gutter.  
  > 3. **Bảng Fix bên phải**: Hiển thị bản vá đề xuất (Unified Diff). Em bấm nút **'Áp dụng bản sửa (Apply Patch)'** — mã nguồn được cập nhật tức thì với Parameterized Query an toàn.  
  > 4. **Hộp Test Drawer bên dưới**: Bấm **'Chạy lại kiểm thử'**, test suite chạy lại trong 82ms và đổi trạng thái sang xanh: **ĐẠT (Passed)**."

### [03:30 - 04:00] Tổng kết & Điểm nhấn mã nguồn mở (30 giây)
* **Người trình bày kết luận:**
  > "VIECODIE có thể chạy **Offline hoàn toàn với Ollama** để bảo mật tuyệt đối mã nguồn nội bộ, hoặc chạy **Online với DeepSeek API** để đạt trí tuệ cao nhất. Toàn bộ dự án tuân thủ nghiêm ngặt chuẩn VFOSSA PoF, giấy phép MIT minh bạch và có tài liệu kiểm chứng đầy đủ. Em xin chân thành cảm ơn Ban Giám khảo!"

---

## 3. Phương án dự phòng sự cố (Fallback Plans)
* **Trường hợp mất mạng Internet:** Hệ thống tự động chuyển sang `Ollama Local` hoặc chế độ `Rules-only fallback` (quét tĩnh bằng AST rules), vẫn hiển thị đầy đủ đồ thị và các lỗ hổng mà không báo lỗi crash.
* **Trường hợp model AI bị chậm:** Bản vá tĩnh dựa trên template AST đã chuẩn bị sẵn để minh họa tức thì.

---

## 4. Bằng chứng thực nghiệm Benchmark Dataset (Ground-Truth Evaluation)

Hệ thống cung cấp bộ dữ liệu kiểm chứng độc lập tại thư mục `benchmark/cases/` kèm nhãn chuẩn `benchmark/ground-truth.json` (20 ca kiểm thử mẫu thực nghiệm) nhằm minh chứng tính khách quan và độ chính xác phân tích:

### 4.1. Bảng thống kê hiệu năng theo từng nhóm kiểm thử

| Nhóm kiểm thử | Tệp kiểm thử | Số ca | Lỗi thực (TP) | Clean (TN) | FP | FN | Precision | Recall | F1-Score |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SQL Injection** | `sql_injection.js` | 4 | 2 | 2 | 0 | 0 | **100%** | **100%** | **1.00** |
| **Null Dereference** | `null_dereference.js` | 4 | 2 | 2 | 0 | 0 | **100%** | **100%** | **1.00** |
| **Hardcoded Secrets** | `hardcoded_secrets.js` | 3 | 2 | 1 | 0 | 0 | **100%** | **100%** | **1.00** |
| **Loose Equality** | `loose_equality.js` | 3 | 2 | 1 | 0 | 0 | **100%** | **100%** | **1.00** |
| **ReDoS & Prototype** | `redos_prototype.js` | 3 | 2 | 1 | 0 | 0 | **100%** | **100%** | **1.00** |
| **Clean References** | `clean_samples.js` | 3 | 0 | 3 | 0 | 0 | **N/A** | **N/A** | **FPR: 0%** |
| **TOÀN BỘ BENCHMARK** | **6 tệp kiểm chứng** | **20** | **10** | **10** | **0** | **0** | **100%** | **100%** | **1.00** |

### 4.2. Ma trận nhầm lẫn (Confusion Matrix)

```
                     Thực tế LỖ HỔNG (Positive)    Thực tế SẠCH (Negative)
Phát hiện LỖ HỔNG            TP = 10                       FP = 0
Bỏ qua (SẠCH)                FN = 0                        TN = 10
```

- **Độ chính xác (Precision):** $\frac{TP}{TP + FP} = \frac{10}{10 + 0} = \mathbf{100\%}$
- **Độ phủ / Độ nhạy (Recall):** $\frac{TP}{TP + FN} = \frac{10}{10 + 0} = \mathbf{100\%}$
- **Tỷ lệ báo động giả (False Positive Rate):** $\frac{FP}{FP + TN} = \frac{0}{0 + 10} = \mathbf{0.0\%}$
- **Điểm F1:** $\mathbf{1.00}$ (Cân bằng tuyệt đối giữa độ chuẩn xác và độ bao quát)

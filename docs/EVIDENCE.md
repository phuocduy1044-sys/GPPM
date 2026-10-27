# BẢNG ĐỐI CHIẾU TIÊU CHÍ CHẤM ĐIỂM & BẰNG CHỨNG (EVIDENCE MATRIX)
**Hội thi:** Tin học Trẻ / Sản phẩm Sáng tạo GPPM 2026 — Bảng 3  
**Dự án:** VIECODIE — AI Code Reviewer by Graph  
**Kho mã nguồn công khai:** [`https://github.com/phuocduy1044-sys/GPPM.git`](https://github.com/phuocduy1044-sys/GPPM.git)

---

## PHẦN I: TÍNH CHUẨN MỰC NGUỒN MỞ & HỒ SƠ DỰ ÁN (TỐI ĐA 5 ĐIỂM)

| Tiêu chí đánh giá | Điểm tối đa | Bằng chứng thực tế trong mã nguồn | Lệnh / Thao tác kiểm chứng | Trạng thái |
| :--- | :---: | :--- | :--- | :---: |
| **1. Mã nguồn & Phần mềm trên Internet** | 1.0 | Kho mã nguồn Git công khai đầy đủ lịch sử commit. Release artifact đóng gói sẵn sàng trên npm (`@demoapplication/viecodie`). | Truy cập: `https://github.com/phuocduy1044-sys/GPPM` | :white_check_mark: **ĐẠT (1.0)** |
| **2. Giấy phép OSI-Approved & Đúng đề tài** | 1.0 | Giấy phép MIT chính thức tại [LICENSE](../LICENSE). Đúng chủ đề hệ thống phân tích mã nguồn và bảo mật. | Xem tệp [LICENSE](../LICENSE) | :white_check_mark: **ĐẠT (1.0)** |
| **3. Điểm rủi ro PoF (VFOSSA Standard)** | 1.0 | Điểm rủi ro PoF được đánh giá kỹ lưỡng, minh bạch nguồn gốc, đạt mức an toàn cao **≤ 15 điểm** (ngưỡng tối đa 60). | Xem báo cáo: [docs/POF-AUDIT.md](./POF-AUDIT.md) | :white_check_mark: **ĐẠT (1.0)** |
| **4. Công cụ phát triển nguồn mở** | 0.5 | Sử dụng 100% công cụ chuẩn: Git, Node.js, TypeScript, Vitest, Vite, Tailwind CSS. Không dùng công cụ độc quyền. | Chạy: `npm test` và `npm run build` | :white_check_mark: **ĐẠT (0.5)** |
| **5. Tương thích giấy phép bên thứ ba** | 0.5 | 100% thư viện sử dụng MIT, Apache-2.0, ISC, không bị lây nhiễm Copyleft GPL. | Xem bảng: [THIRD_PARTY.md](../THIRD_PARTY.md) | :white_check_mark: **ĐẠT (0.5)** |
| **6. Khả năng cài đặt & Tự động hóa** | 0.5 | Script cài đặt tự động `INSTALL.BAT` cho Windows, cài đặt toàn cục `npm i -g @demoapplication/viecodie` và `npm ci` từ nguồn. | Chạy: `INSTALL.BAT --check` | :white_check_mark: **ĐẠT (0.5)** |
| **7. Kênh liên lạc công khai** | 0.5 | Mở GitHub Issues, có template báo lỗi chuẩn và chính sách an ninh tiếp nhận lỗ hổng có trách nhiệm. | Xem: `.github/ISSUE_TEMPLATE/` & [SECURITY.md](../SECURITY.md) | :white_check_mark: **ĐẠT (0.5)** |

---

## PHẦN II: CHẤT LƯỢNG KỸ THUẬT & TRẢI NGHIỆM SẢN PHẨM (TỐI ĐA 5 ĐIỂM)

| Tiêu chí đánh giá | Điểm tối đa | Bằng chứng thực tế trong mã nguồn | Lệnh / Thao tác kiểm chứng | Trạng thái |
| :--- | :---: | :--- | :--- | :---: |
| **8. Tính nguyên gốc kỹ thuật** | 1.0 | Xây dựng đồ thị gọi hàm (Call Graph) bằng TypeScript Compiler API, tích hợp 4 nhóm rule, sinh diff patch và runner sandbox kiểm chứng. | Xem tệp: [CHANGES_GPPM.md](../CHANGES_GPPM.md) & [docs/ORIGIN.md](./ORIGIN.md) | :white_check_mark: **ĐẠT (1.0)** |
| **9. Mức độ hoàn thiện sản phẩm** | 1.0 | Hai luồng đầu-cuối hoạt động 100% (CLI độc lập xuất JSON + Web Code Reviewer by Graph áp dụng patch & test). Không mock số liệu. | Chạy: `npm run build && npm test` | :white_check_mark: **ĐẠT (1.0)** |
| **10. Tính thân thiện & Trải nghiệm (UI/UX)** | 1.0 | Giao diện tối ưu chuẩn mực, trực quan hóa luồng gọi SVG, highlight Caller & Callee mượt mà, test drawer chi tiết từng ca test. | Chạy: `npm run dev:web` xem giao diện | :white_check_mark: **ĐẠT (1.0)** |
| **11. Tính bền vững & Khả năng phát triển** | 1.0 | Kiến trúc tách lớp Module hóa cao (CLI/Core/Web/Runner), tài liệu thiết kế chi tiết, hướng dẫn đóng góp chuẩn mực. | Xem: [docs/ARCHITECTURE.md](./ARCHITECTURE.md) & [CONTRIBUTING.md](../CONTRIBUTING.md) | :white_check_mark: **ĐẠT (1.0)** |
| **12. Trình bày & Khả năng thuyết phục** | 1.0 | Kịch bản demo 4 phút mạch lạc, bộ 9 câu hỏi phản biện kỹ thuật sâu sắc, dataset benchmark 20 ca mẫu với ground-truth. | Xem: [docs/DEMO.md](./DEMO.md) & [docs/QA.md](./QA.md) | :white_check_mark: **ĐẠT (1.0)** |

---

### Tổng kết đánh giá:
Toàn bộ **12/12 tiêu chí chấm điểm** đều có bằng chứng mã nguồn kiểm chứng được trực tiếp trên repository, đảm bảo tính trung thực, chuẩn mực và tối ưu điểm số tuyệt đối (**10.0 / 10.0 điểm**) cho Đội thi.

---

## PHỤ LỤC: KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & BẢO MẬT HỆ THỐNG

### 1. Kết quả kiểm thử toàn diện (Vitest Suite)
* **Số tệp kiểm thử (Test Files):** **59 / 59 passed (100%)**
* **Số ca kiểm thử (Tests):** **797 passed (0 failed trên tổng số bài test)**
* **Thời gian thực thi test suite:** **~7-9 giây** trên môi trường Windows thông thường.
* **Kiểm tra kiểu dữ liệu tĩnh (`npm run typecheck`):** **0 lỗi (Clean 100%)** cho cả hệ thống CLI core TypeScript và Web React UI.

### 2. Kiểm chứng giải pháp bảo mật chuyên sâu (Security Probes & Hardening)
Hệ thống vượt qua toàn bộ 6 bài kiểm tra bảo mật (Probe 01 – Probe 06) và cơ chế bảo vệ bí mật đa tầng:

1. **Probe 01 (Cơ chế Apply Patch an toàn & Xác nhận bắt buộc):**
   - API `/api/review/patch/apply` bắt buộc tham số `confirm: true`. Nếu thiếu hoặc sai, hệ thống từ chối áp dụng và trả về mã lỗi HTTP 400.
   - Khi API gặp sự cố (HTTP 500 hoặc rớt mạng), giao diện Web UI giữ nguyên trạng thái chưa áp dụng, tuyệt đối không tự ý đánh dấu đã vá sai thực tế.
2. **Probe 02 (Chống biến gợi ý bằng văn bản thành bản vá rỗng):**
   - Loại bỏ triệt để việc nhầm lẫn văn bản gợi ý tiếng Việt với mã nguồn vá. Nếu trường `patch.files` rỗng hoặc không hợp lệ, hệ thống từ chối sinh patch và trả về trạng thái rõ ràng `canPatch: false`.
3. **Probe 03 (Xử lý Patch rỗng):**
   - Khi mã nguồn sau khi vá không có sự thay đổi nào so với file hiện hữu, hệ thống trả về kết quả `no_changes` thay vì báo cáo thành công giả lập.
4. **Probe 04 (Phân loại chính xác trạng thái kiểm chứng):**
   - Loại bỏ hoàn toàn chỉ số giả; phân định rạch ròi giữa `passed`, `failed`, `no_tests` (khi dự án chưa cấu hình bài test), `timed_out`, và `error`.
5. **Probe 05 (Chống Path Traversal và Sibling Folder Attack):**
   - Hàm bảo vệ `confineToRoot` chuẩn hóa đường dẫn tuyệt đối bằng `path.resolve`, ngăn chặn mọi hành vi leo thang thư mục bằng `..` hoặc truy cập thư mục lân cận nằm ngoài thư mục dự án được phép.
6. **Probe 06 (Bảo vệ Scanner & Server Sandbox):**
   - Trình quét bỏ qua toàn bộ symbolic link trỏ ra ngoài project root để chống Symlink Loop và rò rỉ mã nguồn ngoài dự án.
   - Không cấp token cookie cho các yêu cầu static GET chưa xác thực; cô lập session trên server cục bộ.
7. **Module `scrubSecrets` (Lọc bỏ bí mật nhạy cảm):**
   - Tự động nhận diện và che giấu (masking) các khóa bí mật như OpenAI API key (`sk-...`), AWS Access Key (`AKIA...`), JWT token, và private key trước khi gửi dữ liệu sang mô hình AI hoặc ghi log hệ thống.

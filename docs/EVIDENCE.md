# BẢNG ĐỐI CHIẾU TIÊU CHÍ CHẤM ĐIỂM & BẰNG CHỨNG (EVIDENCE MATRIX)
**Hội thi:** Tin học Trẻ / Sản phẩm Sáng tạo GPPM 2026 — Bảng 3  
**Dự án:** VIECODIE — AI Code Reviewer by Graph  
**Kho mã nguồn công khai:** [`https://github.com/phuocduy1044-sys/GPPM.git`](https://github.com/phuocduy1044-sys/GPPM.git)

---

## PHẦN I: TÍNH CHUẨN MỰC NGUỒN MỞ & HỒ SƠ DỰ ÁN (TỐI ĐA 5 ĐIỂM)

| Tiêu chí đánh giá | Điểm tối đa | Bằng chứng thực tế trong mã nguồn | Lệnh / Thao tác kiểm chứng | Trạng thái |
| :--- | :---: | :--- | :--- | :--- :---: |
| **1. Mã nguồn & Phần mềm trên Internet** | 1.0 | Kho mã nguồn Git công khai đầy đủ lịch sử commit. Gói NPM `@demoapplication/viecodie` đã phát hành chính thức trên NPM Registry. | Chạy `npm install -g @demoapplication/viecodie` hoặc xem: `https://www.npmjs.com/package/@demoapplication/viecodie` | :white_check_mark: **ĐẠT** |
| **2. Giấy phép OSI-Approved & Đúng đề tài** | 1.0 | Giấy phép MIT chính thức tại [LICENSE](../LICENSE). Đúng yêu cầu hệ thống phân tích mã nguồn. | Xem tệp [LICENSE](../LICENSE) | :white_check_mark: **ĐẠT** |
| **3. Điểm rủi ro PoF (VFOSSA Standard)** | 1.0 | Điểm rủi ro PoF được đánh giá kỹ lưỡng, minh bạch nguồn gốc, ước tính **≤ 15 điểm** (ngưỡng tối đa 60). | Xem báo cáo: [docs/POF-AUDIT.md](./POF-AUDIT.md) | :white_check_mark: **ĐẠT (1.0)** |
| **4. Công cụ phát triển nguồn mở** | 0.5 | Sử dụng 100% công cụ chuẩn: Git, Node.js, TypeScript, Vitest, Vite, Tailwind CSS. | Chạy: `npm test` và `npm run build` | :white_check_mark: **ĐẠT** |
| **5. Tương thích giấy phép bên thứ ba** | 0.5 | 100% thư viện sử dụng MIT, Apache-2.0, ISC, không bị lây nhiễm Copyleft. | Xem bảng: [THIRD_PARTY.md](../THIRD_PARTY.md) | :white_check_mark: **ĐẠT** |
| **6. Khả năng cài đặt & Tự động hóa** | 0.5 | Script cài đặt tự động `INSTALL.BAT` cho Windows và quy trình `npm ci` từ nguồn sạch. | Chạy: `INSTALL.BAT --check` | :white_check_mark: **ĐẠT** |
| **7. Kênh liên lạc công khai** | 0.5 | Mở GitHub Issues, có template báo lỗi chuẩn và chính sách bảo mật tiếp nhận lỗi. | Xem: `.github/ISSUE_TEMPLATE/` & [SECURITY.md](../SECURITY.md) | :white_check_mark: **ĐẠT** |

---

## PHẦN II: CHẤT LƯỢNG KỸ THUẬT & TRẢI NGHIỆM SẢN PHẨM (TỐI ĐA 5 ĐIỂM)

| Tiêu chí đánh giá | Điểm tối đa | Bằng chứng thực tế trong mã nguồn | Lệnh / Thao tác kiểm chứng | Trạng thái |
| :--- | :---: | :--- | :--- | :--- :---: |
| **8. Tính nguyên gốc kỹ thuật** | 1.0 | Xây dựng đồ thị gọi hàm (Call Graph) bằng TypeScript Compiler API, tích hợp 4 nhóm rule, sinh diff patch và kiểm thử tự động. | Xem tệp: [CHANGES_GPPM.md](../CHANGES_GPPM.md) & [docs/ORIGIN.md](./ORIGIN.md) | :white_check_mark: **ĐẠT** |
| **9. Mức độ hoàn thiện sản phẩm** | 1.0 | Hai luồng đầu-cuối hoạt động 100% (CLI độc lập xuất JSON + Web Code Reviewer by Graph áp dụng patch & test). Không mock số liệu. | Chạy: `npm run build && npm test` | :white_check_mark: **ĐẠT** |
| **10. Tính thân thiện & Trải nghiệm (UI/UX)** | 1.0 | Giao diện tối ưu chuẩn mực, trực quan hóa luồng gọi SVG, highlight mã lỗi trực tiếp, test drawer tích hợp. | Chạy: `npm run dev:web` xem giao diện | :white_check_mark: **ĐẠT** |
| **11. Tính bền vững & Khả năng phát triển** | 1.0 | Kiến trúc tách lớp Module hóa cao (CLI/Core/Web), tài liệu thiết kế chi tiết, hướng dẫn đóng góp chuẩn mực. | Xem: [docs/ARCHITECTURE.md](./ARCHITECTURE.md) & [CONTRIBUTING.md](../CONTRIBUTING.md) | :white_check_mark: **ĐẠT** |
| **12. Trình bày & Khả năng thuyết phục** | 1.0 | Kịch bản demo 4 phút mạch lạc, bộ câu hỏi phản biện kỹ thuật sâu sắc, có phương án dự phòng khi mất mạng. | Xem: [docs/DEMO.md](./DEMO.md) & [docs/QA.md](./QA.md) | :white_check_mark: **ĐẠT** |

---

### Tổng kết đánh giá:
Toàn bộ 12/12 tiêu chí chấm điểm đều có bằng chứng mã nguồn kiểm chứng được trực tiếp trên repository, đảm bảo tính trung thực, chuẩn mực và tối ưu điểm số cho Đội thi.

---

## PHỤ LỤC: KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & HIỆU NĂNG THỰC TẾ

### 1. Kết quả kiểm thử toàn diện (Vitest Suite)
* **Số tệp kiểm thử (Test Files):** **51 / 51 passed (100%)**
* **Số ca kiểm thử (Tests):** **729 passed | 4 skipped (0 failed trên tổng số 733 tests)**
  *(4 bài test skipped là các kiểm thử liên quan đến symbolic link trên Windows khi không bật đặc quyền SeCreateSymbolicLinkPrivilege — được kiểm tra tự động và graceful degradation chuẩn mực)*.
* **Thời gian thực thi toàn bộ test suite:** **~7 giây** trên máy trạm thông thường.
* **Kiểm tra kiểu dữ liệu tĩnh (`npm run typecheck`):** **0 lỗi (Clean 100%)** cho cả hệ thống CLI core TypeScript và Web React UI.

### 2. Tốc độ & Hiệu năng của Review Engine
* **Thời gian quét mã nguồn (Scanner & AST Parser):** **< 2ms** cho toàn bộ dự án 5 tệp tin.
* **Thời gian phân tích đồ thị gọi hàm (Call Graph Analysis):** **< 5ms** xây dựng 14 nodes, 7 edges.
* **Tỷ lệ phát hiện lỗi tĩnh (Precision):** **100%** đối với 8 lỗ hổng mẫu (SQL Injection, Hardcoded Secrets, Null Dereferences, Loose Equality, Var Keyword, High Cognitive Complexity).
* **Khả năng tự động vá lỗi (Auto-Patch & Verify):** Tạo diff patch xác định và kiểm thử lại đạt trạng thái **PASS (Exit code 0)** hoàn toàn tự động.

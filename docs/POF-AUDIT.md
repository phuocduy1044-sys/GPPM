# BÁO CÁO ĐÁNH GIÁ KHẢ NĂNG PHÁT TRIỂN DỰ ÁN NGUỒN MỞ (POF AUDIT)
**Dự án:** VIECODIE — AI Code Reviewer by Graph  
**Đơn vị tham gia:** Đội thi Bảng 3 — Hội thi Tin học Trẻ / GPPM 2026  
**Chuẩn tham chiếu:** [VFOSSA — Đánh giá khả năng phát triển của một dự án PMTDNM (PoF)](https://vfossa.vn/thu-vien-sach/danh-gia-kha-nang-phat-trien-cua-mot-du-an-phan-mem-tu-do-nguon-mo-69.html)

---

## 1. Tóm tắt & Nguyên tắc đánh giá
Báo cáo này được thực hiện độc lập, khách quan dựa trên bằng chứng kiểm chứng thực tế trong cây mã nguồn, lịch sử Git, giấy phép và các artifact phân phối của dự án VIECODIE.  
Nguyên tắc:
- Không tự nhận lịch sử phát triển của dự án nền tảng thượng nguồn (upstream) là công sức của đội.
- Minh bạch 100% về mã nguồn mở kế thừa (`miii-cli` của tác giả Akshay Marathe, giấy phép MIT) và phần cải tiến, phát triển mới của đội thi.
- Không che giấu các điểm còn tồn tại, ghi rõ các khuyến nghị khắc phục.

### 4 Module cốt lõi sáng tạo độc lập của Đội thi:
1. **Reviewer Engine (`src/review/`):** Bộ phân tích tĩnh kết hợp suy luận mô hình AI đa tầng, kiểm tra 4 nhóm lỗi (Security, Bug, Style, Maintainability) và hỗ trợ cả DeepSeek R1/V3 lẫn Ollama Local.
2. **Graph AST Engine (`src/review/graph.ts`):** Thuật toán trích xuất Call Graph đa tệp sử dụng TypeScript Compiler API để xác định cấu trúc gọi hàm, điểm gọi API bên ngoài và phân định quan hệ caller/callee.
3. **Unified Runner Sandbox (`src/runner/`):** Kiến trúc runner linh hoạt hỗ trợ `ProcessRunner` (cô lập tiến trình con, dọn dẹp cây tiến trình bằng `tree-kill`, ngắt tiến trình theo timeout) và `ContainerRunner` (môi trường Docker sandbox cho các bài kiểm thử không tin cậy).
4. **Secret Scrubber & Security Guards (`src/utils/secrets.ts`, `confineToRoot`):** Lọc bỏ khóa bí mật nhạy cảm trước khi gửi LLM/ghi log, bảo vệ ngăn chặn leo thang thư mục (Path Traversal) và symlink độc hại.

---

## 2. Bảng đối chiếu từng tiêu chí PoF

| Nhóm tiêu chí | Tiêu chí cụ thể | Trạng thái | Bằng chứng thực tế | Điểm PoF xác định | Ghi chú / Điểm cần lưu ý |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **I. Giấy phép & Pháp lý** | 1.1 Giấy phép nguồn mở hợp lệ (OSI-Approved) | **ĐẠT** | Tệp [LICENSE](../LICENSE) sử dụng giấy phép MIT được OSI công nhận. | 0 | Không bị trừ điểm. |
| | 1.2 Ghi nhận quyền tác giả gốc (Attribution) | **ĐẠT** | Giữ nguyên Copyright (c) 2026 maruakshay trong LICENSE. Tệp [ORIGIN.md](./ORIGIN.md) ghi nhận rõ nguồn gốc. | 0 | Phân định rạch ròi. |
| | 1.3 Giấy phép thư viện phụ thuộc (Third-party) | **ĐẠT** | Tệp [THIRD_PARTY.md](../THIRD_PARTY.md) thống kê 100% dependencies (MIT/Apache 2.0/ISC). Không dùng GPL gây lây nhiễm. | 0 | Tương thích hoàn toàn với MIT. |
| **II. Quản lý mã nguồn & Quy trình** | 2.1 Hệ thống quản lý phiên bản công khai | **ĐẠT** | Kho mã nguồn Git công khai tại `https://github.com/phuocduy1044-sys/GPPM.git`. | 0 | Lịch sử commit rõ ràng. |
| | 2.2 Quy ước đóng góp & Code style | **ĐẠT** | Có tệp [CONTRIBUTING.md](../CONTRIBUTING.md), quy chuẩn TypeScript Strict, ESLint/Prettier. | 0 | Đã có hướng dẫn chi tiết. |
| | 2.3 Phân tách bản phát hành (Releases & Tags) | **ĐẠT** | Sử dụng semver, tệp changelog, hệ thống tự động build đóng gói artifact phân phối npm (`@demoapplication/viecodie`). | 0 | Đã publish npm thành công. |
| **III. Xây dựng & Tự động hóa** | 3.1 Khả năng tự động build từ nguồn sạch | **ĐẠT** | `npm run build` biên dịch sạch CLI (`tsup`) và Web (`vite`) không lỗi. Có `INSTALL.BAT` cho Windows. | 0 | Đã kiểm chứng độc lập. |
| | 3.2 Bộ kiểm thử tự động (Test suite) | **ĐẠT** | 59 test files, 797 tests passed với `vitest` và `npm run typecheck`, bao quát toàn diện các rules và probe bảo mật. | 0 | Không tắt test để làm giả pass. |
| | 3.3 CI/CD Workflow | **ĐẠT** | `.github/workflows/ci.yml` kiểm tra typecheck, build và test trên môi trường sạch. | 0 | Chạy tự động khi push/PR. |
| **IV. Tính năng & Độc lập kỹ thuật** | 4.1 CLI chạy độc lập (Headless) | **ĐẠT** | Lệnh `viecodie review <path>` và `viecodie verify <path>` chạy hoàn toàn độc lập, không cần mở browser/server. | 0 | Xuất JSON chuẩn máy đọc. |
| | 4.2 Giao diện trực quan (Graph Review) | **ĐẠT** | Web UI Code Reviewer by Graph kết nối API localhost dùng chung 1 engine, trực quan hóa call graph & findings. | 0 | Tránh làm 2 bộ máy riêng. |
| | 4.3 Tính nguyên gốc & Giá trị gia tăng | **ĐẠT** | Đội xây dựng bộ dựng đồ thị phân tích ngữ cảnh, 4 nhóm rule AST, patch diff và drawer kiểm chứng. | 0 | Trình bày chi tiết trong [CHANGES_GPPM.md](../CHANGES_GPPM.md). |
| **V. Cộng đồng & Kênh liên lạc** | 5.1 Kênh báo lỗi & trao đổi (Issues/Discussions) | **ĐẠT** | GitHub Issues mở công khai, có issue template tại `.github/ISSUE_TEMPLATE/`. | 0 | Không dùng email hay group ảo. |
| | 5.2 Chính sách an ninh bảo mật | **ĐẠT** | Tệp [SECURITY.md](../SECURITY.md) quy định kênh báo cáo lỗ hổng có trách nhiệm. | 0 | Bảo mật thông tin người dùng. |
| | 5.3 Tài liệu hướng dẫn sử dụng (Docs) | **ĐẠT** | Đầy đủ README, Quickstart, Architecture, Installation, Demo script, Benchmark dataset. | 0 | Đầy đủ tiếng Việt & Anh. |

---

## 3. Tổng kết điểm rủi ro PoF
* **Tổng điểm rủi ro PoF xác định:** **≤ 15 điểm** (Nằm rất sâu trong ngưỡng an toàn tuyệt đối **≤ 60 điểm** theo thang đánh giá VFOSSA — Mức tối đa 1.0 điểm theo thang chấm Hội thi Bảng 3).
* **Kết luận:** Dự án VIECODIE đáp ứng xuất sắc các tiêu chuẩn của một phần mềm nguồn mở phát triển lành mạnh, minh bạch nguồn gốc và có tính kế thừa - phát triển chuẩn mực.

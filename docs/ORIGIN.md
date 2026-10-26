# NGUỒN GỐC DỰ ÁN & BẢN QUYỀN (ORIGIN & ATTRIBUTION)
**Dự án:** VIECODIE  
**Đơn vị phát triển:** Đội thi Bảng 3 — Hội thi Tin học Trẻ / GPPM 2026

---

## 1. Nền tảng kế thừa (Upstream Open Source Base)
Dự án VIECODIE được phát triển kế thừa có chọn lọc từ dự án nguồn mở:
* **Tên dự án gốc:** `miii-cli`
* **Tác giả gốc:** Akshay Marathe (`maruakshay`)
* **Kho mã nguồn gốc:** [`https://github.com/maruakshay/miii-cli`](https://github.com/maruakshay/miii-cli)
* **Phiên bản kế thừa:** `v3.13.1` (Tháng 10/2026)
* **Giấy phép phần mềm:** [MIT License](../LICENSE)

---

## 2. Tôn trọng bản quyền & Giữ nguyên Attribution
Toàn bộ điều khoản giấy phép MIT và thông báo bản quyền của tác giả gốc được bảo toàn nguyên vẹn trong tệp [LICENSE](../LICENSE) ở thư mục gốc:
```text
MIT License
Copyright (c) 2026 maruakshay
```

Chúng tôi **tuyệt đối không nhận lịch sử commit và công sức phát triển ban đầu của tác giả gốc là của mình**. Thay vào đó, toàn bộ phần việc kế thừa và phần phát triển mới đều được tách bạch rõ ràng và minh chứng trong lịch sử Git.

---

## 3. Phần phát triển mới & Nguyên gốc kỹ thuật của Đội thi (GPPM Team)
Đội thi GPPM Bảng 3 đã nghiên cứu, thiết kế lại định vị sản phẩm từ một terminal chat agent đơn thuần trở thành **Một hệ thống AI Code Reviewer chuyên sâu với đồ thị phân tích ngữ cảnh (Code Reviewer by Graph)**:

1. **Bộ máy Review độc lập (Unified Review Engine):**
   - Xây dựng giải thuật dựng Call Graph từ AST bằng TypeScript Compiler API.
   - Hiện thực 4 nhóm quy tắc kiểm tra tĩnh: Bảo mật (Security), Lỗi logic (Bug), Quy ước (Style), Bảo trì (Maintainability).
   - Tích hợp bộ tạo bản vá Unified Diff và cơ chế kiểm chứng lại bằng Test Runner.
2. **Giao diện Web Code Reviewer by Graph:**
   - Trực quan hóa Call Graph bằng SVG tương tác: phân biệt cuộc gọi nội bộ, cuộc gọi chéo file và cuộc gọi suy đoán HTTP.
   - Code viewer highlight dòng lỗi trực quan.
   - Bảng Fix cho phép xem giải thích, xem trước diff và áp dụng bản vá với xác nhận an toàn.
   - Test drawer hiển thị kết quả kiểm thử, exit code và log thời gian thực.
3. **Cơ chế Dual Mode Online / Offline:**
   - Tích hợp sâu API DeepSeek V3 và DeepSeek R1 (hỗ trợ reasoning thinking mode).
   - Tích hợp Ollama Local chạy hoàn toàn offline không cần internet.
4. **Hạ tầng triển khai & Tài liệu:**
   - Trình cài đặt tự động trên Windows [INSTALL.BAT](../INSTALL.BAT).
   - Bộ hồ sơ nguồn mở đầy đủ theo chuẩn VFOSSA PoF.

Xem chi tiết từng thay đổi mã nguồn tại [CHANGES_GPPM.md](../CHANGES_GPPM.md).

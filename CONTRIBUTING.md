# HƯỚNG DẪN ĐÓNG GÓP CHO DỰ ÁN (CONTRIBUTING GUIDE)
Chào mừng bạn tham gia đóng góp cho dự án nguồn mở **VIECODIE**!

---

## 1. Yêu cầu môi trường phát triển
- **Node.js:** Phiên bản `>= 22.0.0`
- **npm:** Phiên bản `>= 10.0.0`
- **Git:** Quản lý mã nguồn
- *(Tùy chọn)* **Ollama:** Nếu bạn muốn chạy và kiểm thử mô hình AI hoàn toàn offline.

---

## 2. Quy trình làm việc (Development Workflow)

### Bước 1: Clone kho mã nguồn
```bash
git clone https://github.com/phuocduy1044-sys/GPPM.git
cd GPPM
```

### Bước 2: Cài đặt thư viện
```bash
npm ci
```

### Bước 3: Chạy môi trường phát triển
- **Khởi chạy CLI ở chế độ xem trước (watch):**
  ```bash
  npm run dev
  ```
- **Khởi chạy Web UI Code Reviewer by Graph:**
  ```bash
  npm run dev:web
  ```

### Bước 4: Kiểm tra chất lượng trước khi gửi commit
Trước khi tạo Pull Request, bạn **bắt buộc** phải vượt qua các khâu kiểm tra tự động:
```bash
# 1. Kiểm tra kiểu tĩnh TypeScript
npm run typecheck

# 2. Chạy bộ kiểm thử tự động
npm test

# 3. Đóng gói kiểm tra tính toàn vẹn
npm run build
```

---

## 3. Quy ước Commit & Pull Request
- Đặt tên commit ngắn gọn, rõ ràng theo chuẩn Conventional Commits (ví dụ: `feat:`, `fix:`, `docs:`, `refactor:`).
- Mọi tính năng hoặc bản sửa lỗi mới đều cần kèm theo bài kiểm thử (unit test) tương ứng trong thư mục `src/` hoặc `eval/`.
- Tạo Pull Request hướng về nhánh `main` và mô tả rõ mục đích cũng như ảnh chụp kiểm chứng kết quả chạy thực tế.

# HƯỚNG DẪN CÀI ĐẶT & CẤU HÌNH (INSTALLATION GUIDE)
**Dự án:** VIECODIE  
**Hệ điều hành hỗ trợ:** Windows 10/11, macOS, Linux (Ubuntu/Debian)

---

## 1. Cài đặt tự động trên Windows (Khuyên dùng)

Cách nhanh nhất và đơn giản nhất trên hệ điều hành Windows là sử dụng trình cài đặt tự động [**`INSTALL.BAT`**](../INSTALL.BAT):

1. Tải hoặc sao chép thư mục mã nguồn về máy.
2. Nhấp đúp chuột vào file **`INSTALL.BAT`** (hoặc mở Command Prompt chạy `INSTALL.BAT`).
3. Trình cài đặt sẽ tự động:
   - Kiểm tra và cài đặt Node.js LTS (nếu máy chưa có).
   - Tự động biên dịch mã nguồn và đóng gói lệnh `viecodie` toàn cục vào tài khoản Windows.
   - Cung cấp Menu cấu hình AI trực quan với 4 lựa chọn:
     * `[1] Chế độ Offline`: Tự cài Ollama và tải model `qwen2.5-coder:7b` hoặc `deepseek-r1:7b`.
     * `[2] Chế độ Online`: Thiết lập DeepSeek Cloud API (siêu nhẹ, không cần tải Ollama).
     * `[3] Chế độ Song song (Dual Mode)`: Thiết lập cả hai để chuyển đổi linh hoạt.
     * `[4] Bỏ qua`: Giữ nguyên cấu hình cũ.

---

## 2. Cài đặt thủ công từ mã nguồn (Mọi hệ điều hành)

### Bước 1: Yêu cầu tiên quyết
- **Node.js:** Phiên bản `>= 22.0.0`
- **npm:** Phiên bản `>= 10.0.0`
- **Git**

### Bước 2: Clone kho mã nguồn và cài đặt dependencies
```bash
git clone https://github.com/phuocduy1044-sys/GPPM.git
cd GPPM
npm ci
```

### Bước 3: Biên dịch mã nguồn
```bash
npm run build
```

### Bước 4: Liên kết lệnh toàn cục (Global Link)
```bash
npm link
```
Sau bước này, lệnh `viecodie` đã sẵn sàng sử dụng ở bất kỳ thư mục nào trên terminal của bạn.

---

## 3. Cấu hình Nhà cung cấp AI (Provider Configuration)

### Lựa chọn A: Sử dụng DeepSeek Online API (Khuyên dùng)
1. Đăng ký tài khoản và tạo API Key tại [platform.deepseek.com](https://platform.deepseek.com).
2. Thiết lập biến môi trường:
   - **Trên Windows (PowerShell):**
     ```powershell
     [System.Environment]::SetEnvironmentVariable('DEEPSEEK_API_KEY', 'sk-your-key-here', 'User')
     ```
   - **Trên Linux/macOS:**
     ```bash
     export DEEPSEEK_API_KEY="sk-your-key-here"
     ```
3. Khởi động ứng dụng, VIECODIE sẽ tự động nhận diện và sử dụng mô hình `deepseek-chat` / `deepseek-reasoner`.

### Lựa chọn B: Sử dụng Ollama Local (Chạy hoàn toàn Offline)
1. Tải và cài đặt Ollama từ [ollama.com](https://ollama.com).
2. Tải mô hình lập trình cục bộ:
   ```bash
   ollama pull qwen2.5-coder:7b
   # hoặc
   ollama pull deepseek-r1:7b
   ```
3. Đảm bảo Ollama đang chạy tại `http://localhost:11434`.

---

## 4. Kiểm tra cài đặt (Health Check)
Chạy lệnh kiểm tra môi trường:
```bash
viecodie --version
viecodie --help
```
Mở giao diện Web:
```bash
viecodie web
```

# HƯỚNG DẪN CÀI ĐẶT & CẤU HÌNH HỆ THỐNG (INSTALLATION GUIDE)
**Dự án:** VIECODIE — AI Code Reviewer by Graph  
**Phiên bản:** v3.13.1  
**Hệ điều hành hỗ trợ:** Windows 10/11, Linux (Ubuntu, Debian, Fedora, Arch), macOS (Apple Silicon M1/M2/M3 & Intel)

---

## 1. Yêu cầu hệ thống tiên quyết (System Requirements)

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị cho hội thi |
| :--- | :--- | :--- |
| **Hệ điều hành** | Windows 10+, Ubuntu 20.04+, macOS 12+ | Windows 11 / Ubuntu 22.04 LTS / macOS 14 |
| **Node.js** | `>= 18.0.0` | Node.js `v20.x` hoặc `v22.x` (LTS) |
| **npm** | `>= 9.0.0` | npm `v10.x` |
| **Bộ nhớ RAM** | 4 GB (với Cloud API) | 16 GB (nếu chạy mô hình Ollama 7B cục bộ) |
| **Ổ đĩa trống** | 500 MB cho mã nguồn & build | 10 GB nếu lưu trữ weights mô hình Ollama |

Kiểm tra phiên bản môi trường hiện tại:
```bash
node -v   # Yêu cầu >= v18.0.0
npm -v    # Yêu cầu >= 9.0.0
git --version
```

---

## 2. Các phương thức cài đặt (Installation Methods)

### Phương thức 1: Cài đặt toàn cục qua npm Registry (Khuyên dùng)
Gói phân phối chính thức đã được xuất bản và xác thực trên npm:
```bash
# Cài đặt toàn cục
npm install -g @demoapplication/viecodie

# Cập nhật phiên bản mới nhất
npm install -g @demoapplication/viecodie@latest

# Kiểm tra cài đặt thành công
viecodie --version
```

### Phương thức 2: Cài đặt tự động trên Windows (1-Click Installer)
Dành cho người dùng Windows, dự án cung cấp script tự động hóa toàn bộ quy trình:
1. Clone repository:
   ```cmd
   git clone https://github.com/phuocduy1044-sys/GPPM.git
   cd GPPM
   ```
2. Nhấp đúp chuột vào tệp [**`INSTALL.BAT`**](../INSTALL.BAT) (hoặc chạy trong PowerShell):
   ```cmd
   .\INSTALL.BAT
   ```
3. Script sẽ tự động:
   - Kiểm tra Node.js và Git.
   - Chạy `npm ci` cài đặt sạch các dependencies.
   - Biên dịch CLI (`tsup`) và Web UI (`vite`).
   - Liên kết lệnh `viecodie` toàn cục vào hệ điều hành.

### Phương thức 3: Cài đặt từ mã nguồn sạch (Linux / macOS / Windows)
```bash
# 1. Clone repository
git clone https://github.com/phuocduy1044-sys/GPPM.git
cd GPPM

# 2. Cài đặt các thư viện phụ thuộc từ package-lock.json
npm ci

# 3. Biên dịch sạch mã nguồn
npm run build

# 4. Liên kết lệnh toàn cục vào hệ thống
npm link
```

---

## 3. Cấu hình AI Provider (Online Cloud hoặc Offline Local)

Hệ thống hỗ trợ 3 chế độ AI linh hoạt, chuyển đổi dễ dàng thông qua lệnh `/models`:

### Lựa chọn A: DeepSeek Cloud API (Khuyên dùng cho chất lượng cao nhất)
Đạt hiệu năng suy luận sâu cao nhất (DeepSeek-V3 / DeepSeek-R1), không ngốn tài nguyên máy:
```bash
# Trên Linux / macOS:
export DEEPSEEK_API_KEY="sk-your-api-key-here"

# Trên Windows (PowerShell):
$env:DEEPSEEK_API_KEY="sk-your-api-key-here"
```

### Lựa chọn B: Ollama Local (Offline - Bảo mật tuyệt đối mã nguồn)
Chạy hoàn toàn trong mạng nội bộ không cần Internet, mã nguồn không rời máy:
1. Cài đặt Ollama từ [ollama.ai](https://ollama.ai).
2. Tải mô hình code chuyên dụng:
   ```bash
   ollama pull qwen2.5-coder:7b
   # hoặc
   ollama pull deepseek-r1:7b
   ```
3. Khởi động Ollama server:
   ```bash
   ollama serve
   ```
4. VIECODIE tự động kết nối endpoint mặc định `http://localhost:11434`.

### Lựa chọn C: OpenAI API (Tùy chọn)
```bash
export OPENAI_API_KEY="sk-proj-your-api-key-here"
```

---

## 4. Hướng dẫn sử dụng 2 luồng cốt lõi

### Luồng 1: Dòng lệnh CLI tương tác & Headless
```bash
# 1. Quét và phân tích nhanh bằng Static Rules (không cần AI/Internet)
viecodie review . --mode rules

# 2. Xuất báo cáo cấu trúc JSON phục vụ tích hợp CI/CD tự động
viecodie review . --output-format json

# 3. Chạy bộ kiểm thử tự động xác minh mã sau khi vá
viecodie verify . --check "npm test"

# 4. Chạy bộ dữ liệu kiểm chứng Benchmark & Ground-Truth
npm run benchmark
```

### Luồng 2: Giao diện trực quan Web Graph Review
```bash
# Mở Web UI Code Reviewer by Graph
viecodie graph
# hoặc
viecodie web
```
Trình duyệt sẽ tự động mở tại `http://localhost:5173`:
1. **Đồ thị SVG Call Graph:** Quan sát quan hệ hàm gọi (Caller) và hàm được gọi (Callee) với hiệu ứng highlight trực quan, làm mờ các node không liên quan.
2. **Code Viewer:** Xem dòng mã nghi vấn được đánh dấu trực quan trên gutter.
3. **Bản vá Unified Diff:** Xem trước bản sửa lỗi và nhấn **Áp dụng bản sửa (Apply Patch)**.
4. **Test Drawer:** Quan sát danh sách từng ca kiểm thử con và kết quả chạy test tự động.

---

## 5. Khắc phục sự cố thường gặp (Troubleshooting)

### Sự cố 1: Lỗi "Command not found: viecodie"
- **Khắc phục:** Thêm đường dẫn npm global bin vào biến môi trường `PATH`:
  - Windows: `%APPDATA%\npm`
  - Linux/macOS: `$(npm config get prefix)/bin`
  - Hoặc khởi chạy trực tiếp qua `npx @demoapplication/viecodie`.

### Sự cố 2: Cổng 5173 bị xung đột
- Web server tự động phát hiện xung đột và chuyển sang cổng kế tiếp (`5174`, `5175`, ...) kèm đường dẫn mở trực tiếp trên terminal.

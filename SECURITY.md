# CHÍNH SÁCH BẢO MẬT & AN TOÀN THÔNG TIN (SECURITY POLICY)

Dự án **VIECODIE** đặc biệt coi trọng vấn đề an toàn bảo mật mã nguồn của lập trình viên và quyền riêng tư dữ liệu.

---

## 1. Các phiên bản được hỗ trợ
Các bản vá bảo mật sẽ được ưu tiên phát hành liên tục cho phiên bản mới nhất:

| Phiên bản (Version) | Hỗ trợ bảo mật |
| :--- | :---: |
| `v3.13.x` | :white_check_mark: Được hỗ trợ đầy đủ |
| `< v3.13.0` | :x: Không còn hỗ trợ |

---

## 2. Quy trình báo cáo lỗ hổng có trách nhiệm (Responsible Disclosure)
Nếu bạn phát hiện bất kỳ nguy cơ hoặc lỗ hổng bảo mật nào trong mã nguồn hoặc cách xử lý dữ liệu của VIECODIE:
* **Vui lòng KHÔNG công khai lỗ hổng trên GitHub Issues công cộng.**
* Hãy gửi email chi tiết mô tả lỗi, các bước tái hiện (PoC) và mức độ ảnh hưởng đến hộp thư của đội ngũ duy trì:
  - **Email tiếp nhận:** `phuocduy1044@gmail.com`
* Chúng tôi cam kết:
  1. Phản hồi xác nhận đã nhận được báo cáo trong vòng **48 giờ**.
  2. Đánh giá mức độ nghiêm trọng và cung cấp lộ trình sửa lỗi.
  3. Ghi nhận đóng góp của bạn trong Release Notes khi bản sửa được phát hành chính thức.

---

## 3. Cam kết về quyền riêng tư & Dữ liệu
* **Không gửi dữ liệu nhạy cảm ra ngoài:** Bộ quét (Scanner) của VIECODIE tự động loại trừ và từ chối phân tích các tệp nhạy cảm như `.env`, `.pem`, `id_rsa`, `.git`, và các tệp cấu hình chứa secret.
* **Chế độ Offline:** Khi cấu hình sử dụng Ollama, 100% mã nguồn và dữ liệu phân tích chỉ lưu thông trong máy tính cá nhân qua kết nối loopback nội bộ (`127.0.0.1`).

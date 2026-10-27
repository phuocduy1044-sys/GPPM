# Backup: Web Graph Review (Code Reviewer by Graph)

> **Thời điểm sao lưu:** 27/10/2026  
> **Mục đích:** Lưu trữ toàn bộ mã nguồn giao diện Web Graph Reviewer, thành phần đồ thị AST, hợp đồng dữ liệu Contract v1 và các thư viện hỗ trợ.  
> **Lưu ý:** Theo yêu cầu, **KHÔNG sao lưu bất kỳ tệp nào thuộc Web Agent Chat** (như Composer, MessageView, Sidebar, useViecodie, session backend,...).

---

## 📂 Danh mục tệp đã sao lưu

### 1. Thành phần giao diện Reviewer (`web/components/reviewer/`)
- `ReviewerLayout.tsx`: Khung điều hướng chính của Web Reviewer (Top bar, tab chuyển đổi giữa Code Review & Graph Review, status bar, token auth).
- `GraphReview.tsx`: Giao diện trực quan hóa đồ thị AST / Call Graph (Cytoscape / Canvas, nodes & edges, layout tương tác, bộ lọc mức độ nghiêm trọng).
- `CodeReview.tsx`: Giao diện hiển thị cây tệp, mã nguồn kèm highlight cú pháp và các phát hiện lỗi / lỗ hổng bảo mật.
- `RightPanel.tsx`: Bảng bên phải hiển thị chi tiết lỗi phát hiện (Finding details, evidence, đề xuất sửa chữa, diff patch).
- `TestDrawer.tsx`: Ngăn kéo chạy kiểm thử và xác minh bản vá lỗi tự động.

### 2. Giao diện người dùng cơ bản (`web/components/ui/`)
- `badge.tsx`: Huy hiệu hiển thị mức độ nghiêm trọng (Critical, High, Medium, Low).
- `button.tsx`: Các nút bấm điều khiển giao diện.
- `collapsible.tsx`: Thành phần thu gọn / mở rộng nội dung.
- `dropdown-menu.tsx`: Menu chọn bộ lọc và hành động.
- `textarea.tsx`: Khung nhập liệu văn bản.
- `tooltip.tsx`: Chú thích khi rê chuột.

### 3. Thư viện & Kiểu dữ liệu (`web/lib/`)
- `reviewTypes.ts`: Định nghĩa kiểu dữ liệu TypeScript cho giao diện Reviewer.
- `reviewFixture.ts`: Dữ liệu mẫu (mock/fixture) phục vụ kiểm thử và render độc lập.
- `highlight.ts`: Thư viện tô màu cú pháp mã nguồn (Syntax highlighting).
- `swal.ts`: Hộp thoại thông báo và xác nhận (SweetAlert wrapper).

### 4. Hợp đồng dữ liệu & Tích hợp Server
- `contracts/review-v1.ts`: Data Contract v1 quy định cấu trúc báo cáo review, AST graph, findings, patches giữa Core Engine và Web UI.
- `src-web/cliWebServer.ts`: Module khởi động Web Server phục vụ giao diện Reviewer từ CLI (Dynamic layout, token auth, cookie session).

---

## 🚫 Danh mục tệp KHÔNG sao lưu (Agent Chat)
Các tệp sau đã được loại trừ hoàn toàn theo chỉ đạo:
- `web/src/components/Composer.tsx` (Khung gõ chat)
- `web/src/components/MessageView.tsx` (Khung hiển thị tin nhắn chat)
- `web/src/components/Sidebar.tsx` (Danh sách phiên chat)
- `web/src/components/ModeMenu.tsx` (Menu chế độ quyền hạn)
- `web/src/components/ModelMenu.tsx` (Menu chọn mô hình AI)
- `web/src/components/AddModelModal.tsx`
- `web/src/components/PermissionCard.tsx` (Thẻ phê duyệt quyền agent)
- `web/src/components/SpeechButton.tsx`
- `web/src/components/ToolCall.tsx`
- `web/src/hooks/useViecodie.ts` (Hook stream chat hội thoại)
- `src/web/session.ts` & `src/web/session.test.ts` (Quản lý phiên chat backend)

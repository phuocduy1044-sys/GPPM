# DANH MỤC THƯ VIỆN BÊN THỨ BA (THIRD-PARTY LICENSES)
**Dự án:** VIECODIE  
**Kiểm tra ngày:** 27/10/2026

Tất cả các thư viện phụ thuộc (dependencies) trực tiếp và gián tiếp của VIECODIE đều sử dụng các giấy phép nguồn mở tương thích hoàn toàn với giấy phép MIT của dự án. Không sử dụng các thư viện mang giấy phép Copyleft mạnh (như GPLv3/AGPL) gây ảnh hưởng tới cấu trúc cấp phép.

---

## 1. Thư viện Runtime & Core Dependencies

| Thư viện (Package) | Phiên bản (Version) | Giấy phép (License) | Mục đích sử dụng | Nguồn gốc |
| :--- | :---: | :---: | :--- | :--- |
| `react` / `react-dom` | `^18.3.0` | **MIT** | Xây dựng giao diện Web và TUI | [facebook/react](https://github.com/facebook/react) |
| `ink` | `^5.0.0` | **MIT** | Khung giao diện Terminal CLI | [vadimdemedes/ink](https://github.com/vadimdemedes/ink) |
| `@tabler/icons-react` | `^3.49.0` | **MIT** | Biểu tượng icon vector UI | [tabler/tabler-icons](https://github.com/tabler/tabler-icons) |
| `lucide-react` | `^1.49.0` | **ISC** | Biểu tượng bổ trợ giao diện | [lucide-icons/lucide](https://github.com/lucide-icons/lucide) |
| `execa` | `^9.0.0` | **MIT** | Thực thi an toàn câu lệnh shell/test runner | [sindresorhus/execa](https://github.com/sindresorhus/execa) |
| `ollama` | `^0.5.0` | **MIT** | Giao thức kết nối Ollama Local | [ollama/ollama-js](https://github.com/ollama/ollama-js) |
| `openai` | `^7.43.0` | **Apache-2.0** | SDK gọi API DeepSeek / OpenAI | [openai/openai-node](https://github.com/openai/openai-node) |
| `@anthropic-ai/sdk` | `^0.126.0` | **MIT** | SDK gọi API Anthropic Claude | [anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) |
| `zod` | `^3.23.0` | **MIT** | Schema validation dữ liệu đầu vào | [colinhacks/zod](https://github.com/colinhacks/zod) |
| `marked` / `marked-terminal` | `^12.0.2` | **MIT** | Render Markdown trên terminal & web | [markedjs/marked](https://github.com/markedjs/marked) |
| `sweetalert2` | `^11.26.25` | **MIT** | Hộp thoại thông báo xác nhận patch | [sweetalert2/sweetalert2](https://github.com/sweetalert2/sweetalert2) |
| `clsx` / `tailwind-merge` | `^2.1.1` | **MIT** | Quản lý class style Tailwind CSS | [lukeed/clsx](https://github.com/lukeed/clsx) |

---

## 2. Thư viện Môi trường Phát triển (DevDependencies)

| Thư viện | Phiên bản | Giấy phép | Mục đích |
| :--- | :---: | :---: | :--- |
| `typescript` | `^5.7.0` | **Apache-2.0** | Trình biên dịch ngôn ngữ TypeScript & AST Parser |
| `vite` | `^6.4.3` | **MIT** | Công cụ đóng gói ứng dụng Web frontend |
| `tsup` | `^8.5.1` | **MIT** | Công cụ bundle mã nguồn CLI |
| `tailwindcss` | `^4.3.3` | **MIT** | Hệ thống utility CSS |
| `vitest` | `^4.1.9` | **MIT** | Khung kiểm thử tự động (Unit Test Runner) |

---

## 3. Bản quyền Mô hình & API
- **DeepSeek (V3/R1):** Dịch vụ API được cấp phép theo điều khoản dịch vụ của DeepSeek Platform. Mô hình DeepSeek-V3/R1 là mã nguồn mở với giấy phép MIT.
- **Qwen 2.5 Coder:** Mô hình nguồn mở được Alibaba Cloud cấp phép theo Apache-2.0.

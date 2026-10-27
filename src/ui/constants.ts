/** UI constants & onboarding copy — kept out of components for easy editing. */

export interface Command {
  name: string
  description: string
  /**
   * Where the command came from. Built-ins are the ones below; the others are
   * Markdown files under .viecodie/commands, and the palette dims their origin so
   * you can tell a repo's command from your own.
   */
  origin?: 'builtin' | 'project' | 'user'
}

/**
 * Slash commands, in the order the palette lists them. Single source of truth:
 * the palette filters this, and the welcome card quotes a subset by name, so a
 * description edited here updates both.
 */
export const COMMANDS: Command[] = [
  { name: '/plan',   description: 'lập kế hoạch trước — nghiên cứu chỉ đọc, phê duyệt trước khi sửa' },
  { name: '/init',   description: 'khảo sát dự án và tạo tệp hướng dẫn VIECODIE.md' },
  { name: '/review', description: 'phân tích đánh giá mã nguồn dự án · gõ /graph để xem sơ đồ tư duy' },
  { name: '/graph',  description: 'xem sơ đồ tư duy kiến trúc (mind map) và chú thích lỗi trong CLI' },
  { name: '/models', description: 'chọn mô hình · tab đổi nhà cung cấp · ←→ mức độ nỗ lực' },
  { name: '/provider', description: 'chuyển đổi backend · /provider add <tên> [khóaApi] · remove <tên>' },
  { name: '/new',    description: 'lưu phiên hiện tại và bắt đầu phiên mới' },
  { name: '/sessions', description: 'danh sách phiên làm việc và tiếp tục một phiên' },
  { name: '/rewind', description: 'hoàn tác các thay đổi tệp của agent và tua lại hội thoại' },
  { name: '/context', description: 'xem những gì đang chiếm dụng cửa sổ ngữ cảnh' },
  { name: '/cost',   description: 'số token và thời gian đã dùng trong phiên này' },
  { name: '/copy',   description: 'sao chép vào clipboard · /copy last | code | tool | all' },
  { name: '/export', description: 'xuất biên bản hội thoại ra tệp Markdown' },
  { name: '/compact', description: 'tóm tắt hội thoại để giải phóng ngữ cảnh · /compact <trọng-tâm>' },
  { name: '/memory', description: 'vị trí tệp VIECODIE.md · # để thêm một dòng ghi nhớ' },
  { name: '/agents', description: 'danh sách subagent mà công cụ task có thể gọi' },
  { name: '/mcp',    description: 'các máy chủ MCP đã kết nối và danh sách công cụ' },
  { name: '/permissions', description: 'danh sách quy tắc phê duyệt đã lưu và vị trí lưu' },
  { name: '/settings', description: 'các tệp cấu hình đang có hiệu lực' },
  { name: '/vim',    description: 'bật/tắt chế độ phím vim trong thanh nhập liệu' },
  { name: '/clear',  description: 'xóa khung trò chuyện và đặt lại ngữ cảnh' },
  { name: '/exit',   description: 'thoát khỏi viecodie' },
]

/** Commands featured on the welcome card, in display order. */
const WELCOME_COMMAND_NAMES = ['/plan', '/models', '/sessions', '/compact', '/clear']

/** The featured commands, resolved against COMMANDS so copy never drifts. */
export const WELCOME_COMMANDS: Command[] = WELCOME_COMMAND_NAMES.flatMap(
  (name) => COMMANDS.find((c) => c.name === name) ?? [],
)

export const WELCOME_PROMPT = 'Chào bạn! Mình có thể giúp đọc, sửa, kiểm thử và giải thích mã nguồn.'

/** Security & permissions notice displayed on launch */
export const SECURITY_WARNING_TITLE = 'QUYỀN TRUY CẬP & BẢO MẬT'
export const SECURITY_WARNING_NOTICE =
  'Mặc định Viecodie chạy toàn quyền theo tài khoản hiện tại: có thể đọc, sửa, xóa tệp và chạy lệnh mà không hỏi. Quy tắc deny đã cấu hình vẫn được áp dụng.'

/** What the status line says while the model is reasoning, and while it is writing its answer. */
export const THINKING_LABEL = 'Tôi đang suy nghĩ…'
export const WRITING_LABEL = 'Tôi đang viết…'

/** Placeholder shown in the input bar while it's empty. */
export const INPUT_PLACEHOLDER = 'mô tả công việc, hoặc gõ / để mở danh sách lệnh'
/** While a turn runs, what you send is handed to the agent at its next step. */
export const BUSY_PLACEHOLDER = 'thêm tin nhắn — agent sẽ đọc ở bước tiếp theo'

/** Key hints under the input bar. Kept short — they share one line. */
export const INPUT_HINTS = '⏎ gửi · / lệnh · @ tệp · shift+tab chế độ · kéo để sao chép · ctrl+y sao chép trả lời · pgup/pgdn cuộn'

/** Key hints under the input bar while a turn is running. */
export const BUSY_HINTS = 'ctrl+t ẩn/hiện suy nghĩ · bấm vào tool để xem chi tiết · ctrl+o mở tất cả · ctrl+y sao chép · cuộn để xem lại'

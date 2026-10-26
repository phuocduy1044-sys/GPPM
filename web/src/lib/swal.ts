import Swal from 'sweetalert2'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Modern, clean SweetAlert2 instance matching viecodie design tokens.
 */
export const swal = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: 'swal-popup-3d',
    title: 'swal-title-custom',
    htmlContainer: 'swal-html-custom',
    confirmButton: 'swal-btn swal-btn-confirm',
    cancelButton: 'swal-btn swal-btn-cancel',
    actions: 'swal-actions-custom',
  },
})

/**
 * Hiển thị hộp thoại xác nhận xóa đoạn chat với SweetAlert2
 */
export async function confirmDeleteSession(title: string): Promise<boolean> {
  const result = await swal.fire({
    title: 'Xóa đoạn chat?',
    html: `
      <div class="swal-body-text">
        Bạn có chắc muốn xóa đoạn chat <span class="swal-highlight">“${escapeHtml(title)}”</span>?
      </div>
      <div class="swal-sub-text">Toàn bộ lịch sử trao đổi của phiên này sẽ bị xóa vĩnh viễn.</div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xóa đoạn chat',
    cancelButtonText: 'Hủy',
    focusCancel: true,
    customClass: {
      popup: 'swal-popup-3d',
      title: 'swal-title-custom',
      htmlContainer: 'swal-html-custom',
      confirmButton: 'swal-btn swal-btn-destructive',
      cancelButton: 'swal-btn swal-btn-cancel',
      actions: 'swal-actions-custom',
    },
  })
  return result.isConfirmed
}

/**
 * Hiển thị hộp thoại xác nhận tua lại (rewind)
 */
export async function confirmRewind(filesCount: number, files: string[]): Promise<boolean> {
  const listItems = files.slice(0, 6).map((f) => `<li class="font-mono text-[11px] truncate">${escapeHtml(f)}</li>`).join('')
  const extraCount = files.length > 6 ? `<li class="text-[11px] text-muted-foreground list-none pt-0.5">… và còn ${files.length - 6} tệp khác</li>` : ''

  const filesHtml = filesCount > 0
    ? `
      <div class="swal-files-box">
        <div class="swal-files-title">Các tệp sẽ hoàn tác về trạng thái trước đó (${filesCount}):</div>
        <ul class="swal-files-list">
          ${listItems}
          ${extraCount}
        </ul>
      </div>
    `
    : `<div class="swal-sub-text">Không có tệp nào bị thay đổi sau tin nhắn này.</div>`

  const result = await swal.fire({
    title: 'Tua lại về trước tin nhắn này?',
    html: `
      <div class="swal-body-text">Đoạn hội thoại từ điểm này trở đi sẽ được hủy bỏ.</div>
      ${filesHtml}
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Xác nhận tua lại',
    cancelButtonText: 'Hủy',
    focusCancel: true,
  })
  return result.isConfirmed
}

/**
 * Hộp thoại xác nhận hành động tùy biến
 */
export async function confirmAction({
  title,
  html,
  text,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDestructive = false,
  icon = 'warning',
}: {
  title: string
  html?: string
  text?: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  icon?: 'warning' | 'error' | 'success' | 'info' | 'question'
}): Promise<boolean> {
  const result = await swal.fire({
    title,
    html: html ?? (text ? `<div class="swal-body-text">${escapeHtml(text)}</div>` : undefined),
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    focusCancel: isDestructive,
    customClass: {
      popup: 'swal-popup-3d',
      title: 'swal-title-custom',
      htmlContainer: 'swal-html-custom',
      confirmButton: isDestructive ? 'swal-btn swal-btn-destructive' : 'swal-btn swal-btn-confirm',
      cancelButton: 'swal-btn swal-btn-cancel',
      actions: 'swal-actions-custom',
    },
  })
  return result.isConfirmed
}

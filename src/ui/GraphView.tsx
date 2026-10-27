import { memo } from 'react'
import { Box, Text, useStdout } from 'ink'
import type { ReviewReport } from '../review/types.js'
import { generateMindMap } from './graphMindMap.js'
import { C } from './theme.js'

interface Props {
  report: ReviewReport | null
  scrollOffset: number
  onClose: () => void
  maxRows?: number
}

export const GraphView = memo(function GraphView({
  report,
  scrollOffset,
  maxRows = 24,
}: Props) {
  const { stdout } = useStdout()
  const cols = stdout?.columns ?? 80

  if (!report) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={C.yellow}
        paddingX={1}
        width="100%"
        flexShrink={0}
      >
        <Text color={C.yellow} bold>
          ⚠ Chưa có dữ liệu review cho dự án này.
        </Text>
        <Text dimColor>Hãy gõ `/review` để phân tích mã nguồn trước khi mở sơ đồ tư duy.</Text>
        <Text color={C.cyan}>Nhấn Esc hoặc q để quay lại màn hình trò chuyện.</Text>
      </Box>
    )
  }

  const allLines = generateMindMap(report, cols - 4)
  // Reserve 4 rows for borders and footer
  const visibleCount = Math.max(4, maxRows - 4)
  const maxScroll = Math.max(0, allLines.length - visibleCount)
  const clampedScroll = Math.max(0, Math.min(scrollOffset, maxScroll))
  const slice = allLines.slice(clampedScroll, clampedScroll + visibleCount)

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="round"
      borderColor={C.blue}
      paddingX={1}
      flexShrink={0}
    >
      {/* Top Title Bar */}
      <Box flexDirection="row" justifyContent="space-between" flexShrink={0}>
        <Text bold color={C.blue}>
          🧠 SƠ ĐỒ TƯ DUY KIẾN TRÚC MÃ NGUỒN (MIND MAP)
        </Text>
        <Text color={C.cyan} bold>100% CLI Mode</Text>
      </Box>

      {/* Mind Map Tree & Error Annotations Content Window */}
      <Box flexDirection="column" flexGrow={1} marginTop={0} marginBottom={0} flexShrink={0}>
        {slice.map((line, idx) => (
          <Text
            key={`line-${clampedScroll + idx}`}
            wrap="truncate"
            color={line.color}
            bold={line.bold}
            dimColor={line.dimColor}
            inverse={line.inverse}
          >
            {line.text || ' '}
          </Text>
        ))}
      </Box>

      {/* Pinned Bottom Navigation / Status Bar */}
      <Box
        flexShrink={0}
        marginTop={0}
        flexDirection="row"
        justifyContent="space-between"
      >
        <Text dimColor wrap="truncate">
          ↑↓/PgUp/PgDn: Cuộn sơ đồ [{clampedScroll + 1}–{Math.min(allLines.length, clampedScroll + visibleCount)} / {allLines.length} dòng]
        </Text>
        <Text bold color={C.cyan} wrap="truncate">
          Esc / q / Enter: Trở về chat
        </Text>
      </Box>
    </Box>
  )
})

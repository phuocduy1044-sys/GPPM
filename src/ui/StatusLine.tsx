import { memo, useEffect, useState } from 'react'
import { Box, Text, useStdout } from 'ink'
import { formatTokens, truncate } from './layout.js'
import { dots, waveColor } from './shimmer.js'

const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

/**
 * The one line that says the agent is working, drawn above the input bar while a
 * turn runs: what it's doing, how long it has been at it, and roughly how much
 * it has written — "⠹ Tôi đang suy nghĩ... (12s · ↓ 1.2k tokens · esc to interrupt)".
 * The spinner and the label cycle through colours, and a trailing ellipsis in the
 * label animates as growing dots.
 *
 * The thought itself is deliberately absent. It lands in the transcript with
 * the step (ctrl+t shows it); streaming it here is a flickering line nobody
 * reads, and the transcript is where the work is judged.
 */
export const StatusLine = memo(function StatusLine({
  label,
  startedAt,
  tokens,
}: {
  label: string
  startedAt: number
  /** Output tokens so far this turn, estimated from streamed characters. */
  tokens: number
}) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    // 200ms is a clean 2× of the runner's 100ms flush, so the two timers
    // phase-lock instead of repainting on drifting, unsynced clocks. The count
    // runs on past the spinner's length: the colour wave moves on the same clock.
    const t = setInterval(() => setFrame((f) => f + 1), 200)
    return () => clearInterval(t)
  }, [])

  const { stdout } = useStdout()
  const stats = [formatElapsed(Date.now() - startedAt)]
  if (tokens > 0) stats.push(`↓ ${formatTokens(tokens)} tokens`)
  stats.push('esc để dừng')
  // Always exactly one row: a status line that wraps grows the frame and shoves
  // the transcript up. Root padding (2) + margin (1) + spinner (2).
  // A label ending in an ellipsis swaps it for animated dots, held at three
  // columns so the stats after it stay put.
  const text = label.endsWith('…') ? label.slice(0, -1) + dots(frame) : label
  const line = truncate(`${text} (${stats.join(' · ')})`, Math.max(10, (stdout?.columns ?? 80) - 5))
  const cut = line.indexOf(' (')

  return (
    <Box marginLeft={1}>
      <Text color={waveColor(0, frame)} bold>{SPIN[frame % SPIN.length]} </Text>
      {cut < 0 ? (
        <Wave text={line} frame={frame} />
      ) : (
        <>
          <Wave text={line.slice(0, cut)} frame={frame} />
          <Text dimColor>{line.slice(cut)}</Text>
        </>
      )}
    </Box>
  )
})

/**
 * The label with a rainbow travelling along it, one colour per character — the
 * line is visibly alive even when the elapsed counter is the only other thing
 * moving. Nested runs inside one <Text>, so it never changes width or wraps.
 * NFC first, so an accented Vietnamese letter is one character, not a base plus
 * a combining mark that would take its own colour.
 */
function Wave({ text, frame }: { text: string; frame: number }) {
  return (
    <Text>
      {Array.from(text.normalize('NFC')).map((ch, i) => (
        <Text key={i} color={waveColor(i, frame)}>{ch}</Text>
      ))}
    </Text>
  )
}

/**
 * Messages sent while the agent works, shown until it picks them up — so a
 * correction typed mid-run is visibly waiting rather than seemingly lost.
 */
export function QueuedMessages({ queued }: { queued: string[] }) {
  const { stdout } = useStdout()
  if (!queued.length) return null
  const width = Math.max(10, (stdout?.columns ?? 80) - 20)
  return (
    <Box flexDirection="column" marginLeft={1}>
      {queued.map((q, i) => (
        <Text key={i} dimColor wrap="truncate">
          {`↳ queued · ${truncate(q.replace(/\s+/g, ' '), width)}`}
        </Text>
      ))}
    </Box>
  )
}

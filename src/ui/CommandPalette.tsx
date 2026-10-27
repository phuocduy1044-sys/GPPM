import { memo } from 'react'
import { Box, Text, useStdout } from 'ink'
import { COMMANDS, type Command } from './constants.js'
import { customCommands } from '../commands/custom.js'
import { C } from './theme.js'
import { truncate } from './layout.js'

export type { Command }

interface Props {
  filter: string
  cursor: number
  /** Most command rows to draw; the list scrolls with the cursor past that. */
  maxRows?: number
}

/**
 * The slice of `count` rows to draw so `cursor` stays in view: centred on it
 * where there's room, pinned to either end near the edges.
 */
export function paletteWindow(count: number, cursor: number, maxRows: number): { start: number; end: number } {
  const rows = Math.max(1, Math.min(count, maxRows))
  const start = Math.max(0, Math.min(count - rows, cursor - Math.floor(rows / 2)))
  return { start, end: start + rows }
}

/**
 * Everything `/` can complete to: the built-ins, then whatever Markdown files
 * the project and the user have dropped in .viecodie/commands. Built-ins come first
 * and a custom command may not shadow one — a repo that defines `/clear` should
 * not be able to redefine what clearing the screen does.
 */
export function allCommands(): Command[] {
  const builtin: Command[] = COMMANDS.map((c) => ({ ...c, origin: 'builtin' as const }))
  const taken = new Set(builtin.map((c) => c.name))
  const custom: Command[] = customCommands()
    .filter((c) => !taken.has(c.name))
    .map((c) => ({ name: c.name, description: c.description, origin: c.scope }))
  return [...builtin, ...custom]
}

/**
 * Commands whose name starts with what has been typed.
 *
 * Matched against the whole line, not just its first word: once you type a
 * space the line has arguments and the palette should get out of the way, the
 * same as it already does for `/copy last`. Resolving `/review src/a.ts` back
 * to `/review` is the submit path's job, not the palette's — doing it here
 * would leave the list open over your arguments and let tab overwrite them.
 */
export function filteredCommands(filter: string): Command[] {
  return allCommands().filter((c) => c.name.startsWith(filter))
}

export const CommandPalette = memo(function CommandPalette({ filter, cursor, maxRows = 6 }: Props) {
  const filtered = filteredCommands(filter)
  if (filtered.length === 0) return null

  const { stdout } = useStdout()
  const cols = stdout?.columns ?? 80

  // Width from the whole list, not the window, so the columns hold still as it scrolls.
  const nameWidth = Math.max(...filtered.map((c) => c.name.length))
  const { start, end } = paletteWindow(filtered.length, cursor, maxRows)

  // Reserve columns for padding (4), border (2), marker (2), gap (2), origin (8 if present)
  const hasCustomOrigin = filtered.some((c) => c.origin && c.origin !== 'builtin')
  const originWidth = hasCustomOrigin ? 10 : 0
  const maxDescWidth = Math.max(10, cols - nameWidth - originWidth - 12)

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="round"
      borderColor={C.gray}
      paddingX={1}
      flexShrink={0}
    >
      {filtered.slice(start, end).map((cmd, j) => {
        const i = start + j
        const active = i === cursor
        return (
          <Box key={cmd.name} gap={2} flexShrink={0}>
            <Text bold={active} color={active ? C.blue : undefined} dimColor={!active} wrap="truncate">
              {active ? '❯ ' : '  '}{cmd.name.padEnd(nameWidth)}
            </Text>
            <Text dimColor wrap="truncate">{truncate(cmd.description, maxDescWidth)}</Text>
            {cmd.origin && cmd.origin !== 'builtin' && (
              <Text color={C.cyan} dimColor wrap="truncate">{cmd.origin}</Text>
            )}
          </Box>
        )
      })}
      <Box marginTop={0} flexShrink={0}>
        <Text dimColor wrap="truncate">
          {truncate(
            `↑↓ navigate   tab/enter autocomplete   esc dismiss${
              end - start < filtered.length ? `   ${start + 1}–${end} of ${filtered.length}` : ''
            }`,
            Math.max(10, cols - 6),
          )}
        </Text>
      </Box>
    </Box>
  )
})

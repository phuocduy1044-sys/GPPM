import { Box, Text } from 'ink'
import { apiKeyFor } from '../config.js'
import type { NamedProvider } from '../config.js'
import { PRESETS } from '../llm/presets.js'
import { C } from './theme.js'

interface Props {
  entries: NamedProvider[]
  cursor: number
  activeName: string
  query: string
}

export function ProviderPicker({ entries, cursor, activeName, query }: Props) {
  // Presets the user hasn't configured yet. Listing them here is the whole
  // discovery story for `/provider add`: the names aren't guessable, and
  // sending people to `viecodie provider list --all` in another shell to find one
  // defeats the point of the picker. Filters alongside the configured rows so
  // typing narrows both halves at once.
  const configured = new Set(entries.map((e) => e.name))
  const q = query.toLowerCase()
  const addable = Object.entries(PRESETS)
    .filter(([name]) => !configured.has(name))
    .filter(([name]) => !q || name.includes(q))

  const nameWidth = Math.max(8, ...entries.map((e) => e.name.length), ...addable.map(([n]) => n.length))
  // Pad the label so the env-var column lines up under itself; the labels vary
  // by ~14 characters, which reads as ragged without this.
  const labelWidth = Math.max(0, ...addable.map(([, p]) => p.label.length))

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Text dimColor>chọn nhà cung cấp</Text>
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor={C.gray} paddingX={1}>
        {entries.length === 0 ? (
          <Text dimColor>chưa cấu hình nhà cung cấp nào — thử dùng /models add ollama</Text>
        ) : (
          entries.map((e, i) => {
            const sel = i === cursor
            return (
              <Text key={e.name} color={sel ? C.blue : undefined} dimColor={!sel}>
                {sel ? '❯ ' : '  '}
                {e.name.padEnd(nameWidth)}
                <Text dimColor>{'  '}{e.kind.padEnd(5)}</Text>
                <Text dimColor>{'  '}{e.entry.baseUrl}</Text>
                {/* A remote provider with no key resolves to nothing at request
                    time; flag it here rather than at the first failed turn. */}
                {e.kind === 'api' && !apiKeyFor(e.entry) ? (
                  <Text color={C.yellow}>{'  chưa có khóa'}</Text>
                ) : null}
                {e.name === activeName ? <Text color={C.green}>{'  ●'}</Text> : null}
              </Text>
            )
          })
        )}

        {addable.length > 0 ? (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>{'  '}khả dụng — /models add &lt;tên&gt; [khóaApi]</Text>
            {addable.map(([name, p]) => (
              <Text key={name} dimColor>
                {'  '}
                {name.padEnd(nameWidth)}
                <Text dimColor>{'  '}{(p.type === 'ollama' ? 'local' : p.apiKeyEnv ? 'api' : 'local').padEnd(5)}</Text>
                <Text dimColor>{'  '}{p.apiKeyEnv ? p.label.padEnd(labelWidth) : p.label}</Text>
                {/* Naming the env var is the actionable half: with it already
                    exported, `add <name>` is the entire setup. */}
                {p.apiKeyEnv ? <Text dimColor>{'  '}${p.apiKeyEnv}</Text> : null}
              </Text>
            ))}
          </Box>
        ) : null}
      </Box>
      <Box marginTop={1} flexDirection="column">
        {query ? <Text dimColor>{`lọc: ${query}`}</Text> : null}
        <Text dimColor>↑↓ di chuyển   enter chọn   gõ để lọc   esc quay lại</Text>
      </Box>
    </Box>
  )
}

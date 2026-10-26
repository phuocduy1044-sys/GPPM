import { existsSync, lstatSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage'])
const args = process.argv.slice(2)
const value = (flag) => args[args.indexOf(flag) + 1]
const from = value('--from')
const to = value('--to')
const apply = args.includes('--apply')

if (args.includes('--help')) {
  process.stdout.write('Usage: npm run rename:project -- --from <old-name> --to <new-name> [--apply]\n')
  process.exit(0)
}

if (!from || !to || from === to) {
  process.stdout.write('Usage: npm run rename:project -- --from <old-name> --to <new-name> [--apply]\n')
  process.exit(from && to && from !== to ? 0 : 1)
}

function classify(path) {
  switch (extname(path).toLowerCase()) {
    case '.json': return 'metadata'
    case '.md': return 'markdown'
    case '.ts':
    case '.tsx':
    case '.js':
    case '.mjs':
    case '.jsx': return 'source'
    case '.html':
    case '.css': return 'web'
    case '.sh':
    case '.ps1':
    case '.yml':
    case '.yaml': return 'automation'
    default:
      return ['.gitignore', '.npmignore'].includes(path.split(/[\\/]/).at(-1))
        ? 'automation'
        : null
  }
}

function replaceName(value) {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return value.replace(new RegExp(escaped, 'gi'), (match) => {
    if (match === from.toUpperCase()) return to.toUpperCase()
    if (match[0] === match[0].toUpperCase()) {
      return to[0].toUpperCase() + to.slice(1).toLowerCase()
    }
    return to.toLowerCase()
  })
}

const entries = []
function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (directory === root && ignoredDirectories.has(name)) continue
    const path = join(directory, name)
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) continue
    const isDirectory = stat.isDirectory()
    entries.push({ path, isDirectory })
    if (isDirectory) walk(path)
  }
}
walk(root)

const edits = []
for (const entry of entries) {
  if (entry.isDirectory) continue
  const category = classify(entry.path)
  if (!category) continue
  const original = readFileSync(entry.path, 'utf8')
  const updated = replaceName(original)
  if (updated !== original) edits.push({ path: entry.path, category, updated })
}

const moves = entries.flatMap(({ path }) => {
  const name = path.split(/[\\/]/).at(-1)
  const renamed = replaceName(name)
  return name === renamed ? [] : [{ from: path, to: join(path.slice(0, -name.length), renamed) }]
})
const movingPaths = new Set(moves.map(({ from: source }) => resolve(source)))
for (const move of moves) {
  if (existsSync(move.to) && !movingPaths.has(resolve(move.to))) {
    throw new Error(`Rename target already exists: ${move.to}`)
  }
}

const summary = new Map()
for (const edit of edits) summary.set(edit.category, (summary.get(edit.category) ?? 0) + 1)
process.stdout.write(`Content files: ${edits.length}; paths to rename: ${moves.length}\n`)
for (const [category, count] of summary) process.stdout.write(`  ${category}: ${count}\n`)
if (!apply) {
  process.stdout.write('Dry run only. Add --apply to write the changes.\n')
  process.exit(0)
}

for (const edit of edits) writeFileSync(edit.path, edit.updated, 'utf8')
for (const move of moves.sort((a, b) => b.from.length - a.from.length)) renameSync(move.from, move.to)
process.stdout.write('Rename complete.\n')

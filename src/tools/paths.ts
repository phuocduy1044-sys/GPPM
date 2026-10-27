import { resolve, relative, isAbsolute, sep, join, dirname, basename } from 'path'
import { lstatSync, realpathSync } from 'fs'
import { homedir } from 'os'

/** App-owned spill directory (see spill.ts). Trusted so the model can page large
 *  tool output written here, even though it sits outside cwd. confinePath also
 *  backs write_file/edit_file, so this grants writes here too — acceptable: the
 *  dir is app-owned and auto-cleaned on startup. */
const SPILL_DIR = resolve(join(homedir(), '.viecodie', 'output'))

export function isUnder(parent: string, child: string): boolean {
  const normParent = resolve(parent)
  const normChild = resolve(child)
  const p = process.platform === 'win32' ? normParent.toLowerCase() : normParent
  const c = process.platform === 'win32' ? normChild.toLowerCase() : normChild
  const rel = relative(p, c)
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel))
}

/**
 * Where `abs` really lands once every symlink on the way is followed. The path
 * may not exist yet (write_file creating a file), so the deepest part that does
 * exist is resolved and the rest appended. A link that points nowhere throws:
 * writing through it would create its target, wherever that is.
 */
function realTarget(abs: string): string {
  let existing = abs
  const rest: string[] = []
  for (;;) {
    try {
      lstatSync(existing)
      break
    } catch {
      const parent = dirname(existing)
      if (parent === existing) return abs
      rest.unshift(basename(existing))
      existing = parent
    }
  }
  return join(realpathSync(existing), ...rest)
}

function realOrSelf(p: string): string {
  try {
    return realpathSync(p)
  } catch {
    return p
  }
}

/**
 * Confine a path strictly to a given root directory.
 * Disallows traversal (`..`), sibling folder prefixes, absolute paths outside root,
 * and any symlinks/junctions resolving outside the root directory.
 */
export function confineToRoot(p: string, rootDir: string): string {
  if (typeof p !== 'string' || p.length === 0) {
    throw new Error('I need a file path here, but none was given.')
  }
  const root = resolve(rootDir)
  const abs = resolve(root, p)
  const outside = new Error(`"${p}" sits outside the project directory (${root}), so I can't touch it. Stay within the project folder.`)
  if (!isUnder(root, abs)) throw outside
  let real: string
  try {
    real = realTarget(abs)
  } catch {
    throw new Error(`"${p}" is a link to somewhere that does not exist, so I can't touch it.`)
  }
  if (isUnder(realOrSelf(root), real)) return abs
  throw outside
}

/**
 * Safe boolean check for whether a path is contained strictly within a root directory.
 */
export function isPathContained(p: string, rootDir: string): boolean {
  try {
    confineToRoot(p, rootDir)
    return true
  } catch {
    return false
  }
}

/**
 * Resolve a tool-supplied path against the current working directory (or explicit root)
 * and reject any path that escapes it. Returns the absolute, confined path.
 *
 * Blocks `../` traversal, absolute paths outside cwd, and symlinks — inside the
 * project or not yet created — whose target is outside it: the check is made on
 * where the path really lands, not how it is spelled. Throws a clear Error the
 * tool turns into an is_error result.
 */
export function confinePath(p: string, rootDir?: string): string {
  if (rootDir && rootDir !== process.cwd()) {
    return confineToRoot(p, rootDir)
  }
  if (typeof p !== 'string' || p.length === 0) {
    throw new Error('I need a file path here, but none was given.')
  }
  const root = process.cwd()
  const abs = resolve(root, p)
  const outside = new Error(`"${p}" sits outside the working directory (${root}), so I can't touch it. Stay within the project folder.`)
  // Allow reads/writes inside cwd, plus the app-owned spill dir (large tool
  // output the model needs to page back in).
  if (!isUnder(root, abs) && !isUnder(SPILL_DIR, abs)) throw outside
  let real: string
  try {
    real = realTarget(abs)
  } catch {
    throw new Error(`"${p}" is a link to somewhere that does not exist, so I can't touch it.`)
  }
  if (isUnder(realOrSelf(root), real) || isUnder(realOrSelf(SPILL_DIR), real)) return abs
  throw outside
}

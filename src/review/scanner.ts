import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, relative, resolve, extname } from 'path';
import type { ScanScope } from './types.js';

export interface ScannedFile {
  relativePath: string;
  absolutePath: string;
  content: string;
  size: number;
}

export interface ScanResult {
  files: ScannedFile[];
  scope: ScanScope;
}

const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.idea',
  '.vscode',
  'temp',
  'tmp',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.zip', '.tar', '.gz', '.tgz', '.7z', '.rar',
  '.pdf', '.doc', '.docx',
  '.woff', '.woff2', '.ttf', '.eot',
  '.mp3', '.mp4', '.wav', '.avi',
]);

const SUPPORTED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
]);

const MAX_TOTAL_FILES = 200;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_SIZE = 512 * 1024;        // 512 KB

export function scanProject(projectRoot: string): ScanResult {
  const startTime = Date.now();
  const root = resolve(projectRoot);

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`Target directory does not exist or is not a directory: ${projectRoot}`);
  }

  const files: ScannedFile[] = [];
  const filesRead: string[] = [];
  const filesIgnored: string[] = [];
  const ignoreReasons: Record<string, string> = {};

  let totalBytes = 0;
  let limitsReached = false;

  function walk(currentDir: string) {
    if (limitsReached) return;

    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch (err) {
      const rel = relative(root, currentDir) || '.';
      filesIgnored.push(rel);
      ignoreReasons[rel] = `Permission denied: ${err instanceof Error ? err.message : String(err)}`;
      return;
    }

    for (const entry of entries) {
      if (limitsReached) break;

      const fullPath = join(currentDir, entry);
      const relPath = relative(root, fullPath).replace(/\\/g, '/');

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (DEFAULT_IGNORED_DIRS.has(entry) || entry.startsWith('.')) {
          filesIgnored.push(relPath);
          ignoreReasons[relPath] = 'Excluded default directory';
          continue;
        }
        walk(fullPath);
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();

        if (BINARY_EXTENSIONS.has(ext)) {
          filesIgnored.push(relPath);
          ignoreReasons[relPath] = 'Binary file';
          continue;
        }

        if (!SUPPORTED_EXTENSIONS.has(ext)) {
          // Not a JS/TS source file
          filesIgnored.push(relPath);
          ignoreReasons[relPath] = 'Unsupported extension';
          continue;
        }

        if (stat.size > MAX_FILE_SIZE) {
          filesIgnored.push(relPath);
          ignoreReasons[relPath] = `File exceeds size limit (${Math.round(stat.size / 1024)} KB > 512 KB)`;
          continue;
        }

        if (files.length >= MAX_TOTAL_FILES || (totalBytes + stat.size) > MAX_TOTAL_BYTES) {
          limitsReached = true;
          filesIgnored.push(relPath);
          ignoreReasons[relPath] = 'Scan limit reached (max files or bytes limit)';
          continue;
        }

        try {
          const content = readFileSync(fullPath, 'utf-8');
          files.push({
            relativePath: relPath,
            absolutePath: fullPath,
            content,
            size: stat.size,
          });
          filesRead.push(relPath);
          totalBytes += stat.size;
        } catch (err) {
          filesIgnored.push(relPath);
          ignoreReasons[relPath] = `Cannot read file: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    }
  }

  walk(root);

  const scanDurationMs = Date.now() - startTime;

  return {
    files,
    scope: {
      totalFilesScanned: filesRead.length,
      filesRead,
      filesIgnored,
      ignoreReasons,
      scanDurationMs,
      limitsReached,
    },
  };
}

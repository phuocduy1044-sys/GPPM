import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative, dirname, extname } from 'path';
import { createHash } from 'crypto';
import { confineToRoot, isPathContained } from '../tools/paths.js';
import type { ImportedTestFile } from '../review/types.js';

export interface ImportTestBundleOptions {
  projectRoot: string;
  testFiles: ImportedTestFile[];
  overwrite?: boolean;
}

export interface ImportTestBundleResult {
  success: boolean;
  importedFiles: string[];
  testsHash: string;
  error?: string;
}

const TEST_FILE_REGEX = /(?:^|[\\/])(?:tests?|__tests__)[\\/]|(?:[._-](?:test|spec))\.[a-zA-Z0-9]+$|^test_.*\.py$|_test\.go$/i;

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.viecodie',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.next',
]);

/**
 * Recursively scans projectRoot and discovers all test files.
 */
export function listProjectTestFiles(projectRoot: string): string[] {
  const root = resolve(projectRoot);
  const result: string[] = [];

  function walk(currentDir: string) {
    if (!existsSync(currentDir)) return;
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const ent of entries) {
      if (ent.isDirectory()) {
        if (IGNORED_DIRS.has(ent.name) || ent.name.startsWith('.')) continue;
        const subDir = join(currentDir, ent.name);
        walk(subDir);
      } else if (ent.isFile()) {
        const fullPath = join(currentDir, ent.name);
        const rel = relative(root, fullPath).replace(/\\/g, '/');
        if (TEST_FILE_REGEX.test(rel)) {
          result.push(rel);
        }
      }
    }
  }

  try {
    walk(root);
  } catch {
    // Return whatever was found so far
  }

  return result.sort((a, b) => a.localeCompare(b));
}

/**
 * Computes deterministic SHA-256 hash across target test files in projectRoot.
 */
export function computeTestsHash(projectRoot: string, filePaths?: string[]): string {
  const root = resolve(projectRoot);
  const targetFiles = filePaths && filePaths.length > 0 ? filePaths : listProjectTestFiles(root);

  if (targetFiles.length === 0) {
    return '';
  }

  const hash = createHash('sha256');
  const sorted = [...targetFiles].sort((a, b) => a.localeCompare(b));

  for (const rel of sorted) {
    let abs: string;
    try {
      abs = confineToRoot(rel, root);
    } catch {
      continue;
    }

    if (existsSync(abs) && statSync(abs).isFile()) {
      const content = readFileSync(abs, 'utf8');
      hash.update(`${rel}:${content.length}:${content}\n`);
    }
  }

  return hash.digest('hex');
}

/**
 * Imports a bundle of test files into projectRoot with strict path containment and validation.
 */
export function importTestBundle(options: ImportTestBundleOptions): ImportTestBundleResult {
  const { projectRoot, testFiles, overwrite = true } = options;
  const root = resolve(projectRoot);

  if (!testFiles || !Array.isArray(testFiles) || testFiles.length === 0) {
    return {
      success: false,
      importedFiles: [],
      testsHash: '',
      error: 'Vui lòng cung cấp ít nhất một tệp kiểm thử trong mảng testFiles.',
    };
  }

  const importedFiles: string[] = [];

  // Phase 1: Pre-validation of all files for security & path containment
  for (const tf of testFiles) {
    if (!tf.filePath || typeof tf.filePath !== 'string' || tf.filePath.trim() === '') {
      return {
        success: false,
        importedFiles: [],
        testsHash: '',
        error: 'Đường dẫn tệp kiểm thử không được để trống.',
      };
    }

    const normalizedRel = tf.filePath.trim().replace(/\\/g, '/');

    // Reject dangerous path traversal
    if (normalizedRel.includes('../') || normalizedRel.startsWith('/') || normalizedRel.startsWith('..')) {
      return {
        success: false,
        importedFiles: [],
        testsHash: '',
        error: `Đường dẫn tệp "${tf.filePath}" không an toàn hoặc nằm ngoài thư mục dự án.`,
      };
    }

    let absPath: string;
    try {
      absPath = confineToRoot(normalizedRel, root);
    } catch {
      return {
        success: false,
        importedFiles: [],
        testsHash: '',
        error: `Đường dẫn tệp "${tf.filePath}" vượt quá phạm vi thư mục dự án.`,
      };
    }

    if (!isPathContained(absPath, root)) {
      return {
        success: false,
        importedFiles: [],
        testsHash: '',
        error: `Tệp "${tf.filePath}" nằm ngoài thư mục dự án.`,
      };
    }

    // Check overwrite policy
    if (!overwrite && existsSync(absPath)) {
      return {
        success: false,
        importedFiles: [],
        testsHash: '',
        error: `Tệp "${tf.filePath}" đã tồn tại trên đĩa và chế độ ghi đè (overwrite) bị tắt.`,
      };
    }
  }

  // Phase 2: Safe write to disk
  for (const tf of testFiles) {
    const normalizedRel = tf.filePath.trim().replace(/\\/g, '/');
    const absPath = confineToRoot(normalizedRel, root);
    const parentDir = dirname(absPath);

    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    writeFileSync(absPath, tf.content ?? '', 'utf8');
    importedFiles.push(normalizedRel);
  }

  // Phase 3: Compute cryptographic testsHash
  const testsHash = computeTestsHash(root);

  return {
    success: true,
    importedFiles,
    testsHash,
  };
}

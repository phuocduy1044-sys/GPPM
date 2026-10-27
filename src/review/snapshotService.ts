import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { resolve, join, relative, dirname } from 'path';
import { createHash } from 'crypto';
import { confineToRoot, isUnder } from '../tools/paths.js';

export interface ProjectSnapshot {
  snapshotId: string;
  projectRoot: string;
  timestamp: string;
  sourceHash: string;
  files: Record<string, string>; // relativePath -> full content
}

const memorySnapshots = new Map<string, ProjectSnapshot>();

function getSnapshotDirs(projectRoot: string): string[] {
  const dirs: string[] = [join(projectRoot, '.viecodie', 'snapshots')];
  if (process.env.LOCALAPPDATA) {
    dirs.push(join(process.env.LOCALAPPDATA, '.viecodie', 'snapshots'));
  }
  if (process.env.USERPROFILE) {
    dirs.push(join(process.env.USERPROFILE, '.viecodie', 'snapshots'));
  }
  if (process.env.HOME && process.env.HOME !== process.env.USERPROFILE) {
    dirs.push(join(process.env.HOME, '.viecodie', 'snapshots'));
  }
  return dirs;
}

export function computeSourceHash(files: Record<string, string>): string {
  const hash = createHash('sha256');
  const sortedKeys = Object.keys(files).sort((a, b) => a.localeCompare(b));
  for (const k of sortedKeys) {
    hash.update(`${k}:${files[k].length}:${files[k]}\n`);
  }
  return hash.digest('hex');
}

/**
 * Creates an immutable snapshot of target files in projectRoot before applying changes.
 */
export function createProjectSnapshot(projectRoot: string, filePaths?: string[]): ProjectSnapshot {
  const root = resolve(projectRoot);
  const files: Record<string, string> = {};

  if (filePaths && filePaths.length > 0) {
    for (const fp of filePaths) {
      let abs: string;
      try {
        abs = confineToRoot(fp, root);
      } catch {
        continue;
      }
      const rel = relative(root, abs).replace(/\\/g, '/');
      if (existsSync(abs) && statSync(abs).isFile()) {
        files[rel] = readFileSync(abs, 'utf8');
      } else {
        files[rel] = ''; // indicates file was non-existent before
      }
    }
  } else {
    // Scan all existing files in root
    const { scanProject } = require('./scanner.js');
    const { files: scanned } = scanProject(root);
    for (const f of scanned) {
      files[f.relativePath] = f.content;
    }
  }

  const sourceHash = computeSourceHash(files);
  const snapshotId = `snap-${Date.now().toString(36)}-${sourceHash.slice(0, 8)}`;
  const snapshot: ProjectSnapshot = {
    snapshotId,
    projectRoot: root,
    timestamp: new Date().toISOString(),
    sourceHash,
    files,
  };

  memorySnapshots.set(snapshotId, snapshot);

  // Persist snapshot to disk
  const dirs = getSnapshotDirs(root);
  for (const dir of dirs) {
    try {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${snapshotId}.json`), JSON.stringify(snapshot, null, 2), 'utf8');
    } catch {
      // continue
    }
  }

  return snapshot;
}

export function getProjectSnapshot(projectRoot: string, snapshotId: string): ProjectSnapshot | null {
  const mem = memorySnapshots.get(snapshotId);
  if (mem) return mem;

  const root = resolve(projectRoot);
  const dirs = getSnapshotDirs(root);
  for (const dir of dirs) {
    const file = join(dir, `${snapshotId}.json`);
    if (existsSync(file)) {
      try {
        const parsed = JSON.parse(readFileSync(file, 'utf8')) as ProjectSnapshot;
        if (parsed && parsed.snapshotId === snapshotId) {
          memorySnapshots.set(snapshotId, parsed);
          return parsed;
        }
      } catch {
        // continue
      }
    }
  }

  return null;
}

/**
 * Restores project files on disk from an immutable snapshot.
 */
export function restoreProjectSnapshot(projectRoot: string, snapshotId: string): { restoredFiles: string[]; restoredRevision: string } {
  const snapshot = getProjectSnapshot(projectRoot, snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot ${snapshotId} không tồn tại hoặc không thể tải.`);
  }

  const root = resolve(projectRoot);
  const restoredFiles: string[] = [];

  for (const [relPath, content] of Object.entries(snapshot.files)) {
    const abs = confineToRoot(relPath, root);
    const parentDir = dirname(abs);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    writeFileSync(abs, content, 'utf8');
    restoredFiles.push(relPath);
  }

  const restoredRevision = snapshot.sourceHash.slice(0, 12);
  return {
    restoredFiles,
    restoredRevision,
  };
}

export function clearSnapshots(): void {
  memorySnapshots.clear();
}

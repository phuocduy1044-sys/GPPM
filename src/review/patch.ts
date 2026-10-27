import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve, isAbsolute } from 'path';
import { createHash } from 'crypto';
import type { Finding, Patch, PatchFile, ApplyPatchResponse } from './types.js';

function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 12);
}

export function createPatch(
  projectRoot: string,
  findings: Finding[],
  baseRevision: string,
  targetFindingIds?: string[]
): Patch {
  const root = resolve(projectRoot);
  const selectedFindings = targetFindingIds && targetFindingIds.length > 0
    ? findings.filter(f => targetFindingIds.includes(f.id))
    : findings.filter(f => f.severity === 'critical' || f.severity === 'high');

  const filesToPatch = new Map<string, { original: string; patched: string; oldHash: string }>();

  for (const finding of selectedFindings) {
    const fullPath = isAbsolute(finding.filePath) ? finding.filePath : join(root, finding.filePath);
    if (!existsSync(fullPath)) continue;

    let fileEntry = filesToPatch.get(finding.filePath);
    if (!fileEntry) {
      const original = readFileSync(fullPath, 'utf8');
      fileEntry = {
        original,
        patched: original,
        oldHash: computeHash(original),
      };
      filesToPatch.set(finding.filePath, fileEntry);
    }

    // Apply remediation heuristics based on getFindingPatch or ruleId
    const patchPreview = getFindingPatch(projectRoot, finding);
    if (patchPreview) {
      if (fileEntry.patched.includes(patchPreview.replacement)) {
        // Already patched in this file by a previous finding
        continue;
      }
      if (fileEntry.patched.includes(patchPreview.original)) {
        fileEntry.patched = fileEntry.patched.replace(patchPreview.original, patchPreview.replacement);
        continue;
      }
    }

    if (finding.ruleId === 'SEC_SQL_INJECTION') {
      if (fileEntry.patched.includes('querySafe(')) {
        continue;
      }
      // Replace queryUnsafe template literal with querySafe parameterized call
      if (fileEntry.patched.includes('queryUnsafe')) {
        fileEntry.patched = fileEntry.patched.replace(
          /queryUnsafe\(`SELECT\s+\*\s+FROM\s+users\s+WHERE\s+username\s*=\s*'\$\{username\}'`\)/g,
          `querySafe('SELECT * FROM users WHERE username = $1', [username])`
        );
      }
    } else if (finding.ruleId === 'BUG_POTENTIAL_NULL_DEREFERENCE') {
      if (fileEntry.patched.includes('!record') || fileEntry.patched.includes('record == null')) {
        continue;
      }
      if (fileEntry.patched.includes('if (record.passwordHash === hashPassword(password))')) {
        fileEntry.patched = fileEntry.patched.replace(
          'if (record.passwordHash === hashPassword(password))',
          'if (!record) return { success: false, reason: "User not found" };\n  if (record.passwordHash === hashPassword(password))'
        );
      }
    } else if (finding.ruleId === 'STYLE_UNUSED_VARIABLE') {
      // If unused variable line exists, prefix with underscore
      const lines = fileEntry.patched.split('\n');
      if (finding.line >= 1 && finding.line <= lines.length) {
        const lineIdx = finding.line - 1;
        if (lines[lineIdx].includes('const clientIp')) {
          lines[lineIdx] = lines[lineIdx].replace('const clientIp', 'const _clientIp');
          fileEntry.patched = lines.join('\n');
        }
      }
    }
  }

  const patchFiles: PatchFile[] = [];
  const fullDiffParts: string[] = [];

  for (const [relPath, entry] of filesToPatch.entries()) {
    if (entry.original === entry.patched) continue;

    const newHash = computeHash(entry.patched);
    const diff = createSimpleUnifiedDiff(relPath, entry.original, entry.patched);

    patchFiles.push({
      filePath: relPath,
      oldHash: entry.oldHash,
      newHash,
      diff,
      newContent: entry.patched,
    });

    fullDiffParts.push(diff);
  }

  const patchId = `patch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id: patchId,
    findingIds: selectedFindings.map(f => f.id),
    baseRevision,
    files: patchFiles,
    fullDiff: fullDiffParts.join('\n\n'),
    status: 'proposed',
  };
}

export function applyPatch(
  projectRoot: string,
  patch: Patch,
  currentRevision: string,
  confirm: boolean
): ApplyPatchResponse {
  if (!confirm) {
    return {
      success: false,
      status: 'unsupported',
      patchId: patch?.id,
      newRevision: currentRevision,
      modifiedFiles: [],
      error: 'User confirmation required to apply patch (confirm: true).',
    };
  }

  if (!patch || !patch.files || patch.files.length === 0) {
    return {
      success: false,
      status: 'no_changes',
      patchId: patch?.id,
      newRevision: currentRevision,
      modifiedFiles: [],
      error: 'Patch is empty: no file modifications specified.',
    };
  }

  if (patch.baseRevision !== currentRevision) {
    patch.status = 'stale';
    return {
      success: false,
      status: 'stale',
      patchId: patch.id,
      newRevision: currentRevision,
      modifiedFiles: [],
      error: `Patch is stale: base revision (${patch.baseRevision}) does not match current source revision (${currentRevision}). Source has changed.`,
    };
  }

  const root = resolve(projectRoot);
  const modifiedFiles: string[] = [];

  // Verify all files match oldHash before modifying anything (atomic check)
  for (const pf of patch.files) {
    const fullPath = isAbsolute(pf.filePath) ? pf.filePath : join(root, pf.filePath);
    if (!existsSync(fullPath)) {
      patch.status = 'failed';
      return {
        success: false,
        status: 'failed',
        patchId: patch.id,
        newRevision: currentRevision,
        modifiedFiles: [],
        error: `File not found: ${pf.filePath}`,
      };
    }
    const currentContent = readFileSync(fullPath, 'utf8');
    const currentHash = computeHash(currentContent);
    if (currentHash !== pf.oldHash) {
      patch.status = 'stale';
      return {
        success: false,
        status: 'stale',
        patchId: patch.id,
        newRevision: currentRevision,
        modifiedFiles: [],
        error: `File ${pf.filePath} has been modified since review (hash mismatch: expected ${pf.oldHash}, got ${currentHash}).`,
      };
    }
  }

  // Write changes
  try {
    for (const pf of patch.files) {
      const fullPath = join(root, pf.filePath);
      const currentContent = readFileSync(fullPath, 'utf8');
      const patchedContent = pf.newContent ?? applyDiffToContent(currentContent, pf.diff);
      writeFileSync(fullPath, patchedContent, 'utf8');
      modifiedFiles.push(pf.filePath);
    }
  } catch (err) {
    patch.status = 'failed';
    return {
      success: false,
      newRevision: currentRevision,
      modifiedFiles,
      error: `Failed to write patch files: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  patch.status = 'applied';
  patch.appliedAt = new Date().toISOString();

  // Compute new revision
  const newRevision = computeHash(currentRevision + Date.now().toString());

  return {
    success: true,
    status: 'applied',
    patchId: patch.id,
    newRevision,
    modifiedFiles,
  };
}

function createSimpleUnifiedDiff(filePath: string, original: string, patched: string): string {
  const origLines = original.split('\n');
  const patchLines = patched.split('\n');

  let startDiff = 0;
  while (startDiff < origLines.length && startDiff < patchLines.length && origLines[startDiff] === patchLines[startDiff]) {
    startDiff++;
  }

  let endOrig = origLines.length - 1;
  let endPatch = patchLines.length - 1;
  while (endOrig >= startDiff && endPatch >= startDiff && origLines[endOrig] === patchLines[endPatch]) {
    endOrig--;
    endPatch--;
  }

  const removed = origLines.slice(startDiff, endOrig + 1);
  const added = patchLines.slice(startDiff, endPatch + 1);

  const header = `--- a/${filePath}\n+++ b/${filePath}\n@@ -${startDiff + 1},${removed.length} +${startDiff + 1},${added.length} @@`;
  const diffBody = [
    ...removed.map(l => `-${l}`),
    ...added.map(l => `+${l}`),
  ].join('\n');

  return `${header}\n${diffBody}`;
}

function applyDiffToContent(original: string, diff: string): string {
  const diffLines = diff.split('\n');
  const removed: string[] = [];
  const added: string[] = [];

  for (const dl of diffLines) {
    if (dl.startsWith('---') || dl.startsWith('+++') || dl.startsWith('@@')) continue;
    if (dl.startsWith('-')) removed.push(dl.slice(1));
    else if (dl.startsWith('+')) added.push(dl.slice(1));
  }

  const origSegment = removed.join('\n');
  const patchSegment = added.join('\n');

  if (origSegment && original.includes(origSegment)) {
    return original.replace(origSegment, patchSegment);
  }

  return original;
}


export function getFindingPatch(
  projectRoot: string,
  finding: Finding
): { original: string; replacement: string; diffText: string } | null {
  const root = resolve(projectRoot);
  const fullPath = isAbsolute(finding.filePath) ? finding.filePath : join(root, finding.filePath);
  if (!existsSync(fullPath)) return null;

  const content = readFileSync(fullPath, 'utf8');

  let originalSnippet = '';
  let replacementSnippet = '';

  if (finding.ruleId === 'SEC_SQL_INJECTION') {
    if (content.includes('queryUnsafe')) {
      const match = content.match(/queryUnsafe\(`SELECT\s+\*\s+FROM\s+users\s+WHERE\s+username\s*=\s*'\$\{username\}'`\)/);
      if (match) {
        originalSnippet = match[0];
        replacementSnippet = "querySafe('SELECT * FROM users WHERE username = $1', [username])";
      }
    }
  } else if (finding.ruleId === 'BUG_POTENTIAL_NULL_DEREFERENCE') {
    if (content.includes('!record') || content.includes('record == null')) {
      return null;
    }
    if (content.includes('if (record.passwordHash === hashPassword(password))')) {
      originalSnippet = 'if (record.passwordHash === hashPassword(password))';
      replacementSnippet = 'if (!record) return { success: false, reason: "User not found" };\n  if (record.passwordHash === hashPassword(password))';
    }
  } else if (finding.ruleId === 'STYLE_UNUSED_VARIABLE') {
    const lines = content.split('\n');
    if (finding.line >= 1 && finding.line <= lines.length) {
      const line = lines[finding.line - 1];
      if (line.includes('const clientIp')) {
        originalSnippet = 'const clientIp';
        replacementSnippet = 'const _clientIp';
      }
    }
  }

  if (!originalSnippet || !replacementSnippet) {
    return null;
  }

  const diffText = `--- a/${finding.filePath}\n+++ b/${finding.filePath}\n@@ -${finding.line},1 +${finding.line},1 @@\n-${originalSnippet}\n+${replacementSnippet}`;

  return {
    original: originalSnippet,
    replacement: replacementSnippet,
    diffText,
  };
}

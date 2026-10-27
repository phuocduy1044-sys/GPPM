import { resolve } from 'path';
import type {
  Patch,
  ApplyRecord,
  UndoRecord,
  ReviewReport,
  ApplyPatchStatus,
} from './types.js';
import { applyPatch } from './patch.js';
import {
  createProjectSnapshot,
  restoreProjectSnapshot,
} from './snapshotService.js';
import { computePatchHash } from './candidateService.js';
import { getCurrentReport, setCurrentReport, reviewProject } from './engine.js';
import { isPathContained } from '../tools/paths.js';

export interface ApplyWithSnapshotOptions {
  projectRoot: string;
  patch: Patch;
  baseRevision: string;
  confirm: boolean;
  sessionId?: string;
  candidateId?: string;
}

export interface ApplyWithSnapshotResult {
  success: boolean;
  status: ApplyPatchStatus;
  record?: ApplyRecord;
  newReport?: ReviewReport;
  modifiedFiles?: string[];
  error?: string;
}

export interface UndoWithSnapshotOptions {
  projectRoot: string;
  applyRecordId?: string;
  patchId?: string;
  sessionId?: string;
  confirm?: boolean;
}

export interface UndoWithSnapshotResult {
  success: boolean;
  status: 'undone' | 'no_changes' | 'stale' | 'failed';
  restoredRevision?: string;
  restoredFiles?: string[];
  newReport?: ReviewReport;
  error?: string;
}

export async function applyPatchWithSnapshot(
  options: ApplyWithSnapshotOptions
): Promise<ApplyWithSnapshotResult> {
  const { projectRoot, patch, baseRevision, confirm, sessionId, candidateId } = options;
  const root = resolve(projectRoot);

  if (!confirm) {
    return {
      success: false,
      status: 'unsupported',
      error: 'Yêu cầu xác nhận (confirm: true) để áp dụng bản vá',
    };
  }

  if (!patch || !patch.files || patch.files.length === 0) {
    return {
      success: false,
      status: 'no_changes',
      error: 'Bản vá rỗng, không có thay đổi mã nguồn nào.',
    };
  }

  // Verify all files are within projectRoot
  for (const f of patch.files) {
    if (!isPathContained(f.filePath, root)) {
      return {
        success: false,
        status: 'failed',
        error: `Tệp ${f.filePath} nằm ngoài thư mục dự án`,
      };
    }
  }

  // 1. Take pre-apply snapshot of touched files
  const filePaths = patch.files.map((f) => f.filePath);
  const snapBefore = createProjectSnapshot(root, filePaths);

  // 2. Apply patch to files on disk
  const applyRes = applyPatch(root, patch, baseRevision, confirm);
  if (!applyRes.success) {
    return {
      success: false,
      status: applyRes.status || 'failed',
      error: applyRes.error,
    };
  }

  // 3. Take post-apply snapshot of touched files
  const snapAfter = createProjectSnapshot(root, filePaths);

  // 4. Re-run review to update report
  const current = getCurrentReport(sessionId, root);
  const mode = current?.analysisMode === 'ai' ? 'ai' : 'rules';
  const newReport = await reviewProject({
    projectRoot: root,
    mode,
    sessionId,
  });

  // 5. Build ApplyRecord
  const recordId = `apply-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const patchHash = computePatchHash(patch);
  const record: ApplyRecord = {
    recordId,
    patchId: patch.id,
    candidateId,
    findingIds: patch.findingIds,
    baseRevision,
    newRevision: newReport.revision,
    snapshotBeforeId: snapBefore.snapshotId,
    snapshotAfterId: snapAfter.snapshotId,
    patchHash,
    sourceHashBefore: snapBefore.sourceHash,
    sourceHashAfter: snapAfter.sourceHash,
    modifiedFiles: applyRes.modifiedFiles,
    appliedAt: new Date().toISOString(),
    status: 'applied',
  };

  // 6. Record history ledger on newReport
  newReport.applyHistory = [...(current?.applyHistory || []), record];
  newReport.undoHistory = current?.undoHistory || [];
  setCurrentReport(newReport, sessionId);

  return {
    success: true,
    status: 'applied',
    record,
    newReport,
    modifiedFiles: applyRes.modifiedFiles,
  };
}

export async function undoApplyWithSnapshot(
  options: UndoWithSnapshotOptions
): Promise<UndoWithSnapshotResult> {
  const { projectRoot, applyRecordId, patchId, sessionId, confirm = true } = options;
  const root = resolve(projectRoot);

  if (!confirm) {
    return {
      success: false,
      status: 'stale',
      error: 'Yêu cầu xác nhận (confirm: true) để hoàn tác bản vá',
    };
  }

  const current = getCurrentReport(sessionId, root);
  if (!current || !current.applyHistory || current.applyHistory.length === 0) {
    return {
      success: false,
      status: 'no_changes',
      error: 'Không tìm thấy lịch sử bản vá nào để hoàn tác',
    };
  }

  // Find target ApplyRecord
  let targetRecord: ApplyRecord | undefined;
  if (applyRecordId) {
    targetRecord = current.applyHistory.find((r) => r.recordId === applyRecordId);
  } else if (patchId) {
    targetRecord = [...current.applyHistory].reverse().find((r) => r.patchId === patchId && r.status === 'applied');
  } else {
    // Find the latest applied record
    targetRecord = [...current.applyHistory].reverse().find((r) => r.status === 'applied');
  }

  if (!targetRecord) {
    return {
      success: false,
      status: 'no_changes',
      error: 'Không tìm thấy bản vá khả dụng nào để hoàn tác',
    };
  }

  if (targetRecord.status === 'undone') {
    return {
      success: false,
      status: 'no_changes',
      error: 'Bản vá này đã được hoàn tác trước đó',
    };
  }

  // 1. Restore files from snapshotBeforeId
  try {
    const { restoredFiles } = restoreProjectSnapshot(root, targetRecord.snapshotBeforeId);

    // 2. Re-run review to update report
    const mode = current.analysisMode === 'ai' ? 'ai' : 'rules';
    const newReport = await reviewProject({
      projectRoot: root,
      mode,
      sessionId,
    });

    // 3. Mark record as undone
    targetRecord.status = 'undone';

    // 4. Create UndoRecord
    const undoRecordId = `undo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const undoRecord: UndoRecord = {
      recordId: undoRecordId,
      applyRecordId: targetRecord.recordId,
      patchId: targetRecord.patchId,
      restoredRevision: newReport.revision,
      restoredFiles,
      undoneAt: new Date().toISOString(),
    };

    newReport.applyHistory = current.applyHistory;
    newReport.undoHistory = [...(current.undoHistory || []), undoRecord];
    setCurrentReport(newReport, sessionId);

    return {
      success: true,
      status: 'undone',
      restoredRevision: newReport.revision,
      restoredFiles,
      newReport,
    };
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      error: `Lỗi khi hoàn tác bản vá: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

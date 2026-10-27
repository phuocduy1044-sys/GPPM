import { createHash } from 'crypto';
import type { Finding, Patch, Candidate } from './types.js';

export function computePatchHash(patch: Patch): string {
  const hash = createHash('sha256');
  if (patch.files) {
    for (const f of patch.files) {
      hash.update(`${f.filePath}:${f.oldHash}:${f.newHash}:${f.diff}\n`);
    }
  }
  return hash.digest('hex');
}

export function createCandidate(
  finding: Finding,
  patch: Patch,
  baseRevision: string
): Candidate {
  const candidateId = `cand-${finding.id}`;
  const patchHash = computePatchHash(patch);

  return {
    candidateId,
    findingId: finding.id,
    patchId: patch.id,
    patch,
    baseRevision,
    targetRevision: patch.newRevision,
    patchHash,
    status: 'proposed',
    createdAt: new Date().toISOString(),
  };
}

export function generateCandidates(
  findings: Finding[],
  patches: Record<string, Patch>,
  baseRevision: string
): Record<string, Candidate> {
  const candidates: Record<string, Candidate> = {};

  for (const f of findings) {
    if (f.patchId && patches[f.patchId]) {
      const patch = patches[f.patchId];
      const candidate = createCandidate(f, patch, baseRevision);
      candidates[candidate.candidateId] = candidate;
    }
  }

  return candidates;
}

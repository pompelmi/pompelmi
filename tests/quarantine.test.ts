/**
 * Tests for the Quarantine workflow module.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { QuarantineManager, FilesystemQuarantineStorage } from '../src/quarantine/index';
import type { ScanReport } from '../src/types';

function makeSuspiciousReport(): ScanReport {
  return {
    verdict: 'suspicious',
    matches: [{ rule: 'test.pdf_js', namespace: 'heuristics', tags: ['pdf', 'medium'] }],
    ok: false,
    durationMs: 42,
  };
}

function makeMaliciousReport(): ScanReport {
  return {
    verdict: 'malicious',
    matches: [{ rule: 'EICAR_Test_File', namespace: 'heuristics', tags: ['critical'] }],
    ok: false,
    durationMs: 10,
  };
}

describe('QuarantineManager (FilesystemQuarantineStorage)', () => {
  let tmpDir: string;
  let manager: QuarantineManager;
  const sampleBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pompelmi-quarantine-test-'));
    manager = new QuarantineManager({
      storage: new FilesystemQuarantineStorage({ dir: tmpDir }),
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shouldQuarantine returns true for suspicious and malicious', () => {
    expect(manager.shouldQuarantine(makeSuspiciousReport())).toBe(true);
    expect(manager.shouldQuarantine(makeMaliciousReport())).toBe(true);
    expect(manager.shouldQuarantine({ ...makeSuspiciousReport(), verdict: 'clean', ok: true, matches: [] })).toBe(false);
  });

  it('quarantines a file and creates a pending entry', async () => {
    const entry = await manager.quarantine(sampleBytes, makeSuspiciousReport(), {
      originalName: 'upload.pdf',
      sizeBytes: sampleBytes.length,
      uploadedBy: 'user-123',
    });

    expect(entry.id).toBeTruthy();
    expect(entry.status).toBe('pending');
    expect(entry.file.originalName).toBe('upload.pdf');
    expect(entry.file.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.scanReport.verdict).toBe('suspicious');
  });

  it('getEntry returns the stored entry', async () => {
    const created = await manager.quarantine(sampleBytes, makeSuspiciousReport(), {
      originalName: 'upload.pdf',
      sizeBytes: sampleBytes.length,
    });

    const retrieved = await manager.getEntry(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
  });

  it('listPending returns only pending entries', async () => {
    await manager.quarantine(sampleBytes, makeSuspiciousReport(), { originalName: 'a.pdf', sizeBytes: 4 });
    await manager.quarantine(sampleBytes, makeMaliciousReport(), { originalName: 'b.pdf', sizeBytes: 4 });

    const pending = await manager.listPending();
    expect(pending.length).toBe(2);
    expect(pending.every((e) => e.status === 'pending')).toBe(true);
  });

  it('startReview transitions entry to reviewing', async () => {
    const created = await manager.quarantine(sampleBytes, makeSuspiciousReport(), { originalName: 'a.pdf', sizeBytes: 4 });
    const reviewing = await manager.startReview(created.id, 'ops-team');
    expect(reviewing.status).toBe('reviewing');
    expect(reviewing.reviewedBy).toBe('ops-team');
  });

  it('resolve with promote transitions to promoted and bytes remain accessible', async () => {
    const created = await manager.quarantine(sampleBytes, makeSuspiciousReport(), { originalName: 'a.pdf', sizeBytes: 4 });
    const resolved = await manager.resolve(created.id, {
      decision: 'promote',
      reviewedBy: 'admin',
      reviewNote: 'False positive',
    });

    expect(resolved.status).toBe('promoted');
    expect(resolved.reviewNote).toBe('False positive');
    expect(resolved.resolvedAt).toBeTruthy();

    const bytes = await manager.getFile(created.id);
    expect(bytes).not.toBeNull();
    expect(bytes!).toEqual(sampleBytes);
  });

  it('resolve with delete transitions to deleted and removes bytes', async () => {
    const created = await manager.quarantine(sampleBytes, makeMaliciousReport(), { originalName: 'eicar.txt', sizeBytes: 4 });
    const resolved = await manager.resolve(created.id, {
      decision: 'delete',
      reviewedBy: 'admin',
      reviewNote: 'Confirmed malware',
    });

    expect(resolved.status).toBe('deleted');

    const bytes = await manager.getFile(created.id);
    expect(bytes).toBeNull();
  });

  it('resolve throws if already resolved', async () => {
    const created = await manager.quarantine(sampleBytes, makeSuspiciousReport(), { originalName: 'a.pdf', sizeBytes: 4 });
    await manager.resolve(created.id, { decision: 'delete' });
    await expect(manager.resolve(created.id, { decision: 'delete' })).rejects.toThrow('already resolved');
  });

  it('report returns correct counts', async () => {
    const e1 = await manager.quarantine(sampleBytes, makeSuspiciousReport(), { originalName: 'a.pdf', sizeBytes: 4 });
    await manager.quarantine(sampleBytes, makeMaliciousReport(), { originalName: 'b.pdf', sizeBytes: 4 });
    await manager.resolve(e1.id, { decision: 'promote' });

    const report = await manager.report();
    expect(report.totalEntries).toBe(2);
    expect(report.byStatus.promoted).toBe(1);
    expect(report.byStatus.pending).toBe(1);
    expect(report.generatedAt).toBeTruthy();
  });
});

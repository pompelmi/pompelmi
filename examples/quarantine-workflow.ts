/**
 * Quarantine workflow example for Pompelmi.
 *
 * Demonstrates: scan → quarantine suspicious files → review → promote or delete.
 *
 * Run with:
 *   npx tsx examples/quarantine-workflow.ts
 */

import { scanBytes } from 'pompelmi';
import { QuarantineManager, FilesystemQuarantineStorage } from 'pompelmi/quarantine';
import { AuditTrail } from 'pompelmi/audit';
import { createScanHooks, withHooks } from 'pompelmi/hooks';
import * as path from 'path';

// ── Setup ─────────────────────────────────────────────────────────────────────

const quarantine = new QuarantineManager({
  storage: new FilesystemQuarantineStorage({
    dir: path.join(process.cwd(), 'tmp-quarantine'),
  }),
});

const audit = new AuditTrail({
  output: { dest: 'console' },
  pretty: false,
});

const hooks = createScanHooks({
  onScanComplete(ctx, report) {
    console.log(`[scan] ${ctx.filename ?? '?'} → ${report.verdict} (${report.durationMs ?? 0}ms)`);
  },
  onThreatDetected(ctx, report) {
    console.warn(`[threat] ${ctx.filename ?? '?'} — ${report.verdict}, ${report.matches.length} match(es)`);
    audit.logScanComplete(report, { filename: ctx.filename });
  },
});

// Wrap scanBytes once; use `scan` everywhere in this app.
const scan = withHooks(scanBytes, hooks);

// ── Simulated upload ──────────────────────────────────────────────────────────

// Use a minimal EICAR-like payload (not a real EICAR, safe to commit)
// In real use, pass file bytes from multer/formidable/etc.
const suspiciousPayload = Buffer.from(
  '%PDF-1.7\nobj << /OpenAction (javascript:alert(1)) >> endobj\n%%EOF',
);

async function handleUpload(filename: string, bytes: Uint8Array, userId?: string) {
  const report = await scan(bytes, { ctx: { filename } });

  if (report.verdict !== 'clean') {
    const entry = await quarantine.quarantine(bytes, report, {
      originalName: filename,
      sizeBytes: bytes.length,
      uploadedBy: userId,
    });
    audit.logQuarantine(entry);
    console.log(`[quarantine] ${filename} → entry id: ${entry.id}`);
    return { status: 'quarantined', quarantineId: entry.id };
  }

  console.log(`[upload] ${filename} accepted`);
  return { status: 'accepted' };
}

// ── Simulated review ──────────────────────────────────────────────────────────

async function runReview(quarantineId: string) {
  const entry = await quarantine.startReview(quarantineId, 'ops-team');
  console.log(`[review] ${entry.file.originalName} — reviewing`);

  // Operator decision: delete (it's real malware)
  const resolved = await quarantine.resolve(quarantineId, {
    decision: 'delete',
    reviewedBy: 'ops-team',
    reviewNote: 'Confirmed: PDF with embedded JavaScript action',
  });
  audit.logQuarantineResolved(resolved);
  console.log(`[resolved] ${resolved.file.originalName} → ${resolved.status}`);
}

// ── Run the demo ──────────────────────────────────────────────────────────────

const result = await handleUpload('document.pdf', new Uint8Array(suspiciousPayload), 'user-42');
if (result.status === 'quarantined') {
  await runReview(result.quarantineId!);
}

// Summary report
const report = await quarantine.report();
console.log('\n[report]', JSON.stringify(report.byStatus, null, 2));

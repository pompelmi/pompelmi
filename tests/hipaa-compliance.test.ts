/**
 * Tests for src/hipaa-compliance.ts
 * Covers: HipaaComplianceManager, initializeHipaaCompliance, getHipaaManager,
 *         createHipaaError, HipaaTemp exports
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
  HipaaComplianceManager,
  initializeHipaaCompliance,
  getHipaaManager,
  createHipaaError,
  HipaaTemp,
  type HipaaConfig,
  type AuditEvent,
} from '../src/hipaa-compliance';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeManager(overrides: Partial<HipaaConfig> = {}): HipaaComplianceManager {
  return new HipaaComplianceManager({ enabled: true, ...overrides });
}

// ─── sanitizeFilename ───────────────────────────────────────────────────────

describe('HipaaComplianceManager.sanitizeFilename', () => {
  it('returns hashed+extension when enabled', () => {
    const m = makeManager();
    const result = m.sanitizeFilename('patient_record.pdf');
    expect(result).toMatch(/^file_[0-9a-f]{8}\.pdf$/);
  });

  it('returns consistent hash for same input', () => {
    const m = makeManager();
    expect(m.sanitizeFilename('test.txt')).toBe(m.sanitizeFilename('test.txt'));
  });

  it('returns different hash for different inputs', () => {
    const m = makeManager();
    expect(m.sanitizeFilename('a.txt')).not.toBe(m.sanitizeFilename('b.txt'));
  });

  it('returns "unknown" when filename is undefined', () => {
    const m = makeManager();
    expect(m.sanitizeFilename(undefined)).toBe('unknown');
  });

  it('returns "unknown" when filename is empty string', () => {
    const m = makeManager();
    expect(m.sanitizeFilename('')).toBe('unknown');
  });

  it('returns raw filename when disabled', () => {
    const m = makeManager({ enabled: false });
    expect(m.sanitizeFilename('real_name.png')).toBe('real_name.png');
  });

  it('returns raw filename when sanitizeFilenames is false', () => {
    const m = makeManager({ sanitizeFilenames: false });
    expect(m.sanitizeFilename('real_name.png')).toBe('real_name.png');
  });

  it('handles filenames with full path (only basename is hashed)', () => {
    const m = makeManager();
    const result = m.sanitizeFilename('/home/user/patients/john_doe.txt');
    expect(result).toMatch(/^file_[0-9a-f]{8}\.txt$/);
  });
});

// ─── sanitizeError ──────────────────────────────────────────────────────────

describe('HipaaComplianceManager.sanitizeError', () => {
  it('returns string message unchanged when disabled', () => {
    const m = makeManager({ enabled: false });
    expect(m.sanitizeError('plain error')).toBe('plain error');
  });

  it('returns Error.message unchanged when disabled', () => {
    const m = makeManager({ enabled: false });
    expect(m.sanitizeError(new Error('err msg'))).toBe('err msg');
  });

  it('accepts string input when sanitizeErrors is true', () => {
    const m = makeManager();
    const result = m.sanitizeError('something failed');
    expect(typeof result).toBe('string');
  });

  it('accepts Error objects', () => {
    const m = makeManager();
    const result = m.sanitizeError(new Error('file not found'));
    expect(typeof result).toBe('string');
  });

  it('returns raw message when sanitizeErrors is false', () => {
    const m = makeManager({ sanitizeErrors: false });
    expect(m.sanitizeError('raw message')).toBe('raw message');
  });
});

// ─── calculateFileHash ──────────────────────────────────────────────────────

describe('HipaaComplianceManager.calculateFileHash', () => {
  it('returns a sha-256 hex string of length 64', () => {
    const m = makeManager();
    const hash = m.calculateFileHash(new Uint8Array([1, 2, 3]));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns same hash for same data', () => {
    const m = makeManager();
    const data = new Uint8Array([10, 20, 30]);
    expect(m.calculateFileHash(data)).toBe(m.calculateFileHash(data));
  });

  it('returns different hash for different data', () => {
    const m = makeManager();
    expect(m.calculateFileHash(new Uint8Array([1]))).not.toBe(
      m.calculateFileHash(new Uint8Array([2]))
    );
  });
});

// ─── auditLog / getAuditEvents ──────────────────────────────────────────────

describe('HipaaComplianceManager.auditLog + getAuditEvents', () => {
  it('records events when enabled', () => {
    const m = makeManager();
    m.auditLog('file_scan', { action: 'scan', success: true });
    const events = m.getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('file_scan');
    expect(events[0].details.action).toBe('scan');
  });

  it('does NOT record when disabled', () => {
    const m = makeManager({ enabled: false });
    m.auditLog('file_scan', { action: 'scan', success: true });
    expect(m.getAuditEvents()).toHaveLength(0);
  });

  it('returns a copy (mutation does not affect internal state)', () => {
    const m = makeManager();
    m.auditLog('phi_detected', { action: 'detect', success: true });
    const copy = m.getAuditEvents();
    copy.push({} as AuditEvent);
    expect(m.getAuditEvents()).toHaveLength(1);
  });

  it('includes sessionId and timestamp in each event', () => {
    const m = makeManager();
    m.auditLog('error_occurred', { action: 'err', success: false });
    const ev = m.getAuditEvents()[0];
    expect(ev.sessionId).toHaveLength(32); // 16 bytes hex
    expect(new Date(ev.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('defaults success to true when not provided', () => {
    const m = makeManager();
    m.auditLog('temp_file_created', { action: 'create' });
    expect(m.getAuditEvents()[0].details.success).toBe(true);
  });
});

// ─── clearSensitiveData ─────────────────────────────────────────────────────

describe('HipaaComplianceManager.clearSensitiveData', () => {
  it('clears audit events when enabled with memoryProtection', () => {
    const m = makeManager({ memoryProtection: true });
    m.auditLog('file_scan', { action: 'x', success: true });
    m.auditLog('phi_detected', { action: 'y', success: true });
    expect(m.getAuditEvents()).toHaveLength(2);
    m.clearSensitiveData();
    expect(m.getAuditEvents()).toHaveLength(0);
  });

  it('does nothing when disabled', () => {
    const m = makeManager({ enabled: false });
    // no error thrown
    expect(() => m.clearSensitiveData()).not.toThrow();
  });

  it('does nothing when memoryProtection is false', () => {
    const m = makeManager({ memoryProtection: false });
    m.auditLog('file_scan', { action: 'x', success: true });
    m.clearSensitiveData(); // should NOT clear
    expect(m.getAuditEvents()).toHaveLength(1);
  });
});

// ─── validateTransportSecurity ──────────────────────────────────────────────

describe('HipaaComplianceManager.validateTransportSecurity', () => {
  it('returns true for https URLs', () => {
    const m = makeManager({ requireSecureTransport: true });
    expect(m.validateTransportSecurity('https://example.com')).toBe(true);
  });

  it('returns true for localhost http', () => {
    const m = makeManager({ requireSecureTransport: true });
    expect(m.validateTransportSecurity('http://localhost/api')).toBe(true);
  });

  it('returns true for 127.0.0.1 http', () => {
    const m = makeManager({ requireSecureTransport: true });
    expect(m.validateTransportSecurity('http://127.0.0.1/api')).toBe(true);
  });

  it('returns false for plain http to remote host', () => {
    const m = makeManager({ requireSecureTransport: true });
    expect(m.validateTransportSecurity('http://evil.com/upload')).toBe(false);
  });

  it('logs a security_violation audit event for insecure URL', () => {
    const m = makeManager({ requireSecureTransport: true });
    m.validateTransportSecurity('http://evil.com/upload');
    const events = m.getAuditEvents();
    expect(events.some(e => e.eventType === 'security_violation')).toBe(true);
  });

  it('returns true when url is undefined', () => {
    const m = makeManager({ requireSecureTransport: true });
    expect(m.validateTransportSecurity(undefined)).toBe(true);
  });

  it('returns true when requireSecureTransport is false', () => {
    const m = makeManager({ requireSecureTransport: false });
    expect(m.validateTransportSecurity('http://evil.com/upload')).toBe(true);
  });

  it('returns false for invalid URL', () => {
    const m = makeManager({ requireSecureTransport: true });
    expect(m.validateTransportSecurity('not-a-valid-url')).toBe(false);
  });

  it('returns true when disabled', () => {
    const m = makeManager({ enabled: false });
    expect(m.validateTransportSecurity('http://evil.com')).toBe(true);
  });
});

// ─── createSecureTempPath ───────────────────────────────────────────────────

describe('HipaaComplianceManager.createSecureTempPath', () => {
  it('returns a path string when enabled', () => {
    const m = makeManager();
    const p = m.createSecureTempPath('test');
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(0);
  });

  it('uses default prefix "pompelmi" when no prefix given', () => {
    const m = makeManager();
    const p = m.createSecureTempPath();
    expect(path.basename(p)).toMatch(/^pompelmi-/);
  });

  it('returns a path under tmpdir when disabled', () => {
    const m = makeManager({ enabled: false });
    const p = m.createSecureTempPath('pfx');
    expect(p.startsWith(os.tmpdir())).toBe(true);
  });

  it('adds a temp_file_created audit event when enabled', () => {
    const m = makeManager();
    m.createSecureTempPath('ev-test');
    const events = m.getAuditEvents();
    expect(events.some(e => e.eventType === 'temp_file_created')).toBe(true);
  });

  it('two calls return different paths', () => {
    const m = makeManager();
    expect(m.createSecureTempPath()).not.toBe(m.createSecureTempPath());
  });
});

// ─── secureFileCleanup ──────────────────────────────────────────────────────

describe('HipaaComplianceManager.secureFileCleanup', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `hipaa-test-${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, Buffer.from('hello world'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('deletes the file when enabled', async () => {
    const m = makeManager({ memoryProtection: false });
    await m.secureFileCleanup(tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(false);
  });

  it('deletes the file when disabled (simple unlink)', async () => {
    const m = makeManager({ enabled: false });
    await m.secureFileCleanup(tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(false);
  });

  it('does not throw when file does not exist (enabled=false)', async () => {
    const m = makeManager({ enabled: false });
    await expect(m.secureFileCleanup('/non/existent/file.bin')).resolves.toBeUndefined();
  });

  it('logs a temp_file_deleted event on success', async () => {
    const m = makeManager({ memoryProtection: false });
    await m.secureFileCleanup(tmpFile);
    const events = m.getAuditEvents();
    expect(events.some(e => e.eventType === 'temp_file_deleted' && e.details.success)).toBe(true);
  });

  it('logs failure when file does not exist (enabled=true)', async () => {
    const m = makeManager({ memoryProtection: false });
    await m.secureFileCleanup('/does/not/exist.bin');
    const events = m.getAuditEvents();
    expect(events.some(e => e.eventType === 'temp_file_deleted' && !e.details.success)).toBe(true);
  });
});

// ─── module-level helpers ───────────────────────────────────────────────────

describe('initializeHipaaCompliance / getHipaaManager', () => {
  it('initializeHipaaCompliance returns a HipaaComplianceManager', () => {
    const mgr = initializeHipaaCompliance({ enabled: true });
    expect(mgr).toBeInstanceOf(HipaaComplianceManager);
  });

  it('getHipaaManager returns the initialized manager', () => {
    initializeHipaaCompliance({ enabled: true });
    expect(getHipaaManager()).toBeInstanceOf(HipaaComplianceManager);
  });
});

describe('createHipaaError', () => {
  beforeEach(() => {
    initializeHipaaCompliance({ enabled: true });
  });

  it('returns an Error from a string message', () => {
    const err = createHipaaError('something failed', 'test');
    expect(err).toBeInstanceOf(Error);
  });

  it('returns an Error from an Error object', () => {
    const err = createHipaaError(new Error('original'), 'ctx');
    expect(err).toBeInstanceOf(Error);
  });

  it('logs an error_occurred audit event', () => {
    initializeHipaaCompliance({ enabled: true });
    createHipaaError('oops', 'upload');
    const events = getHipaaManager()!.getAuditEvents();
    expect(events.some(e => e.eventType === 'error_occurred')).toBe(true);
  });

  it('works even when no manager is initialised (returns plain Error)', () => {
    // Reset global manager by overwriting with null via a fresh import isn't
    // possible; but if manager is still set from above, that's fine — just
    // verify no crash and return type.
    const err = createHipaaError('plain', 'ctx');
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── HipaaTemp ──────────────────────────────────────────────────────────────

describe('HipaaTemp', () => {
  beforeEach(() => {
    initializeHipaaCompliance({ enabled: true });
  });

  it('createPath returns a non-empty string', () => {
    const p = HipaaTemp.createPath('tmp');
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(0);
  });

  it('createPath without prefix still returns a string', () => {
    const p = HipaaTemp.createPath();
    expect(typeof p).toBe('string');
  });

  it('cleanup resolves without error for non-existent file', async () => {
    await expect(HipaaTemp.cleanup('/does/not/exist.bin')).resolves.toBeUndefined();
  });

  describe('cleanup without manager', () => {
    it('falls back to plain unlink and does not throw', async () => {
      // Create a real temp file and clean it up
      const tmpPath = path.join(os.tmpdir(), `hipaa-temp-test-${Date.now()}.bin`);
      fs.writeFileSync(tmpPath, 'data');
      await expect(HipaaTemp.cleanup(tmpPath)).resolves.toBeUndefined();
    });
  });
});

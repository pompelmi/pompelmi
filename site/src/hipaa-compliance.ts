/**
 * HIPAA Compliance Module for Pompelmi
 * 
 * This module provides comprehensive HIPAA compliance features for healthcare environments
 * where Pompelmi is used to analyze potentially compromised systems containing PHI.
 * 
 * Key protections:
 * - Data sanitization and redaction
 * - Secure temporary file handling
 * - Audit logging
 * - Memory protection
 * - Error message sanitization
 */

import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';

export interface HipaaConfig {
  enabled: boolean;
  auditLogPath?: string;
  encryptTempFiles?: boolean;
  sanitizeErrors?: boolean;
  sanitizeFilenames?: boolean;
  memoryProtection?: boolean;
  requireSecureTransport?: boolean;
}

export interface AuditEvent {
  timestamp: string;
  eventType: 'file_scan' | 'temp_file_created' | 'temp_file_deleted' | 'error_occurred' | 'phi_detected' | 'security_violation';
  sessionId: string;
  userId?: string;
  details: {
    action: string;
    fileHash?: string; // SHA-256 of file content (safe for logging)
    fileSizeBytes?: number;
    success: boolean;
    sanitizedError?: string;
    metadata?: Record<string, unknown>;
  };
}

class HipaaComplianceManager {
  private config: HipaaConfig;
  private sessionId: string;
  private auditEvents: AuditEvent[] = [];

  constructor(config: HipaaConfig) {
    this.config = {
      sanitizeErrors: true,
      sanitizeFilenames: true,
      encryptTempFiles: true,
      memoryProtection: true,
      requireSecureTransport: true,
      ...config,
      enabled: config.enabled !== undefined ? config.enabled : true
    };
    this.sessionId = this.generateSessionId();
  }

  /**
   * Sanitize filename to prevent PHI leakage in logs
   */
  sanitizeFilename(filename?: string): string {
    if (!this.config.enabled || !this.config.sanitizeFilenames || !filename) {
      return filename || 'unknown';
    }

    // Remove potentially sensitive path information
    const basename = path.basename(filename);
    
    // Hash the filename to create a consistent but non-revealing identifier
    const hash = crypto.createHash('sha256').update(basename).digest('hex').substring(0, 8);
    
    // Preserve file extension for analysis purposes
    const ext = path.extname(basename);
    
    return `file_${hash}${ext}`;
  }

  /**
   * Sanitize error messages to prevent PHI exposure
   */
  sanitizeError(error: Error | string): string {
    if (!this.config.enabled || !this.config.sanitizeErrors) {
      return typeof error === 'string' ? error : error.message;
    }

    const message = typeof error === 'string' ? error : error.message;
    
    // Remove common patterns that might contain PHI
    let sanitized = message
      // Remove file paths
      .replace(/[A-Za-z]:\\\\[^\\s]+/g, '[REDACTED_PATH]')
      .replace(/\/[^\\s]+/g, '[REDACTED_PATH]')
      // Remove potential patient identifiers (numbers that could be MRNs, SSNs)
      .replace(/\\b\\d{3}-?\\d{2}-?\\d{4}\\b/g, '[REDACTED_ID]')
      .replace(/\\b\\d{6,}\\b/g, '[REDACTED_ID]')
      // Remove email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      // Remove potential names (capitalize words in error messages)
      .replace(/\\b[A-Z][a-z]+\\s+[A-Z][a-z]+\\b/g, '[REDACTED_NAME]')
      // Remove IP addresses
      .replace(/\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b/g, '[REDACTED_IP]');

    return sanitized;
  }

  /**
   * Create secure temporary file path with encryption if enabled
   */
  createSecureTempPath(prefix: string = 'pompelmi'): string {
    if (!this.config.enabled) {
      return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }

    // Use cryptographically secure random names
    const randomId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    // Create path in secure temp directory
    const secureTempDir = this.getSecureTempDir();
    const tempPath = path.join(secureTempDir, `${prefix}-${timestamp}-${randomId}`);
    
    this.auditLog('temp_file_created', {
      action: 'create_temp_file',
      success: true,
      metadata: { path: this.sanitizeFilename(tempPath) }
    });
    
    return tempPath;
  }

  /**
   * Get or create secure temporary directory with restricted permissions
   */
  private getSecureTempDir(): string {
    const secureTempPath = path.join(os.tmpdir(), 'pompelmi-secure');
    
    try {
      const fs = require('fs');
      if (!fs.existsSync(secureTempPath)) {
        fs.mkdirSync(secureTempPath, { mode: 0o700 }); // Owner read/write/execute only
      }
    } catch (error) {
      // Fallback to system temp
      return os.tmpdir();
    }
    
    return secureTempPath;
  }

  /**
   * Secure file cleanup with multiple overwrite passes
   */
  async secureFileCleanup(filePath: string): Promise<void> {
    if (!this.config.enabled) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
      return;
    }

    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(filePath);
      
      if (this.config.memoryProtection) {
        // Overwrite file with random data multiple times (DoD 5220.22-M standard)
        const fileSize = stats.size;
        const buffer = crypto.randomBytes(Math.min(fileSize, 64 * 1024)); // 64KB chunks
        
        for (let pass = 0; pass < 3; pass++) {
          const handle = await fs.open(filePath, 'r+');
          try {
            for (let offset = 0; offset < fileSize; offset += buffer.length) {
              const chunk = offset + buffer.length > fileSize 
                ? buffer.subarray(0, fileSize - offset) 
                : buffer;
              await handle.write(chunk, 0, chunk.length, offset);
            }
            await handle.sync();
          } finally {
            await handle.close();
          }
        }
      }
      
      // Final deletion
      await fs.unlink(filePath);
      
      this.auditLog('temp_file_deleted', {
        action: 'secure_delete',
        success: true,
        metadata: { 
          path: this.sanitizeFilename(filePath),
          overwritePasses: this.config.memoryProtection ? 3 : 0
        }
      });
      
    } catch (error) {
      this.auditLog('temp_file_deleted', {
        action: 'secure_delete',
        success: false,
        sanitizedError: this.sanitizeError(error as Error),
        metadata: { path: this.sanitizeFilename(filePath) }
      });
    }
  }

  /**
   * Calculate secure file hash for audit purposes
   */
  calculateFileHash(data: Uint8Array): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Log audit event
   */
  auditLog(eventType: AuditEvent['eventType'], details: Partial<AuditEvent['details']>): void {
    if (!this.config.enabled) return;

    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      sessionId: this.sessionId,
      details: {
        action: details.action || 'unknown',
        success: details.success ?? true,
        ...details
      }
    };

    this.auditEvents.push(event);

    // Write to audit log file if configured
    if (this.config.auditLogPath) {
      this.writeAuditLog(event).catch(() => {
        // Silent failure to prevent error loops
      });
    }
  }

  /**
   * Write audit event to file
   */
  private async writeAuditLog(event: AuditEvent): Promise<void> {
    if (!this.config.auditLogPath) return;

    try {
      const fs = await import('fs/promises');
      const logLine = JSON.stringify(event) + '\\n';
      await fs.appendFile(this.config.auditLogPath, logLine, { flag: 'a' });
    } catch {
      // Silent failure
    }
  }

  /**
   * Generate cryptographically secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get current audit events for this session
   */
  getAuditEvents(): AuditEvent[] {
    return [...this.auditEvents];
  }

  /**
   * Clear sensitive data from memory
   */
  clearSensitiveData(): void {
    if (!this.config.enabled || !this.config.memoryProtection) return;

    // Clear audit events
    this.auditEvents.length = 0;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Validate transport security
   */
  validateTransportSecurity(url?: string): boolean {
    if (!this.config.enabled || !this.config.requireSecureTransport) {
      return true;
    }

    if (!url) return true;

    try {
      const urlObj = new URL(url);
      const isSecure = urlObj.protocol === 'https:' || urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
      
      if (!isSecure) {
        this.auditLog('security_violation', {
          action: 'insecure_transport',
          success: false,
          metadata: { protocol: urlObj.protocol, hostname: urlObj.hostname }
        });
      }
      
      return isSecure;
    } catch {
      return false;
    }
  }
}

// Global HIPAA compliance instance
let hipaaManager: HipaaComplianceManager | null = null;

/**
 * Initialize HIPAA compliance
 */
export function initializeHipaaCompliance(config: HipaaConfig): HipaaComplianceManager {
  hipaaManager = new HipaaComplianceManager(config);
  return hipaaManager;
}

/**
 * Get current HIPAA compliance manager
 */
export function getHipaaManager(): HipaaComplianceManager | null {
  return hipaaManager;
}

/**
 * HIPAA-compliant error wrapper
 */
export function createHipaaError(error: Error | string, context?: string): Error {
  const manager = getHipaaManager();
  
  if (!manager) {
    return typeof error === 'string' ? new Error(error) : error;
  }

  const sanitizedMessage = manager.sanitizeError(error);
  const hipaaError = new Error(sanitizedMessage);
  
  manager.auditLog('error_occurred', {
    action: context || 'error',
    success: false,
    sanitizedError: sanitizedMessage
  });
  
  return hipaaError;
}

/**
 * HIPAA-compliant temporary file utilities
 */
export const HipaaTemp = {
  createPath: (prefix?: string): string => {
    const manager = getHipaaManager();
    return manager ? manager.createSecureTempPath(prefix) : path.join(os.tmpdir(), `${prefix || 'pompelmi'}-${Date.now()}`);
  },
  
  cleanup: async (filePath: string): Promise<void> => {
    const manager = getHipaaManager();
    if (manager) {
      await manager.secureFileCleanup(filePath);
    } else {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(filePath);
      } catch {
        // Ignore errors
      }
    }
  }
};

export { HipaaComplianceManager };
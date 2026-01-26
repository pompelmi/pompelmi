/**
 * Standardized reason codes for scan results
 * 
 * These codes enable automated decision-making and monitoring.
 */

/**
 * Finding with reason code
 */
export interface Finding {
  /** Human-readable description */
  message: string;
  /** Standardized reason code */
  reasonCode: ReasonCode;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Reason codes for scan verdicts
 */
export enum ReasonCode {
  // Malware detection
  MALWARE_SIGNATURE_MATCH = 'MALWARE_SIGNATURE_MATCH',
  MALWARE_YARA_MATCH = 'MALWARE_YARA_MATCH',
  MALWARE_CLAMAV_MATCH = 'MALWARE_CLAMAV_MATCH',
  MALWARE_EICAR_TEST = 'MALWARE_EICAR_TEST',
  
  // Archive-related
  ARCHIVE_TOO_DEEP = 'ARCHIVE_TOO_DEEP',
  ARCHIVE_TOO_MANY_FILES = 'ARCHIVE_TOO_MANY_FILES',
  ARCHIVE_BOMB_DETECTED = 'ARCHIVE_BOMB_DETECTED',
  ARCHIVE_PATH_TRAVERSAL = 'ARCHIVE_PATH_TRAVERSAL',
  
  // File characteristics
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_POLYGLOT = 'FILE_POLYGLOT',
  FILE_EMBEDDED_SCRIPT = 'FILE_EMBEDDED_SCRIPT',
  FILE_EXECUTABLE = 'FILE_EXECUTABLE',
  FILE_MACRO_DETECTED = 'FILE_MACRO_DETECTED',
  
  // MIME and format
  MIME_NOT_ALLOWED = 'MIME_NOT_ALLOWED',
  MIME_MISMATCH = 'MIME_MISMATCH',
  
  // Operational
  SCAN_TIMEOUT = 'SCAN_TIMEOUT',
  SCAN_ERROR = 'SCAN_ERROR',
  
  // Heuristic
  HEURISTIC_SUSPICIOUS = 'HEURISTIC_SUSPICIOUS',
  HEURISTIC_THRESHOLD_EXCEEDED = 'HEURISTIC_THRESHOLD_EXCEEDED',
  
  // Clean
  CLEAN = 'CLEAN',
}

/**
 * Reason code metadata
 */
export interface ReasonCodeInfo {
  code: ReasonCode;
  description: string;
  severity: 'clean' | 'suspicious' | 'malicious';
  actionable: boolean;
}

/**
 * Metadata for all reason codes
 */
export const REASON_CODE_METADATA: Record<ReasonCode, Omit<ReasonCodeInfo, 'code'>> = {
  [ReasonCode.MALWARE_SIGNATURE_MATCH]: {
    description: 'File matches a known malware signature',
    severity: 'malicious',
    actionable: true,
  },
  [ReasonCode.MALWARE_YARA_MATCH]: {
    description: 'File matches a YARA rule',
    severity: 'malicious',
    actionable: true,
  },
  [ReasonCode.MALWARE_CLAMAV_MATCH]: {
    description: 'File matches a ClamAV signature',
    severity: 'malicious',
    actionable: true,
  },
  [ReasonCode.MALWARE_EICAR_TEST]: {
    description: 'EICAR test file detected (safe test pattern)',
    severity: 'malicious',
    actionable: true,
  },
  [ReasonCode.ARCHIVE_TOO_DEEP]: {
    description: 'Archive nesting exceeds maximum depth limit',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.ARCHIVE_TOO_MANY_FILES]: {
    description: 'Archive contains too many files',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.ARCHIVE_BOMB_DETECTED]: {
    description: 'Archive exhibits ZIP bomb characteristics',
    severity: 'malicious',
    actionable: true,
  },
  [ReasonCode.ARCHIVE_PATH_TRAVERSAL]: {
    description: 'Archive contains path traversal attempts',
    severity: 'malicious',
    actionable: true,
  },
  [ReasonCode.FILE_TOO_LARGE]: {
    description: 'File size exceeds configured limits',
    severity: 'suspicious',
    actionable: false,
  },
  [ReasonCode.FILE_POLYGLOT]: {
    description: 'File exhibits multiple format signatures (polyglot)',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.FILE_EMBEDDED_SCRIPT]: {
    description: 'File contains embedded scripts or code',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.FILE_EXECUTABLE]: {
    description: 'File is an executable format',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.FILE_MACRO_DETECTED]: {
    description: 'Document contains macros',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.MIME_NOT_ALLOWED]: {
    description: 'MIME type not in allowed list',
    severity: 'suspicious',
    actionable: false,
  },
  [ReasonCode.MIME_MISMATCH]: {
    description: 'Declared MIME type does not match file content',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.SCAN_TIMEOUT]: {
    description: 'Scan operation exceeded time limit',
    severity: 'suspicious',
    actionable: false,
  },
  [ReasonCode.SCAN_ERROR]: {
    description: 'Error occurred during scanning',
    severity: 'suspicious',
    actionable: false,
  },
  [ReasonCode.HEURISTIC_SUSPICIOUS]: {
    description: 'Heuristic analysis flagged file as suspicious',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.HEURISTIC_THRESHOLD_EXCEEDED]: {
    description: 'Heuristic score exceeded configured threshold',
    severity: 'suspicious',
    actionable: true,
  },
  [ReasonCode.CLEAN]: {
    description: 'No threats detected',
    severity: 'clean',
    actionable: false,
  },
};

/**
 * Get information about a reason code
 */
export function getReasonCodeInfo(code: ReasonCode): ReasonCodeInfo {
  const meta = REASON_CODE_METADATA[code];
  return { code, ...meta };
}

/**
 * Infer reason code from finding text (backward compatibility helper)
 */
export function inferReasonCode(finding: string): ReasonCode {
  const lower = finding.toLowerCase();
  
  if (lower.includes('eicar')) return ReasonCode.MALWARE_EICAR_TEST;
  if (lower.includes('yara')) return ReasonCode.MALWARE_YARA_MATCH;
  if (lower.includes('clamav')) return ReasonCode.MALWARE_CLAMAV_MATCH;
  if (lower.includes('polyglot')) return ReasonCode.FILE_POLYGLOT;
  if (lower.includes('embedded') && lower.includes('script')) return ReasonCode.FILE_EMBEDDED_SCRIPT;
  if (lower.includes('executable')) return ReasonCode.FILE_EXECUTABLE;
  if (lower.includes('macro')) return ReasonCode.FILE_MACRO_DETECTED;
  if (lower.includes('zip bomb') || lower.includes('archive bomb')) return ReasonCode.ARCHIVE_BOMB_DETECTED;
  if (lower.includes('path traversal') || lower.includes('traversal')) return ReasonCode.ARCHIVE_PATH_TRAVERSAL;
  if (lower.includes('too deep') || lower.includes('depth')) return ReasonCode.ARCHIVE_TOO_DEEP;
  if (lower.includes('too many files')) return ReasonCode.ARCHIVE_TOO_MANY_FILES;
  if (lower.includes('timeout')) return ReasonCode.SCAN_TIMEOUT;
  if (lower.includes('heuristic')) return ReasonCode.HEURISTIC_SUSPICIOUS;
  
  return ReasonCode.HEURISTIC_SUSPICIOUS;
}

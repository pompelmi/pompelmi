import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';

// Node.js globals - declared to avoid @types/node dependency
declare const process: {
  env: Record<string, string | undefined>;
};

interface BufferType {
  from(data: Uint8Array): BufferType;
}

declare const Buffer: BufferType;

// HIPAA Compliance utilities (local implementation)
interface HipaaUtilities {
  sanitizeFilename(filename?: string): string;
  sanitizeError(error: Error | string): string;
  createSecureTempPath(prefix?: string): string;
  secureCleanup(filePath: string): Promise<void>;
  auditLog(eventType: string, details: any): void;
}

// Define types locally since we can't import from main package yet
export type AnalysisDepth = 'minimal' | 'basic' | 'deep';
export type DecompilationEngine = 'binaryninja-hlil' | 'ghidra-pcode';

export interface DecompilationMatch {
  rule: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  engine: DecompilationEngine;
  confidence: number;
  meta?: {
    function?: string;
    address?: string;
    instruction?: string;
    pattern?: string;
    [key: string]: unknown;
  };
}

export interface FunctionAnalysis {
  name: string;
  address: string;
  size: number;
  complexity?: number;
  callCount?: number;
  isObfuscated?: boolean;
  hasAntiAnalysis?: boolean;
  suspiciousCalls?: string[];
}

export interface DecompilationResult {
  engine: DecompilationEngine;
  success: boolean;
  functions: FunctionAnalysis[];
  matches: DecompilationMatch[];
  meta?: {
    analysisTime?: number;
    binaryFormat?: string;
    architecture?: string;
    [key: string]: unknown;
  };
}

export interface DecompilationScanner {
  scan(bytes: Uint8Array): Promise<DecompilationMatch[]>;
  analyze?(bytes: Uint8Array): Promise<DecompilationResult>;
}

export interface BinaryNinjaOptions {
  timeout?: number;
  depth?: AnalysisDepth;
  enableHeuristics?: boolean;
  pythonPath?: string;
  binaryNinjaPath?: string;
}

const pexec = promisify(execFile);

interface BinaryNinjaAnalysisResult {
  success: boolean;
  error?: string;
  engine?: string;
  functions?: any[];
  matches?: any[];
  meta?: {
    analysisTime?: number;
    binaryFormat?: string;
    architecture?: string;
    functionCount?: number;
  };
}

export class BinaryNinjaScanner implements DecompilationScanner {
  private options: Required<BinaryNinjaOptions>;
  private hipaa: HipaaUtilities;

  constructor(options: BinaryNinjaOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 30000, // 30 second default
      depth: options.depth ?? 'basic',
      enableHeuristics: options.enableHeuristics ?? true,
      pythonPath: options.pythonPath ?? 'python3',
      binaryNinjaPath: options.binaryNinjaPath ?? process.env.BINJA_PATH ?? ''
    };

    // Initialize HIPAA compliance utilities
    this.hipaa = this.createHipaaUtilities();
  }

  private createHipaaUtilities(): HipaaUtilities {
    return {
      sanitizeFilename: (filename?: string) => {
        if (!filename) return 'unknown';
        const basename = path.basename(filename);
        const hash = randomBytes(4).toString('hex');
        const ext = path.extname(basename);
        return `file_${hash}${ext}`;
      },
      sanitizeError: (error: Error | string) => {
        const message = typeof error === 'string' ? error : error.message;
        return message
          .replace(/[A-Za-z]:\\[^\s]+/g, '[REDACTED_PATH]')
          .replace(/\/[^\s]+/g, '[REDACTED_PATH]')
          .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[REDACTED_ID]')
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
      },
      createSecureTempPath: (prefix = 'pompelmi-binja') => {
        const randomId = randomBytes(8).toString('hex');
        return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${randomId}`);
      },
      secureCleanup: async (filePath: string) => {
        try {
          await fs.unlink(filePath);
        } catch {
          // Ignore cleanup errors - file may not exist
        }
      },
      auditLog: (eventType: string, details: any) => {
        // Simple audit logging - in production, this would write to secure logs
        console.debug(`[HIPAA-AUDIT] ${eventType}:`, JSON.stringify(details));
      }
    };
  }

  async scan(bytes: Uint8Array): Promise<DecompilationMatch[]> {
    const result = await this.analyze(bytes);
    return result.matches;
  }

  async analyze(bytes: Uint8Array): Promise<DecompilationResult> {
    // HIPAA-compliant analysis with secure temp file handling
    const secureId = this.randomHex(16);
    const tmpDir = await fs.mkdtemp(`${os.tmpdir()}/pompelmi-binja-${secureId}-`);
    const binPath = this.hipaa.createSecureTempPath('binja-sample');
    
    // Audit log for analysis start
    this.hipaa.auditLog('decompilation_start', {
      engine: 'binaryninja-hlil',
      depth: this.options.depth,
      sampleSize: bytes.length,
      sessionId: secureId
    });
    
    try {
      // Write binary to temp file
      await fs.writeFile(binPath, Buffer.from(bytes));
      
      // Get path to analysis script
      // Get current module directory
      const currentFile = fileURLToPath(import.meta.url);
      const currentDir = path.dirname(currentFile);
      const scriptPath = path.join(currentDir, '..', 'scripts', 'hlil_analysis.py');
      
      // Prepare environment - sanitize for HIPAA compliance
      const env = { ...process.env };
      // Remove potentially sensitive environment variables
      delete env.USERNAME;
      delete env.USER;
      delete env.HOME;
      delete env.USERPROFILE;
      
      if (this.options.binaryNinjaPath) {
        env.PYTHONPATH = this.options.binaryNinjaPath + (env.PYTHONPATH ? `:${env.PYTHONPATH}` : '');
      }
      
      // Execute Binary Ninja analysis
      const timeoutSeconds = Math.ceil(this.options.timeout / 1000);
      const { stdout, stderr } = await pexec(
        this.options.pythonPath, 
        [scriptPath, binPath, timeoutSeconds.toString()],
        { 
          timeout: this.options.timeout,
          env,
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }
      );
      
      // Parse results - sanitize any errors for HIPAA compliance
      let rawResult: BinaryNinjaAnalysisResult;
      try {
        rawResult = JSON.parse(stdout);
      } catch (parseError) {
        const sanitizedError = this.hipaa.sanitizeError(parseError as Error);
        this.hipaa.auditLog('decompilation_parse_error', {
          engine: 'binaryninja-hlil',
          sessionId: secureId,
          error: sanitizedError
        });
        
        return {
          engine: 'binaryninja-hlil',
          success: false,
          functions: [],
          matches: [],
          meta: { error: 'Failed to parse analysis results' }
        };
      }
      
      if (!rawResult.success) {
        const sanitizedError = rawResult.error ? this.hipaa.sanitizeError(rawResult.error) : 'Analysis failed';
        
        this.hipaa.auditLog('decompilation_analysis_error', {
          engine: 'binaryninja-hlil',
          sessionId: secureId,
          error: sanitizedError
        });
        
        return {
          engine: 'binaryninja-hlil',
          success: false,
          functions: [],
          matches: [],
          meta: { error: sanitizedError }
        };
      }
      
      // Transform functions to our interface
      const functions: FunctionAnalysis[] = (rawResult.functions || []).map(func => ({
        name: func.name || 'unknown',
        address: func.address || '0x0',
        size: func.size || 0,
        complexity: func.complexity,
        callCount: func.callCount,
        isObfuscated: func.complexity > 200,
        hasAntiAnalysis: func.suspiciousCalls?.some((call: string) => 
          call.toLowerCase().includes('debug') || call.toLowerCase().includes('protect')),
        suspiciousCalls: func.suspiciousCalls || []
      }));
      
      // Transform matches to our interface
      const matches: DecompilationMatch[] = (rawResult.matches || []).map(match => ({
        rule: match.rule,
        severity: match.severity || 'medium',
        engine: 'binaryninja-hlil',
        confidence: match.confidence || 0.5,
        meta: match.meta || {}
      }));
      
      // Log successful analysis
      this.hipaa.auditLog('decompilation_success', {
        engine: 'binaryninja-hlil',
        sessionId: secureId,
        functionCount: functions.length,
        matchCount: matches.length
      });

      return {
        engine: 'binaryninja-hlil',
        success: true,
        functions,
        matches,
        meta: rawResult.meta
      };
      
    } catch (error: any) {
      const sanitizedError = this.hipaa.sanitizeError(error);
      
      // Log error event for audit trail
      this.hipaa.auditLog('decompilation_error', {
        engine: 'binaryninja-hlil',
        sessionId: secureId,
        errorType: error.code || 'unknown',
        error: sanitizedError
      });
      
      // Handle specific error cases
      if (error.code === 'ENOENT') {
        return {
          engine: 'binaryninja-hlil',
          success: false,
          functions: [],
          matches: [],
          meta: { error: 'Binary Ninja Python executable not found' }
        };
      }
      
      if (error.killed && error.signal === 'SIGTERM') {
        return {
          engine: 'binaryninja-hlil',
          success: false,
          functions: [],
          matches: [],
          meta: { error: 'Analysis timeout' }
        };
      }
      
      return {
        engine: 'binaryninja-hlil',
        success: false,
        functions: [],
        matches: [],
        meta: { error: 'Analysis failed' }
      };
      
    } finally {
      // HIPAA-compliant secure cleanup
      try {
        // Secure cleanup of temp directory
        await fs.rm(tmpDir, { recursive: true, force: true });
        // Secure cleanup of binary file if separate
        await this.hipaa.secureCleanup(binPath);
        
        this.hipaa.auditLog('decompilation_cleanup', {
          engine: 'binaryninja-hlil',
          sessionId: secureId,
          status: 'completed'
        });
      } catch (cleanupError) {
        // Log cleanup failure but don't throw
        const sanitizedCleanupError = this.hipaa.sanitizeError(cleanupError as Error);
        this.hipaa.auditLog('decompilation_cleanup_error', {
          engine: 'binaryninja-hlil',
          sessionId: secureId,
          error: sanitizedCleanupError
        });
      }
    }
  }

  private randomHex(length: number): string {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }
}

export function createBinaryNinjaScanner(options: BinaryNinjaOptions = {}): DecompilationScanner {
  return new BinaryNinjaScanner(options);
}

// All types are already exported above
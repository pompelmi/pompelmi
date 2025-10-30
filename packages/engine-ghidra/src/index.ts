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

// Define types locally - these will match the main package types
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

export interface GhidraOptions {
  timeout?: number;
  depth?: AnalysisDepth;
  enableHeuristics?: boolean;
  ghidraPath?: string;
  analyzeHeadless?: string;
  javaPath?: string;
  maxMemory?: string;
}

const pexec = promisify(execFile);

interface GhidraAnalysisResult {
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

export class GhidraScanner implements DecompilationScanner {
  private options: Required<GhidraOptions>;
  private hipaa: HipaaUtilities;

  constructor(options: GhidraOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 60000, // 60 second default
      depth: options.depth ?? 'basic',
      enableHeuristics: options.enableHeuristics ?? true,
      ghidraPath: options.ghidraPath ?? process.env.GHIDRA_INSTALL_DIR ?? '',
      analyzeHeadless: options.analyzeHeadless ?? 'analyzeHeadless',
      javaPath: options.javaPath ?? 'java',
      maxMemory: options.maxMemory ?? '2G'
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
      createSecureTempPath: (prefix = 'pompelmi-ghidra') => {
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
    const tmpDir = this.hipaa.createSecureTempPath('ghidra-analysis');
    const projectDir = path.join(tmpDir, 'project');
    const binPath = this.hipaa.createSecureTempPath('ghidra-sample');
    const scriptPath = path.join(tmpDir, 'analysis_script.java');
    
    // Audit log for analysis start
    this.hipaa.auditLog('decompilation_start', {
      engine: 'ghidra-pcode',
      depth: this.options.depth,
      sampleSize: bytes.length,
      sessionId: secureId
    });
    
    try {
      // Create project directory
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.mkdir(projectDir, { recursive: true });
      
      // Write binary to temp file
      await fs.writeFile(binPath, Buffer.from(bytes));
      
      // Create Ghidra analysis script
      await this.createAnalysisScript(scriptPath);
      
      // Build analyzeHeadless command
      const ghidraScript = this.options.analyzeHeadless;
      const projectPath = projectDir;
      const projectName = 'PompelmiAnalysis';
      
      const args = [
        `-Xmx${this.options.maxMemory}`,
        '-jar', path.join(this.options.ghidraPath, 'support', 'analyzeHeadless.jar'),
        projectPath, projectName,
        '-import', binPath,
        '-scriptPath', path.dirname(scriptPath),
        '-postScript', path.basename(scriptPath, '.java'),
        '-overwrite',
        '-deleteProject'
      ];
      
      // Execute Ghidra analysis with sanitized environment
      const env = { ...process.env };
      // Remove potentially sensitive environment variables for HIPAA compliance
      delete env.USERNAME;
      delete env.USER;
      delete env.HOME;
      delete env.USERPROFILE;
      
      const timeoutSeconds = Math.ceil(this.options.timeout / 1000);
      const { stdout, stderr } = await pexec(
        this.options.javaPath,
        args,
        { 
          timeout: this.options.timeout,
          env,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          cwd: tmpDir
        }
      );
      
      // Parse results from stdout/stderr - sanitize any errors for HIPAA compliance
      let rawResult: GhidraAnalysisResult;
      
      try {
        // Look for JSON output in the logs
        const jsonMatch = stdout.match(/POMPELMI_RESULT:(.*?)POMPELMI_END/s);
        if (jsonMatch) {
          rawResult = JSON.parse(jsonMatch[1]);
        } else {
          // Fallback parsing
          rawResult = this.parseGhidraOutput(stdout, stderr);
        }
      } catch (parseError) {
        const sanitizedError = this.hipaa.sanitizeError(parseError as Error);
        this.hipaa.auditLog('decompilation_parse_error', {
          engine: 'ghidra-pcode',
          sessionId: secureId,
          error: sanitizedError
        });
        
        return {
          engine: 'ghidra-pcode',
          success: false,
          functions: [],
          matches: [],
          meta: { error: 'Failed to parse analysis results' }
        };
      }
      
      if (!rawResult.success) {
        const sanitizedError = rawResult.error ? this.hipaa.sanitizeError(rawResult.error) : 'Analysis failed';
        
        this.hipaa.auditLog('decompilation_analysis_error', {
          engine: 'ghidra-pcode',
          sessionId: secureId,
          error: sanitizedError
        });
        
        return {
          engine: 'ghidra-pcode',
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
        isObfuscated: func.complexity > 50,
        hasAntiAnalysis: func.suspiciousCalls?.some((call: string) => 
          call.toLowerCase().includes('debug') || call.toLowerCase().includes('protect')),
        suspiciousCalls: func.suspiciousCalls || []
      }));
      
      // Transform matches to our interface
      const matches: DecompilationMatch[] = (rawResult.matches || []).map(match => ({
        rule: match.rule,
        severity: match.severity || 'medium',
        engine: 'ghidra-pcode',
        confidence: match.confidence || 0.5,
        meta: match.meta || {}
      }));
      
      // Log successful analysis
      this.hipaa.auditLog('decompilation_success', {
        engine: 'ghidra-pcode',
        sessionId: secureId,
        functionCount: functions.length,
        matchCount: matches.length
      });

      return {
        engine: 'ghidra-pcode',
        success: true,
        functions,
        matches,
        meta: rawResult.meta
      };
      
    } catch (error: any) {
      const sanitizedError = this.hipaa.sanitizeError(error);
      
      // Log error event for audit trail
      this.hipaa.auditLog('decompilation_error', {
        engine: 'ghidra-pcode',
        sessionId: secureId,
        errorType: error.code || 'unknown',
        error: sanitizedError
      });
      
      // Handle specific error cases
      if (error.code === 'ENOENT') {
        return {
          engine: 'ghidra-pcode',
          success: false,
          functions: [],
          matches: [],
          meta: { error: 'Ghidra installation not found' }
        };
      }
      
      if (error.killed && error.signal === 'SIGTERM') {
        return {
          engine: 'ghidra-pcode',
          success: false,
          functions: [],
          matches: [],
          meta: { error: 'Analysis timeout' }
        };
      }
      
      return {
        engine: 'ghidra-pcode',
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
          engine: 'ghidra-pcode',
          sessionId: secureId,
          status: 'completed'
        });
      } catch (cleanupError) {
        // Log cleanup failure but don't throw
        const sanitizedCleanupError = this.hipaa.sanitizeError(cleanupError as Error);
        this.hipaa.auditLog('decompilation_cleanup_error', {
          engine: 'ghidra-pcode',
          sessionId: secureId,
          error: sanitizedCleanupError
        });
      }
    }
  }

  private async createAnalysisScript(scriptPath: string): Promise<void> {
    const script = `
//Ghidra P-Code Analysis Script for Pompelmi
//@category PompelmiAnalysis

import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;
import ghidra.program.model.pcode.*;
import ghidra.program.model.address.*;
import ghidra.program.model.symbol.*;
import java.util.*;
import java.util.regex.*;

public class PompelmiPcodeAnalysis extends GhidraScript {

    @Override
    public void run() throws Exception {
        long startTime = System.currentTimeMillis();
        
        List<Object> functions = new ArrayList<>();
        List<Object> matches = new ArrayList<>();
        
        try {
            // Analyze all functions
            FunctionManager funcMgr = currentProgram.getFunctionManager();
            FunctionIterator funcIter = funcMgr.getFunctions(true);
            
            int funcCount = 0;
            while (funcIter.hasNext() && funcCount < 20) { // Limit to 20 functions
                Function func = funcIter.next();
                
                Map<String, Object> funcInfo = analyzeFunctionPcode(func);
                if (funcInfo != null) {
                    functions.add(funcInfo);
                    
                    // Check for suspicious patterns
                    List<Object> funcMatches = detectSuspiciousPatterns(func, funcInfo);
                    matches.addAll(funcMatches);
                }
                funcCount++;
            }
            
            // Build result
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("engine", "ghidra-pcode");
            result.put("functions", functions);
            result.put("matches", matches);
            
            Map<String, Object> meta = new HashMap<>();
            meta.put("analysisTime", (System.currentTimeMillis() - startTime) / 1000.0);
            meta.put("binaryFormat", currentProgram.getExecutableFormat());
            meta.put("architecture", currentProgram.getLanguage().getProcessor().toString());
            meta.put("functionCount", funcMgr.getFunctionCount());
            result.put("meta", meta);
            
            // Output result as JSON
            println("POMPELMI_RESULT:" + toJson(result) + "POMPELMI_END");
            
        } catch (Exception e) {
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("success", false);
            errorResult.put("error", e.getMessage());
            println("POMPELMI_RESULT:" + toJson(errorResult) + "POMPELMI_END");
        }
    }
    
    private Map<String, Object> analyzeFunctionPcode(Function func) throws Exception {
        if (func.isThunk()) return null;
        
        Map<String, Object> info = new HashMap<>();
        info.put("name", func.getName());
        info.put("address", func.getEntryPoint().toString());
        info.put("size", func.getBody().getNumAddresses());
        
        // Analyze P-Code operations
        List<String> suspiciousCalls = new ArrayList<>();
        int complexity = 0;
        int callCount = 0;
        
        DecompInterface decompiler = new DecompInterface();
        try {
            decompiler.openProgram(currentProgram);
            DecompileResults results = decompiler.decompileFunction(func, 30, null);
            
            if (results != null && results.decompileCompleted()) {
                HighFunction highFunc = results.getHighFunction();
                if (highFunc != null) {
                    Iterator<PcodeOpAST> pcodeOps = highFunc.getPcodeOps();
                    while (pcodeOps.hasNext()) {
                        PcodeOpAST op = pcodeOps.next();
                        complexity++;
                        
                        // Check for calls
                        if (op.getOpcode() == PcodeOp.CALL || op.getOpcode() == PcodeOp.CALLIND) {
                            callCount++;
                            
                            // Check for suspicious calls
                            String callStr = op.toString();
                            if (containsSuspiciousPattern(callStr)) {
                                suspiciousCalls.add(callStr);
                            }
                        }
                    }
                }
            }
        } finally {
            decompiler.dispose();
        }
        
        info.put("complexity", complexity);
        info.put("callCount", callCount);
        info.put("suspiciousCalls", suspiciousCalls);
        
        return info;
    }
    
    private boolean containsSuspiciousPattern(String text) {
        String[] patterns = {
            "CreateRemoteThread", "WriteProcessMemory", "VirtualAllocEx",
            "IsDebuggerPresent", "CheckRemoteDebuggerPresent", "OutputDebugString"
        };
        
        for (String pattern : patterns) {
            if (text.toLowerCase().contains(pattern.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
    
    private List<Object> detectSuspiciousPatterns(Function func, Map<String, Object> funcInfo) {
        List<Object> matches = new ArrayList<>();
        
        // High complexity detection
        int complexity = (Integer) funcInfo.get("complexity");
        if (complexity > 100) {
            Map<String, Object> match = new HashMap<>();
            match.put("rule", "high_complexity_function");
            match.put("severity", "medium");
            match.put("engine", "ghidra-pcode");
            match.put("confidence", 0.6);
            
            Map<String, Object> meta = new HashMap<>();
            meta.put("function", func.getName());
            meta.put("address", func.getEntryPoint().toString());
            meta.put("complexity", complexity);
            match.put("meta", meta);
            
            matches.add(match);
        }
        
        // Suspicious API calls
        List<String> suspiciousCalls = (List<String>) funcInfo.get("suspiciousCalls");
        for (String call : suspiciousCalls) {
            Map<String, Object> match = new HashMap<>();
            match.put("rule", "suspicious_api_call");
            match.put("severity", "high");
            match.put("engine", "ghidra-pcode");
            match.put("confidence", 0.8);
            
            Map<String, Object> meta = new HashMap<>();
            meta.put("function", func.getName());
            meta.put("address", func.getEntryPoint().toString());
            meta.put("api_call", call);
            match.put("meta", meta);
            
            matches.add(match);
        }
        
        return matches;
    }
    
    private String toJson(Map<String, Object> obj) {
        // Simple JSON serialization (limited but sufficient for our needs)
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        
        boolean first = true;
        for (Map.Entry<String, Object> entry : obj.entrySet()) {
            if (!first) sb.append(",");
            first = false;
            
            sb.append("\\"").append(entry.getKey()).append("\\":");
            Object value = entry.getValue();
            
            if (value == null) {
                sb.append("null");
            } else if (value instanceof String) {
                sb.append("\\"").append(((String) value).replace("\\"", "\\\\\\"")).append("\\"");
            } else if (value instanceof Number || value instanceof Boolean) {
                sb.append(value.toString());
            } else if (value instanceof List) {
                sb.append(listToJson((List) value));
            } else if (value instanceof Map) {
                sb.append(toJson((Map<String, Object>) value));
            } else {
                sb.append("\\"").append(value.toString().replace("\\"", "\\\\\\"")).append("\\"");
            }
        }
        
        sb.append("}");
        return sb.toString();
    }
    
    private String listToJson(List list) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        
        boolean first = true;
        for (Object item : list) {
            if (!first) sb.append(",");
            first = false;
            
            if (item instanceof String) {
                sb.append("\\"").append(((String) item).replace("\\"", "\\\\\\"")).append("\\"");
            } else if (item instanceof Map) {
                sb.append(toJson((Map<String, Object>) item));
            } else {
                sb.append("\\"").append(item.toString().replace("\\"", "\\\\\\"")).append("\\"");
            }
        }
        
        sb.append("]");
        return sb.toString();
    }
}
`;
    
    await fs.writeFile(scriptPath, script.trim(), 'utf8');
  }

  private parseGhidraOutput(stdout: string, stderr: string): GhidraAnalysisResult {
    // Fallback parsing if JSON extraction fails
    if (stderr.includes('ERROR') || stdout.includes('ERROR')) {
      return {
        success: false,
        error: 'Ghidra analysis error'
      };
    }
    
    // Extract basic info from stdout
    const functionCount = (stdout.match(/Function/g) || []).length;
    
    return {
      success: true,
      functions: [],
      matches: [],
      meta: {
        analysisTime: 0,
        functionCount: functionCount
      }
    };
  }

  private randomHex(length: number): string {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }
}

export function createGhidraScanner(options: GhidraOptions = {}): DecompilationScanner {
  return new GhidraScanner(options);
}

// All types are already exported above
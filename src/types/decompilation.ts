/** Decompilation-specific types for Pompelmi */

export type DecompilationEngine = 'binaryninja-hlil' | 'ghidra-pcode';

export type AnalysisDepth = 'minimal' | 'basic' | 'deep';

export interface DecompilationMatch {
  rule: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  engine: DecompilationEngine;
  confidence: number; // 0.0 to 1.0
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

// Base interface for all decompilation engines
export interface DecompilationScanner {
  scan(bytes: Uint8Array): Promise<DecompilationMatch[]>;
  analyze?(bytes: Uint8Array): Promise<DecompilationResult>;
}

// Binary Ninja HLIL-specific types
export interface HLILInstruction {
  operation: string;
  address: string;
  operands?: any[];
  vars?: string[];
}

export interface HLILFunction {
  name: string;
  address: string;
  instructions: HLILInstruction[];
  basicBlocks?: number;
  complexity?: number;
}

export interface BinaryNinjaOptions {
  timeout?: number; // milliseconds
  depth?: AnalysisDepth;
  enableHeuristics?: boolean;
  pythonPath?: string;
  binaryNinjaPath?: string;
}

// Ghidra P-Code-specific types (for future implementation)
export interface PCodeOperation {
  opcode: string;
  address: string;
  inputs?: string[];
  output?: string;
}

export interface PCodeFunction {
  name: string;
  address: string;
  operations: PCodeOperation[];
  basicBlocks?: number;
}

export interface GhidraOptions {
  timeout?: number;
  depth?: AnalysisDepth;
  enableHeuristics?: boolean;
  ghidraPath?: string;
  analyzeHeadless?: string;
}

// Unified decompilation configuration
export interface DecompilationOptions {
  engine: DecompilationEngine;
  timeout?: number;
  depth?: AnalysisDepth;
  enableHeuristics?: boolean;
  // Engine-specific options
  binaryNinja?: BinaryNinjaOptions;
  ghidra?: GhidraOptions;
}

// Pattern detection types
export interface SuspiciousPattern {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: RegExp | string | ((instruction: any) => boolean);
}

export const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  {
    name: 'syscall_direct',
    description: 'Direct system call without library wrapper',
    severity: 'medium',
    pattern: /syscall|sysenter|int\s+0x80/i
  },
  {
    name: 'process_injection',
    description: 'Process injection techniques',
    severity: 'high',
    pattern: /CreateRemoteThread|WriteProcessMemory|VirtualAllocEx/i
  },
  {
    name: 'anti_debug',
    description: 'Anti-debugging techniques',
    severity: 'medium',
    pattern: /IsDebuggerPresent|CheckRemoteDebuggerPresent|OutputDebugString/i
  },
  {
    name: 'obfuscation_xor',
    description: 'XOR-based obfuscation pattern',
    severity: 'medium',
    pattern: /xor.*0x[0-9a-f]+.*xor/i
  },
  {
    name: 'crypto_constants',
    description: 'Cryptographic constants',
    severity: 'low',
    pattern: /0x67452301|0xefcdab89|0x98badcfe|0x10325476/i
  }
];
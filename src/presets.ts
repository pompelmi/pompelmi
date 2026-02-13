import type { Scanner, Match, DecompilationScanner, AnalysisDepth } from "./types";

export type PresetName = 'basic' | 'advanced' | 'malware-analysis' | 'decompilation-basic' | 'decompilation-deep' | string;

export interface PresetOptions { 
  // YARA options
  yaraRules?: string | string[];
  yaraTimeout?: number;
  
  // Decompilation options
  enableDecompilation?: boolean;
  decompilationEngine?: 'binaryninja-hlil' | 'ghidra-pcode' | 'both';
  decompilationDepth?: AnalysisDepth;
  decompilationTimeout?: number;
  
  // Binary Ninja specific
  binaryNinjaPath?: string;
  pythonPath?: string;
  
  // Ghidra specific  
  ghidraPath?: string;
  analyzeHeadless?: string;
  
  // General options
  timeout?: number;
  [key: string]: unknown;
}

function toScanFn(s: Scanner): (input: any, ctx?: any) => Promise<Match[]> {
  return (typeof s === "function" ? s : s.scan) as (input: any, ctx?: any) => Promise<Match[]>;
}

export function composeScanners(...scanners: Scanner[]): Scanner {
  return async (input: any, ctx?: any) => {
    const all: Match[] = [];
    for (const s of scanners) {
      try {
        const out = await toScanFn(s)(input, ctx);
        if (Array.isArray(out)) all.push(...out);
      } catch {
        // ignore individual scanner failures
      }
    }
    return all;
  };
}

export function createPresetScanner(preset: PresetName, opts: PresetOptions = {}): Scanner {
  const scanners: Scanner[] = [];
  
  // Add decompilation scanners based on preset
  if (preset === 'decompilation-basic' || preset === 'decompilation-deep' || 
      preset === 'malware-analysis' || opts.enableDecompilation) {
    
    const depth = preset === 'decompilation-deep' ? 'deep' : 
                  preset === 'decompilation-basic' ? 'basic' : 
                  opts.decompilationDepth || 'basic';
    
    if (!opts.decompilationEngine || opts.decompilationEngine === 'binaryninja-hlil' || opts.decompilationEngine === 'both') {
      try {
        // Dynamic import to avoid bundling issues - using Function to bypass TypeScript type checking
        const importModule = new Function('specifier', 'return import(specifier)');
        importModule('@pompelmi/engine-binaryninja').then((mod: any) => {
          const binjaScanner = mod.createBinaryNinjaScanner({
            timeout: opts.decompilationTimeout || opts.timeout || 30000,
            depth,
            pythonPath: opts.pythonPath,
            binaryNinjaPath: opts.binaryNinjaPath
          });
          scanners.push(binjaScanner);
        }).catch(() => {
          // Binary Ninja engine not available - silently skip
        });
      } catch {
        // Engine not installed
      }
    }
    
    if (!opts.decompilationEngine || opts.decompilationEngine === 'ghidra-pcode' || opts.decompilationEngine === 'both') {
      try {
        // Dynamic import for Ghidra engine (when implemented) - using Function to bypass TypeScript type checking
        const importModule = new Function('specifier', 'return import(specifier)');
        importModule('@pompelmi/engine-ghidra').then((mod: any) => {
          const ghidraScanner = mod.createGhidraScanner({
            timeout: opts.decompilationTimeout || opts.timeout || 30000,
            depth,
            ghidraPath: opts.ghidraPath,
            analyzeHeadless: opts.analyzeHeadless
          });
          scanners.push(ghidraScanner);
        }).catch(() => {
          // Ghidra engine not available - silently skip
        });
      } catch {
        // Engine not installed
      }
    }
  }
  
  // Add other scanners for advanced presets
  if (preset === 'advanced' || preset === 'malware-analysis') {
    // Add heuristics scanner
    try {
      const { CommonHeuristicsScanner } = require('./scanners/common-heuristics');
      scanners.push(new CommonHeuristicsScanner());
    } catch {
      // Heuristics not available
    }
  }
  
  if (scanners.length === 0) {
    // Fallback scanner that returns no matches
    return async (_input: any, _ctx?: any) => {
      return [] as Match[];
    };
  }
  
  return composeScanners(...scanners);
}

// Preset configurations
export const PRESET_CONFIGS: Record<string, PresetOptions> = {
  'basic': {
    timeout: 10000
  },
  'advanced': {
    timeout: 30000,
    enableDecompilation: false
  },
  'malware-analysis': {
    timeout: 60000,
    enableDecompilation: true,
    decompilationEngine: 'both',
    decompilationDepth: 'deep'
  },
  'decompilation-basic': {
    timeout: 30000,
    enableDecompilation: true,
    decompilationDepth: 'basic'
  },
  'decompilation-deep': {
    timeout: 120000,
    enableDecompilation: true,
    decompilationDepth: 'deep'
  }
};

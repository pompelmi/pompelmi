import { createYaraScannerFromRules } from './yara/index';
import type { YaraMatch as YaraMatchT } from './yara/index';
import { promises as fs } from 'node:fs';

// src/index.ts
// Browser / React entry point for local-file-scanner

// Re-export the core scanning function
export { scanFiles } from './scan';

// Re-export the file validation function
export { validateFile } from './validate';

// Re-export the React hook for easy integration
export { useFileScanner } from './useFileScanner';

export interface YaraMatch {
  rule: string;
  tags?: string[];
}

export interface ScanOptions {
  // ...le tue opzioni esistenti...
  enableYara?: boolean;     // default: false
  yaraRules?: string;       // sorgente regole in chiaro (es. `rule R { strings: ... }`)
}

export interface FileEntry {
  // ...campi esistenti (path, absPath, isDir, ecc.)...
  yara?: {
    matches: YaraMatch[];
  };
}

export interface ScanOptions {
  // ...esistenti...
  enableYara?: boolean;
  yaraRules?: string;      // regole in stringa
  yaraRulesPath?: string;  // NUOVO: percorso a file .yar
}

export interface FileEntry {
  // ...esistenti...
  yara?: { matches: import('./yara/index').YaraMatch[] };
}
// src/index.ts
// Browser / React entry point for local-file-scanner

// Re-export the core scanning function
export { scanFiles } from './scan';

// Re-export the file validation function
export { validateFile } from './validate';

// Re-export the React hook for easy integration
export { useFileScanner } from './useFileScanner';
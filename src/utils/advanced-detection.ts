/**
 * Advanced threat detection utilities
 * @module utils/advanced-detection
 */

import type { Match } from '../types';

/**
 * Enhanced polyglot file detection
 * Detects files that can be interpreted as multiple formats
 */
export function detectPolyglot(bytes: Uint8Array): Match[] {
  const matches: Match[] = [];
  
  // Check for PDF/ZIP polyglot
  if (isPDFZipPolyglot(bytes)) {
    matches.push({
      rule: 'polyglot_pdf_zip',
      severity: 'high',
      meta: { description: 'File can be interpreted as both PDF and ZIP' },
    });
  }

  // Check for image/script polyglot
  if (isImageScriptPolyglot(bytes)) {
    matches.push({
      rule: 'polyglot_image_script',
      severity: 'high',
      meta: { description: 'Image file contains executable script content' },
    });
  }

  // Check for GIFAR (GIF/JAR polyglot)
  if (isGIFAR(bytes)) {
    matches.push({
      rule: 'polyglot_gifar',
      severity: 'critical',
      meta: { description: 'GIF file contains Java archive' },
    });
  }

  return matches;
}

/**
 * Detect obfuscated JavaScript/VBScript
 */
export function detectObfuscatedScripts(bytes: Uint8Array): Match[] {
  const matches: Match[] = [];
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(64 * 1024, bytes.length)));
  
  // Check for common obfuscation patterns
  const obfuscationPatterns = [
    /eval\s*\(\s*unescape\s*\(/gi,
    /eval\s*\(\s*atob\s*\(/gi,
    /String\.fromCharCode\s*\(\s*\d+(?:\s*,\s*\d+){10,}/gi,
    /[a-z0-9]{100,}/gi, // Long encoded strings
    /\\x[0-9a-f]{2}/gi, // Hex escapes
  ];

  for (const pattern of obfuscationPatterns) {
    if (pattern.test(text)) {
      matches.push({
        rule: 'obfuscated_script',
        severity: 'medium',
        meta: { 
          description: 'Detected obfuscated script content',
          pattern: pattern.source,
        },
      });
      break;
    }
  }

  return matches;
}

/**
 * Enhanced nested archive detection with depth limits
 */
export function analyzeNestedArchives(bytes: Uint8Array, maxDepth = 10): { depth: number; hasExcessiveNesting: boolean } {
  let depth = 0;
  let currentBytes = bytes;

  while (depth < maxDepth) {
    if (isArchive(currentBytes)) {
      depth++;
      // In a real implementation, we would extract and check the nested content
      // For now, we just check if it looks like an archive
      const extracted = extractFirstEntry(currentBytes);
      if (extracted && isArchive(extracted)) {
        currentBytes = extracted;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return {
    depth,
    hasExcessiveNesting: depth >= 5,
  };
}

// Helper functions

function isPDFZipPolyglot(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  
  // Check for PDF signature
  const hasPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  
  // Check for ZIP signature anywhere in the file
  let hasZIP = false;
  for (let i = 0; i < Math.min(bytes.length - 4, 1024); i++) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4B && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
      hasZIP = true;
      break;
    }
  }
  
  return hasPDF && hasZIP;
}

function isImageScriptPolyglot(bytes: Uint8Array): boolean {
  if (bytes.length < 100) return false;
  
  // Check for image signatures
  const isImage = (
    (bytes[0] === 0xFF && bytes[1] === 0xD8) || // JPEG
    (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) || // PNG
    (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) // GIF
  );
  
  if (!isImage) return false;
  
  // Check for script content
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  return /<script|javascript:|eval\(|function\s*\(/i.test(text);
}

function isGIFAR(bytes: Uint8Array): boolean {
  if (bytes.length < 100) return false;
  
  // Check for GIF signature
  const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  
  // Check for ZIP/JAR signature
  let hasZIP = false;
  for (let i = 0; i < Math.min(bytes.length - 4, 1024); i++) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4B && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
      hasZIP = true;
      break;
    }
  }
  
  return isGIF && hasZIP;
}

function isArchive(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  
  return (
    // ZIP
    (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) ||
    // RAR
    (bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21) ||
    // 7z
    (bytes[0] === 0x37 && bytes[1] === 0x7A && bytes[2] === 0xBC && bytes[3] === 0xAF) ||
    // tar.gz
    (bytes[0] === 0x1F && bytes[1] === 0x8B)
  );
}

function extractFirstEntry(bytes: Uint8Array): Uint8Array | null {
  // Simplified extraction - in real implementation would properly parse archive
  // This is a placeholder
  return null;
}

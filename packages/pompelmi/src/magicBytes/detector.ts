import type {
  MagicBytesSignature,
  MagicBytesResult,
  PolyglotResult,
} from './types.js';
import { DEFAULT_SIGNATURES } from './signatures.js';

/**
 * Extensible magic bytes detector for file format identification
 */
export class MagicBytesDetector {
  private signatures: MagicBytesSignature[] = [];

  constructor(signatures: MagicBytesSignature[] = DEFAULT_SIGNATURES) {
    this.signatures = [...signatures];
  }

  /**
   * Add a custom signature to the detector
   */
  addSignature(signature: MagicBytesSignature): void {
    this.signatures.push(signature);
  }

  /**
   * Add multiple signatures at once
   */
  addSignatures(signatures: MagicBytesSignature[]): void {
    this.signatures.push(...signatures);
  }

  /**
   * Remove a signature by name
   */
  removeSignature(name: string): void {
    this.signatures = this.signatures.filter((sig) => sig.name !== name);
  }

  /**
   * Get all registered signatures
   */
  getSignatures(): ReadonlyArray<MagicBytesSignature> {
    return this.signatures;
  }

  /**
   * Detect file format from buffer
   */
  detect(buffer: Buffer): MagicBytesResult {
    const matches: MagicBytesSignature[] = [];

    for (const signature of this.signatures) {
      if (this.matchesSignature(buffer, signature)) {
        matches.push(signature);
      }
    }

    if (matches.length === 0) {
      return { detected: false };
    }

    // Return the first match (most specific)
    const primary = matches[0];
    return {
      detected: true,
      format: primary.name,
      mimeType: primary.mimeType,
      extension: primary.extensions[0],
      suspicious: primary.suspicious,
      matches,
    };
  }

  /**
   * Detect polyglot files (multiple formats in one file)
   */
  detectPolyglot(buffer: Buffer): PolyglotResult {
    const result = this.detect(buffer);

    if (!result.detected || !result.matches || result.matches.length <= 1) {
      return {
        isPolyglot: false,
        formats: result.format ? [result.format] : [],
        mimeTypes: result.mimeType ? [result.mimeType] : [],
        suspicious: false,
      };
    }

    // Multiple formats detected - potential polyglot
    const formats = result.matches.map((m) => m.name);
    const mimeTypes = result.matches.map((m) => m.mimeType);
    const suspicious = result.matches.some((m) => m.suspicious);

    return {
      isPolyglot: true,
      formats,
      mimeTypes,
      suspicious,
      reason: `Multiple file formats detected: ${formats.join(', ')}`,
    };
  }

  /**
   * Check if buffer contains embedded scripts (common polyglot technique)
   */
  detectEmbeddedScripts(buffer: Buffer): {
    hasScripts: boolean;
    scriptTypes: string[];
    suspicious: boolean;
  } {
    const scriptPatterns = [
      { type: 'PHP', pattern: Buffer.from('<?php') },
      { type: 'JavaScript', pattern: Buffer.from('<script') },
      { type: 'Shell', pattern: Buffer.from('#!/bin/') },
      { type: 'Python', pattern: Buffer.from('#!/usr/bin/env python') },
      { type: 'Perl', pattern: Buffer.from('#!/usr/bin/perl') },
      { type: 'Ruby', pattern: Buffer.from('#!/usr/bin/ruby') },
    ];

    const found: string[] = [];

    for (const { type, pattern } of scriptPatterns) {
      if (buffer.includes(pattern)) {
        found.push(type);
      }
    }

    // Check for base64-encoded scripts (common obfuscation)
    const content = buffer.toString('utf-8');
    if (
      content.includes('eval(') ||
      content.includes('exec(') ||
      content.includes('base64_decode') ||
      content.includes('atob(')
    ) {
      found.push('Obfuscated Script');
    }

    return {
      hasScripts: found.length > 0,
      scriptTypes: found,
      suspicious: found.length > 0,
    };
  }

  /**
   * Check if a specific format is present in the buffer
   */
  hasFormat(buffer: Buffer, formatName: string): boolean {
    const signature = this.signatures.find((sig) => sig.name === formatName);
    if (!signature) return false;
    return this.matchesSignature(buffer, signature);
  }

  /**
   * Match a single signature against a buffer
   */
  private matchesSignature(buffer: Buffer, signature: MagicBytesSignature): boolean {
    const offset = signature.offset || 0;

    // Use custom detection function if provided
    if (signature.detect) {
      return signature.detect(buffer);
    }

    // Convert pattern to Buffer if string
    const pattern =
      typeof signature.pattern === 'string'
        ? Buffer.from(signature.pattern)
        : signature.pattern;

    // Check if buffer is large enough
    if (buffer.length < offset + pattern.length) {
      return false;
    }

    // Compare bytes
    const slice = buffer.slice(offset, offset + pattern.length);
    return slice.equals(pattern);
  }

  /**
   * Analyze file for security risks based on format detection
   */
  analyzeSecurityRisks(buffer: Buffer): {
    isExecutable: boolean;
    isPolyglot: boolean;
    hasEmbeddedScripts: boolean;
    suspicious: boolean;
    reasons: string[];
  } {
    const formatResult = this.detect(buffer);
    const polyglotResult = this.detectPolyglot(buffer);
    const scriptResult = this.detectEmbeddedScripts(buffer);

    const reasons: string[] = [];

    if (formatResult.suspicious) {
      reasons.push(`Suspicious file format: ${formatResult.format}`);
    }

    if (polyglotResult.isPolyglot) {
      reasons.push(`Polyglot file detected: ${polyglotResult.formats.join(', ')}`);
    }

    if (scriptResult.hasScripts) {
      reasons.push(`Embedded scripts found: ${scriptResult.scriptTypes.join(', ')}`);
    }

    // Special case: Image with embedded scripts (common exploit vector)
    if (formatResult.detected && formatResult.mimeType?.startsWith('image/')) {
      if (scriptResult.hasScripts) {
        reasons.push('Image file contains embedded executable code');
      }
    }

    // Special case: Document with embedded executables
    if (
      formatResult.detected &&
      (formatResult.mimeType?.includes('document') || formatResult.mimeType?.includes('pdf'))
    ) {
      if (polyglotResult.suspicious) {
        reasons.push('Document contains embedded executable content');
      }
    }

    return {
      isExecutable: formatResult.suspicious || false,
      isPolyglot: polyglotResult.isPolyglot,
      hasEmbeddedScripts: scriptResult.hasScripts,
      suspicious:
        formatResult.suspicious ||
        polyglotResult.suspicious ||
        scriptResult.suspicious ||
        false,
      reasons,
    };
  }
}

// Export singleton instance
export const defaultDetector = new MagicBytesDetector();

/**
 * Convenience function to detect file format
 */
export function detectFormat(buffer: Buffer): MagicBytesResult {
  return defaultDetector.detect(buffer);
}

/**
 * Convenience function to detect polyglot files
 */
export function detectPolyglot(buffer: Buffer): PolyglotResult {
  return defaultDetector.detectPolyglot(buffer);
}

/**
 * Convenience function to analyze security risks
 */
export function analyzeSecurityRisks(buffer: Buffer) {
  return defaultDetector.analyzeSecurityRisks(buffer);
}

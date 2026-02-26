import type { MagicBytesSignature } from './types.js';

/**
 * Built-in magic bytes signatures for common file formats
 */
export const DEFAULT_SIGNATURES: MagicBytesSignature[] = [
  // Executables
  {
    name: 'PE (Windows Executable)',
    mimeType: 'application/x-msdownload',
    extensions: ['.exe', '.dll', '.sys'],
    pattern: Buffer.from([0x4d, 0x5a]), // MZ
    suspicious: true,
  },
  {
    name: 'ELF (Linux Executable)',
    mimeType: 'application/x-executable',
    extensions: ['.elf', '.so'],
    pattern: Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // \x7fELF
    suspicious: true,
  },
  {
    name: 'Mach-O (macOS Executable)',
    mimeType: 'application/x-mach-binary',
    extensions: ['.dylib', '.bundle'],
    pattern: Buffer.from([0xcf, 0xfa, 0xed, 0xfe]),
    suspicious: true,
  },
  {
    name: 'Java Class',
    mimeType: 'application/java-vm',
    extensions: ['.class'],
    pattern: Buffer.from([0xca, 0xfe, 0xba, 0xbe]),
    suspicious: true,
  },

  // Scripts
  {
    name: 'Shell Script',
    mimeType: 'text/x-shellscript',
    extensions: ['.sh', '.bash'],
    pattern: Buffer.from('#!/bin/sh'),
    suspicious: true,
  },
  {
    name: 'Bash Script',
    mimeType: 'text/x-shellscript',
    extensions: ['.sh', '.bash'],
    pattern: Buffer.from('#!/bin/bash'),
    suspicious: true,
  },
  {
    name: 'Python Script',
    mimeType: 'text/x-python',
    extensions: ['.py'],
    pattern: Buffer.from('#!/usr/bin/env python'),
    suspicious: true,
  },
  {
    name: 'Node.js Script',
    mimeType: 'text/javascript',
    extensions: ['.js', '.mjs'],
    pattern: Buffer.from('#!/usr/bin/env node'),
    suspicious: true,
  },
  {
    name: 'PHP Script',
    mimeType: 'application/x-php',
    extensions: ['.php'],
    pattern: Buffer.from('<?php'),
    suspicious: true,
  },

  // Archives
  {
    name: 'ZIP Archive',
    mimeType: 'application/zip',
    extensions: ['.zip'],
    pattern: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  },
  {
    name: 'RAR Archive',
    mimeType: 'application/x-rar-compressed',
    extensions: ['.rar'],
    pattern: Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]),
  },
  {
    name: '7-Zip Archive',
    mimeType: 'application/x-7z-compressed',
    extensions: ['.7z'],
    pattern: Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
  },
  {
    name: 'Gzip Archive',
    mimeType: 'application/gzip',
    extensions: ['.gz'],
    pattern: Buffer.from([0x1f, 0x8b]),
  },

  // Images
  {
    name: 'JPEG Image',
    mimeType: 'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
    pattern: Buffer.from([0xff, 0xd8, 0xff]),
  },
  {
    name: 'PNG Image',
    mimeType: 'image/png',
    extensions: ['.png'],
    pattern: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    name: 'GIF Image',
    mimeType: 'image/gif',
    extensions: ['.gif'],
    pattern: Buffer.from('GIF8'),
  },
  {
    name: 'BMP Image',
    mimeType: 'image/bmp',
    extensions: ['.bmp'],
    pattern: Buffer.from([0x42, 0x4d]),
  },
  {
    name: 'WebP Image',
    mimeType: 'image/webp',
    extensions: ['.webp'],
    pattern: Buffer.from('RIFF'),
    detect: (buffer: Buffer) => {
      if (buffer.length < 12) return false;
      return (
        buffer.slice(0, 4).equals(Buffer.from('RIFF')) &&
        buffer.slice(8, 12).equals(Buffer.from('WEBP'))
      );
    },
  },

  // Documents
  {
    name: 'PDF Document',
    mimeType: 'application/pdf',
    extensions: ['.pdf'],
    pattern: Buffer.from('%PDF'),
  },
  {
    name: 'Microsoft Office Document (2007+)',
    mimeType: 'application/vnd.openxmlformats-officedocument',
    extensions: ['.docx', '.xlsx', '.pptx'],
    pattern: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    detect: (buffer: Buffer) => {
      if (buffer.length < 30) return false;
      // Check for ZIP + Office XML namespaces
      const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));
      return (
        buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) &&
        (content.includes('word/') || content.includes('xl/') || content.includes('ppt/'))
      );
    },
  },
  {
    name: 'RTF Document',
    mimeType: 'application/rtf',
    extensions: ['.rtf'],
    pattern: Buffer.from('{\\rtf'),
  },

  // Media
  {
    name: 'MP3 Audio',
    mimeType: 'audio/mpeg',
    extensions: ['.mp3'],
    pattern: Buffer.from([0xff, 0xfb]),
  },
  {
    name: 'MP4 Video',
    mimeType: 'video/mp4',
    extensions: ['.mp4'],
    pattern: Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
  },
  {
    name: 'AVI Video',
    mimeType: 'video/x-msvideo',
    extensions: ['.avi'],
    pattern: Buffer.from('RIFF'),
    detect: (buffer: Buffer) => {
      if (buffer.length < 12) return false;
      return (
        buffer.slice(0, 4).equals(Buffer.from('RIFF')) &&
        buffer.slice(8, 12).equals(Buffer.from('AVI '))
      );
    },
  },

  // Specialized formats
  {
    name: 'SQLite Database',
    mimeType: 'application/x-sqlite3',
    extensions: ['.db', '.sqlite', '.sqlite3'],
    pattern: Buffer.from('SQLite format 3'),
  },
  {
    name: 'WebAssembly Module',
    mimeType: 'application/wasm',
    extensions: ['.wasm'],
    pattern: Buffer.from([0x00, 0x61, 0x73, 0x6d]),
    suspicious: true,
  },
];

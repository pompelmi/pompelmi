---
title: "Building Secure File Uploads in Next.js with App Router and Pompelmi"
description: "Master secure file uploads in Next.js 13+ using App Router, Server Actions, and Pompelmi's advanced security features for enterprise-grade protection."
pubDate: 2024-03-15
author: "Pompelmi Team"
tags: ["nextjs", "app-router", "security", "react", "server-actions"]
---

# Building Secure File Uploads in Next.js with App Router and Pompelmi

Next.js 13's App Router revolutionized how we handle server interactions, and file uploads are no exception. With Server Actions and the new routing paradigm, we can build incredibly secure and user-friendly file upload experiences. In this comprehensive guide, we'll explore how to implement bulletproof file upload security using Pompelmi with Next.js.

## Why File Upload Security Matters in Next.js Apps

Next.js applications often handle sensitive user data and serve as the backbone for modern web applications. A single compromised upload can lead to:

- **Server-side execution** of malicious code
- **Client-side attacks** through XSS in uploaded files
- **Resource exhaustion** from ZIP bombs or large files
- **Data exfiltration** through uploaded backdoors

## Setting Up the Foundation

Let's start with a basic Next.js 13+ project structure:

```bash
npm create next-app@latest secure-upload-app
cd secure-upload-app
npm install pompelmi
```

### Project Structure

```
src/
├── app/
│   ├── upload/
│   │   ├── page.tsx          # Upload UI
│   │   └── actions.ts        # Server Actions
│   ├── api/
│   │   └── upload/
│   │       └── route.ts      # API Route (alternative)
│   └── globals.css
├── components/
│   ├── FileUpload.tsx        # Client component
│   ├── UploadProgress.tsx    # Progress indicator
│   └── SecurityBadge.tsx     # Security status
└── lib/
    ├── upload-config.ts      # Pompelmi configuration
    └── security-utils.ts     # Security utilities
```

## Server Actions Implementation

### Secure Upload Action

First, let's create a robust Server Action with Pompelmi:

```typescript
// app/upload/actions.ts
'use server'

import { NextFileScanner, type ScanResult } from 'pompelmi/next';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';

// Configure Pompelmi scanner
const scanner = new NextFileScanner({
  // Basic security policies
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf',
    'text/plain'
  ],
  
  // Advanced ZIP protection
  zipLimits: {
    maxEntries: 100,
    maxDepth: 5,
    maxTotalSize: 50 * 1024 * 1024,
    scanContents: true,
    blockSuspiciousStructures: true
  },
  
  // Content analysis
  enableHeuristics: true,
  enableYARA: process.env.NODE_ENV === 'production',
  
  // Sanitization options
  sanitization: {
    stripMetadata: true,
    removeComments: true,
    sanitizeFilenames: true
  }
});

export interface UploadResult {
  success: boolean;
  filename?: string;
  scanResult?: ScanResult;
  error?: string;
  securityWarnings?: string[];
}

export async function uploadFile(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get('file') as File;
    
    if (!file) {
      return { 
        success: false, 
        error: 'No file provided' 
      };
    }
    
    // Validate file size before processing
    if (file.size > 10 * 1024 * 1024) {
      return { 
        success: false, 
        error: 'File too large. Maximum size is 10MB.' 
      };
    }
    
    // Convert File to Buffer for scanning
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Security scan with Pompelmi
    const scanResult = await scanner.scanBuffer(buffer, {
      filename: file.name,
      mimeType: file.type
    });
    
    // Handle security verdict
    if (scanResult.verdict === 'malicious') {
      // Log security event
      console.warn('Malicious file upload attempt:', {
        filename: file.name,
        size: file.size,
        type: file.type,
        threats: scanResult.findings
      });
      
      return {
        success: false,
        error: 'File rejected due to security concerns',
        scanResult
      };
    }
    
    // Generate safe filename
    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${sanitizeFilename(file.name)}`;
    
    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    // Save file
    const filePath = join(uploadDir, safeFilename);
    await writeFile(filePath, buffer);
    
    // Revalidate any relevant pages
    revalidatePath('/dashboard');
    revalidatePath('/files');
    
    // Success response
    return {
      success: true,
      filename: safeFilename,
      scanResult,
      securityWarnings: scanResult.verdict === 'suspicious' 
        ? scanResult.findings.map(f => f.description)
        : undefined
    };
    
  } catch (error) {
    console.error('Upload error:', error);
    return { 
      success: false, 
      error: 'Upload failed. Please try again.' 
    };
  }
}

// Utility function to sanitize filenames
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100); // Limit length
}

// Multiple file upload action
export async function uploadMultipleFiles(formData: FormData): Promise<UploadResult[]> {
  const files = formData.getAll('files') as File[];
  
  if (files.length === 0) {
    return [{ success: false, error: 'No files provided' }];
  }
  
  if (files.length > 5) {
    return [{ success: false, error: 'Maximum 5 files allowed' }];
  }
  
  // Process files in parallel with concurrency limit
  const results: UploadResult[] = [];
  
  for (const file of files) {
    const fileData = new FormData();
    fileData.append('file', file);
    const result = await uploadFile(fileData);
    results.push(result);
    
    // Stop processing if we hit a malicious file (fail-fast)
    if (result.scanResult?.verdict === 'malicious') {
      break;
    }
  }
  
  return results;
}
```

### Advanced Security Configuration

```typescript
// lib/upload-config.ts
import { NextFileScanner } from 'pompelmi/next';

export const createProductionScanner = () => new NextFileScanner({
  // Strict production settings
  maxFileSize: 5 * 1024 * 1024, // 5MB in production
  
  // Comprehensive MIME validation
  mimeValidation: {
    strict: true,
    allowList: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ],
    denyList: [
      'application/x-executable',
      'application/x-msdownload',
      'text/html' // Prevent HTML uploads (XSS risk)
    ],
    customValidators: {
      'image/jpeg': validateJPEG,
      'application/pdf': validatePDF
    }
  },
  
  // Enhanced ZIP protection
  zipLimits: {
    maxEntries: 50,
    maxDepth: 3,
    maxTotalSize: 25 * 1024 * 1024,
    maxEntrySize: 5 * 1024 * 1024,
    maxCompressionRatio: 50,
    scanContents: true,
    blockSuspiciousStructures: true,
    allowedExtensions: ['.txt', '.md', '.json', '.csv']
  },
  
  // YARA scanning for advanced threats
  yara: {
    enabled: true,
    rules: [
      'rules/malware.yar',
      'rules/webshells.yar',
      'rules/office-macros.yar'
    ],
    timeout: 10000 // 10 seconds
  },
  
  // Content analysis
  contentAnalysis: {
    scanText: true,
    detectSuspiciousPatterns: true,
    analyzeMetadata: true,
    checkEmbeddedFiles: true
  },
  
  // Logging and monitoring
  monitoring: {
    logLevel: 'info',
    enableMetrics: true,
    alertOnThreats: true,
    securityEventWebhook: process.env.SECURITY_WEBHOOK_URL
  }
});

// Custom validators
function validateJPEG(buffer: Buffer): boolean {
  return buffer.length >= 2 && 
         buffer[0] === 0xFF && 
         buffer[1] === 0xD8;
}

function validatePDF(buffer: Buffer): boolean {
  return buffer.length >= 4 &&
         buffer.toString('ascii', 0, 4) === '%PDF';
}
```

## Client-Side Implementation

### Modern Upload Component

```tsx
// components/FileUpload.tsx
'use client'

import { useState, useRef } from 'react';
import { uploadFile, uploadMultipleFiles, type UploadResult } from '@/app/upload/actions';
import { UploadProgress } from './UploadProgress';
import { SecurityBadge } from './SecurityBadge';

interface FileUploadProps {
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  onUploadComplete?: (results: UploadResult[]) => void;
}

export function FileUpload({ 
  multiple = false, 
  accept = "image/*,application/pdf",
  maxSize = 10 * 1024 * 1024,
  onUploadComplete 
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFiles = Array.from(fileList);
    
    // Validate file sizes client-side
    const validFiles = newFiles.filter(file => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is ${formatBytes(maxSize)}.`);
        return false;
      }
      return true;
    });
    
    if (multiple) {
      setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    } else {
      setFiles(validFiles.slice(0, 1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setResults([]);
    
    try {
      const formData = new FormData();
      
      if (multiple) {
        files.forEach(file => formData.append('files', file));
        const uploadResults = await uploadMultipleFiles(formData);
        setResults(uploadResults);
        onUploadComplete?.(uploadResults);
      } else {
        formData.append('file', files[0]);
        const uploadResult = await uploadFile(formData);
        setResults([uploadResult]);
        onUploadComplete?.([uploadResult]);
      }
      
      // Clear files on success
      const allSuccessful = results.every(r => r.success);
      if (allSuccessful) {
        setFiles([]);
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      setResults([{ success: false, error: 'Upload failed' }]);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            dragOver ? 'bg-blue-500' : 'bg-gray-100'
          }`}>
            <svg className={`w-8 h-8 ${dragOver ? 'text-white' : 'text-gray-400'}`} 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">
              {dragOver ? 'Drop files here' : 'Drag & drop files'}
            </h3>
            <p className="text-gray-600 mt-1">
              or click to browse • Max {formatBytes(maxSize)} • {multiple ? 'Multiple files' : 'Single file'}
            </p>
          </div>
          
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select Files
          </button>
        </div>
        
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">Selected Files ({files.length})</h4>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Scanning and Uploading...
            </span>
          ) : (
            `Upload ${files.length} ${files.length === 1 ? 'File' : 'Files'}`
          )}
        </button>
      )}

      {/* Progress */}
      {uploading && <UploadProgress />}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">Upload Results</h4>
          {results.map((result, index) => (
            <div key={index} className={`p-4 rounded-lg border ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {result.success ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                  )}
                  <div>
                    <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.success ? 'Upload Successful' : 'Upload Failed'}
                    </p>
                    {result.filename && (
                      <p className="text-sm text-gray-600">File: {result.filename}</p>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                </div>
                
                {result.scanResult && (
                  <SecurityBadge scanResult={result.scanResult} />
                )}
              </div>
              
              {result.securityWarnings && result.securityWarnings.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800">Security Warnings:</p>
                  <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                    {result.securityWarnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Utility function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

### Security Badge Component

```tsx
// components/SecurityBadge.tsx
import { ScanResult } from 'pompelmi/next';

interface SecurityBadgeProps {
  scanResult: ScanResult;
}

export function SecurityBadge({ scanResult }: SecurityBadgeProps) {
  const getBadgeStyle = () => {
    switch (scanResult.verdict) {
      case 'clean':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'suspicious':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'malicious':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIcon = () => {
    switch (scanResult.verdict) {
      case 'clean':
        return '✓';
      case 'suspicious':
        return '⚠';
      case 'malicious':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getBadgeStyle()}`}>
      <span className="mr-1">{getIcon()}</span>
      {scanResult.verdict.toUpperCase()}
    </div>
  );
}
```

## API Route Alternative

For cases where Server Actions aren't suitable:

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { NextFileScanner } from 'pompelmi/next';

const scanner = new NextFileScanner({
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    const bytes = await file.arrayBuffer();
    const scanResult = await scanner.scanBuffer(Buffer.from(bytes), {
      filename: file.name,
      mimeType: file.type
    });
    
    if (scanResult.verdict === 'malicious') {
      return NextResponse.json(
        { 
          error: 'File rejected',
          verdict: scanResult.verdict,
          threats: scanResult.findings
        },
        { status: 422 }
      );
    }
    
    // Process file...
    
    return NextResponse.json({
      success: true,
      filename: file.name,
      scanResult
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

## Testing and Validation

```typescript
// __tests__/upload.test.ts
import { uploadFile } from '@/app/upload/actions';

describe('File Upload Security', () => {
  it('should reject malicious files', async () => {
    const maliciousFile = new File(['malicious content'], 'virus.exe', {
      type: 'application/x-executable'
    });
    
    const formData = new FormData();
    formData.append('file', maliciousFile);
    
    const result = await uploadFile(formData);
    
    expect(result.success).toBe(false);
    expect(result.scanResult?.verdict).toBe('malicious');
  });
  
  it('should accept clean images', async () => {
    // Mock clean JPEG file
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
    const cleanImage = new File([jpegHeader], 'photo.jpg', {
      type: 'image/jpeg'
    });
    
    const formData = new FormData();
    formData.append('file', cleanImage);
    
    const result = await uploadFile(formData);
    
    expect(result.success).toBe(true);
    expect(result.scanResult?.verdict).toBe('clean');
  });
});
```

## Deployment Considerations

### Environment Configuration

```bash
# .env.local
SECURITY_WEBHOOK_URL=https://your-monitoring-service.com/webhooks/security
YARA_RULES_PATH=/app/yara-rules
MAX_UPLOAD_SIZE=10485760
ENABLE_YARA_SCANNING=true
```

### Production Security Headers

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers for upload endpoints
  if (request.nextUrl.pathname.startsWith('/api/upload') || 
      request.nextUrl.pathname.startsWith('/upload')) {
    
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  
  return response;
}
```

## Conclusion

Implementing secure file uploads in Next.js with Pompelmi provides enterprise-grade protection while maintaining excellent developer experience. The combination of Server Actions, client-side validation, and Pompelmi's advanced scanning creates multiple layers of defense against file-based attacks.

Key takeaways:
- Always validate files server-side, even with client-side checks
- Use Server Actions for type-safe, server-side processing
- Implement progressive enhancement with proper error handling
- Monitor and log all security events
- Test your upload security thoroughly

Ready for more advanced techniques? Check out our [YARA Integration Guide](/blog/yara-integration-guide) for custom threat detection rules.
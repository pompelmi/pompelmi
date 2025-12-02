import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BinaryNinjaScanner, createBinaryNinjaScanner } from '../src/index';

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

// Mock fs/promises  
vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn().mockResolvedValue('/tmp/pompelmi-binja-test'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

// Mock util
vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

describe('BinaryNinjaScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Skip tests in CI environment since external dependencies may not be available
  const runTests = !process.env.CI;

  it('should create scanner with default options', () => {
    const scanner = new BinaryNinjaScanner();
    expect(scanner).toBeInstanceOf(BinaryNinjaScanner);
  });

  it('should create scanner with custom options', () => {
    const options = {
      timeout: 60000,
      depth: 'deep' as const,
      enableHeuristics: false,
      pythonPath: '/usr/bin/python3',
      binaryNinjaPath: '/opt/binaryninja'
    };
    
    const scanner = new BinaryNinjaScanner(options);
    expect(scanner).toBeInstanceOf(BinaryNinjaScanner);
  });

  it.skipIf(!runTests)('should handle successful analysis', async () => {
    const { execFile } = await import('child_process');
    vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
      process.nextTick(() => {
        callback(null, {
          stdout: JSON.stringify({
            success: true,
            engine: 'binaryninja-hlil',
            functions: [{
              name: 'main',
              address: '0x1000',
              size: 100,
              complexity: 5,
              callCount: 3,
              suspiciousCalls: []
            }],
            matches: [{
              rule: 'test_rule',
              severity: 'medium',
              engine: 'binaryninja-hlil',
              confidence: 0.8,
              meta: { function: 'main' }
            }],
            meta: {
              analysisTime: 1.5,
              binaryFormat: 'PE',
              architecture: 'x86_64'
            }
          }),
          stderr: ''
        });
      });
    } as any);

    const scanner = new BinaryNinjaScanner();
    const testBytes = new Uint8Array([0x4D, 0x5A]); // PE header
    
    const result = await scanner.analyze(testBytes);
    
    expect(result.success).toBe(true);
    expect(result.engine).toBe('binaryninja-hlil');
    expect(result.functions).toHaveLength(1);
    expect(result.matches).toHaveLength(1);
    expect(result.functions[0].name).toBe('main');
    expect(result.matches[0].rule).toBe('test_rule');
  }, 10000);

  it.skipIf(!runTests)('should handle analysis failure', async () => {
    const { execFile } = await import('child_process');
    vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
      process.nextTick(() => {
        callback(null, {
          stdout: JSON.stringify({
            success: false,
            error: 'Binary format not supported'
          }),
          stderr: ''
        });
      });
    } as any);

    const scanner = new BinaryNinjaScanner();
    const testBytes = new Uint8Array([0x00, 0x01]); // Invalid header
    
    const result = await scanner.analyze(testBytes);
    
    expect(result.success).toBe(false);
    expect(result.functions).toHaveLength(0);
    expect(result.matches).toHaveLength(0);
    expect(result.meta?.error).toBe('Binary format not supported');
  }, 10000);

  it.skipIf(!runTests)('should handle timeout errors', async () => {
    const { execFile } = await import('child_process');
    vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
      process.nextTick(() => {
        const error = new Error('Process timed out') as any;
        error.killed = true;
        error.signal = 'SIGTERM';
        callback(error);
      });
    } as any);

    const scanner = new BinaryNinjaScanner({ timeout: 1000 });
    const testBytes = new Uint8Array([0x4D, 0x5A]);
    
    const result = await scanner.analyze(testBytes);
    
    expect(result.success).toBe(false);
    expect(result.meta?.error).toBe('Analysis timeout');
  }, 10000);

  it.skipIf(!runTests)('should handle missing Binary Ninja', async () => {
    const { execFile } = await import('child_process');
    vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
      process.nextTick(() => {
        const error = new Error('python3 ENOENT') as any;
        error.code = 'ENOENT';
        callback(error);
      });
    } as any);

    const scanner = new BinaryNinjaScanner();
    const testBytes = new Uint8Array([0x4D, 0x5A]);
    
    const result = await scanner.analyze(testBytes);
    
    expect(result.success).toBe(false);
    expect(result.meta?.error).toBe('Binary Ninja Python executable not found');
  }, 10000);

  it.skipIf(!runTests)('should return only matches from scan method', async () => {
    const { execFile } = await import('child_process');
    vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
      process.nextTick(() => {
        callback(null, {
          stdout: JSON.stringify({
            success: true,
            matches: [{
              rule: 'suspicious_api_call',
              severity: 'high',
              engine: 'binaryninja-hlil',
              confidence: 0.9
            }],
            functions: [],
            meta: {}
          }),
          stderr: ''
        });
      });
    } as any);

    const scanner = new BinaryNinjaScanner();
    const testBytes = new Uint8Array([0x4D, 0x5A]);
    
    const matches = await scanner.scan(testBytes);
    
    expect(matches).toHaveLength(1);
    expect(matches[0].rule).toBe('suspicious_api_call');
    expect(matches[0].severity).toBe('high');
  }, 10000);
  });
});

describe('createBinaryNinjaScanner', () => {
  it('should create scanner instance', () => {
    const scanner = createBinaryNinjaScanner();
    expect(scanner).toBeInstanceOf(BinaryNinjaScanner);
  });

  it('should pass options to scanner', () => {
    const options = { timeout: 45000, depth: 'minimal' as const };
    const scanner = createBinaryNinjaScanner(options);
    expect(scanner).toBeInstanceOf(BinaryNinjaScanner);
  });
});
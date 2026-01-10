import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { scan } from '@pompelmi/core';
import { readFileSync } from 'node:fs';

describe('scan command integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'pompelmi-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should scan a single file', async () => {
    const filePath = join(testDir, 'test.txt');
    await writeFile(filePath, 'Hello World');

    const buffer = readFileSync(filePath);
    const result = await scan(buffer);

    expect(result.verdict).toBe('clean');
  });

  it('should detect EICAR test file', async () => {
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const filePath = join(testDir, 'eicar.txt');
    await writeFile(filePath, eicar);

    const buffer = readFileSync(filePath);
    const result = await scan(buffer);

    expect(result.verdict).toBe('malicious');
    expect(result.findings).toContain('EICAR test signature');
  });

  it('should detect executable files as suspicious', async () => {
    const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const filePath = join(testDir, 'test.exe');
    await writeFile(filePath, peHeader);

    const buffer = readFileSync(filePath);
    const result = await scan(buffer);

    expect(result.verdict).toBe('suspicious');
  });
});

    await writeFile(join(testDir, 'file1.txt'), 'Content 1');
    await writeFile(join(testDir, 'subdir', 'file2.txt'), 'Content 2');

    const results = await scanCommand(testDir, {
      recursive: true,
      format: 'json',
      ext: [],
      maxSize: 10 * 1024 * 1024,
      failOn: 'malicious',
      quiet: false,
      stream: false,
    });

    expect(results.length).toBeGreaterThanOrEqual(2);
    const paths = results.map((r) => r.filePath);
    expect(paths).toContain(join(testDir, 'file1.txt'));
    expect(paths).toContain(join(testDir, 'subdir', 'file2.txt'));
  });

  it('should filter by file extensions', async () => {
    await writeFile(join(testDir, 'file.txt'), 'Text file');
    await writeFile(join(testDir, 'file.js'), 'JavaScript file');
    await writeFile(join(testDir, 'file.json'), 'JSON file');

    const results = await scanCommand(testDir, {
      recursive: false,
      format: 'json',
      ext: ['.txt', '.js'],
      maxSize: 10 * 1024 * 1024,
      failOn: 'malicious',
      quiet: false,
      stream: false,
    });

    expect(results.length).toBe(2);
    const paths = results.map((r) => r.filePath);
    expect(paths).toContain(join(testDir, 'file.txt'));
    expect(paths).toContain(join(testDir, 'file.js'));
    expect(paths).not.toContain(join(testDir, 'file.json'));
  });

  it('should skip files larger than maxSize', async () => {
    const smallFile = join(testDir, 'small.txt');
    const largeFile = join(testDir, 'large.txt');
    
    await writeFile(smallFile, 'Small');
    await writeFile(largeFile, Buffer.alloc(2 * 1024 * 1024)); // 2MB

    const results = await scanCommand(testDir, {
      recursive: false,
      format: 'json',
      ext: [],
      maxSize: 1024 * 1024, // 1MB limit
      failOn: 'malicious',
      quiet: false,
      stream: false,
    });

    const paths = results.map((r) => r.filePath);
    expect(paths).toContain(smallFile);
    expect(paths).not.toContain(largeFile);
  });

  it('should skip dotfiles', async () => {
    await writeFile(join(testDir, '.hidden'), 'Hidden file');
    await writeFile(join(testDir, 'visible.txt'), 'Visible file');

    const results = await scanCommand(testDir, {
      recursive: false,
      format: 'json',
      ext: [],
      maxSize: 10 * 1024 * 1024,
      failOn: 'malicious',
      quiet: false,
      stream: false,
    });

    const paths = results.map((r) => r.filePath);
    expect(paths).not.toContain(join(testDir, '.hidden'));
    expect(paths).toContain(join(testDir, 'visible.txt'));
  });

  it('should skip node_modules directory', async () => {
    await mkdir(join(testDir, 'node_modules'));
    await writeFile(join(testDir, 'node_modules', 'package.js'), 'Code');
    await writeFile(join(testDir, 'app.js'), 'App code');

    const results = await scanCommand(testDir, {
      recursive: true,
      format: 'json',
      ext: [],
      maxSize: 10 * 1024 * 1024,
      failOn: 'malicious',
      quiet: false,
      stream: false,
    });

    const paths = results.map((r) => r.filePath);
    expect(paths).not.toContain(join(testDir, 'node_modules', 'package.js'));
    expect(paths).toContain(join(testDir, 'app.js'));
  });

  it('should use stream scanner when stream option is true', async () => {
    const filePath = join(testDir, 'test.txt');
    await writeFile(filePath, 'Test content');

    const results = await scanCommand(filePath, {
      recursive: false,
      format: 'json',
      ext: [],
      maxSize: 10 * 1024 * 1024,
      failOn: 'malicious',
      quiet: false,
      stream: true, // Force stream scanner
    });

    expect(results).toHaveLength(1);
    expect(results[0].clean).toBe(true);
  });
});

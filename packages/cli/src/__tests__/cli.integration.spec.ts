import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  let testDir: string;
  const cliPath = join(__dirname, '../../../bin/pompelmi.mjs');

  beforeAll(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'pompelmi-cli-test-'));
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should show help when no arguments provided', async () => {
    const { stdout } = await execAsync(`node ${cliPath} --help`);
    
    expect(stdout).toContain('pompelmi');
    expect(stdout).toContain('scan');
    expect(stdout).toContain('watch');
  });

  it('should show version', async () => {
    const { stdout } = await execAsync(`node ${cliPath} --version`);
    
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should scan a clean file and exit with 0', async () => {
    const filePath = join(testDir, 'clean.txt');
    await writeFile(filePath, 'Hello World');

    const { stdout, stderr } = await execAsync(`node ${cliPath} scan ${filePath}`);
    
    expect(stdout).toContain('clean.txt');
    expect(stdout).toContain('Clean');
    expect(stderr).toBe('');
  });

  it('should detect EICAR and exit with 1', async () => {
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const filePath = join(testDir, 'eicar.txt');
    await writeFile(filePath, eicar);

    try {
      await execAsync(`node ${cliPath} scan ${filePath} --fail-on malicious`);
      expect.fail('Should have exited with code 1');
    } catch (error: any) {
      expect(error.code).toBe(1);
      expect(error.stdout).toContain('eicar.txt');
      expect(error.stdout).toContain('Threat');
    }
  });

  it('should output JSON format', async () => {
    const filePath = join(testDir, 'test.txt');
    await writeFile(filePath, 'Test content');

    const { stdout } = await execAsync(`node ${cliPath} scan ${filePath} --format json`);
    
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty('summary');
    expect(parsed).toHaveProperty('results');
    expect(parsed.summary.totalFiles).toBeGreaterThan(0);
  });

  it('should output summary format', async () => {
    const filePath = join(testDir, 'test2.txt');
    await writeFile(filePath, 'Test content');

    const { stdout } = await execAsync(`node ${cliPath} scan ${filePath} --format summary`);
    
    expect(stdout).toContain('TOTAL_FILES=');
    expect(stdout).toContain('CLEAN_FILES=');
    expect(stdout).toContain('THREATS_FOUND=');
    expect(stdout).toContain('HAS_THREATS=');
  });

  it('should filter by file extension', async () => {
    await writeFile(join(testDir, 'file.js'), 'JavaScript');
    await writeFile(join(testDir, 'file.txt'), 'Text');

    const { stdout } = await execAsync(`node ${cliPath} scan ${testDir} --ext .js --format json`);
    
    const parsed = JSON.parse(stdout);
    expect(parsed.results.some((r: any) => r.filePath.endsWith('.js'))).toBe(true);
    expect(parsed.results.some((r: any) => r.filePath.endsWith('.txt'))).toBe(false);
  });

  it('should handle recursive scanning', async () => {
    const subdir = join(testDir, 'subdir');
    await mkdtemp(subdir);
    await writeFile(join(subdir, 'nested.txt'), 'Nested file');

    const { stdout } = await execAsync(`node ${cliPath} scan ${testDir} --recursive --format json`);
    
    const parsed = JSON.parse(stdout);
    expect(parsed.results.some((r: any) => r.filePath.includes('nested.txt'))).toBe(true);
  });

  it('should respect quiet mode', async () => {
    const filePath = join(testDir, 'quiet-test.txt');
    await writeFile(filePath, 'Clean file');

    const { stdout } = await execAsync(`node ${cliPath} scan ${filePath} --quiet`);
    
    // Quiet mode should not show clean files
    expect(stdout.trim()).toBe('');
  });

  it('should handle fail-on never policy', async () => {
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const filePath = join(testDir, 'eicar-never.txt');
    await writeFile(filePath, eicar);

    // Should not exit with error when fail-on=never
    const { stdout } = await execAsync(`node ${cliPath} scan ${filePath} --fail-on never`);
    
    expect(stdout).toContain('Threat');
  });
});

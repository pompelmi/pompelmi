import { describe, it, expect } from 'vitest';
import { scan } from '../scan.js';

describe('scan() with polyglot detection', () => {
  it('should detect PE executables as suspicious', async () => {
    const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    
    const result = await scan(peHeader);
    
    expect(result.verdict).toBe('suspicious');
    expect(result.findings.some(f => f.includes('PE'))).toBe(true);
  });

  it('should detect ELF executables as suspicious', async () => {
    const elfHeader = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
    
    const result = await scan(elfHeader);
    
    expect(result.verdict).toBe('suspicious');
    expect(result.findings.some(f => f.includes('ELF'))).toBe(true);
  });

  it('should detect PHP backdoor in image as suspicious', async () => {
    const maliciousImage = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
      Buffer.from('<?php system($_GET["cmd"]); ?>'), // PHP backdoor
    ]);
    
    const result = await scan(maliciousImage);
    
    expect(result.verdict).toBe('suspicious');
    expect(result.findings.some(f => f.includes('embedded'))).toBe(true);
  });

  it('should detect polyglot files', async () => {
    const polyglot = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP signature
      Buffer.alloc(50),
      Buffer.from([0x4d, 0x5a]), // PE signature
    ]);
    
    const result = await scan(polyglot);
    
    expect(result.verdict).toBe('suspicious');
    expect(result.findings.some(f => f.toLowerCase().includes('polyglot'))).toBe(true);
  });

  it('should detect EICAR as malicious (higher priority than polyglot)', async () => {
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    
    const result = await scan(eicar);
    
    expect(result.verdict).toBe('malicious');
    expect(result.findings).toContain('EICAR test signature');
  });

  it('should detect obfuscated scripts', async () => {
    const obfuscated = Buffer.from('eval(atob("dmFyIG1hbGljaW91cyA9ICJjb2RlIjs="));');
    
    const result = await scan(obfuscated);
    
    expect(result.verdict).toBe('suspicious');
    expect(result.findings.some(f => f.includes('Obfuscated'))).toBe(true);
  });

  it('should allow clean images without embedded code', async () => {
    const cleanImage = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG header
      Buffer.from('Normal image data'),
    ]);
    
    const result = await scan(cleanImage);
    
    expect(result.verdict).toBe('clean');
    expect(result.findings).toHaveLength(0);
  });

  it('should allow clean text files', async () => {
    const cleanText = Buffer.from('Hello World! This is a normal text file.');
    
    const result = await scan(cleanText);
    
    expect(result.verdict).toBe('clean');
    expect(result.findings).toHaveLength(0);
  });

  it('should report multiple findings for complex threats', async () => {
    const complexThreat = Buffer.concat([
      Buffer.from([0x4d, 0x5a]), // PE header
      Buffer.from('<?php eval($_POST["x"]); ?>'), // PHP backdoor
      Buffer.from('eval(atob("payload"));'), // Obfuscated JS
    ]);
    
    const result = await scan(complexThreat);
    
    expect(result.verdict).toBe('suspicious');
    expect(result.findings.length).toBeGreaterThan(1);
  });
});

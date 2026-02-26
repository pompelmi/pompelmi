/**
 * @pompelmi/core
 *
 * Canonical API surface used by framework adapters (@pompelmi/cli,
 * @pompelmi/nestjs-integration, etc.).
 *
 * This package is a thin facade over the root `pompelmi` package that
 * provides a unified `scan()` function accepting Buffer, Readable stream,
 * or a file-path string.
 */
import { Readable } from 'node:stream';
import { scanBytes, scanFile, type ScanOptions, type ScanReport } from 'pompelmi';

export type { ScanOptions, ScanReport };

// Re-export everything else from the root pompelmi package so consumers
// can import any public API via '@pompelmi/core'.
export * from 'pompelmi';

/**
 * Scan a Buffer, Readable stream, or file-path string for malware.
 *
 * @example
 * const report = await scan(req.file.buffer);
 * const report = await scan('/uploads/file.pdf');
 * const report = await scan(fs.createReadStream('file.zip'));
 */
export async function scan(
  input: Buffer | Readable | string,
  opts?: ScanOptions,
): Promise<ScanReport> {
  if (typeof input === 'string') {
    return scanFile(input, opts);
  }

  if (Buffer.isBuffer(input)) {
    return scanBytes(new Uint8Array(input.buffer, input.byteOffset, input.byteLength), opts);
  }

  // Readable stream — collect chunks then scan
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    input.on('data', (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    input.on('end', resolve);
    input.on('error', reject);
  });
  const buf = Buffer.concat(chunks);
  return scanBytes(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), opts);
}

/**
 * Returns `true` if the input is detected as malicious.
 *
 * @example
 * if (await isMalware(fileBuffer)) throw new ForbiddenException('Malware detected');
 */
export async function isMalware(
  input: Buffer | Readable | string,
  opts?: ScanOptions,
): Promise<boolean> {
  const report = await scan(input, opts);
  return report.verdict === 'malicious';
}

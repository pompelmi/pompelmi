
export interface MockScanner {
  Verdict: { readonly Clean: symbol; readonly Malicious: symbol; readonly ScanError: symbol };
  scan(filePath: string): Promise<symbol>;
  scanBuffer(buffer: Buffer | Uint8Array): Promise<symbol>;
  scanStream(stream: NodeJS.ReadableStream): Promise<symbol>;
  scanS3(opts: Record<string, unknown>): Promise<symbol>;
  /** The verdict this scanner always resolves to */
  _verdict: symbol;
  /** Virus name label — only present on mockInfected() scanners */
  virusName?: string;
}

/**
 * Creates a mock pompelmi scanner where every scan method resolves to
 * `defaultVerdict`.
 */
export function createMockScanner(defaultVerdict: symbol): MockScanner;

/** Returns a mock scanner that always resolves to Verdict.Clean */
export function mockClean(): MockScanner;

/**
 * Returns a mock scanner that always resolves to Verdict.Malicious.
 * The `virusName` is stored as `scanner.virusName` for test assertions.
 */
export function mockInfected(virusName?: string): MockScanner;

/** Returns a mock scanner that always resolves to Verdict.ScanError */
export function mockScanError(): MockScanner;

/**
 * Wraps a test function with a mock scanner.
 * The scanner is passed as the first argument to `fn`.
 *
 * @example
 * await withMockedPompelmi(Verdict.Malicious, async (scanner) => {
 *   const result = await scanner.scanBuffer(buffer)
 *   expect(result).toBe(Verdict.Malicious)
 * })
 */
export function withMockedPompelmi(verdict: symbol, fn: (scanner: MockScanner) => unknown): Promise<void>;

export { Verdict } from 'pompelmi';

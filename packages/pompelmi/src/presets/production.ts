import { createZipTraversalGuard } from '../scanners/zipTraversalGuard';
import { scanPolyglot } from '../scanners/polyglotDetector';

/**
 * Factory to avoid circular imports with index.ts.
 * Usage:
 *   const scanner = createProductionScannerFactory({
 *     composeScanners, createZipBombGuard, CommonHeuristicsScanner
 *   });
 */
export function createProductionScannerFactory(deps: {
  composeScanners: any,
  createZipBombGuard: any,
  CommonHeuristicsScanner: any
}) {
  const { composeScanners, createZipBombGuard, CommonHeuristicsScanner } = deps;
  return composeScanners(
    [
      ['zip-bomb', createZipBombGuard()],
      ['zip-traversal', createZipTraversalGuard()],
      ['heuristics', CommonHeuristicsScanner],
      ['polyglot', { scan: scanPolyglot }],
    ],
    { parallel: false, stopOn: 'suspicious', tagSourceName: true, timeoutMsPerScanner: 2000 }
  );
}

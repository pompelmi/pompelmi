'use strict';

const { Verdict } = require('pompelmi');

/**
 * Creates a mock pompelmi scanner where all scan methods resolve to
 * the given verdict.
 *
 * @param {symbol} defaultVerdict - One of Verdict.Clean, Verdict.Malicious, or Verdict.ScanError.
 * @returns {{ scan, scanBuffer, scanStream, Verdict }}
 */
function createMockScanner(defaultVerdict) {
  if (defaultVerdict !== Verdict.Clean &&
      defaultVerdict !== Verdict.Malicious &&
      defaultVerdict !== Verdict.ScanError) {
    throw new TypeError('defaultVerdict must be one of Verdict.Clean, Verdict.Malicious, or Verdict.ScanError');
  }

  return {
    Verdict,
    scan:        () => Promise.resolve(defaultVerdict),
    scanBuffer:  () => Promise.resolve(defaultVerdict),
    scanStream:  () => Promise.resolve(defaultVerdict),
    scanS3:      () => Promise.resolve(defaultVerdict),
    _verdict: defaultVerdict,
  };
}

/**
 * Shorthand: returns a mock scanner that always resolves to Verdict.Clean.
 */
function mockClean() {
  return createMockScanner(Verdict.Clean);
}

/**
 * Shorthand: returns a mock scanner that always resolves to Verdict.Malicious.
 * The virusName parameter is stored on the scanner for inspection in tests.
 *
 * @param {string} [virusName='Win.Malware.Test'] - Virus name label (stored as scanner.virusName).
 */
function mockInfected(virusName) {
  const scanner = createMockScanner(Verdict.Malicious);
  scanner.virusName = virusName || 'Win.Malware.Test';
  return scanner;
}

/**
 * Shorthand: returns a mock scanner that always resolves to Verdict.ScanError.
 */
function mockScanError() {
  return createMockScanner(Verdict.ScanError);
}

/**
 * Wraps a test function with a mocked pompelmi scanner.
 * The scanner is passed as the first argument to fn.
 *
 * This is a lightweight helper — for full module-level mocking in Jest/Vitest,
 * use jest.mock() / vi.mock() directly.
 *
 * @param {symbol}   verdict - Verdict to mock.
 * @param {Function} fn      - Test function that receives the mock scanner.
 * @returns {Promise}
 */
function withMockedPompelmi(verdict, fn) {
  const scanner = createMockScanner(verdict);
  try {
    return Promise.resolve(fn(scanner));
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = {
  createMockScanner,
  mockClean,
  mockInfected,
  mockScanError,
  withMockedPompelmi,
  Verdict,
};

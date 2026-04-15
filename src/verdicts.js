'use strict';

/**
 * Opaque Symbol-based scan verdicts.
 *
 * Using Symbols instead of strings makes comparisons typo-proof: a misspelled
 * string silently produces `false`; an unknown Symbol property is `undefined`
 * and fails loudly at the point of use.
 *
 * Usage:
 *   const { Verdict } = require('pompelmi');
 *   const result = await pompelmi.scan(filePath);
 *   if (result === Verdict.Clean)     { /* safe *\/ }
 *   if (result === Verdict.Malicious) { /* quarantine or reject *\/ }
 *   if (result === Verdict.ScanError) { /* clamscan returned exit code 2 *\/ }
 */
const Verdict = Object.freeze({
    Clean:     Symbol('Clean'),
    Malicious: Symbol('Malicious'),
    ScanError: Symbol('ScanError'),
});

module.exports = { Verdict };

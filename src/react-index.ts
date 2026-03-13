/**
 * src/react-index.ts — React entry point for Pompelmi.
 *
 * Re-exports the full browser-safe Pompelmi API plus the React hook.
 * Import from 'pompelmi/react'.
 *
 * Peer dependency: react ^18 || ^19
 *
 * @example
 * import { useFileScanner } from 'pompelmi/react';
 */

// Re-export all browser-safe APIs
export * from './browser-index';

// React hook for controlled file inputs
export { useFileScanner } from './useFileScanner';

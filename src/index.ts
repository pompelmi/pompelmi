// src/index.ts — Browser / React entry point per pompelmi

// Re-export API browser
export { scanFiles } from './scan';
export { validateFile } from './validate';
export { useFileScanner } from './useFileScanner';

// (Se hai aggiunto la funzione con YARA lato browser)
export { scanFilesWithYara } from './scan'; // <-- adatta il path se diverso
// Nuova API: heuristics (magic bytes, SVG/script, JPEG trailer) + YARA opzionale
export { scanFilesWithHeuristicsAndYara, prefilterBrowser } from './scan';
export type { BrowserPolicy, PrefilterResult } from './scan';

// Re-export dei TIPI (nessuna ridichiarazione locale)
export type { YaraMatch } from './yara/index';
export type { NodeScanOptions, NodeFileEntry } from './node/scanDir'; // opzionale
export { scanFilesWithRemoteYara } from './scan/remote';

export * from './types';
export { mapMatchesToVerdict } from './verdict';


export { CommonHeuristicsScanner } from './scanners/common-heuristics';

export { createZipBombGuard } from './scanners/zip-bomb-guard';

export { definePolicy, DEFAULT_POLICY } from './policy';
export { createPresetScanner, type PresetName, type PresetOptions } from './presets';

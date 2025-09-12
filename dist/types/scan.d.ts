import { type PresetName } from './presets';
import type { ScanContext, ScanReport } from './types';
export type ScanOptions = {
    preset?: PresetName;
    ctx?: ScanContext;
};
/** Scan di bytes (browser/node) usando preset (default: zip-basic) */
export declare function scanBytes(input: Uint8Array, opts?: ScanOptions): Promise<ScanReport>;
/** Scan di un file su disco (Node). Import dinamico per non vincolare il bundle browser. */
export declare function scanFile(filePath: string, opts?: Omit<ScanOptions, 'ctx'>): Promise<ScanReport>;
/** Scan multipli File (browser) usando scanBytes + preset di default */
export declare function scanFiles(files: ArrayLike<File>, opts?: Omit<ScanOptions, 'ctx'>): Promise<ScanReport[]>;

import type { YaraMatch } from './yara/index';
type Severity = 'clean' | 'suspicious' | 'malicious';
export type BrowserPolicy = {
    includeExtensions: string[];
    allowedMimeTypes: string[];
    maxFileSizeBytes: number;
    denyScriptableSvg?: boolean;
};
export type PrefilterResult = {
    severity: Severity;
    reasons: string[];
    mime?: string;
};
export declare function prefilterBrowser(bytes: Uint8Array, filename: string, policy: BrowserPolicy): PrefilterResult;
/**
 * Reads an array of File objects via FileReader and returns their text.
 */
export declare function scanFiles(files: File[]): Promise<Array<{
    file: File;
    content: string;
}>>;
export declare function scanFilesWithYara(files: File[], rulesSource: string): Promise<Array<{
    file: File;
    content: string;
    yara: {
        matches: YaraMatch[];
    };
}>>;
/**
 * Scan files with fast browser heuristics + optional YARA.
 * Returns content, prefilter verdict, and YARA matches.
 */
export declare function scanFilesWithHeuristicsAndYara(files: File[], rulesSource: string, policy: BrowserPolicy): Promise<Array<{
    file: File;
    content: string;
    prefilter: PrefilterResult;
    yara: {
        matches: YaraMatch[];
    };
}>>;
export {};

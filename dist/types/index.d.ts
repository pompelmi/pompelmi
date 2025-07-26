export { scanFiles } from './scan';
export { validateFile } from './validate';
export { useFileScanner } from './useFileScanner';
export interface YaraMatch {
    rule: string;
    tags?: string[];
}
export interface ScanOptions {
    enableYara?: boolean;
    yaraRules?: string;
}
export interface FileEntry {
    yara?: {
        matches: YaraMatch[];
    };
}
export interface ScanOptions {
    enableYara?: boolean;
    yaraRules?: string;
    yaraRulesPath?: string;
}
export interface FileEntry {
    yara?: {
        matches: import('./yara/index').YaraMatch[];
    };
}

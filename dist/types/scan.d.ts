import type { YaraMatch } from './yara/index';
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

/**
 * Reads an array of File objects via FileReader and returns their text.
 */
export declare function scanFiles(files: File[]): Promise<Array<{
    file: File;
    content: string;
}>>;

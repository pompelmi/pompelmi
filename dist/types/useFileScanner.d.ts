/**
 * React Hook: handles <input type="file" onChange> with validation + scanning.
 */
export declare function useFileScanner(): {
    results: {
        file: File;
        content: string;
    }[];
    errors: {
        file: File;
        error: string;
    }[];
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

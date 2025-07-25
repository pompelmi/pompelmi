/**
 * Validates a File by MIME type and size (max 5 MB).
 */
export declare function validateFile(file: File): {
    valid: boolean;
    error?: string;
};

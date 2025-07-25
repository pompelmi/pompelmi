/**
 * Validates a File by MIME type and size (max 5 MB).
 */
export function validateFile(
  file: File
): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ['text/plain', 'application/json', 'text/csv'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported file type' };
  }
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large (max 5 MB)' };
  }
  return { valid: true };
}
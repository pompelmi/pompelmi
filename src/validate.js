export function validateFile(file) {
  const maxSize = 5 * 1024 * 1024; // 5 MB
  const allowedTypes = [
    'text/plain',
    'application/json',
    'text/csv',
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported file type' };
  }
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large (max 5 MB)' };
  }
  return { valid: true };
}
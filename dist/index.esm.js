import { useState, useCallback } from 'react';

/**
 * Reads an array of File objects via FileReader and returns their text.
 */
async function scanFiles(files) {
  const readText = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
  const results = [];
  for (const file of files) {
    const content = await readText(file);
    results.push({
      file,
      content
    });
  }
  return results;
}

/**
 * Validates a File by MIME type and size (max 5 MB).
 */
function validateFile(file) {
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ['text/plain', 'application/json', 'text/csv'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file type'
    };
  }
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large (max 5 MB)'
    };
  }
  return {
    valid: true
  };
}

/**
 * React Hook: handles <input type="file" onChange> with validation + scanning.
 */
function useFileScanner() {
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const onChange = useCallback(async e => {
    const fileList = Array.from(e.target.files || []);
    const good = [];
    const bad = [];
    for (const file of fileList) {
      const {
        valid,
        error
      } = validateFile(file);
      if (valid) good.push(file);else bad.push({
        file,
        error: error
      });
    }
    setErrors(bad);
    if (good.length) {
      const scanned = await scanFiles(good);
      setResults(scanned);
    } else {
      setResults([]);
    }
  }, []);
  return {
    results,
    errors,
    onChange
  };
}

export { scanFiles, useFileScanner, validateFile };

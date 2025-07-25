import { useState, useCallback } from 'react';

async function scanFiles(files) {
  const readAsText = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
  const results = [];
  for (const file of files) {
    const content = await readAsText(file);
    results.push({
      file,
      content
    });
  }
  return results;
}

function validateFile(file) {
  const maxSize = 5 * 1024 * 1024; // 5 MB
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
 * React Hook to handle file input change, validate and scan files.
 * @returns {{ results: Array<{ file: File, content: string }>, errors: Array<{ file: File, error: string }>, onChange: function }}
 */
function useFileScanner() {
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const onChange = useCallback(async event => {
    const files = Array.from(event.target.files || []);
    const validFiles = [];
    const errorList = [];
    for (const file of files) {
      const {
        valid,
        error
      } = validateFile(file);
      if (valid) validFiles.push(file);else errorList.push({
        file,
        error
      });
    }
    setErrors(errorList);
    if (validFiles.length > 0) {
      const scanned = await scanFiles(validFiles);
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

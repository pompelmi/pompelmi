import { useState, useCallback } from 'react';
import { scanFiles } from './scan.js';
import { validateFile } from './validate.js';

/**
 * React Hook to handle file input change, validate and scan files.
 * @returns {{ results: Array<{ file: File, content: string }>, errors: Array<{ file: File, error: string }>, onChange: function }}
 */
export function useFileScanner() {
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);

  const onChange = useCallback(async event => {
    const files = Array.from(event.target.files || []);
    const validFiles = [];
    const errorList = [];

    for (const file of files) {
      const { valid, error } = validateFile(file);
      if (valid) validFiles.push(file);
      else errorList.push({ file, error });
    }

    setErrors(errorList);
    if (validFiles.length > 0) {
      const scanned = await scanFiles(validFiles);
      setResults(scanned);
    } else {
      setResults([]);
    }
  }, []);

  return { results, errors, onChange };
}
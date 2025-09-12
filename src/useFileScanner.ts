import { useState, useCallback } from 'react';
import type { ScanReport } from './types';
import { scanFiles } from './scan';
import { validateFile } from './validate';

/**
 * React Hook: handles <input type="file" onChange> with validation + scanning.
 */
export function useFileScanner() {
  const [results, setResults] = useState<Array<{ file: File; report: ScanReport }>>([]);
  const [errors, setErrors] = useState<
    Array<{ file: File; error: string }>
  >([]);

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = Array.from(e.target.files || []);
      const good: File[] = [];
      const bad: Array<{ file: File; error: string }> = [];

      for (const file of fileList) {
        const { valid, error } = validateFile(file);
        if (valid) good.push(file);
        else bad.push({ file, error: error! });
      }

      setErrors(bad);
      if (good.length) {
        const scanned = await scanFiles(good);
        setResults(scanned.map((r, i) => ({ file: good[i], report: r })) );
      } else {
        setResults([]);
      }
    },
    []
  );

  return { results, errors, onChange };
}
import React, { useRef, useState } from 'react';

export interface UploadButtonProps {
  /** Acceptable MIME types, e.g. "image/*" */
  accept?: string;
  /** Max file size in bytes (e.g. 52428800 for 50 MB) */
  maxSize?: number;
  /** Endpoint that will receive the file via POST */
  action: string;
  /** Called with the parsed JSON response on success */
  onResult?: (data: any) => void;
  /** Called with an Error when something goes wrong */
  onError?: (error: Error) => void;
  /** Called with a 0–100 number during upload */
  onProgress?: (progress: number) => void;
  /** Extra Tailwind classes to override styling */
  className?: string;
  /** Visible text on the button */
  label?: string;
}

const UploadButton: React.FC<UploadButtonProps> = ({
  accept,
  maxSize,
  action,
  onResult,
  onError,
  onProgress,
  className = '',
  label = 'Upload file'
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (maxSize && file.size > maxSize) {
      onError?.(new Error(`File size exceeds maxSize (${maxSize} bytes)`));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', action);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        const percent = (ev.loaded / ev.total) * 100;
        onProgress(percent);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        setLoading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            onResult?.(result);
          } catch (err) {
            onError?.(err as Error);
          }
        } else {
          onError?.(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    setLoading(true);
    xhr.send(formData);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <input
        type="file"
        accept={accept}
        ref={inputRef}
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Uploading…' : label}
      </button>
    </div>
  );
};

export default UploadButton;
import React, { useState, useCallback } from 'react';

export interface UploadDropzoneProps {
  accept?: string;
  maxSize?: number;
  action: string;
  /** Allow multiple files (default false) */
  multiple?: boolean;
  onResult?: (data: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  className?: string;
}

const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  accept,
  maxSize,
  action,
  multiple = false,
  onResult,
  onError,
  onProgress,
  className = ''
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpload = useCallback(
    (files: FileList | File[]) => {
      const fileList = Array.from(files);
      if (!fileList.length) return;

      if (!multiple && fileList.length > 1) {
        onError?.(new Error('Multiple file upload not allowed'));
        return;
      }

      const file = fileList[0];
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
    },
    [action, maxSize, multiple, onResult, onError, onProgress]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(e.target.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragOver ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'
      } ${className}`}
    >
      <input
        id="upload-dropzone-input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      <label htmlFor="upload-dropzone-input" className="cursor-pointer">
        {loading
          ? 'Uploading…'
          : 'Drag and drop a file here or click to choose one'}
      </label>
    </div>
  );
};

export default UploadDropzone;
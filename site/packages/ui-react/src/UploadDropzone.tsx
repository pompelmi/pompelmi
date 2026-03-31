import type React from "react";
import { useCallback, useRef, useState } from "react";

type UploadResult = unknown;

export interface UploadDropzoneProps {
  accept?: string;
  maxSize?: number;
  action: string;
  /** Allow multiple files (default false) */
  multiple?: boolean;
  onResult?: (data: UploadResult) => void;
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
  className = "",
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = useCallback(() => {
    if (!loading) {
      inputRef.current?.click();
    }
  }, [loading]);

  const handleUpload = useCallback(
    (files: FileList | File[]) => {
      const fileList = Array.from(files);
      if (!fileList.length) return;

      if (!multiple && fileList.length > 1) {
        onError?.(new Error("Multiple file upload not allowed"));
        return;
      }

      const file = fileList[0];
      if (maxSize && file.size > maxSize) {
        onError?.(new Error(`File size exceeds maxSize (${maxSize} bytes)`));
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", action);

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
    [action, maxSize, multiple, onResult, onError, onProgress],
  );

  const handleDrop: React.DragEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files) {
      handleUpload(event.dataTransfer.files);
    }
  };

  const handleDragOver: React.DragEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLButtonElement> = () => {
    setDragOver(false);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files) {
      handleUpload(event.target.files);
    }
  };

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = () => {
    openFilePicker();
  };

  return (
    <>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        ref={inputRef}
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"
        } ${className}`}
      >
        <span className="cursor-pointer">
          {loading ? "Uploading…" : "Drag and drop a file here or click to choose one"}
        </span>
      </button>
    </>
  );
};

export default UploadDropzone;

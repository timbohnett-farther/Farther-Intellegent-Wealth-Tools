'use client';

import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { Upload, X, FileText } from 'lucide-react';

export interface UploadDropzoneProps {
  /** Accepted MIME types, e.g., ["application/pdf"] */
  accept: string[];
  /** Maximum file size in bytes, enforced client-side */
  maxSizeBytes: number;
  /** Callback when valid files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Disable the dropzone */
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  accept,
  maxSizeBytes,
  onFilesSelected,
  disabled = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: FileList | File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const fileErrors: string[] = [];
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (accept.length > 0 && !accept.includes(file.type)) {
          fileErrors.push(
            `"${file.name}" has an unsupported file type. Accepted: ${accept.join(', ')}`
          );
          continue;
        }
        if (file.size > maxSizeBytes) {
          fileErrors.push(
            `"${file.name}" exceeds the maximum size of ${formatBytes(maxSizeBytes)}`
          );
          continue;
        }
        valid.push(file);
      }

      return { valid, errors: fileErrors };
    },
    [accept, maxSizeBytes]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const { valid, errors: fileErrors } = validateFiles(files);
      setErrors(fileErrors);

      if (valid.length > 0) {
        setSelectedFiles((prev) => [...prev, ...valid]);
        onFilesSelected(valid);
      }
    },
    [validateFiles, onFilesSelected]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragActive(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [handleFiles]
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={clsx(
          'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors',
          'cursor-pointer focus-visible:outline-none focus-visible:shadow-focus',
          disabled && 'cursor-not-allowed opacity-50',
          isDragActive
            ? 'border-brand-700 bg-brand-50'
            : 'border-limestone-300 bg-limestone-50 hover:border-brand-400 hover:bg-brand-50',
        )}
      >
        <Upload
          className={clsx(
            'h-10 w-10',
            isDragActive ? 'text-brand-700' : 'text-charcoal-300'
          )}
          aria-hidden="true"
        />

        <div className="text-center">
          <p className="text-sm font-medium text-charcoal-700">
            {isDragActive
              ? 'Drop files here'
              : 'Drop PDF files here or click to browse'}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">
            Max {formatBytes(maxSizeBytes)}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept.join(',')}
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
          aria-label="File upload"
        />
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {errors.map((err, i) => (
            <li key={i} className="text-xs text-critical-500">
              {err}
            </li>
          ))}
        </ul>
      )}

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <ul className="mt-3 space-y-2">
          {selectedFiles.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-limestone-200 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <span className="truncate text-sm text-charcoal-700">
                  {file.name}
                </span>
                <span className="shrink-0 text-xs text-charcoal-500">
                  {formatBytes(file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="ml-2 shrink-0 rounded p-1 text-charcoal-300 hover:bg-limestone-100 hover:text-charcoal-700 transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

UploadDropzone.displayName = 'UploadDropzone';

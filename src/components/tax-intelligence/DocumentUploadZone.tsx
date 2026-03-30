/**
 * Document Upload Zone Component — Phase 2 Sprint 1
 *
 * Drag-and-drop zone for tax document uploads with:
 * - Multi-file selection (1-50 files)
 * - File validation (type, size)
 * - Preview of selected files
 * - Duplicate detection warnings
 * - Progress tracking
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { DocumentType } from './DocumentTypeSelector';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 50;

export interface SelectedFile {
  file: File;
  id: string;
  preview?: string;
  error?: string;
}

interface DocumentUploadZoneProps {
  householdId: string;
  defaultTaxYear?: number;
  defaultDocumentType?: DocumentType;
  onFilesSelected: (files: SelectedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export default function DocumentUploadZone({
  householdId,
  defaultTaxYear = new Date().getFullYear(),
  defaultDocumentType = 'unknown',
  onFilesSelected,
  maxFiles = MAX_FILES,
  disabled = false,
}: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate individual file
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Only PDF, JPEG, PNG, and TIFF files are allowed.`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return `File size (${sizeMB}MB) exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }

    return null;
  }, []);

  /**
   * Process selected files
   */
  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Check max files
      if (fileArray.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files at once.`);
        return;
      }

      // Validate and create SelectedFile objects
      const validatedFiles: SelectedFile[] = fileArray.map((file) => {
        const error = validateFile(file);
        return {
          file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          error: error || undefined,
        };
      });

      setSelectedFiles(validatedFiles);
      onFilesSelected(validatedFiles);
    },
    [maxFiles, validateFile, onFilesSelected]
  );

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, processFiles]
  );

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFiles]
  );

  /**
   * Trigger file input click
   */
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  /**
   * Remove selected file
   */
  const handleRemoveFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      onFilesSelected(updated);
      return updated;
    });
  }, [onFilesSelected]);

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all ${
          isDragging
            ? 'border-teal-500 bg-teal-500/10'
            : disabled
              ? 'border-white/[0.06] bg-white/[0.02] opacity-50'
              : 'border-white/[0.12] bg-white/[0.02] hover:border-white/[0.20] hover:bg-white/[0.04]'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="px-6 py-12 text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/10">
            <svg className="h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          {/* Text */}
          <h3 className="mb-2 text-lg font-semibold text-white">
            {isDragging ? 'Drop files here' : 'Upload Tax Documents'}
          </h3>
          <p className="mb-4 text-sm text-white/50">
            Drag and drop files here, or click to browse
          </p>

          {/* Specs */}
          <div className="mx-auto max-w-md space-y-1 text-xs text-white/40">
            <p>Accepted formats: PDF, JPEG, PNG, TIFF</p>
            <p>Maximum file size: 10MB per file</p>
            <p>Maximum files: {maxFiles} per upload</p>
          </div>

          {/* Button */}
          {!disabled && (
            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Choose Files
            </button>
          )}
        </div>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              onClick={() => {
                setSelectedFiles([]);
                onFilesSelected([]);
              }}
              className="text-xs text-white/50 hover:text-white"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((selectedFile) => (
              <div
                key={selectedFile.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                  selectedFile.error
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {selectedFile.file.name}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
                    <span>{formatFileSize(selectedFile.file.size)}</span>
                    <span>• {selectedFile.file.type}</span>
                  </div>
                  {selectedFile.error && (
                    <p className="mt-2 text-xs text-red-400">{selectedFile.error}</p>
                  )}
                </div>

                <button
                  onClick={() => handleRemoveFile(selectedFile.id)}
                  className="shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/[0.04] hover:text-red-400"
                  title="Remove file"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Validation Summary */}
          {selectedFiles.some((f) => f.error) && (
            <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-xs text-red-300">
                <strong>{selectedFiles.filter((f) => f.error).length} file(s)</strong> have validation errors and will not be uploaded.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

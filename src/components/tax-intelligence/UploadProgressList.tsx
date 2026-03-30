/**
 * Upload Progress List Component — Phase 2 Sprint 1
 *
 * Shows real-time upload progress for multiple files with:
 * - Progress bars
 * - Status badges
 * - Duplicate warnings
 * - Error messages
 * - Retry/remove actions
 */

'use client';

import React from 'react';
import ProcessingStatusBadge, { ProcessingStatus } from './ProcessingStatusBadge';

export interface UploadProgressItem {
  id: string;
  filename: string;
  fileSize: number;
  progress: number; // 0-100
  status: ProcessingStatus;
  error?: string;
  isDuplicate?: boolean;
  duplicateWarning?: string;
  documentType?: string;
  canRetry?: boolean;
  canRemove?: boolean;
}

interface UploadProgressListProps {
  uploads: UploadProgressItem[];
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  onOverrideDuplicate?: (id: string) => void;
}

export default function UploadProgressList({
  uploads,
  onRetry,
  onRemove,
  onOverrideDuplicate,
}: UploadProgressListProps) {
  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Upload Progress ({uploads.length} {uploads.length === 1 ? 'file' : 'files'})
        </h3>
        <div className="flex items-center gap-2 text-xs text-white/50">
          {uploads.filter((u) => u.status === 'approved').length > 0 && (
            <span className="text-green-400">
              ✓ {uploads.filter((u) => u.status === 'approved').length} complete
            </span>
          )}
          {uploads.filter((u) => u.status === 'failed').length > 0 && (
            <span className="text-red-400">
              ✗ {uploads.filter((u) => u.status === 'failed').length} failed
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {uploads.map((upload) => (
          <UploadProgressCard
            key={upload.id}
            upload={upload}
            onRetry={onRetry}
            onRemove={onRemove}
            onOverrideDuplicate={onOverrideDuplicate}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual upload progress card
 */
function UploadProgressCard({
  upload,
  onRetry,
  onRemove,
  onOverrideDuplicate,
}: {
  upload: UploadProgressItem;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  onOverrideDuplicate?: (id: string) => void;
}) {
  const isUploading = ['uploaded', 'queued', 'processing'].includes(upload.status);
  const isComplete = upload.status === 'approved';
  const isFailed = upload.status === 'failed';

  return (
    <div
      className={`rounded-lg border bg-white/[0.02] p-4 transition-all ${
        upload.isDuplicate
          ? 'border-amber-500/30 bg-amber-500/5'
          : isFailed
            ? 'border-red-500/30 bg-red-500/5'
            : isComplete
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-white/[0.06]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-white">{upload.filename}</p>
            <ProcessingStatusBadge status={upload.status} size="sm" />
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
            <span>{formatFileSize(upload.fileSize)}</span>
            {upload.documentType && <span>• {upload.documentType}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {upload.canRetry && onRetry && (
            <button
              onClick={() => onRetry(upload.id)}
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
              title="Retry upload"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}
          {upload.canRemove && onRemove && (
            <button
              onClick={() => onRemove(upload.id)}
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/[0.04] hover:text-red-400"
              title="Remove"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-300"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-white/40">{upload.progress}% complete</p>
        </div>
      )}

      {/* Duplicate Warning */}
      {upload.isDuplicate && upload.duplicateWarning && (
        <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-300">Potential Duplicate</p>
              <p className="mt-1 text-xs text-amber-200/70">{upload.duplicateWarning}</p>
              {onOverrideDuplicate && (
                <button
                  onClick={() => onOverrideDuplicate(upload.id)}
                  className="mt-2 text-xs font-semibold text-amber-300 underline hover:text-amber-200"
                >
                  Upload anyway
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {isFailed && upload.error && (
        <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 p-3">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-red-300">Upload Failed</p>
              <p className="mt-1 text-xs text-red-200/70">{upload.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {isComplete && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Upload complete and queued for processing</span>
        </div>
      )}
    </div>
  );
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

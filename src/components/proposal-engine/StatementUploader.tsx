'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  Upload,
  X,
  FileText,
  ScanLine,
  Download,
  Pencil,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { StatementScanResult } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatementUploaderProps {
  /** Callback when all scans are complete. */
  onScanComplete: (results: StatementScanResult[]) => void;
  /** Previously scanned results. */
  existingScans?: StatementScanResult[];
}

type CaptureTab = 'ocr' | 'custodian' | 'manual';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'scanning' | 'complete' | 'error';
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
];

const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
const MAX_FILES = 20;
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 95) {
    return { label: `${confidence}%`, bgClass: 'bg-success-100', textClass: 'text-success-700' };
  }
  if (confidence >= 85) {
    return { label: `${confidence}%`, bgClass: 'bg-warning-100', textClass: 'text-warning-700' };
  }
  return { label: `${confidence}%`, bgClass: 'bg-critical-100', textClass: 'text-critical-700' };
}

let idCounter = 0;
function nextId(): string {
  return `upload-${++idCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatementUploader({
  onScanComplete,
  existingScans = [],
}: StatementUploaderProps) {
  const [activeTab, setActiveTab] = useState<CaptureTab>('ocr');
  const [uploads, setUploads] = useState<UploadingFile[]>([]);
  const [scans, setScans] = useState<StatementScanResult[]>(existingScans);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ------- File handling -------

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const totalAfter = uploads.length + fileArray.length;

      if (totalAfter > MAX_FILES) {
        alert(`Maximum ${MAX_FILES} files allowed. You have ${uploads.length} already.`);
        return;
      }

      const newUploads: UploadingFile[] = [];
      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_SIZE_BYTES) continue;

        newUploads.push({
          id: nextId(),
          file,
          progress: 0,
          status: 'uploading',
        });
      }

      if (newUploads.length === 0) return;

      setUploads((prev) => [...prev, ...newUploads]);

      // Simulate upload & scan progress for each file
      for (const upload of newUploads) {
        simulateUpload(upload.id);
      }
    },
    [uploads.length],
  );

  const simulateUpload = useCallback((uploadId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        // Move to scanning phase
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, progress: 100, status: 'scanning' } : u,
          ),
        );

        // Simulate scan delay
        setTimeout(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: 'complete' } : u,
            ),
          );
        }, 1500 + Math.random() * 2000);
      } else {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, progress: Math.min(progress, 99) } : u,
          ),
        );
      }
    }, 200);
  }, []);

  const removeUpload = useCallback((uploadId: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
  }, []);

  // ------- Drag & drop handlers -------

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

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
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      e.target.value = '';
    },
    [processFiles],
  );

  // ------- Tab content -------

  const tabs: { key: CaptureTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'ocr', label: 'OCR Scan', icon: ScanLine },
    { key: 'custodian', label: 'Custodian Pull', icon: Download },
    { key: 'manual', label: 'Manual Entry', icon: Pencil },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Capture method tabs */}
      <div className="flex gap-1 rounded-lg bg-limestone-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-700',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* OCR Scan tab content */}
      {activeTab === 'ocr' && (
        <div className="space-y-4">
          {/* Drag-and-drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors',
              'cursor-pointer focus-visible:outline-hidden focus-visible:shadow-focus',
              isDragActive
                ? 'border-brand-700 bg-brand-50'
                : 'border-limestone-300 bg-limestone-50 hover:border-brand-400 hover:bg-brand-50',
            )}
          >
            <Upload
              className={cn(
                'h-10 w-10',
                isDragActive ? 'text-brand-700' : 'text-charcoal-300',
              )}
              aria-hidden="true"
            />
            <div className="text-center">
              <p className="text-sm font-medium text-charcoal-700">
                {isDragActive
                  ? 'Drop statements here'
                  : 'Drop brokerage statements here or click to browse'}
              </p>
              <p className="mt-1 text-xs text-charcoal-500">
                PDF, JPG, PNG, TIFF -- up to {MAX_FILES} files, {formatBytes(MAX_SIZE_BYTES)} each
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              onChange={handleInputChange}
              className="hidden"
              aria-label="Upload statement files"
            />
          </div>

          {/* Upload progress list */}
          {uploads.length > 0 && (
            <ul className="space-y-2">
              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="flex items-center gap-3 rounded-lg border border-limestone-200 bg-white px-4 py-3"
                >
                  <FileText className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-charcoal-700">
                        {upload.file.name}
                      </span>
                      <span className="shrink-0 text-xs text-charcoal-400">
                        {formatBytes(upload.file.size)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {upload.status === 'uploading' && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-limestone-100">
                        <div
                          className="h-full rounded-full bg-brand-700 transition-all duration-200"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}

                    {upload.status === 'scanning' && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin text-brand-700" />
                        <span className="text-xs text-brand-700 font-medium">
                          Scanning document...
                        </span>
                      </div>
                    )}

                    {upload.status === 'complete' && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-success-600" />
                        <span className="text-xs text-success-700 font-medium">
                          Scan complete
                        </span>
                      </div>
                    )}

                    {upload.status === 'error' && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 text-critical-500" />
                        <span className="text-xs text-critical-600">
                          {upload.error ?? 'Scan failed'}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeUpload(upload.id)}
                    className="shrink-0 rounded p-1 text-charcoal-300 hover:bg-limestone-100 hover:text-charcoal-700 transition-colors"
                    aria-label={`Remove ${upload.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Custodian Pull tab */}
      {activeTab === 'custodian' && (
        <div className="rounded-lg border border-limestone-200 bg-white p-8 text-center">
          <Download className="mx-auto h-10 w-10 text-charcoal-300" />
          <h3 className="mt-3 text-sm font-semibold text-charcoal-900">
            Custodian Data Pull
          </h3>
          <p className="mt-1 text-xs text-charcoal-500">
            Connect to a custodian to automatically pull the latest account data.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Connect Custodian
          </button>
        </div>
      )}

      {/* Manual Entry tab */}
      {activeTab === 'manual' && (
        <div className="rounded-lg border border-limestone-200 bg-white p-8 text-center">
          <Pencil className="mx-auto h-10 w-10 text-charcoal-300" />
          <h3 className="mt-3 text-sm font-semibold text-charcoal-900">
            Manual Entry
          </h3>
          <p className="mt-1 text-xs text-charcoal-500">
            Enter holdings manually in the review table below.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Start Manual Entry
          </button>
        </div>
      )}

      {/* Existing scan results review */}
      {scans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-charcoal-900">
            Scanned Statements ({scans.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-limestone-200">
            <table className="w-full text-sm">
              <thead className="border-b border-limestone-200 bg-limestone-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                    File
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                    Account
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                    Custodian
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                    Holdings
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                    Confidence
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone-100 bg-white">
                {scans.map((scan) => {
                  const badge = getConfidenceBadge(scan.confidence);
                  return (
                    <tr key={scan.scanId} className="hover:bg-limestone-50">
                      <td className="px-4 py-2.5 text-charcoal-700 font-medium">
                        {scan.fileName}
                      </td>
                      <td className="px-4 py-2.5 text-charcoal-600 font-mono text-xs">
                        {scan.accountNumber ?? '--'}
                      </td>
                      <td className="px-4 py-2.5 text-charcoal-600">
                        {scan.custodian ?? '--'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-charcoal-600 tabular-nums">
                        {scan.holdings.length}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                            badge.bgClass,
                            badge.textClass,
                          )}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {scan.status === 'PROCESSING' && (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-700">
                            <Loader2 className="h-3 w-3 animate-spin" /> Processing
                          </span>
                        )}
                        {scan.status === 'COMPLETE' && (
                          <span className="inline-flex items-center gap-1 text-xs text-success-700">
                            <Check className="h-3 w-3" /> Complete
                          </span>
                        )}
                        {scan.status === 'ERROR' && (
                          <span className="inline-flex items-center gap-1 text-xs text-critical-600">
                            <AlertCircle className="h-3 w-3" /> Error
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action to confirm scans */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onScanComplete(scans)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors"
            >
              <Check className="h-4 w-4" />
              Confirm Scanned Holdings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

StatementUploader.displayName = 'StatementUploader';

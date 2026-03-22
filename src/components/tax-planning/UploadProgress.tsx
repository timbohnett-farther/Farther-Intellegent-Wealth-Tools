'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { FileText, Check, AlertCircle, Loader2, Upload } from 'lucide-react';

export interface UploadFileProgress {
  name: string;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
}

export interface UploadProgressProps {
  /** Array of files with their upload progress */
  files: UploadFileProgress[];
}

function getStatusIcon(status: UploadFileProgress['status']) {
  switch (status) {
    case 'uploading':
      return <Upload className="h-4 w-4 text-teal-300" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-info-700 animate-spin" />;
    case 'done':
      return <Check className="h-4 w-4 text-success-700" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-critical-700" />;
  }
}

function getStatusLabel(status: UploadFileProgress['status']): string {
  switch (status) {
    case 'uploading':
      return 'Uploading';
    case 'processing':
      return 'Processing';
    case 'done':
      return 'Complete';
    case 'error':
      return 'Failed';
  }
}

function getProgressBarColor(status: UploadFileProgress['status']): string {
  switch (status) {
    case 'uploading':
      return 'bg-teal-500';
    case 'processing':
      return 'bg-info-500';
    case 'done':
      return 'bg-success-500';
    case 'error':
      return 'bg-critical-500';
  }
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ files }) => {
  if (files.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 flex-shrink-0 text-white/30" />
              <span className="text-sm font-medium text-white truncate">
                {file.name}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusIcon(file.status)}
              <span
                className={cn(
                  'text-xs font-medium',
                  file.status === 'done' && 'text-success-700',
                  file.status === 'error' && 'text-critical-700',
                  file.status === 'uploading' && 'text-teal-300',
                  file.status === 'processing' && 'text-info-700'
                )}
              >
                {getStatusLabel(file.status)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300 ease-out',
                getProgressBarColor(file.status)
              )}
              style={{ width: `${Math.min(100, Math.max(0, file.progress))}%` }}
            />
          </div>

          {/* Progress percentage */}
          <div className="mt-1 text-right">
            <span className="text-xs tabular-nums text-white/50">
              {Math.round(file.progress)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

UploadProgress.displayName = 'UploadProgress';

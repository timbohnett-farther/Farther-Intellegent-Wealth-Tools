/**
 * Processing Status Badge Component — Phase 2 Sprint 1
 *
 * Displays document processing status with appropriate color coding.
 */

import React from 'react';

export type ProcessingStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'ocr_complete'
  | 'classified'
  | 'fields_extracted'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'failed';

interface ProcessingStatusBadgeProps {
  status: ProcessingStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  ProcessingStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  uploaded: {
    label: 'Uploaded',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    icon: '⬆️',
  },
  queued: {
    label: 'Queued',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    icon: '⏳',
  },
  processing: {
    label: 'Processing',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    icon: '⚙️',
  },
  ocr_complete: {
    label: 'OCR Complete',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    icon: '📄',
  },
  classified: {
    label: 'Classified',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    icon: '🏷️',
  },
  fields_extracted: {
    label: 'Fields Extracted',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10 border-teal-500/20',
    icon: '📊',
  },
  needs_review: {
    label: 'Needs Review',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    icon: '👁️',
  },
  approved: {
    label: 'Approved',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
    icon: '✅',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    icon: '❌',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    icon: '⚠️',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export default function ProcessingStatusBadge({
  status,
  showIcon = true,
  size = 'md',
}: ProcessingStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-semibold ${config.color} ${config.bgColor} ${sizeClasses[size]}`}
    >
      {showIcon && <span className="leading-none">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}

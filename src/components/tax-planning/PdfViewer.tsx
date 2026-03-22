'use client';

import React from 'react';
import { FileText, Download } from 'lucide-react';

export interface PdfViewerProps {
  /** URL to the PDF report */
  reportUrl?: string;
  /** Whether to show a placeholder skeleton */
  placeholder?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  reportUrl,
  placeholder = false,
}) => {
  if (placeholder || !reportUrl) {
    return (
      <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="h-16 w-16 rounded-full bg-limestone-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-charcoal-300" />
          </div>
          <p className="text-sm font-medium text-charcoal-700">
            Report will be generated here
          </p>
          <p className="mt-1 text-xs text-charcoal-500">
            Run a scenario computation to generate a report.
          </p>

          {/* Skeleton lines */}
          <div className="mt-6 w-full max-w-md space-y-3">
            <div className="h-3 rounded bg-limestone-200 animate-pulse" />
            <div className="h-3 rounded bg-limestone-200 animate-pulse w-5/6" />
            <div className="h-3 rounded bg-limestone-200 animate-pulse w-4/6" />
            <div className="h-3 rounded bg-limestone-200 animate-pulse w-5/6" />
            <div className="h-3 rounded bg-limestone-200 animate-pulse w-3/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-limestone-200 px-4 py-2">
        <span className="text-xs font-medium text-charcoal-500">PDF Report</span>
        <a
          href={reportUrl}
          download
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>

      {/* PDF iframe */}
      <iframe
        src={reportUrl}
        title="PDF Report Viewer"
        className="w-full h-[600px] border-0"
      />
    </div>
  );
};

PdfViewer.displayName = 'PdfViewer';

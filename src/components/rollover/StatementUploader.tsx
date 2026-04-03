'use client';

import { useState, useCallback } from 'react';
import { RiFileUploadLine, RiCheckLine, RiCloseLine, RiLoaderLine } from '@remixicon/react';

interface ExtractedStatementData {
  accountNumber: string;
  custodian: string;
  statementDate: string;
  balance: number;
  contributions?: {
    employee: number;
    employer: number;
    yearToDate: number;
  };
  holdings?: Array<{
    fundName: string;
    ticker: string;
    shares: number;
    value: number;
    allocationPercent: number;
  }>;
  fees?: {
    managementFee: number;
    expenseRatio: number;
    annualFees: number;
  };
}

interface StatementUploadResult {
  success: boolean;
  data?: ExtractedStatementData;
  rawText?: string;
  confidence?: number;
  error?: string;
}

interface StatementUploaderProps {
  onDataExtracted?: (data: ExtractedStatementData) => void;
  onError?: (error: string) => void;
}

export default function StatementUploader({ onDataExtracted, onError }: StatementUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedStatementData | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      const errorMsg = 'Invalid file type. Please upload PDF, JPG, PNG, or TIFF.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'File too large. Maximum size is 10MB.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setUploading(true);
    setError(null);
    setExtractedData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/rollover/statement-upload', {
        method: 'POST',
        body: formData,
      });

      const result: StatementUploadResult = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.success && result.data) {
        setExtractedData(result.data);
        setConfidence(result.confidence || null);
      } else {
        throw new Error(result.error || 'Failed to extract data from statement');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  }, [onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleUseData = useCallback(() => {
    if (extractedData) {
      onDataExtracted?.(extractedData);
    }
  }, [extractedData, onDataExtracted]);

  const handleReset = useCallback(() => {
    setExtractedData(null);
    setConfidence(null);
    setError(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!extractedData && !uploading && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-brand-500 transition-colors cursor-pointer"
        >
          <input
            type="file"
            id="statement-upload"
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={handleFileInput}
            className="hidden"
          />
          <label htmlFor="statement-upload" className="cursor-pointer flex flex-col items-center gap-3">
            <RiFileUploadLine className="size-12 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Upload 401(k) Statement
              </p>
              <p className="text-xs text-text-secondary mt-1">
                PDF, JPG, PNG, or TIFF (max 10MB)
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-brand-500 text-white rounded-md text-sm font-medium hover:bg-brand-600"
            >
              Choose File
            </button>
            <p className="text-xs text-text-muted">or drag and drop</p>
          </label>
        </div>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="border border-border rounded-lg p-8 text-center">
          <RiLoaderLine className="size-12 text-brand-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">Processing statement...</p>
          <p className="text-xs text-text-secondary mt-1">
            Extracting account details, holdings, and fees
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="border border-error bg-error/10 rounded-lg p-4 flex items-start gap-3">
          <RiCloseLine className="size-5 text-error shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-error">Upload Failed</p>
            <p className="text-xs text-text-secondary mt-1">{error}</p>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Extracted Data Preview */}
      {extractedData && (
        <div className="border border-border rounded-lg p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <RiCheckLine className="size-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Statement Processed Successfully
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Review extracted data below
                </p>
              </div>
            </div>
            {confidence && (
              <div className="text-right">
                <p className="text-xs text-text-secondary">Confidence</p>
                <p className={`text-sm font-medium ${
                  confidence > 0.9 ? 'text-success' :
                  confidence > 0.7 ? 'text-warning' :
                  'text-error'
                }`}>
                  {Math.round(confidence * 100)}%
                </p>
              </div>
            )}
          </div>

          {/* Extracted Fields */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-text-secondary">Custodian</p>
              <p className="text-sm font-medium text-text-primary mt-1">
                {extractedData.custodian}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Account Number</p>
              <p className="text-sm font-medium text-text-primary mt-1">
                {extractedData.accountNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Statement Date</p>
              <p className="text-sm font-medium text-text-primary mt-1">
                {extractedData.statementDate}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Account Balance</p>
              <p className="text-sm font-medium text-text-primary mt-1">
                ${extractedData.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Contributions */}
          {extractedData.contributions && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-text-secondary mb-3">Contributions</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Employee</p>
                  <p className="text-sm font-medium text-text-primary mt-1">
                    ${extractedData.contributions.employee.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Employer</p>
                  <p className="text-sm font-medium text-text-primary mt-1">
                    ${extractedData.contributions.employer.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Year-to-Date</p>
                  <p className="text-sm font-medium text-text-primary mt-1">
                    ${extractedData.contributions.yearToDate.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Holdings */}
          {extractedData.holdings && extractedData.holdings.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-text-secondary mb-3">
                Holdings ({extractedData.holdings.length} funds)
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {extractedData.holdings.map((holding, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-surface-subtle rounded text-xs">
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">{holding.fundName}</p>
                      <p className="text-text-muted">{holding.ticker}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-text-primary">
                        ${holding.value.toLocaleString()}
                      </p>
                      <p className="text-text-muted">{holding.allocationPercent.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fees */}
          {extractedData.fees && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-text-secondary mb-3">Fees</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Management Fee</p>
                  <p className="text-sm font-medium text-text-primary mt-1">
                    ${extractedData.fees.managementFee.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Expense Ratio</p>
                  <p className="text-sm font-medium text-text-primary mt-1">
                    {(extractedData.fees.expenseRatio * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Annual Fees</p>
                  <p className="text-sm font-medium text-text-primary mt-1">
                    ${extractedData.fees.annualFees.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              onClick={handleReset}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Upload Different Statement
            </button>
            <button
              onClick={handleUseData}
              className="px-4 py-2 bg-brand-500 text-white rounded-md text-sm font-medium hover:bg-brand-600"
            >
              Use This Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

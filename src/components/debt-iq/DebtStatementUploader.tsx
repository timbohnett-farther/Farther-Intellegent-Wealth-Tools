'use client';

import { useState, useCallback } from 'react';
import { RiUploadCloudLine, RiCheckLine, RiErrorWarningLine, RiFileTextLine, RiLoader4Line } from '@remixicon/react';

export type DebtType = 'mortgage' | 'credit_card' | 'auto_loan' | 'student_loan' | 'personal_loan';

interface MortgageData {
  property: string;
  lender: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  escrowAmount?: number;
  remainingTerm?: number;
  originalAmount?: number;
  loanType?: string;
  statementDate?: string;
}

interface CreditCardData {
  issuer: string;
  last4: string;
  balance: number;
  creditLimit: number;
  apr: number;
  minimumPayment: number;
  dueDate: string;
  statementDate?: string;
  availableCredit?: number;
}

interface LoanData {
  lender: string;
  loanType: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  remainingTerm?: number;
  originalAmount?: number;
  statementDate?: string;
}

export type ExtractedDebtData = MortgageData | CreditCardData | LoanData;

interface DebtStatementUploaderProps {
  debtType: DebtType;
  onDataExtracted: (data: ExtractedDebtData) => void;
  onError?: (error: string) => void;
}

export default function DebtStatementUploader({
  debtType,
  onDataExtracted,
  onError,
}: DebtStatementUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedDebtData | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const debtTypeLabels: Record<DebtType, string> = {
    mortgage: 'Mortgage Statement',
    credit_card: 'Credit Card Statement',
    auto_loan: 'Auto Loan Statement',
    student_loan: 'Student Loan Statement',
    personal_loan: 'Personal Loan Statement',
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setExtractedData(null);
    setConfidence(null);

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      const errorMsg = 'Invalid file type. Please upload a PDF, JPG, PNG, or TIFF file.';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'File too large. Maximum file size is 10MB.';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('debtType', debtType);

      const response = await fetch('/api/v1/debt-iq/statement-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process statement');
      }

      if (result.data) {
        setExtractedData(result.data);
        setConfidence(result.confidence ?? null);
      } else {
        throw new Error('No data extracted from statement');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [debtType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUseData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-success';
    if (conf >= 0.75) return 'text-warning';
    return 'text-error';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.9) return 'High confidence';
    if (conf >= 0.75) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!extractedData && (
        <div
          className={`relative rounded-xl border-2 border-dashed transition-colors ${
            dragActive
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
              : 'border-border bg-surface-subtle hover:border-brand-400'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="debt-statement-upload"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={handleChange}
            disabled={uploading}
          />
          <label
            htmlFor="debt-statement-upload"
            className="flex cursor-pointer flex-col items-center justify-center gap-4 p-12 text-center"
          >
            {uploading ? (
              <>
                <RiLoader4Line className="size-12 animate-spin text-brand-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-primary">Processing statement...</p>
                  <p className="text-xs text-text-muted">This usually takes 2-5 seconds</p>
                </div>
              </>
            ) : (
              <>
                <RiUploadCloudLine className="size-12 text-text-muted" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-primary">
                    Upload {debtTypeLabels[debtType]}
                  </p>
                  <p className="text-xs text-text-muted">
                    Drag and drop or click to browse
                  </p>
                  <p className="text-xs text-text-muted">
                    Supports PDF, JPG, PNG (max 10MB)
                  </p>
                </div>
              </>
            )}
          </label>
        </div>
      )}

      {/* Error Display */}
      {error && !uploading && (
        <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error/10 p-4">
          <RiErrorWarningLine className="size-5 shrink-0 text-error" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-error">Upload Failed</p>
            <p className="text-sm text-text-secondary">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setExtractedData(null);
              }}
              className="mt-2 text-sm font-medium text-error underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Extracted Data Preview */}
      {extractedData && !uploading && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiCheckLine className="size-5 text-success" />
              <h3 className="text-sm font-semibold text-text-primary">
                Statement Processed Successfully
              </h3>
            </div>
            {confidence !== null && (
              <span className={`text-xs font-medium ${getConfidenceColor(confidence)}`}>
                {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
              </span>
            )}
          </div>

          {/* Mortgage Data */}
          {debtType === 'mortgage' && 'property' in extractedData && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-text-muted">Property</p>
                <p className="text-sm font-medium text-text-primary">{extractedData.property}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Lender</p>
                <p className="text-sm font-medium text-text-primary">{extractedData.lender}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Current Balance</p>
                <p className="text-sm font-medium text-text-primary">
                  ${extractedData.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Interest Rate</p>
                <p className="text-sm font-medium text-text-primary">{extractedData.interestRate}%</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Monthly Payment</p>
                <p className="text-sm font-medium text-text-primary">
                  ${extractedData.monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {extractedData.escrowAmount && (
                <div>
                  <p className="text-xs text-text-muted">Escrow</p>
                  <p className="text-sm font-medium text-text-primary">
                    ${extractedData.escrowAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {extractedData.remainingTerm && (
                <div>
                  <p className="text-xs text-text-muted">Remaining Term</p>
                  <p className="text-sm font-medium text-text-primary">{extractedData.remainingTerm} months</p>
                </div>
              )}
              {extractedData.loanType && (
                <div>
                  <p className="text-xs text-text-muted">Loan Type</p>
                  <p className="text-sm font-medium text-text-primary">{extractedData.loanType}</p>
                </div>
              )}
            </div>
          )}

          {/* Credit Card Data */}
          {debtType === 'credit_card' && 'issuer' in extractedData && 'last4' in extractedData && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-text-muted">Issuer</p>
                <p className="text-sm font-medium text-text-primary">{extractedData.issuer}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Account</p>
                <p className="text-sm font-medium text-text-primary">****{extractedData.last4}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Current Balance</p>
                <p className="text-sm font-medium text-text-primary">
                  ${extractedData.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Credit Limit</p>
                <p className="text-sm font-medium text-text-primary">
                  ${extractedData.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">APR</p>
                <p className="text-sm font-medium text-text-primary">{extractedData.apr}%</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Minimum Payment</p>
                <p className="text-sm font-medium text-text-primary">
                  ${extractedData.minimumPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Due Date</p>
                <p className="text-sm font-medium text-text-primary">{extractedData.dueDate}</p>
              </div>
              {extractedData.availableCredit && (
                <div>
                  <p className="text-xs text-text-muted">Available Credit</p>
                  <p className="text-sm font-medium text-text-primary">
                    ${extractedData.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loan Data */}
          {(debtType === 'auto_loan' || debtType === 'student_loan' || debtType === 'personal_loan') &&
            'lender' in extractedData &&
            'loanType' in extractedData && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-text-muted">Lender</p>
                  <p className="text-sm font-medium text-text-primary">{extractedData.lender}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Loan Type</p>
                  <p className="text-sm font-medium text-text-primary">{extractedData.loanType}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Current Balance</p>
                  <p className="text-sm font-medium text-text-primary">
                    ${extractedData.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Interest Rate</p>
                  <p className="text-sm font-medium text-text-primary">{extractedData.interestRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Monthly Payment</p>
                  <p className="text-sm font-medium text-text-primary">
                    ${extractedData.monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {extractedData.remainingTerm && (
                  <div>
                    <p className="text-xs text-text-muted">Remaining Term</p>
                    <p className="text-sm font-medium text-text-primary">{extractedData.remainingTerm} months</p>
                  </div>
                )}
                {extractedData.originalAmount && (
                  <div>
                    <p className="text-xs text-text-muted">Original Amount</p>
                    <p className="text-sm font-medium text-text-primary">
                      ${extractedData.originalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <button
              onClick={handleUseData}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              <RiCheckLine className="size-4" />
              Use This Data
            </button>
            <button
              onClick={() => {
                setExtractedData(null);
                setConfidence(null);
                setError(null);
              }}
              className="text-sm font-medium text-text-secondary underline hover:no-underline"
            >
              Upload Different Statement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/tax-planning/auth-context';
import { useToast } from '@/lib/tax-planning/auth-context';
import { DocTypeSelector } from '@/components/tax-planning/DocTypeSelector';
import { UploadDropzone } from '@/components/tax-planning/UploadDropzone';
import { UploadProgress, type UploadFileProgress } from '@/components/tax-planning/UploadProgress';
import type { Household, DocType, TaxYear } from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAX_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = ['application/pdf'];

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-success-500 text-white'
                    : isActive
                      ? 'bg-brand-700 text-white'
                      : 'bg-limestone-200 text-charcoal-500'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  isActive ? 'text-brand-700' : isCompleted ? 'text-success-700' : 'text-charcoal-400'
                }`}
              >
                {label}
              </span>
            </div>

            {!isLast && (
              <div
                className={`mx-3 -mt-4.5 h-0.5 w-16 sm:w-24 ${
                  isCompleted ? 'bg-success-500' : 'bg-limestone-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload Page
// ---------------------------------------------------------------------------

export default function UploadReturnPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { addToast } = useToast();

  const householdId = params.id as string;

  // State
  const [household, setHousehold] = useState<Household | null>(null);
  const [loadingHousehold, setLoadingHousehold] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [docType, setDocType] = useState<string>('');
  const [taxYear, setTaxYear] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadFileProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch household name for breadcrumb
  useEffect(() => {
    async function loadHousehold() {
      if (!token || !householdId) return;
      setLoadingHousehold(true);

      try {
        const res = await fetch(`/api/v1/households/${householdId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data: Household = await res.json();
          setHousehold(data);
        }
      } catch {
        // Silently handle -- breadcrumb will fall back gracefully
      } finally {
        setLoadingHousehold(false);
      }
    }

    loadHousehold();
  }, [token, householdId]);

  // Step validation
  const canGoNext = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return docType !== '';
      case 2:
        return taxYear !== '';
      case 3:
        return selectedFile !== null;
      default:
        return false;
    }
  }, [currentStep, docType, taxYear, selectedFile]);

  const handleNext = useCallback(() => {
    if (!canGoNext()) return;
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, canGoNext]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setUploadError(null);
    }
  }, []);

  // Upload handler
  const handleUpload = useCallback(async () => {
    if (!token || !selectedFile || !docType || !taxYear) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress([
      { name: selectedFile.name, progress: 0, status: 'uploading' },
    ]);

    try {
      // Step 1: Initialize upload -- POST to /api/v1/return-documents
      setUploadProgress([
        { name: selectedFile.name, progress: 10, status: 'uploading' },
      ]);

      const initRes = await fetch('/api/v1/return-documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          householdId,
          taxYear: Number(taxYear) as TaxYear,
          docType: docType as DocType,
          filename: selectedFile.name,
        }),
      });

      if (!initRes.ok) {
        const errBody = await initRes.json().catch(() => ({ error: { message: 'Upload initialization failed' } }));
        throw new Error(errBody.error?.message || 'Failed to initialize upload');
      }

      const { uploadUrl, docId } = await initRes.json();

      // Step 2: Upload file to the presigned URL
      setUploadProgress([
        { name: selectedFile.name, progress: 30, status: 'uploading' },
      ]);

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!uploadRes.ok) {
        throw new Error('File upload failed');
      }

      setUploadProgress([
        { name: selectedFile.name, progress: 70, status: 'processing' },
      ]);

      // Step 3: Finalize upload -- POST to /api/v1/return-documents/[docId]/finalize
      const finalizeRes = await fetch(`/api/v1/return-documents/${docId}/finalize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!finalizeRes.ok) {
        throw new Error('Failed to finalize upload');
      }

      setUploadProgress([
        { name: selectedFile.name, progress: 100, status: 'done' },
      ]);

      setUploadedDocId(docId);
      setUploadComplete(true);
      addToast('Return uploaded successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(message);
      setUploadProgress([
        { name: selectedFile.name, progress: 0, status: 'error' },
      ]);
      addToast(message, 'error');
    } finally {
      setIsUploading(false);
    }
  }, [token, selectedFile, docType, taxYear, householdId, addToast]);

  // Success state
  if (uploadComplete) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-success-200 bg-success-50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-100 mb-4">
            <svg className="h-7 w-7 text-success-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-success-900">Upload Complete</h2>
          <p className="mt-2 text-sm text-success-700">
            Your return has been uploaded and is being processed.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href={`/tax-planning/households/${householdId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-limestone-200 bg-white px-5 py-2.5 text-sm font-medium text-charcoal-700 shadow-sm transition-colors hover:bg-limestone-50"
            >
              Back to Household
            </Link>
            {uploadedDocId && (
              <Link
                href={`/tax-planning/households/${householdId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
              >
                View Returns
              </Link>
            )}
          </div>
        </div>

        {uploadProgress.length > 0 && (
          <UploadProgress files={uploadProgress} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link
          href="/tax-planning/households"
          className="text-charcoal-500 transition-colors hover:text-charcoal-700"
        >
          Households
        </Link>
        <svg className="h-4 w-4 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <Link
          href={`/tax-planning/households/${householdId}`}
          className="text-charcoal-500 transition-colors hover:text-charcoal-700"
        >
          {loadingHousehold ? '...' : household?.display_name || 'Household'}
        </Link>
        <svg className="h-4 w-4 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="font-medium text-charcoal-900">Upload Return</span>
      </nav>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-charcoal-900">Upload Return</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Upload a tax return document for processing and analysis.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
        <StepIndicator
          currentStep={currentStep}
          steps={['Document Type', 'Tax Year', 'Upload File']}
        />
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
        {/* Step 1: Document Type */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-charcoal-900">
                Select Document Type
              </h2>
              <p className="mt-1 text-sm text-charcoal-500">
                Choose the type of document you are uploading.
              </p>
            </div>
            <DocTypeSelector value={docType} onChange={setDocType} />
          </div>
        )}

        {/* Step 2: Tax Year */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-charcoal-900">
                Select Tax Year
              </h2>
              <p className="mt-1 text-sm text-charcoal-500">
                Choose the tax year this document pertains to.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TAX_YEARS.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setTaxYear(String(year))}
                  className={`rounded-lg border-[1.5px] px-4 py-3 text-center text-sm font-medium transition-all ${
                    taxYear === String(year)
                      ? 'border-brand-700 bg-brand-50 text-brand-700 shadow-sm'
                      : 'border-limestone-200 bg-white text-charcoal-700 hover:border-brand-300 hover:bg-brand-50/30'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Upload File */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-charcoal-900">
                Upload File
              </h2>
              <p className="mt-1 text-sm text-charcoal-500">
                Upload a PDF file (max 50MB). The document will be processed automatically.
              </p>
            </div>

            {/* Summary of selections */}
            <div className="rounded-lg bg-limestone-50 border border-limestone-200 p-4">
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-charcoal-500">Document Type</dt>
                  <dd className="mt-0.5 font-medium text-charcoal-900">
                    {docType === 'FORM1040_PDF'
                      ? 'Form 1040 PDF'
                      : docType === 'IRS_RETURN_TRANSCRIPT_PDF'
                        ? 'IRS Return Transcript'
                        : 'Other'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-charcoal-500">Tax Year</dt>
                  <dd className="mt-0.5 font-medium text-charcoal-900">{taxYear}</dd>
                </div>
              </dl>
            </div>

            <UploadDropzone
              accept={ACCEPTED_TYPES}
              maxSizeBytes={MAX_FILE_SIZE}
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />

            {/* Upload progress */}
            {uploadProgress.length > 0 && (
              <UploadProgress files={uploadProgress} />
            )}

            {/* Upload error */}
            {uploadError && (
              <div className="rounded-lg border border-critical-200 bg-critical-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-critical-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-critical-700">{uploadError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null);
                        setUploadProgress([]);
                      }}
                      className="mt-1 text-xs font-medium text-critical-600 hover:text-critical-800"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={currentStep === 1 ? () => router.push(`/tax-planning/households/${householdId}`) : handleBack}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg border border-limestone-200 bg-white px-5 py-2.5 text-sm font-medium text-charcoal-700 shadow-sm transition-colors hover:bg-limestone-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </button>

        {currentStep < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

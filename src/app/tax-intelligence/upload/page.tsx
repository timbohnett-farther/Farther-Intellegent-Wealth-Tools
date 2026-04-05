/**
 * Upload Page — Phase 2 Sprint 1
 *
 * Main document upload interface with:
 * - Household selector
 * - Tax year selector
 * - Optional document type selector
 * - Drag-and-drop upload zone
 * - Real-time upload progress
 * - Upload history
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DocumentUploadZone, { type SelectedFile } from '@/components/tax-intelligence/DocumentUploadZone';
import UploadProgressList, { type UploadProgressItem } from '@/components/tax-intelligence/UploadProgressList';
import DocumentTypeSelector, { type DocumentType } from '@/components/tax-intelligence/DocumentTypeSelector';

interface Household {
  id: string;
  name: string;
}

export default function UploadPage() {
  const router = useRouter();

  // Form state
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [documentType, setDocumentType] = useState<DocumentType>('unknown');
  const [uploadedBy, setUploadedBy] = useState<string>(''); // Set from auth context

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load households on mount (in real app, fetch from API)
  useEffect(() => {
    // Mock data for now - replace with actual API call
    const mockHouseholds: Household[] = [
      { id: '1', name: 'Anderson Family' },
      { id: '2', name: 'Brown Trust' },
      { id: '3', name: 'Chen & Associates' },
    ];
    setHouseholds(mockHouseholds);

    // Mock advisor ID - replace with auth context
    setUploadedBy('advisor-001');
  }, []);

  // Handle files selected
  const handleFilesSelected = useCallback((files: SelectedFile[]) => {
    setSelectedFiles(files);
  }, []);

  // Handle upload
  const handleUpload = async () => {
    if (!selectedHousehold) {
      alert('Please select a household');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    // Filter out files with validation errors
    const validFiles = selectedFiles.filter(f => !f.error);
    if (validFiles.length === 0) {
      alert('All selected files have validation errors. Please fix and try again.');
      return;
    }

    setIsUploading(true);

    // Initialize progress tracking
    const progressItems: UploadProgressItem[] = validFiles.map((sf) => ({
      id: sf.id,
      filename: sf.file.name,
      fileSize: sf.file.size,
      progress: 0,
      status: 'uploaded',
      documentType,
      canRetry: false,
      canRemove: false,
    }));
    setUploadProgress(progressItems);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('householdId', selectedHousehold);
      formData.append('uploadedBy', uploadedBy);
      formData.append('taxYear', taxYear.toString());
      formData.append('documentType', documentType);

      validFiles.forEach((sf, index) => {
        formData.append(`file_${index}`, sf.file);
      });

      // Simulate progress updates (in real app, use XMLHttpRequest for progress events)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) =>
          prev.map((item) => ({
            ...item,
            progress: Math.min(item.progress + 10, 90),
            status: item.progress < 90 ? 'processing' : 'processing',
          }))
        );
      }, 500);

      // Call upload API
      const response = await fetch('/api/tax/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update progress with results
      const updatedProgress: UploadProgressItem[] = result.results.map((r: any) => {
        const original = progressItems.find((p) => p.filename === r.filename);
        return {
          id: r.documentId || original?.id || '',
          filename: r.filename,
          fileSize: original?.fileSize || 0,
          progress: 100,
          status: r.status === 'success' ? 'approved' : r.status === 'duplicate' ? 'needs_review' : 'failed',
          error: r.error,
          isDuplicate: r.status === 'duplicate',
          duplicateWarning: r.duplicateWarning,
          documentType,
          canRetry: r.status === 'error',
          canRemove: true,
        };
      });

      setUploadProgress(updatedProgress);

      // Show success message
      const successCount = result.stats.successful;
      if (successCount > 0) {
        alert(`Successfully uploaded ${successCount} document(s)`);
      }

      // Clear selected files after successful upload
      if (result.stats.successful === result.stats.total) {
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');

      // Mark all as failed
      setUploadProgress((prev) =>
        prev.map((item) => ({
          ...item,
          progress: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed',
          canRetry: true,
          canRemove: true,
        }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Handle retry
  const handleRetry = useCallback((id: string) => {
    // In real app, re-attempt upload for this file
    console.log('Retry upload:', id);
    alert('Retry not yet implemented');
  }, []);

  // Handle remove
  const handleRemove = useCallback((id: string) => {
    setUploadProgress((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Handle override duplicate
  const handleOverrideDuplicate = useCallback((id: string) => {
    // In real app, re-upload with override flag
    console.log('Override duplicate:', id);
    alert('Override duplicate not yet implemented');
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Tax Documents</h1>
        <p className="mt-1 text-sm text-white/50">
          Upload client tax documents for OCR processing and review
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        {/* Household Selector */}
        <div className="space-y-1.5">
          <label htmlFor="household" className="block text-sm font-medium text-white">
            Household <span className="text-red-400">*</span>
          </label>
          <select
            id="household"
            value={selectedHousehold}
            onChange={(e) => setSelectedHousehold(e.target.value)}
            disabled={isUploading}
            className="block w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors
              focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20
              disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select household...</option>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tax Year Selector */}
        <div className="space-y-1.5">
          <label htmlFor="tax-year" className="block text-sm font-medium text-white">
            Tax Year
          </label>
          <select
            id="tax-year"
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            disabled={isUploading}
            className="block w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors
              focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20
              disabled:cursor-not-allowed disabled:opacity-50"
          >
            {[2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Document Type Selector */}
        <DocumentTypeSelector
          value={documentType}
          onChange={setDocumentType}
          disabled={isUploading}
        />
      </div>

      {/* Upload Zone */}
      <DocumentUploadZone
        householdId={selectedHousehold}
        defaultTaxYear={taxYear}
        defaultDocumentType={documentType}
        onFilesSelected={handleFilesSelected}
        disabled={isUploading || !selectedHousehold}
      />

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/50">
            {selectedFiles.filter(f => !f.error).length} file(s) ready to upload
          </p>
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedHousehold || selectedFiles.filter(f => !f.error).length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload Documents
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <UploadProgressList
          uploads={uploadProgress}
          onRetry={handleRetry}
          onRemove={handleRemove}
          onOverrideDuplicate={handleOverrideDuplicate}
        />
      )}

      {/* Help Text */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex gap-3">
          <svg className="h-5 w-5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-200">
            <p className="font-medium">Upload Tips</p>
            <ul className="mt-2 space-y-1 text-blue-200/80">
              <li>• Upload up to 50 files at once</li>
              <li>• Accepted formats: PDF, JPEG, PNG, TIFF</li>
              <li>• Maximum file size: 10MB per file</li>
              <li>• Document type is optional — system will auto-classify</li>
              <li>• Duplicate files will be flagged for review</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  classification: string;
  confidence: number;
  uploadProgress: number;
  status: 'uploading' | 'classifying' | 'complete' | 'error';
}

interface MissingDocAlert {
  category: string;
  referenced_in: string;
  urgency: 'high' | 'medium' | 'low';
}

// ───────────────────────────────────────────────────────────────────────────
// Components
// ───────────────────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map(step => (
        <div key={step} className="flex items-center">
          <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold ${
            step < currentStep ? 'bg-success-100 text-success-700' :
            step === currentStep ? 'bg-accent-primary text-text-onBrand' :
            'bg-surface-subtle text-text-muted'
          }`}>
            {step < currentStep ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : step}
          </div>
          {step < 2 && <div className="h-0.5 w-12 bg-border-subtle mx-2" />}
        </div>
      ))}
    </div>
  );
}

function FileUploadZone({
  onFilesSelected,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  onFilesSelected: (files: FileList) => void;
  isDragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
        isDragging ? 'border-accent-primary bg-accent-primary/10' : 'border-border-subtle bg-surface-soft'
      }`}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <svg className="mx-auto h-12 w-12 text-text-faint mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-sm font-medium text-text mb-1">
        {isDragging ? 'Drop files here' : 'Drop files or click to browse'}
      </p>
      <p className="text-xs text-text-muted">
        Supports PDF, DOCX, XLSX, JPG, PNG — up to 50MB per file
      </p>
    </div>
  );
}

function FileList({ files }: { files: UploadedFile[] }) {
  if (files.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm font-medium text-text">Uploaded Documents ({files.length})</p>
      {files.map(file => (
        <div key={file.id} className="rounded-lg border border-border-subtle bg-surface-soft p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">{file.name}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="ml-4">
              {file.status === 'complete' && (
                <svg className="h-5 w-5 text-success-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {file.status === 'uploading' && (
                <svg className="h-5 w-5 text-info-700 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </div>
          </div>

          {file.status === 'complete' && (
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center rounded-full bg-info-100 px-2 py-0.5 text-xs font-medium text-info-700">
                {file.classification}
              </span>
              <span className="text-xs text-text-muted">
                {Math.round(file.confidence * 100)}% confidence
              </span>
            </div>
          )}

          {file.status === 'uploading' && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-surface-subtle overflow-hidden">
                <div
                  className="h-full bg-accent-primary transition-all duration-300"
                  style={{ width: `${file.uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MissingDocAlerts({ alerts }: { alerts: MissingDocAlert[] }) {
  if (alerts.length === 0) return null;

  const urgencyColors = {
    high: 'border-critical-200 bg-critical-50 text-critical-700',
    medium: 'border-warning-200 bg-warning-50 text-warning-700',
    low: 'border-info-200 bg-info-50 text-info-700',
  };

  return (
    <div className="mt-6 rounded-lg border border-warning-200 bg-warning-50 p-4">
      <div className="flex items-start gap-3 mb-3">
        <svg className="h-5 w-5 text-warning-700 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-warning-900">Missing Documents Detected</p>
          <p className="text-xs text-warning-700 mt-0.5">
            Cross-references found to documents not yet uploaded
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className={`rounded-lg border p-3 ${urgencyColors[alert.urgency]}`}>
            <p className="text-sm font-medium">{alert.category}</p>
            <p className="text-xs mt-1">Referenced in: {alert.referenced_in}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Main Page
// ───────────────────────────────────────────────────────────────────────────

export default function NewAnalysisPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isDragging, setIsDragging] = useState(false);

  // Step 1 state
  const [clientName, setClientName] = useState('');
  const [household, setHousehold] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2 state
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [missingDocs, setMissingDocs] = useState<MissingDocAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function handleFilesSelected(fileList: FileList) {
    const newFiles = Array.from(fileList).map(file => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      classification: '',
      confidence: 0,
      uploadProgress: 0,
      status: 'uploading' as const,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Simulate upload and classification
    newFiles.forEach(file => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id ? { ...f, uploadProgress: progress } : f
          )
        );

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setFiles(prev =>
              prev.map(f =>
                f.id === file.id
                  ? {
                      ...f,
                      status: 'complete',
                      classification: getClassification(f.name),
                      confidence: 0.85 + Math.random() * 0.14,
                    }
                  : f
              )
            );

            // Randomly add missing doc alerts
            if (Math.random() > 0.7) {
              setMissingDocs(prev => [
                ...prev,
                {
                  category: 'LLC Operating Agreement',
                  referenced_in: file.name,
                  urgency: 'medium',
                },
              ]);
            }
          }, 500);
        }
      }, 200);
    });
  }

  function getClassification(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes('trust')) return 'Revocable Trust';
    if (lower.includes('will')) return 'Last Will & Testament';
    if (lower.includes('llc')) return 'LLC Operating Agreement';
    if (lower.includes('power')) return 'Power of Attorney';
    return 'Estate Document';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  }

  async function handleStartAnalysis() {
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/v1/estate-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName,
          household_id: household || null,
          notes,
          documents: files.map(f => ({ name: f.name, classification: f.classification })),
        }),
      });

      if (!res.ok) throw new Error('Failed to create analysis');

      const { id } = await res.json();

      // Trigger analysis execution
      await fetch(`/api/v1/estate-analyses/${id}/execute`, { method: 'POST' });

      router.push(`/estate-intelligence/${id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/estate-intelligence')}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text mb-4 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Analyses
        </button>
        <h1 className="text-2xl font-bold text-text">New Estate Analysis</h1>
        <p className="mt-1 text-sm text-text-muted">
          Upload trust documents and estate plans for AI-powered analysis
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-8 shadow-sm">
        <StepIndicator currentStep={step} />

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Client Name <span className="text-critical-700">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="John & Jane Doe"
                className="w-full rounded-lg border border-border-subtle bg-surface px-4 py-2.5 text-sm text-text placeholder-text-faint focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Household (optional)
              </label>
              <select
                value={household}
                onChange={e => setHousehold(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface px-4 py-2.5 text-sm text-text focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
              >
                <option value="">No household link</option>
                <option value="hh-1">Anderson Family Trust</option>
                <option value="hh-2">Baker Estate</option>
                <option value="hh-3">Chen Household</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes about this analysis..."
                rows={3}
                className="w-full rounded-lg border border-border-subtle bg-surface px-4 py-2.5 text-sm text-text placeholder-text-faint focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!clientName.trim()}
                className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-semibold text-text-onBrand transition-colors hover:bg-accent-primarySoft disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Upload Documents →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <FileUploadZone
              onFilesSelected={handleFilesSelected}
              isDragging={isDragging}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            />

            <FileList files={files} />
            <MissingDocAlerts alerts={missingDocs} />

            <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
              <button
                onClick={() => setStep(1)}
                className="text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleStartAnalysis}
                disabled={files.filter(f => f.status === 'complete').length === 0 || isAnalyzing}
                className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-semibold text-text-onBrand transition-colors hover:bg-accent-primarySoft disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Starting Analysis...
                  </>
                ) : (
                  'Start Analysis'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

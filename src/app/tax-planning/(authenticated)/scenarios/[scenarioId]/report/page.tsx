'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import { PdfViewer } from '@/components/tax-planning/PdfViewer';
import { ShareModal } from '@/components/tax-planning/ShareModal';
import type { Scenario } from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportMetadata {
  scenarioName: string;
  householdName: string;
  generatedDate: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { addToast } = useToast();

  const scenarioId = params.scenarioId as string;

  // State
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [metadata, setMetadata] = useState<ReportMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch scenario data for report metadata
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch scenario details
      const scenarioRes = await fetch(`/api/v1/scenarios/${scenarioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!scenarioRes.ok) throw new Error('Failed to load scenario details.');
      const scenarioData: Scenario = await scenarioRes.json();
      setScenario(scenarioData);

      // Fetch household name for metadata
      let householdName = 'Unknown Household';
      try {
        const returnRes = await fetch(`/api/v1/returns/${scenarioData.return_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (returnRes.ok) {
          const returnData = await returnRes.json();
          const hhRes = await fetch(
            `/api/v1/households/${returnData.household_id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (hhRes.ok) {
            const hhData = await hhRes.json();
            householdName = hhData.display_name ?? 'Unknown Household';
          }
        }
      } catch {
        // Continue with default household name
      }

      setMetadata({
        scenarioName: scenarioData.name,
        householdName,
        generatedDate: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, scenarioId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(() => {
    addToast('PDF download will be available in Stage 2.', 'info');
  }, [addToast]);

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6 bg-canvas">
        <div className="h-8 w-48 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-12 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm space-y-3">
          <div className="h-4 w-40 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-56 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-48 rounded bg-white/[0.06] animate-pulse" />
        </div>
        <div className="h-[400px] rounded-lg bg-white/[0.06] animate-pulse" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error || !scenario) {
    return (
      <div className="bg-canvas">
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-critical-700">
            Error Loading Report
          </h2>
          <p className="mt-2 text-sm text-critical-600">
            {error || 'Scenario not found.'}
          </p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-teal-500 px-5 text-sm font-medium text-white hover:bg-teal-400 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Format date helper
  // -----------------------------------------------------------------------

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6 bg-canvas">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push(`/tax-planning/scenarios/${scenarioId}`)}
        className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white/60 transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to Scenario Builder
      </button>

      {/* Page title */}
      <h1 className="text-2xl font-bold text-white">Scenario Report</h1>

      {/* Info banner */}
      <div className="flex items-center gap-3 rounded-lg border border-info-300 bg-info-50 px-4 py-3">
        <svg
          className="h-5 w-5 flex-shrink-0 text-info-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-sm font-medium text-info-700">
          Full PDF report generation will be available in Stage 2. Below is a preview.
        </p>
      </div>

      {/* Report metadata */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-white">
          Report Details
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-white/50">
              Scenario Name
            </dt>
            <dd className="mt-1 text-sm font-medium text-white">
              {metadata?.scenarioName ?? scenario.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-white/50">
              Household
            </dt>
            <dd className="mt-1 text-sm font-medium text-white">
              {metadata?.householdName ?? '--'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-white/50">
              Generated Date
            </dt>
            <dd className="mt-1 text-sm font-medium text-white">
              {metadata?.generatedDate
                ? formatDate(metadata.generatedDate)
                : '--'}
            </dd>
          </div>
        </dl>
      </div>

      {/* PDF Viewer placeholder */}
      <PdfViewer placeholder />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative group">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-500 px-5 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download PDF
          </button>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-xs text-white shadow-lg group-hover:block whitespace-nowrap">
            Coming in Stage 2
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-5 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
          Share
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-5 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
            />
          </svg>
          Print
        </button>
      </div>

      {/* Share modal */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        reportId={scenarioId}
      />
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Tax Intelligence Dashboard — Phase 1 Placeholder
 *
 * This is the main entry point for the Tax Intelligence platform.
 * Future phases will add:
 * - KPI cards (documents uploaded, forms extracted, opportunities detected)
 * - Recent activity feed
 * - Quick actions (upload documents, review queue)
 * - Household summary table
 */
export default function TaxIntelligenceDashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Tax Intelligence</h1>
        <p className="mt-2 text-sm text-white/50">
          OCR-powered tax document extraction, deterministic tax calculation, and AI-driven opportunity detection
        </p>
      </div>

      {/* Status banner */}
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/20">
            <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-base font-semibold text-white">Phase 1: Database Schema Complete</h3>
            <p className="text-sm text-white/70">
              The Tax Intelligence platform is now integrated into the database with 6 new models:
            </p>
            <ul className="ml-4 list-disc space-y-1 text-sm text-white/60">
              <li><span className="font-mono text-teal-400">TaxDocument</span> — Uploaded tax documents with OCR pipeline</li>
              <li><span className="font-mono text-teal-400">TaxForm</span> — Extracted line-by-line tax data with confidence scoring</li>
              <li><span className="font-mono text-teal-400">TaxScenario</span> — Baseline + alternate scenarios with deterministic calculation results</li>
              <li><span className="font-mono text-teal-400">TaxOpportunity</span> — Detected opportunities with AI explanations + citations</li>
              <li><span className="font-mono text-teal-400">TaxDeliverable</span> — Generated reports with immutable versioning</li>
              <li><span className="font-mono text-teal-400">AuditLog</span> — Compliance audit trail</li>
            </ul>
            <div className="pt-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-teal-500/15 px-3 py-1.5 text-xs font-semibold text-teal-300">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Migration Complete
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming soon features */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
          title="Document Upload"
          description="Multi-file drag-drop uploader with S3 storage and automatic OCR processing"
          phase="Phase 2"
        />
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          }
          title="OCR Integration"
          description="Azure Form Recognizer for 1040, W-2, 1099, Schedule D, and K-1 extraction"
          phase="Phase 3"
        />
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          }
          title="Review Workflow"
          description="Human review interface for low-confidence extractions with correction history"
          phase="Phase 4"
        />
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
            </svg>
          }
          title="Federal Tax Engine"
          description="Deterministic calculation with >99.9% accuracy for tax years 2020-2025"
          phase="Phase 5"
        />
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          }
          title="State Tax Engine"
          description="Top 10 states including CA, NY, TX, FL with state-specific rules"
          phase="Phase 6"
        />
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          }
          title="Entity Support"
          description="S-corps, partnerships, and trusts with K-1 passthrough treatment"
          phase="Phase 7"
        />
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          }
          title="Opportunity Detection"
          description="6 opportunity types: Roth conversions, cap gains, charitable, NIIT, withholding, RMD"
          phase="Phase 8"
        />
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          }
          title="Scenario Builder"
          description="Create what-if scenarios with side-by-side comparison to baseline"
          phase="Phase 9"
        />
        <FeatureCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          }
          title="AI Copilot"
          description="Claude-generated summaries with citations, zero hallucinations on tax law"
          phase="Phase 10"
        />
      </div>

      {/* Next steps */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <h3 className="text-base font-semibold text-white">Next Steps</h3>
        <div className="mt-4 space-y-3">
          <NextStep
            number={1}
            title="Phase 2: Document Upload System"
            description="Multi-file drag-drop with S3 storage and database records"
          />
          <NextStep
            number={2}
            title="Phase 3: OCR Integration"
            description="Azure Form Recognizer integration for automatic extraction"
          />
          <NextStep
            number={3}
            title="Phase 4: Human Review Workflow"
            description="Review interface for low-confidence extractions"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Feature Card Component
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  phase: string;
}

function FeatureCard({ icon, title, description, phase }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/50">
          {icon}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <span className="shrink-0 rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              {phase}
            </span>
          </div>
          <p className="text-xs text-white/50">{description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Next Step Component
 */
interface NextStepProps {
  number: number;
  title: string;
  description: string;
}

function NextStep({ number, title, description }: NextStepProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-400">
        {number}
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/50">{description}</p>
      </div>
    </div>
  );
}

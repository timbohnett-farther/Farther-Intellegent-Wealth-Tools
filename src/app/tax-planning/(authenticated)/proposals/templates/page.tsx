'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { ProposalSection } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProposalTemplate {
  templateId: string;
  name: string;
  description: string;
  sections: ProposalSection[];
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const formatDate = (iso?: string | null) => {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TemplateSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-40 rounded bg-limestone-200 mb-3" />
          <div className="h-4 w-full rounded bg-limestone-100 mb-2" />
          <div className="h-4 w-3/4 rounded bg-limestone-100 mb-4" />
          <div className="flex justify-between">
            <div className="h-4 w-20 rounded bg-limestone-100" />
            <div className="h-8 w-24 rounded bg-limestone-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onUse,
}: {
  template: ProposalTemplate;
  onUse: (templateId: string) => void;
}) {
  const includedSections = template.sections.filter((s) => s.included);

  return (
    <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-charcoal-900">{template.name}</h3>
        {template.isDefault && (
          <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
            Default
          </span>
        )}
      </div>

      <p className="text-xs text-charcoal-500 leading-relaxed mb-4">
        {template.description}
      </p>

      {/* Sections preview */}
      <div className="mb-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400 mb-2">
          Sections ({includedSections.length})
        </p>
        <div className="flex flex-wrap gap-1">
          {includedSections.slice(0, 5).map((s) => (
            <span
              key={s.key}
              className="rounded bg-limestone-100 px-2 py-0.5 text-[10px] font-medium text-charcoal-600"
            >
              {s.label}
            </span>
          ))}
          {includedSections.length > 5 && (
            <span className="rounded bg-limestone-100 px-2 py-0.5 text-[10px] font-medium text-charcoal-400">
              +{includedSections.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-limestone-100 pt-4">
        <div className="text-[10px] text-charcoal-400">
          <span>Last used: {formatDate(template.lastUsedAt)}</span>
        </div>
        <button
          type="button"
          onClick={() => onUse(template.templateId)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Use Template
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProposalTemplatesPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/proposals/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data: ProposalTemplate[] = await res.json();
      setTemplates(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load templates';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleUseTemplate = useCallback(
    (templateId: string) => {
      router.push(`/tax-planning/proposals/new?template=${templateId}`);
    },
    [router],
  );

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Proposal Templates</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Browse and manage reusable proposal templates for your team.
          </p>
        </div>
        <Link
          href="/tax-planning/proposals"
          className="inline-flex items-center gap-2 text-sm font-medium text-charcoal-500 hover:text-charcoal-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Proposals
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-limestone-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
        />
      </div>

      {/* Content */}
      {loading ? (
        <TemplateSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-limestone-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-critical-700">{error}</p>
          <button type="button" onClick={fetchTemplates} className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-600">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-limestone-200 bg-white p-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-charcoal-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm font-medium text-charcoal-700">
            {search ? 'No templates match your search.' : 'No templates available.'}
          </p>
          <p className="mt-1 text-sm text-charcoal-500">
            {search ? 'Try adjusting your search terms.' : 'Templates will appear here once created.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <TemplateCard
              key={template.templateId}
              template={template}
              onUse={handleUseTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

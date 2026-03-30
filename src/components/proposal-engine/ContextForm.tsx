'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  FileText,
  RefreshCw,
  Scissors,
  Briefcase,
  ArrowLeftRight,
  Shield,
  Settings,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import type {
  CreateProposalRequest,
  ProposalType,
  ProposalOccasion,
  RelationshipTier,
} from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Form data produced by the ContextForm (clientId is not collected in the form). */
export type ContextFormData = Omit<CreateProposalRequest, 'clientId'>;

export interface ContextFormProps {
  /** Pre-populate form fields on edit/resume. */
  initialData?: Partial<{
    clientName: string;
    proposalType: string;
    occasion: string;
    assetsInScope: number;
    relationshipTier: string;
    notes: string;
  }>;
  /** Callback when the form is submitted. */
  onSubmit: (data: ContextFormData) => void;
  /** Callback to navigate back (hidden on first step). */
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Proposal type definitions
// ---------------------------------------------------------------------------

interface ProposalTypeOption {
  value: ProposalType;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}

const PROPOSAL_TYPES: ProposalTypeOption[] = [
  {
    value: 'INITIAL_PROPOSAL',
    label: 'Initial Proposal',
    description: 'New client onboarding',
    icon: FileText,
  },
  {
    value: 'REBALANCE',
    label: 'Rebalance',
    description: 'Periodic rebalancing review',
    icon: RefreshCw,
  },
  {
    value: 'TAX_LOSS_HARVEST',
    label: 'Tax-Loss Harvest',
    description: 'Harvest losses for tax benefit',
    icon: Scissors,
  },
  {
    value: 'RETIREMENT_TRANSITION',
    label: 'Retirement Transition',
    description: 'Pre/post-retirement shift',
    icon: Briefcase,
  },
  {
    value: 'CONSOLIDATION',
    label: 'Consolidation',
    description: 'Merge outside accounts',
    icon: ArrowLeftRight,
  },
  {
    value: 'RISK_ADJUSTMENT',
    label: 'Risk Adjustment',
    description: 'Change risk profile',
    icon: Shield,
  },
  {
    value: 'CUSTOM',
    label: 'Custom',
    description: 'Free-form proposal',
    icon: Settings,
  },
];

const OCCASIONS = [
  { value: '', label: 'Select an occasion...' },
  { value: 'ANNUAL_REVIEW', label: 'Annual Review' },
  { value: 'LIFE_EVENT', label: 'Life Event' },
  { value: 'MARKET_CONDITIONS', label: 'Market Conditions' },
  { value: 'CLIENT_REQUEST', label: 'Client Request' },
  { value: 'NEW_ASSETS', label: 'New Assets Received' },
  { value: 'TAX_PLANNING', label: 'Tax Planning' },
  { value: 'ESTATE_PLANNING', label: 'Estate Planning' },
  { value: 'OTHER', label: 'Other' },
];

const TIERS: { value: RelationshipTier; label: string; threshold: number }[] = [
  { value: 'STANDARD', label: 'Standard', threshold: 0 },
  { value: 'PREMIUM', label: 'Premium', threshold: 500_000 },
  { value: 'PRIVATE_CLIENT', label: 'Private Client', threshold: 2_000_000 },
  { value: 'INSTITUTIONAL', label: 'Institutional', threshold: 10_000_000 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (!value) return '';
  return value.toLocaleString('en-US');
}

function parseCurrency(s: string): number {
  const cleaned = s.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function getTierForAmount(amount: number): RelationshipTier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (amount >= TIERS[i].threshold) return TIERS[i].value;
  }
  return 'STANDARD';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContextForm({ initialData, onSubmit, onBack }: ContextFormProps) {
  const [clientName, setClientName] = useState(initialData?.clientName ?? '');
  const [proposalType, setProposalType] = useState<ProposalType>(
    (initialData?.proposalType as ProposalType) ?? 'INITIAL_PROPOSAL',
  );
  const [occasion, setOccasion] = useState(initialData?.occasion ?? '');
  const [assetsRaw, setAssetsRaw] = useState(
    initialData?.assetsInScope ? formatCurrency(initialData.assetsInScope) : '',
  );
  const [assetsInScope, setAssetsInScope] = useState(initialData?.assetsInScope ?? 0);
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const relationshipTier = getTierForAmount(assetsInScope);

  const handleAssetsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setAssetsRaw(raw);
    const parsed = parseCurrency(raw);
    setAssetsInScope(parsed);
  }, []);

  const handleAssetsBlur = useCallback(() => {
    if (assetsInScope > 0) {
      setAssetsRaw(formatCurrency(assetsInScope));
    }
  }, [assetsInScope]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!clientName.trim()) errs.clientName = 'Client name is required';
    if (!occasion) errs.occasion = 'Please select an occasion';
    if (assetsInScope <= 0) errs.assetsInScope = 'Enter a valid amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [clientName, occasion, assetsInScope]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      onSubmit({
        clientName: clientName.trim(),
        proposalType,
        occasion: occasion as ProposalOccasion,
        assetsInScope,
        relationshipTier,
        notes: notes.trim(),
      });
    },
    [clientName, proposalType, occasion, assetsInScope, relationshipTier, notes, validate, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8">
      {/* Client Name */}
      <div>
        <label
          htmlFor="client-name"
          className="block text-sm font-medium text-text-muted"
        >
          Client Name
        </label>
        <input
          id="client-name"
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Search or enter client name..."
          className={cn(
            'mt-1.5 h-10 w-full rounded-lg border-[1.5px] bg-surface-soft backdrop-blur-xl px-3 text-sm text-text',
            'placeholder:text-text-faint transition-colors',
            'focus:outline-hidden focus:border-accent-primary focus:shadow-focus',
            errors.clientName ? 'border-critical-500' : 'border-border-subtle',
          )}
        />
        {errors.clientName && (
          <p className="mt-1 text-xs text-critical-500">{errors.clientName}</p>
        )}
      </div>

      {/* Proposal Type Radio Cards */}
      <fieldset>
        <legend className="block text-sm font-medium text-text-muted mb-3">
          Proposal Type
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PROPOSAL_TYPES.map((opt) => {
            const isSelected = proposalType === opt.value;
            const Icon = opt.icon;

            return (
              <label
                key={opt.value}
                className={cn(
                  'relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 px-3 py-4 text-center transition-all',
                  isSelected
                    ? 'border-accent-primary bg-accent-primary/10 shadow-sm shadow-brand-700/10'
                    : 'border-border-subtle bg-surface-soft hover:border-border-subtle hover:bg-surface-subtle',
                )}
              >
                <input
                  type="radio"
                  name="proposalType"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => setProposalType(opt.value)}
                  className="sr-only"
                />
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isSelected ? 'text-accent-primarySoft' : 'text-text-faint',
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isSelected ? 'text-accent-primarySoft' : 'text-text-muted',
                  )}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] text-text-muted leading-tight">
                  {opt.description}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Occasion */}
      <div>
        <label
          htmlFor="occasion"
          className="block text-sm font-medium text-text-muted"
        >
          Occasion
        </label>
        <div className="relative mt-1.5">
          <select
            id="occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className={cn(
              'h-10 w-full appearance-none rounded-lg border-[1.5px] bg-text pl-3 pr-9 text-sm text-text',
              'transition-colors focus:outline-hidden focus:border-accent-primary focus:shadow-focus',
              errors.occasion ? 'border-critical-500' : 'border-border-subtle',
              !occasion && 'text-text-faint',
            )}
          >
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value} disabled={o.value === ''}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {errors.occasion && (
          <p className="mt-1 text-xs text-critical-500">{errors.occasion}</p>
        )}
      </div>

      {/* Assets in Scope + Relationship Tier */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="assets-in-scope"
            className="block text-sm font-medium text-text-muted"
          >
            Assets in Scope
          </label>
          <div
            className={cn(
              'mt-1.5 flex items-center rounded-lg border-[1.5px] bg-text transition-colors',
              'focus-within:border-accent-primary focus-within:shadow-focus',
              errors.assetsInScope ? 'border-critical-500' : 'border-border-subtle',
            )}
          >
            <span className="select-none pl-3 text-sm text-text-muted">$</span>
            <input
              id="assets-in-scope"
              type="text"
              inputMode="decimal"
              value={assetsRaw}
              onChange={handleAssetsChange}
              onBlur={handleAssetsBlur}
              placeholder="0"
              className="h-10 w-full bg-transparent pl-1 pr-3 text-sm font-mono text-text outline-hidden tabular-nums placeholder:text-text-faint"
            />
          </div>
          {errors.assetsInScope && (
            <p className="mt-1 text-xs text-critical-500">{errors.assetsInScope}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted">
            Relationship Tier
          </label>
          <div className="mt-1.5 flex h-10 items-center rounded-lg border-[1.5px] border-border-subtle bg-transparent px-3">
            <span
              className={cn(
                'text-sm font-semibold',
                relationshipTier === 'INSTITUTIONAL' && 'text-accent-primarySoft',
                relationshipTier === 'PRIVATE_CLIENT' && 'text-accent-primarySoft',
                relationshipTier === 'PREMIUM' && 'text-text-muted',
                relationshipTier === 'STANDARD' && 'text-text-muted',
              )}
            >
              {TIERS.find((t) => t.value === relationshipTier)?.label ?? 'Standard'}
            </span>
            <span className="ml-2 text-[10px] text-text-faint">(auto-set by assets)</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-text-muted"
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any context for this proposal..."
          rows={4}
          className={cn(
            'mt-1.5 w-full rounded-lg border-[1.5px] border-border-subtle bg-surface-soft backdrop-blur-xl px-3 py-2.5 text-sm text-text',
            'placeholder:text-text-faint transition-colors resize-none',
            'focus:outline-hidden focus:border-accent-primary focus:shadow-focus',
          )}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-limestone-100">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-subtle transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-text shadow-sm hover:bg-brand-400 active:bg-brand-600 transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

ContextForm.displayName = 'ContextForm';

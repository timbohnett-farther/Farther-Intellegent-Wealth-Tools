'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import DebtStatementUploader, { type ExtractedDebtData } from '@/components/debt-iq/DebtStatementUploader';
import type {
  CreditCard,
  BalanceTransferOffer,
  BalanceTransferOpportunity,
  UtilizationAnalysis,
  PayoffPlan,
  PayoffStrategy,
} from '@/lib/debt-engine/types';

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type CreditCardTab = 'payoff' | 'transfer' | 'utilization';

const TABS: { key: CreditCardTab; label: string }[] = [
  { key: 'payoff', label: 'Payoff Strategy' },
  { key: 'transfer', label: 'Balance Transfer' },
  { key: 'utilization', label: 'Utilization Optimizer' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-surface-subtle" style={{ width: `${65 + Math.random() * 35}%` }} />
      ))}
    </div>
  );
}

function InputField({ label, value, onChange, prefix, suffix, min, max, step }: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-faint">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={`w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl py-2 text-sm text-text placeholder:text-text-faint focus:border-accent-primary focus:ring-1 focus:ring-accent-primary ${prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-8' : 'px-3'}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-faint">{suffix}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card entry type (local form state)
// ---------------------------------------------------------------------------

interface CardEntry {
  id: string;
  issuer: string;
  balance: string;
  apr: string;
  limit: string;
  minPayment: string;
}

function emptyCard(index: number): CardEntry {
  return { id: `card-${index}`, issuer: '', balance: '', apr: '', limit: '', minPayment: '' };
}

// ---------------------------------------------------------------------------
// Payoff Strategy Tab
// ---------------------------------------------------------------------------

interface PayoffResult {
  strategies: Record<string, PayoffPlan>;
  recommendation: string;
  recommendationReason: string;
}

function PayoffTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [cards, setCards] = useState<CardEntry[]>([
    { id: 'card-0', issuer: 'Card A', balance: '8500', apr: '22.99', limit: '15000', minPayment: '170' },
    { id: 'card-1', issuer: 'Card B', balance: '4200', apr: '18.49', limit: '10000', minPayment: '84' },
  ]);
  const [extraPayment, setExtraPayment] = useState('300');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PayoffResult | null>(null);
  const [showStatementUpload, setShowStatementUpload] = useState(false);

  const handleDataExtracted = (data: ExtractedDebtData) => {
    if ('issuer' in data && 'balance' in data && 'apr' in data) {
      const newCard: CardEntry = {
        id: `card-${cards.length}`,
        issuer: data.issuer,
        balance: data.balance.toString(),
        apr: data.apr.toString(),
        limit: 'creditLimit' in data ? data.creditLimit.toString() : '',
        minPayment: 'minimumPayment' in data ? data.minimumPayment.toString() : '',
      };
      setCards((prev) => [...prev, newCard]);
      setShowStatementUpload(false);
      addToast('Credit card statement data loaded successfully', 'success');
    }
  };

  const addCard = () => setCards((prev) => [...prev, emptyCard(prev.length)]);
  const removeCard = (idx: number) => setCards((prev) => prev.filter((_, i) => i !== idx));

  const updateCard = (idx: number, field: keyof CardEntry, value: string) => {
    setCards((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const body = {
        cards: cards.map((c) => ({
          id: c.id,
          issuer: c.issuer || `Card ${c.id}`,
          balance: Number(c.balance),
          apr: Number(c.apr) / 100,
          creditLimit: Number(c.limit),
          minimumPayment: Number(c.minPayment),
        })),
        extraMonthlyPayment: Number(extraPayment),
      };
      const res = await fetch('/api/v1/debt-iq/analysis/credit-cards/payoff', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Payoff analysis failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const avalanche = result?.strategies['AVALANCHE'] ?? null;
  const snowball = result?.strategies['SNOWBALL'] ?? null;

  return (
    <div className="space-y-6">
      {/* Upload Toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4">
        <div>
          <p className="text-sm font-medium text-text">Import from Statement</p>
          <p className="text-xs text-text-muted">Upload a credit card statement to add a new card</p>
        </div>
        <button
          onClick={() => setShowStatementUpload(!showStatementUpload)}
          className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text hover:bg-accent-primary/80 transition-colors"
        >
          {showStatementUpload ? 'Cancel' : 'Upload Statement'}
        </button>
      </div>

      {/* Statement Upload */}
      {showStatementUpload && (
        <DebtStatementUploader
          debtType="credit_card"
          onDataExtracted={handleDataExtracted}
          onError={(error) => addToast(error, 'error')}
        />
      )}

      {/* Card entries */}
      {cards.map((card, idx) => (
        <div key={card.id} className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text">Credit Card {idx + 1}</h3>
            {cards.length > 1 && (
              <button onClick={() => removeCard(idx)} className="text-xs text-critical-600 hover:text-critical-700">Remove</button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Issuer / Name</label>
              <input type="text" value={card.issuer} onChange={(e) => updateCard(idx, 'issuer', e.target.value)}
                className="w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl py-2 px-3 text-sm text-text focus:border-accent-primary focus:ring-1 focus:ring-accent-primary" />
            </div>
            <InputField label="Balance" value={card.balance} onChange={(v) => updateCard(idx, 'balance', v)} prefix="$" />
            <InputField label="APR (%)" value={card.apr} onChange={(v) => updateCard(idx, 'apr', v)} suffix="%" step={0.01} />
            <InputField label="Credit Limit" value={card.limit} onChange={(v) => updateCard(idx, 'limit', v)} prefix="$" />
            <InputField label="Min Payment" value={card.minPayment} onChange={(v) => updateCard(idx, 'minPayment', v)} prefix="$" />
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={addCard} className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-subtle transition-colors">
          + Add Card
        </button>
        <InputField label="" value={extraPayment} onChange={setExtraPayment} prefix="$" />
        <span className="text-xs text-text-muted self-end pb-2">extra monthly</span>
        <button onClick={analyze} disabled={loading} className="rounded-lg bg-accent-primary px-6 py-2 text-sm font-medium text-text hover:bg-accent-primary/80 disabled:opacity-50 transition-colors shadow-sm self-end">
          {loading ? 'Analyzing...' : 'Compare Strategies'}
        </button>
      </div>

      {loading && <CardSkeleton rows={8} />}

      {result && (
        <div className="space-y-4">
          {/* Strategy comparison */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-limestone-100 bg-transparent/50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint">Strategy</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint text-right">Total Interest</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint text-right">Payoff Timeline</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint text-right">Interest Saved vs Min</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone-100">
                {avalanche && (
                  <tr className={result.recommendation === 'AVALANCHE' ? 'bg-success-50/20' : ''}>
                    <td className="px-4 py-3 font-medium text-text">
                      Avalanche (Highest APR First)
                      {result.recommendation === 'AVALANCHE' && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-success-500" />}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-muted">{fmt.format(avalanche.summary.totalInterestPaid)}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{Math.ceil(avalanche.debtPayoffSequence.length > 0 ? avalanche.debtPayoffSequence[avalanche.debtPayoffSequence.length - 1].payoffMonth : 0)} months</td>
                    <td className="px-4 py-3 text-right font-mono text-success-700">{fmt.format(avalanche.summary.totalInterestSaved)}</td>
                    <td className="px-4 py-3">
                      {result.recommendation === 'AVALANCHE'
                        ? <span className="inline-flex rounded-full bg-success-100 px-2 py-0.5 text-xs font-semibold text-success-700">Best</span>
                        : <span className="text-xs text-text-muted">-</span>}
                    </td>
                  </tr>
                )}
                {snowball && (
                  <tr className={result.recommendation === 'SNOWBALL' ? 'bg-success-50/20' : ''}>
                    <td className="px-4 py-3 font-medium text-text">
                      Snowball (Lowest Balance First)
                      {result.recommendation === 'SNOWBALL' && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-success-500" />}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-muted">{fmt.format(snowball.summary.totalInterestPaid)}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{Math.ceil(snowball.debtPayoffSequence.length > 0 ? snowball.debtPayoffSequence[snowball.debtPayoffSequence.length - 1].payoffMonth : 0)} months</td>
                    <td className="px-4 py-3 text-right font-mono text-success-700">{fmt.format(snowball.summary.totalInterestSaved)}</td>
                    <td className="px-4 py-3">
                      {result.recommendation === 'SNOWBALL'
                        ? <span className="inline-flex rounded-full bg-success-100 px-2 py-0.5 text-xs font-semibold text-success-700">Best</span>
                        : <span className="text-xs text-text-muted">-</span>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payoff sequence */}
          {avalanche && avalanche.debtPayoffSequence.length > 0 && (
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6">
              <h4 className="text-sm font-semibold text-text mb-3">Payoff Sequence ({result.recommendation === 'AVALANCHE' ? 'Avalanche' : 'Snowball'})</h4>
              <div className="space-y-3">
                {(result.recommendation === 'AVALANCHE' ? avalanche : snowball ?? avalanche).debtPayoffSequence.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-accent-primary/15 text-accent-primarySoft text-xs font-bold">{i + 1}</span>
                    <span className="font-medium text-text flex-1">{item.debtName}</span>
                    <span className="text-text-muted">Month {item.payoffMonth}</span>
                    <span className="font-mono text-text-muted">{fmt.format(item.totalInterestPaid)} interest</span>
                    {item.rolloverAmount > 0 && (
                      <span className="text-xs text-success-600">+{fmtDec.format(item.rolloverAmount)}/mo freed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-info-200 bg-info-50 p-4">
            <p className="text-sm font-medium text-info-700">{result.recommendationReason}</p>
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-12 text-center">
          <p className="text-sm text-text-muted">Add your credit cards and extra payment amount, then compare payoff strategies.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Balance Transfer Tab
// ---------------------------------------------------------------------------

interface TransferOfferEntry {
  id: string;
  label: string;
  promoRate: string;
  promoMonths: string;
  postPromoRate: string;
  transferFee: string;
  limit: string;
}

function emptyOffer(idx: number): TransferOfferEntry {
  return { id: `offer-${idx}`, label: '', promoRate: '0', promoMonths: '18', postPromoRate: '24.99', transferFee: '3', limit: '15000' };
}

interface TransferResult {
  opportunities: BalanceTransferOpportunity[];
}

function BalanceTransferTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [offers, setOffers] = useState<TransferOfferEntry[]>([
    { id: 'offer-0', label: '0% for 18mo Card', promoRate: '0', promoMonths: '18', postPromoRate: '24.99', transferFee: '3', limit: '15000' },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);

  const addOffer = () => setOffers((prev) => [...prev, emptyOffer(prev.length)]);
  const removeOffer = (idx: number) => setOffers((prev) => prev.filter((_, i) => i !== idx));
  const updateOffer = (idx: number, field: keyof TransferOfferEntry, value: string) => {
    setOffers((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const body = {
        offers: offers.map((o) => ({
          offerLabel: o.label || `Offer ${o.id}`,
          promoRate: Number(o.promoRate) / 100,
          promoPeriodMonths: Number(o.promoMonths),
          postPromoRate: Number(o.postPromoRate) / 100,
          transferFee: Number(o.transferFee) / 100,
          creditLimit: Number(o.limit),
        })),
      };
      const res = await fetch('/api/v1/debt-iq/analysis/credit-cards/balance-transfer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Balance transfer analysis failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const recBadge = (rec: BalanceTransferOpportunity['recommendation']) => {
    const styles: Record<string, string> = {
      DO_IT: 'bg-success-100 text-success-700',
      MARGINAL: 'bg-warning-100 text-warning-700',
      SKIP: 'bg-critical-100 text-critical-700',
    };
    const labels: Record<string, string> = { DO_IT: 'Do It', MARGINAL: 'Marginal', SKIP: 'Skip' };
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${styles[rec]}`}>{labels[rec]}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Transfer offer entries */}
      {offers.map((offer, idx) => (
        <div key={offer.id} className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text">Transfer Offer {idx + 1}</h3>
            {offers.length > 1 && (
              <button onClick={() => removeOffer(idx)} className="text-xs text-critical-600 hover:text-critical-700">Remove</button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Offer Label</label>
              <input type="text" value={offer.label} onChange={(e) => updateOffer(idx, 'label', e.target.value)}
                className="w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl py-2 px-3 text-sm text-text focus:border-accent-primary focus:ring-1 focus:ring-accent-primary" />
            </div>
            <InputField label="Promo Rate (%)" value={offer.promoRate} onChange={(v) => updateOffer(idx, 'promoRate', v)} suffix="%" step={0.01} />
            <InputField label="Promo Period (months)" value={offer.promoMonths} onChange={(v) => updateOffer(idx, 'promoMonths', v)} />
            <InputField label="Post-Promo APR (%)" value={offer.postPromoRate} onChange={(v) => updateOffer(idx, 'postPromoRate', v)} suffix="%" step={0.01} />
            <InputField label="Transfer Fee (%)" value={offer.transferFee} onChange={(v) => updateOffer(idx, 'transferFee', v)} suffix="%" step={0.5} />
            <InputField label="Credit Limit" value={offer.limit} onChange={(v) => updateOffer(idx, 'limit', v)} prefix="$" />
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button onClick={addOffer} className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-subtle transition-colors">
          + Add Offer
        </button>
        <button onClick={analyze} disabled={loading} className="rounded-lg bg-accent-primary px-6 py-2 text-sm font-medium text-text hover:bg-accent-primary/80 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Analyze Transfers'}
        </button>
      </div>

      {loading && <CardSkeleton rows={6} />}

      {result && result.opportunities.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-limestone-100 bg-transparent/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint">From Card</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint">To Offer</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint text-right">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint text-right">Transfer Fee</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint text-right">Interest Saved</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint text-right">Net Savings</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-limestone-100">
              {result.opportunities.map((opp, i) => (
                <tr key={i} className="hover:bg-surface-subtle/50">
                  <td className="px-4 py-3 font-medium text-text">{opp.fromCard}</td>
                  <td className="px-4 py-3 text-text-muted">{opp.toOffer}</td>
                  <td className="px-4 py-3 text-right font-mono text-text-muted">{fmt.format(opp.amountToTransfer)}</td>
                  <td className="px-4 py-3 text-right font-mono text-text-muted">{fmt.format(opp.transferFee)}</td>
                  <td className="px-4 py-3 text-right font-mono text-success-700">{fmt.format(opp.interestSaved)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-success-700">{fmt.format(opp.netSavings)}</td>
                  <td className="px-4 py-3">{recBadge(opp.recommendation)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.opportunities.length === 0 && (
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-12 text-center">
          <p className="text-sm text-text-muted">No beneficial balance transfer opportunities found with the current offers.</p>
        </div>
      )}

      {!loading && !result && (
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-12 text-center">
          <p className="text-sm text-text-muted">Enter available balance transfer offers to see which transfers save you money.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utilization Optimizer Tab
// ---------------------------------------------------------------------------

interface UtilizationResult {
  analysis: UtilizationAnalysis;
  cards: Array<{ id: string; issuer: string; balance: number; limit: number; utilization: number }>;
}

function UtilizationTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UtilizationResult | null>(null);

  const fetchUtilization = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/credit-cards/utilization', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load utilization data');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    fetchUtilization();
  }, [fetchUtilization]);

  const utilizationColor = (pct: number) => {
    if (pct <= 0.1) return 'bg-success-500';
    if (pct <= 0.3) return 'bg-accent-primary';
    if (pct <= 0.5) return 'bg-warning-500';
    return 'bg-critical-500';
  };

  return (
    <div className="space-y-6">
      {loading && <CardSkeleton rows={8} />}

      {!loading && !result && (
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-12 text-center">
          <p className="text-sm text-text-muted">No credit card data available. Add your credit cards in the Payoff Strategy tab first.</p>
          <button onClick={fetchUtilization} className="mt-3 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text hover:bg-accent-primary/80 transition-colors">
            Retry
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Overall utilization */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Overall Utilization</h3>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                result.analysis.currentTotal <= 0.1 ? 'bg-success-100 text-success-700' :
                result.analysis.currentTotal <= 0.3 ? 'bg-accent-primary/15 text-accent-primarySoft' :
                result.analysis.currentTotal <= 0.5 ? 'bg-warning-100 text-warning-700' :
                'bg-critical-100 text-critical-700'
              }`}>
                {fmtPct.format(result.analysis.currentTotal)}
              </span>
            </div>
            <div className="h-4 rounded-full bg-surface-subtle overflow-hidden">
              <div className={`h-full rounded-full transition-all ${utilizationColor(result.analysis.currentTotal)}`}
                style={{ width: `${Math.min(100, result.analysis.currentTotal * 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-text-faint">
              <span>0%</span>
              <span className="text-success-500">10%</span>
              <span className="text-accent-primarySoft">30%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Per-card utilization */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6">
            <h3 className="text-sm font-semibold text-text mb-4">Per-Card Utilization</h3>
            <div className="space-y-4">
              {result.cards.map((card) => (
                <div key={card.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-muted">{card.issuer}</span>
                    <span className="text-xs text-text-muted">
                      {fmt.format(card.balance)} / {fmt.format(card.limit)} ({fmtPct.format(card.utilization)})
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-subtle overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${utilizationColor(card.utilization)}`}
                      style={{ width: `${Math.min(100, card.utilization * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6">
              <h4 className="text-sm font-semibold text-text mb-3">Target: 30% Utilization</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Pay Down Needed</span>
                  <span className="font-mono font-semibold text-text">{fmt.format(result.analysis.paydownToImprove.to30pct)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Est. Score Impact</span>
                  <span className="font-semibold text-success-700">+{result.analysis.paydownToImprove.estimatedScoreLift.to30pct} points</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-success-200 bg-success-50/30 p-6">
              <h4 className="text-sm font-semibold text-text mb-3">Target: 10% Utilization (Optimal)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Pay Down Needed</span>
                  <span className="font-mono font-semibold text-text">{fmt.format(result.analysis.paydownToImprove.to10pct)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Est. Score Impact</span>
                  <span className="font-semibold text-success-700">+{result.analysis.paydownToImprove.estimatedScoreLift.to10pct} points</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CreditCardsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<CreditCardTab>('payoff');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-text-faint mb-1">
          <Link href="/debt-iq" className="hover:text-accent-primarySoft transition-colors">Debt IQ</Link>
          <span>/</span>
          <span className="text-text-muted">Credit Card Optimizer</span>
        </nav>
        <h1 className="text-2xl font-bold text-text">Credit Card Optimizer</h1>
        <p className="mt-1 text-sm text-text-muted">Payoff strategies, balance transfers, and utilization optimization</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle">
        <nav className="flex gap-6" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-primary text-accent-primarySoft'
                  : 'border-transparent text-text-faint hover:text-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'payoff' && <PayoffTab token={token} />}
      {activeTab === 'transfer' && <BalanceTransferTab token={token} />}
      {activeTab === 'utilization' && <UtilizationTab token={token} />}
    </div>
  );
}

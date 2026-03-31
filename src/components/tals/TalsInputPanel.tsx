'use client';

import React from 'react';
import { TalsInputs, ColumnType, TalsColumnConfig } from '@/lib/tals/types';
import { PROVIDER_GROUPS, getProviderById } from '@/lib/tals/providers';
import { STATE_TAX_RATES } from '@/lib/data/stateTaxRates';
import { FilingStatus } from '@/lib/types';

interface TalsInputPanelProps {
  inputs: TalsInputs;
  onChange: (inputs: TalsInputs) => void;
}

const FILING_STATUSES: { value: FilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'mfj', label: 'Married Filing Jointly' },
  { value: 'mfs', label: 'Married Filing Separately' },
  { value: 'hoh', label: 'Head of Household' },
];

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'hold', label: 'Hold Concentrated' },
  { value: 'sell_upfront', label: 'Sell & Reinvest' },
  { value: 'direct_indexing', label: 'Direct Indexing' },
  { value: 'tals', label: 'TALS Strategy' },
];

const states = Object.entries(STATE_TAX_RATES)
  .map(([abbr, info]) => ({ value: abbr, label: info.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

export default function TalsInputPanel({ inputs, onChange }: TalsInputPanelProps) {
  const update = (path: string, value: number | string) => {
    const newInputs = JSON.parse(JSON.stringify(inputs)) as TalsInputs;
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = newInputs;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    onChange(newInputs);
  };

  const updateColumn = (index: number, field: keyof TalsColumnConfig, value: string | number | undefined) => {
    const newInputs = JSON.parse(JSON.stringify(inputs)) as TalsInputs;
    const col = newInputs.columns[index];
    if (field === 'type') {
      col.type = value as ColumnType;
      if (col.type === 'tals') {
        col.strategyId = col.strategyId ?? 'aqr_145_45';
        const provider = getProviderById(col.strategyId);
        col.label = provider?.name ?? 'TALS';
      } else {
        col.strategyId = undefined;
        col.feeOverride = undefined;
        const typeLabel = COLUMN_TYPES.find((t) => t.value === col.type)?.label ?? '';
        col.label = typeLabel;
      }
    } else if (field === 'strategyId') {
      col.strategyId = value as string;
      const provider = getProviderById(col.strategyId);
      col.label = provider?.name ?? 'TALS';
      col.feeOverride = undefined;
    } else if (field === 'feeOverride') {
      col.feeOverride = value as number;
    }
    onChange(newInputs);
  };

  const addColumn = () => {
    if (inputs.columns.length >= 4) return;
    const newInputs = JSON.parse(JSON.stringify(inputs)) as TalsInputs;
    newInputs.columns.push({
      type: 'tals',
      strategyId: 'aqr_145_45',
      label: 'AQR Flex 145/45',
    });
    onChange(newInputs);
  };

  const removeColumn = (index: number) => {
    if (inputs.columns.length <= 1) return;
    const newInputs = JSON.parse(JSON.stringify(inputs)) as TalsInputs;
    newInputs.columns.splice(index, 1);
    onChange(newInputs);
  };

  const unrealizedGain = Math.max(0, inputs.portfolio.concentratedStockValue - inputs.portfolio.costBasis);

  const CurrencyInput = ({ label, value, path, tooltip }: { label: string; value: number; path: string; tooltip?: string }) => (
    <div className="mb-3">
      <label className="label" title={tooltip}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-2 text-text-faint text-sm">$</span>
        <input
          type="text"
          className="input-field pl-7"
          value={value ? value.toLocaleString() : ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            update(path, raw ? parseInt(raw) : 0);
          }}
        />
      </div>
    </div>
  );

  const PercentSlider = ({ label, value, path, min = 0, max = 20, step = 0.1, tooltip }: {
    label: string; value: number; path: string; min?: number; max?: number; step?: number; tooltip?: string;
  }) => (
    <div className="mb-3">
      <label className="label" title={tooltip}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          className="flex-1 h-1.5 accent-brand-700"
          min={min}
          max={max}
          step={step}
          value={value * 100}
          onChange={(e) => update(path, parseFloat(e.target.value) / 100)}
        />
        <span className="text-sm font-mono w-16 text-right">{(value * 100).toFixed(2)}%</span>
      </div>
    </div>
  );

  const IntSlider = ({ label, value, path, min, max, step = 1, suffix = '' }: {
    label: string; value: number; path: string; min: number; max: number; step?: number; suffix?: string;
  }) => (
    <div className="mb-3">
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          className="flex-1 h-1.5 accent-brand-700"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => update(path, parseInt(e.target.value))}
        />
        <span className="text-sm font-mono w-16 text-right">{value}{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Portfolio Section */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-text mb-3 uppercase tracking-wider">Portfolio</h3>
        <CurrencyInput label="Portfolio Value" value={inputs.portfolio.value} path="portfolio.value" />
        <CurrencyInput label="Concentrated Stock Value" value={inputs.portfolio.concentratedStockValue} path="portfolio.concentratedStockValue" />
        <CurrencyInput label="Cost Basis" value={inputs.portfolio.costBasis} path="portfolio.costBasis" />
        {unrealizedGain > 0 && (
          <div className="p-2 rounded-lg bg-warning-50 text-xs text-warning-700">
            Unrealized Gain: <strong>${unrealizedGain.toLocaleString()}</strong> ({((unrealizedGain / inputs.portfolio.concentratedStockValue) * 100).toFixed(0)}%)
          </div>
        )}
      </div>

      {/* Tax Information */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-text mb-3 uppercase tracking-wider">Tax Information</h3>
        <div className="mb-3">
          <label className="label">Filing Status</label>
          <select
            className="input-field"
            value={inputs.tax.filingStatus}
            onChange={(e) => update('tax.filingStatus', e.target.value)}
          >
            {FILING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <CurrencyInput label="Taxable Income" value={inputs.tax.taxableIncome} path="tax.taxableIncome" />
        <div className="mb-3">
          <label className="label">State</label>
          <select
            className="input-field"
            value={inputs.tax.state}
            onChange={(e) => update('tax.state', e.target.value)}
          >
            {states.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assumptions */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-text mb-3 uppercase tracking-wider">Assumptions</h3>
        <PercentSlider label="Market Return" value={inputs.assumptions.marketReturn} path="assumptions.marketReturn" min={0} max={15} step={0.25} />
        <IntSlider label="Investment Horizon" value={inputs.assumptions.horizon} path="assumptions.horizon" min={1} max={30} suffix=" yr" />
        <PercentSlider label="RIA Fee" value={inputs.assumptions.riaFee} path="assumptions.riaFee" min={0} max={2} step={0.05} />
        <PercentSlider label="Target Concentration" value={inputs.assumptions.targetConcentration} path="assumptions.targetConcentration" min={1} max={50} step={1} />
        <div className="mb-3">
          <label className="label">Gain Offset Type</label>
          <select
            className="input-field"
            value={inputs.assumptions.gainOffsetType}
            onChange={(e) => update('assumptions.gainOffsetType', e.target.value)}
          >
            <option value="capital_gains">Capital Gains</option>
            <option value="ordinary_income">Ordinary Income</option>
            <option value="blended">Blended</option>
          </select>
        </div>
      </div>

      {/* Strategy Comparison Columns */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Comparison</h3>
          {inputs.columns.length < 4 && (
            <button
              onClick={addColumn}
              className="text-xs px-2 py-1 rounded bg-accent-primary/10 text-accent-primarySoft hover:bg-accent-primary/20 transition-colors"
            >
              + Add
            </button>
          )}
        </div>

        {inputs.columns.map((col, i) => {
          const provider = col.strategyId ? getProviderById(col.strategyId) : null;
          return (
            <div key={i} className="mb-3 p-2 rounded-lg border border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-muted">Column {i + 1}</span>
                {inputs.columns.length > 1 && (
                  <button
                    onClick={() => removeColumn(i)}
                    className="text-xs text-critical-500 hover:text-critical-700"
                  >
                    Remove
                  </button>
                )}
              </div>

              <select
                className="input-field mb-2"
                value={col.type}
                onChange={(e) => updateColumn(i, 'type', e.target.value)}
              >
                {COLUMN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {col.type === 'tals' && (
                <>
                  <select
                    className="input-field mb-2"
                    value={col.strategyId ?? ''}
                    onChange={(e) => updateColumn(i, 'strategyId', e.target.value)}
                  >
                    {PROVIDER_GROUPS.map((group) => (
                      <optgroup key={group.provider} label={group.provider}>
                        {group.strategies.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.longRatio * 100}/{s.shortRatio * 100})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {provider?.fees.mgmtFeeEditable && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted whitespace-nowrap">Mgmt Fee Override</label>
                      <input
                        type="range"
                        className="flex-1 h-1.5 accent-brand-700"
                        min={0}
                        max={2}
                        step={0.05}
                        value={(col.feeOverride ?? provider.fees.mgmtFee) * 100}
                        onChange={(e) => updateColumn(i, 'feeOverride', parseFloat(e.target.value) / 100)}
                      />
                      <span className="text-xs font-mono w-14 text-right">
                        {((col.feeOverride ?? provider.fees.mgmtFee) * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-text-faint leading-tight px-1">
        This tool is for educational and illustrative purposes only and does not constitute investment, tax, or legal advice.
      </div>
    </div>
  );
}

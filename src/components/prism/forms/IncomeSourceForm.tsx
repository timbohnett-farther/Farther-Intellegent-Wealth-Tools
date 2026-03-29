'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Select, Toggle } from '@/components/prism/atoms';
import { FormField, CurrencyInput, PercentInput } from '@/components/prism/molecules';
import { INCOME_TYPE_LABELS, type IncomeType } from '@/lib/prism/types';

// ==================== ZOD SCHEMA ====================

const incomeSourceSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    type: z.string().min(1, 'Income type is required'),
    annualAmount: z.number().min(0, 'Amount must be positive'),
    frequency: z.string().min(1, 'Frequency is required'),
    startYear: z.number().min(1900).max(2100),
    endYear: z.number().min(1900).max(2100).optional(),
    growthRate: z.number().min(0).max(1).optional(),
    isInflationAdjusted: z.boolean(),
    taxCharacter: z.string().min(1, 'Tax character is required'),
    stateTaxable: z.boolean(),
    notes: z.string().optional().or(z.literal('')),

    // W-2 / Employment
    employerName: z.string().optional().or(z.literal('')),

    // Self-Employment
    seExpenseRatio: z.number().min(0).max(1).optional(),

    // Social Security
    ssPia: z.number().optional(),
    ssClaimAge: z.number().min(62).max(70).optional(),
    ssStrategy: z.string().optional().or(z.literal('')),
    ssWepApplicable: z.boolean().optional(),
    ssGpoApplicable: z.boolean().optional(),

    // Pension
    pensionCola: z.number().min(0).max(1).optional(),
    survivorBenefitPct: z.string().optional().or(z.literal('')),

    // Rental
    rentalGross: z.number().optional(),
    rentalExpenses: z.number().optional(),
    rentalDepreciation: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endYear && data.endYear < data.startYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End year must be after start year',
        path: ['endYear'],
      });
    }
  });

export type IncomeSourceFormData = z.infer<typeof incomeSourceSchema>;

// ==================== OPTION ARRAYS ====================

const INCOME_TYPE_OPTIONS = Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const FREQUENCY_OPTIONS = [
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'one_time', label: 'One-Time' },
];

const TAX_CHARACTER_OPTIONS = [
  { value: 'ordinary', label: 'Ordinary Income' },
  { value: 'qualified_dividend', label: 'Qualified Dividend' },
  { value: 'ltcg', label: 'Long-Term Capital Gain' },
  { value: 'tax_exempt', label: 'Tax-Exempt' },
  { value: 'return_of_basis', label: 'Return of Basis' },
];

const SS_STRATEGY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Own', label: 'Own' },
  { value: 'Spousal', label: 'Spousal' },
  { value: 'Survivor', label: 'Survivor' },
];

const SURVIVOR_BENEFIT_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'none', label: 'None' },
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '100', label: '100%' },
];

// ==================== HELPERS ====================

function isEmploymentType(type: string): boolean {
  return ['employment_salary', 'employment_bonus', 'employment_commission'].includes(type);
}

function isSelfEmploymentType(type: string): boolean {
  return type === 'self_employment';
}

function isSocialSecurityType(type: string): boolean {
  return [
    'social_security_retirement',
    'social_security_spousal',
    'social_security_survivor',
    'social_security_disability',
  ].includes(type);
}

function isPensionType(type: string): boolean {
  return ['pension_defined_benefit', 'pension_defined_contribution'].includes(type);
}

function isRentalType(type: string): boolean {
  return ['rental_real_estate', 'rental_other'].includes(type);
}

// ==================== COMPONENT PROPS ====================

export interface IncomeSourceFormProps {
  initialData?: Partial<IncomeSourceFormData>;
  onSubmit: (data: IncomeSourceFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ==================== COMPONENT ====================

export function IncomeSourceForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: IncomeSourceFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<IncomeSourceFormData>({
    resolver: zodResolver(incomeSourceSchema) as any,
    defaultValues: {
      name: '',
      type: '',
      annualAmount: 0,
      frequency: 'annual',
      startYear: new Date().getFullYear(),
      endYear: undefined,
      growthRate: 0,
      isInflationAdjusted: false,
      taxCharacter: 'ordinary',
      stateTaxable: true,
      notes: '',
      employerName: '',
      seExpenseRatio: 0,
      ssPia: 0,
      ssClaimAge: undefined,
      ssStrategy: '',
      ssWepApplicable: false,
      ssGpoApplicable: false,
      pensionCola: 0,
      survivorBenefitPct: '',
      rentalGross: 0,
      rentalExpenses: 0,
      rentalDepreciation: 0,
      ...initialData,
    },
  });

  const incomeType = watch('type');

  return (
    <div className="flex h-full max-w-lg flex-col border-l border-border-subtle bg-surface-soft backdrop-blur-xl shadow-xl">
      {/* Header */}
      <div className="border-b border-border-subtle px-6 py-4">
        <h2 className="text-lg font-semibold text-text">
          {initialData?.name ? 'Edit Income Source' : 'Add Income Source'}
        </h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Configure income stream details and projections.
        </p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <form id="income-source-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Common Fields ── */}
          <FormField label="Name" required error={errors.name?.message}>
            <Input {...register('name')} error={errors.name?.message} placeholder="Income source name" />
          </FormField>

          <FormField label="Income Type" required error={errors.type?.message}>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  options={INCOME_TYPE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select income type"
                  error={errors.type?.message}
                />
              )}
            />
          </FormField>

          <FormField label="Annual Amount" required error={errors.annualAmount?.message}>
            <Controller
              control={control}
              name="annualAmount"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.annualAmount}
                />
              )}
            />
          </FormField>

          <FormField label="Frequency" required error={errors.frequency?.message}>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Select
                  options={FREQUENCY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.frequency?.message}
                />
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Year" required error={errors.startYear?.message}>
              <Input
                type="number"
                {...register('startYear')}
                error={errors.startYear?.message}
                placeholder="2025"
              />
            </FormField>

            <FormField label="End Year" error={errors.endYear?.message}>
              <Input
                type="number"
                {...register('endYear')}
                error={errors.endYear?.message}
                placeholder="Optional"
              />
            </FormField>
          </div>

          <FormField label="Growth Rate" error={errors.growthRate?.message}>
            <Controller
              control={control}
              name="growthRate"
              render={({ field }) => (
                <PercentInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  error={!!errors.growthRate}
                />
              )}
            />
          </FormField>

          <Controller
            control={control}
            name="isInflationAdjusted"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onCheckedChange={field.onChange}
                label="Inflation Adjusted"
              />
            )}
          />

          <FormField label="Tax Character" required error={errors.taxCharacter?.message}>
            <Controller
              control={control}
              name="taxCharacter"
              render={({ field }) => (
                <Select
                  options={TAX_CHARACTER_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.taxCharacter?.message}
                />
              )}
            />
          </FormField>

          <Controller
            control={control}
            name="stateTaxable"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onCheckedChange={field.onChange}
                label="State Taxable"
              />
            )}
          />

          {/* ── W-2 / Employment Fields ── */}
          {isEmploymentType(incomeType) && (
            <div className="rounded-lg border border-border-subtle bg-transparent p-4">
              <h4 className="mb-3 text-sm font-medium text-text-muted">Employment Details</h4>
              <FormField label="Employer Name" error={errors.employerName?.message}>
                <Input
                  {...register('employerName')}
                  error={errors.employerName?.message}
                  placeholder="Employer name"
                />
              </FormField>
            </div>
          )}

          {/* ── Self-Employment Fields ── */}
          {isSelfEmploymentType(incomeType) && (
            <div className="rounded-lg border border-border-subtle bg-transparent p-4">
              <h4 className="mb-3 text-sm font-medium text-text-muted">Self-Employment Details</h4>
              <FormField label="SE Expense Ratio" error={errors.seExpenseRatio?.message}>
                <Controller
                  control={control}
                  name="seExpenseRatio"
                  render={({ field }) => (
                    <PercentInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      error={!!errors.seExpenseRatio}
                    />
                  )}
                />
              </FormField>
            </div>
          )}

          {/* ── Social Security Fields ── */}
          {isSocialSecurityType(incomeType) && (
            <div className="rounded-lg border border-border-subtle bg-transparent p-4 space-y-4">
              <h4 className="text-sm font-medium text-text-muted">Social Security Details</h4>

              <FormField label="Primary Insurance Amount (PIA)">
                <Controller
                  control={control}
                  name="ssPia"
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>

              <FormField label="Claim Age" error={errors.ssClaimAge?.message} helperText="Between 62 and 70">
                <Input
                  type="number"
                  {...register('ssClaimAge')}
                  error={errors.ssClaimAge?.message}
                  placeholder="67"
                  min={62}
                  max={70}
                />
              </FormField>

              <FormField label="SS Strategy">
                <Controller
                  control={control}
                  name="ssStrategy"
                  render={({ field }) => (
                    <Select
                      options={SS_STRATEGY_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>

              <Controller
                control={control}
                name="ssWepApplicable"
                render={({ field }) => (
                  <Toggle
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    label="WEP Applicable"
                  />
                )}
              />

              <Controller
                control={control}
                name="ssGpoApplicable"
                render={({ field }) => (
                  <Toggle
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    label="GPO Applicable"
                  />
                )}
              />
            </div>
          )}

          {/* ── Pension Fields ── */}
          {isPensionType(incomeType) && (
            <div className="rounded-lg border border-border-subtle bg-transparent p-4 space-y-4">
              <h4 className="text-sm font-medium text-text-muted">Pension Details</h4>

              <FormField label="Pension COLA">
                <Controller
                  control={control}
                  name="pensionCola"
                  render={({ field }) => (
                    <PercentInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>

              <FormField label="Survivor Benefit">
                <Controller
                  control={control}
                  name="survivorBenefitPct"
                  render={({ field }) => (
                    <Select
                      options={SURVIVOR_BENEFIT_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>
            </div>
          )}

          {/* ── Rental Fields ── */}
          {isRentalType(incomeType) && (
            <div className="rounded-lg border border-border-subtle bg-transparent p-4 space-y-4">
              <h4 className="text-sm font-medium text-text-muted">Rental Details</h4>

              <FormField label="Gross Rental Income">
                <Controller
                  control={control}
                  name="rentalGross"
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>

              <FormField label="Rental Expenses">
                <Controller
                  control={control}
                  name="rentalExpenses"
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>

              <FormField label="Depreciation">
                <Controller
                  control={control}
                  name="rentalDepreciation"
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>
            </div>
          )}

          {/* ── Notes ── */}
          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Additional notes..."
              className="w-full rounded-lg border border-border-subtle bg-surface-soft backdrop-blur-xl px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent-primary focus:outline-hidden focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
        </form>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-6 py-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" form="income-source-form" loading={isLoading}>
          {initialData?.name ? 'Update' : 'Add'} Income Source
        </Button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Select, Toggle } from '@/components/prism/atoms';
import { FormField, CurrencyInput, PercentInput } from '@/components/prism/molecules';
import type { GoalType } from '@/lib/prism/types';

// ==================== OPTION ARRAYS ====================

const GOAL_TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'retirement', label: 'Retirement' },
  { value: 'early_retirement', label: 'Early Retirement' },
  { value: 'semi_retirement', label: 'Semi-Retirement' },
  { value: 'education_college', label: 'College Education' },
  { value: 'education_private_k12', label: 'Private K-12' },
  { value: 'education_graduate', label: 'Graduate School' },
  { value: 'home_purchase', label: 'Home Purchase' },
  { value: 'home_renovation', label: 'Home Renovation' },
  { value: 'home_payoff', label: 'Home Payoff' },
  { value: 'vehicle_purchase', label: 'Vehicle Purchase' },
  { value: 'major_travel', label: 'Major Travel' },
  { value: 'sabbatical', label: 'Sabbatical' },
  { value: 'business_purchase', label: 'Business Purchase' },
  { value: 'business_startup', label: 'Business Startup' },
  { value: 'legacy_estate', label: 'Legacy / Estate' },
  { value: 'legacy_charity', label: 'Legacy / Charity' },
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'long_term_care', label: 'Long-Term Care' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'financial_independence', label: 'Financial Independence' },
  { value: 'debt_payoff', label: 'Debt Payoff' },
  { value: 'other_one_time', label: 'Other (One-Time)' },
  { value: 'other_recurring', label: 'Other (Recurring)' },
];

const PRIORITY_OPTIONS = [
  { value: 'needs', label: 'Needs' },
  { value: 'wants', label: 'Wants' },
  { value: 'wishes', label: 'Wishes' },
];

const FUNDING_SOURCE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'savings', label: 'Savings' },
  { value: 'investments', label: 'Investments' },
  { value: 'income', label: 'Income' },
  { value: 'loan', label: 'Loan' },
  { value: 'gift', label: 'Gift / Inheritance' },
  { value: 'other', label: 'Other' },
];

const SCHOOL_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'public_in_state', label: 'Public (In-State)' },
  { value: 'public_out_of_state', label: 'Public (Out-of-State)' },
  { value: 'private', label: 'Private' },
  { value: 'community_college', label: 'Community College' },
  { value: 'trade_school', label: 'Trade School' },
];

// ==================== ZOD SCHEMA ====================

const goalSchema = z.object({
  // Common fields
  name: z.string().min(1, 'Name is required').max(100),
  type: z.string().min(1, 'Goal type is required'),
  priority: z.string().min(1, 'Priority is required'),
  targetAmount: z.number().min(0, 'Amount must be positive'),
  targetYear: z.number().min(1900).max(2100),
  recurringAmount: z.number().optional(),
  fundingSource: z.string().optional().or(z.literal('')),
  currentSavings: z.number().optional(),
  monthlyContribution: z.number().optional(),
  isInflationAdjusted: z.boolean(),
  notes: z.string().optional().or(z.literal('')),

  // Retirement-specific
  retirementAgeClient: z.number().min(30).max(100).optional(),
  retirementAgeCo: z.number().min(30).max(100).optional(),
  retirementIncomeNeed: z.number().optional(),
  retirementIncomePct: z.number().min(0).max(1).optional(),

  // Education-specific
  educationSchoolType: z.string().optional().or(z.literal('')),
  educationDurationYears: z.number().min(1).max(10).optional(),
  educationAnnualCost: z.number().optional(),
  educationPctFunded: z.number().min(0).max(1).optional(),

  // Legacy-specific
  legacyAmount: z.number().optional(),
  legacyBeneficiaries: z.string().optional().or(z.literal('')),
});

export type GoalFormData = z.infer<typeof goalSchema>;

// ==================== HELPERS ====================

function isRetirementGoal(type: string): boolean {
  return ['retirement', 'early_retirement', 'semi_retirement'].includes(type);
}

function isEducationGoal(type: string): boolean {
  return ['education_college', 'education_private_k12', 'education_graduate'].includes(type);
}

function isLegacyGoal(type: string): boolean {
  return ['legacy_estate', 'legacy_charity'].includes(type);
}

// ==================== COMPONENT PROPS ====================

export interface GoalFormProps {
  initialData?: Partial<GoalFormData>;
  onSubmit: (data: GoalFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ==================== COMPONENT ====================

export function GoalForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: GoalFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema) as any,
    defaultValues: {
      name: '',
      type: '',
      priority: 'needs',
      targetAmount: 0,
      targetYear: new Date().getFullYear() + 10,
      recurringAmount: 0,
      fundingSource: '',
      currentSavings: 0,
      monthlyContribution: 0,
      isInflationAdjusted: true,
      notes: '',
      retirementAgeClient: undefined,
      retirementAgeCo: undefined,
      retirementIncomeNeed: 0,
      retirementIncomePct: 0,
      educationSchoolType: '',
      educationDurationYears: undefined,
      educationAnnualCost: 0,
      educationPctFunded: 0,
      legacyAmount: 0,
      legacyBeneficiaries: '',
      ...initialData,
    },
  });

  const goalType = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Common Fields ── */}
      <FormField label="Goal Name" required error={errors.name?.message}>
        <Input {...register('name')} error={errors.name?.message} placeholder="e.g. Retire at 62" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Goal Type" required error={errors.type?.message}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                options={GOAL_TYPE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select goal type"
                error={errors.type?.message}
              />
            )}
          />
        </FormField>

        <FormField label="Priority" required error={errors.priority?.message}>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select
                options={PRIORITY_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.priority?.message}
              />
            )}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Target Amount" required error={errors.targetAmount?.message}>
          <Controller
            control={control}
            name="targetAmount"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                error={!!errors.targetAmount}
              />
            )}
          />
        </FormField>

        <FormField label="Target Year" required error={errors.targetYear?.message}>
          <Input
            type="number"
            {...register('targetYear')}
            error={errors.targetYear?.message}
            placeholder="2035"
          />
        </FormField>
      </div>

      <FormField label="Recurring Amount" error={errors.recurringAmount?.message}>
        <Controller
          control={control}
          name="recurringAmount"
          render={({ field }) => (
            <CurrencyInput
              value={field.value ?? 0}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label="Funding Source" error={errors.fundingSource?.message}>
        <Controller
          control={control}
          name="fundingSource"
          render={({ field }) => (
            <Select
              options={FUNDING_SOURCE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Current Savings" error={errors.currentSavings?.message}>
          <Controller
            control={control}
            name="currentSavings"
            render={({ field }) => (
              <CurrencyInput
                value={field.value ?? 0}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>

        <FormField label="Monthly Contribution" error={errors.monthlyContribution?.message}>
          <Controller
            control={control}
            name="monthlyContribution"
            render={({ field }) => (
              <CurrencyInput
                value={field.value ?? 0}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      </div>

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

      {/* ── Retirement-Specific Fields ── */}
      {isRetirementGoal(goalType) && (
        <div className="rounded-lg border border-border-subtle bg-transparent p-4 space-y-4">
          <h4 className="text-sm font-medium text-text-muted">Retirement Details</h4>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Retirement Age (Client)" error={errors.retirementAgeClient?.message}>
              <Input
                type="number"
                {...register('retirementAgeClient')}
                error={errors.retirementAgeClient?.message}
                placeholder="65"
                min={30}
                max={100}
              />
            </FormField>

            <FormField label="Retirement Age (Co-Client)" error={errors.retirementAgeCo?.message}>
              <Input
                type="number"
                {...register('retirementAgeCo')}
                error={errors.retirementAgeCo?.message}
                placeholder="65"
                min={30}
                max={100}
              />
            </FormField>
          </div>

          <FormField label="Retirement Income Need" error={errors.retirementIncomeNeed?.message}>
            <Controller
              control={control}
              name="retirementIncomeNeed"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <FormField
            label="Retirement Income %"
            helperText="Percentage of pre-retirement income needed"
            error={errors.retirementIncomePct?.message}
          >
            <Controller
              control={control}
              name="retirementIncomePct"
              render={({ field }) => (
                <PercentInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  error={!!errors.retirementIncomePct}
                />
              )}
            />
          </FormField>
        </div>
      )}

      {/* ── Education-Specific Fields ── */}
      {isEducationGoal(goalType) && (
        <div className="rounded-lg border border-border-subtle bg-transparent p-4 space-y-4">
          <h4 className="text-sm font-medium text-text-muted">Education Details</h4>

          <FormField label="School Type" error={errors.educationSchoolType?.message}>
            <Controller
              control={control}
              name="educationSchoolType"
              render={({ field }) => (
                <Select
                  options={SCHOOL_TYPE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duration (Years)" error={errors.educationDurationYears?.message}>
              <Input
                type="number"
                {...register('educationDurationYears')}
                error={errors.educationDurationYears?.message}
                placeholder="4"
                min={1}
                max={10}
              />
            </FormField>

            <FormField label="Annual Cost" error={errors.educationAnnualCost?.message}>
              <Controller
                control={control}
                name="educationAnnualCost"
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField
            label="% Funded by Family"
            error={errors.educationPctFunded?.message}
            helperText="Portion parents plan to cover"
          >
            <Controller
              control={control}
              name="educationPctFunded"
              render={({ field }) => (
                <PercentInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  error={!!errors.educationPctFunded}
                />
              )}
            />
          </FormField>
        </div>
      )}

      {/* ── Legacy-Specific Fields ── */}
      {isLegacyGoal(goalType) && (
        <div className="rounded-lg border border-border-subtle bg-transparent p-4 space-y-4">
          <h4 className="text-sm font-medium text-text-muted">Legacy Details</h4>

          <FormField label="Legacy Amount" error={errors.legacyAmount?.message}>
            <Controller
              control={control}
              name="legacyAmount"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <FormField label="Beneficiaries" error={errors.legacyBeneficiaries?.message}>
            <Input
              {...register('legacyBeneficiaries')}
              placeholder="e.g. Children, Alma Mater Foundation"
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

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-5">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          {initialData?.name ? 'Update' : 'Add'} Goal
        </Button>
      </div>
    </form>
  );
}

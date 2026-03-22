'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Select, Toggle } from '@/components/prism/atoms';
import { FormField, CurrencyInput } from '@/components/prism/molecules';
import type { InsuranceType } from '@/lib/prism/types';

// ==================== OPTION ARRAYS ====================

const INSURANCE_TYPE_OPTIONS: { value: InsuranceType; label: string }[] = [
  { value: 'life_term', label: 'Life - Term' },
  { value: 'life_whole', label: 'Life - Whole' },
  { value: 'life_universal', label: 'Life - Universal' },
  { value: 'life_vul', label: 'Life - Variable Universal' },
  { value: 'life_iul', label: 'Life - Indexed Universal' },
  { value: 'disability', label: 'Disability' },
  { value: 'ltc', label: 'Long-Term Care' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'property', label: 'Property' },
  { value: 'annuity_income', label: 'Annuity (Income)' },
];

const BENEFIT_PERIOD_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: '2_years', label: '2 Years' },
  { value: '5_years', label: '5 Years' },
  { value: 'to_65', label: 'To Age 65' },
  { value: 'to_67', label: 'To Age 67' },
  { value: 'lifetime', label: 'Lifetime' },
];

const LTC_INFLATION_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'none', label: 'None' },
  { value: 'simple_3', label: 'Simple 3%' },
  { value: 'compound_3', label: 'Compound 3%' },
  { value: 'compound_5', label: 'Compound 5%' },
  { value: 'cpi', label: 'CPI' },
];

// ==================== ZOD SCHEMA ====================

const insurancePolicySchema = z.object({
  // Common fields
  type: z.string().min(1, 'Insurance type is required'),
  insuredClientId: z.string().optional().or(z.literal('')),
  deathBenefit: z.number().min(0).optional(),
  monthlyBenefit: z.number().min(0).optional(),
  annualPremium: z.number().min(0, 'Annual premium must be positive'),
  policyNumber: z.string().optional().or(z.literal('')),
  carrier: z.string().optional().or(z.literal('')),
  issueDate: z.string().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
  isEmployerPaid: z.boolean(),
  notes: z.string().optional().or(z.literal('')),

  // Disability-specific
  ownOcc: z.boolean().optional(),
  monthlyBenefitMax: z.number().min(0).optional(),
  eliminationPeriodDays: z.number().min(0).optional(),
  benefitPeriod: z.string().optional().or(z.literal('')),

  // LTC-specific
  ltcDailyBenefit: z.number().min(0).optional(),
  ltcInflationProtection: z.string().optional().or(z.literal('')),
});

export type InsurancePolicyFormData = z.infer<typeof insurancePolicySchema>;

// ==================== HELPERS ====================

function isDisabilityPolicy(type: string): boolean {
  return type === 'disability';
}

function isLtcPolicy(type: string): boolean {
  return type === 'ltc';
}

// ==================== COMPONENT PROPS ====================

export interface InsurancePolicyFormProps {
  initialData?: Partial<InsurancePolicyFormData>;
  onSubmit: (data: InsurancePolicyFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ==================== COMPONENT ====================

export function InsurancePolicyForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: InsurancePolicyFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<InsurancePolicyFormData>({
    resolver: zodResolver(insurancePolicySchema) as any,
    defaultValues: {
      type: '',
      insuredClientId: '',
      deathBenefit: 0,
      monthlyBenefit: 0,
      annualPremium: 0,
      policyNumber: '',
      carrier: '',
      issueDate: '',
      expiryDate: '',
      isEmployerPaid: false,
      notes: '',
      ownOcc: false,
      monthlyBenefitMax: 0,
      eliminationPeriodDays: undefined,
      benefitPeriod: '',
      ltcDailyBenefit: 0,
      ltcInflationProtection: '',
      ...initialData,
    },
  });

  const policyType = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Common Fields ── */}
      <FormField label="Policy Type" required error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              options={INSURANCE_TYPE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              placeholder="Select policy type"
              error={errors.type?.message}
            />
          )}
        />
      </FormField>

      <FormField label="Insured Client ID" error={errors.insuredClientId?.message}>
        <Input
          {...register('insuredClientId')}
          placeholder="Client identifier"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Death Benefit" error={errors.deathBenefit?.message}>
          <Controller
            control={control}
            name="deathBenefit"
            render={({ field }) => (
              <CurrencyInput
                value={field.value ?? 0}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>

        <FormField label="Monthly Benefit" error={errors.monthlyBenefit?.message}>
          <Controller
            control={control}
            name="monthlyBenefit"
            render={({ field }) => (
              <CurrencyInput
                value={field.value ?? 0}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      </div>

      <FormField label="Annual Premium" required error={errors.annualPremium?.message}>
        <Controller
          control={control}
          name="annualPremium"
          render={({ field }) => (
            <CurrencyInput
              value={field.value}
              onChange={field.onChange}
              error={!!errors.annualPremium}
            />
          )}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Policy Number" error={errors.policyNumber?.message}>
          <Input {...register('policyNumber')} placeholder="Policy #" />
        </FormField>

        <FormField label="Carrier" error={errors.carrier?.message}>
          <Input {...register('carrier')} placeholder="Insurance carrier" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Issue Date" error={errors.issueDate?.message}>
          <Input type="date" {...register('issueDate')} />
        </FormField>

        <FormField label="Expiry Date" error={errors.expiryDate?.message}>
          <Input type="date" {...register('expiryDate')} />
        </FormField>
      </div>

      <Controller
        control={control}
        name="isEmployerPaid"
        render={({ field }) => (
          <Toggle
            checked={field.value}
            onCheckedChange={field.onChange}
            label="Employer Paid"
          />
        )}
      />

      {/* ── Disability-Specific Fields ── */}
      {isDisabilityPolicy(policyType) && (
        <div className="rounded-lg border border-white/[0.06] bg-transparent p-4 space-y-4">
          <h4 className="text-sm font-medium text-white/60">Disability Details</h4>

          <Controller
            control={control}
            name="ownOcc"
            render={({ field }) => (
              <Toggle
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                label="Own Occupation"
              />
            )}
          />

          <FormField label="Monthly Benefit Max" error={errors.monthlyBenefitMax?.message}>
            <Controller
              control={control}
              name="monthlyBenefitMax"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Elimination Period (Days)" error={errors.eliminationPeriodDays?.message}>
              <Input
                type="number"
                {...register('eliminationPeriodDays')}
                error={errors.eliminationPeriodDays?.message}
                placeholder="90"
                min={0}
              />
            </FormField>

            <FormField label="Benefit Period" error={errors.benefitPeriod?.message}>
              <Controller
                control={control}
                name="benefitPeriod"
                render={({ field }) => (
                  <Select
                    options={BENEFIT_PERIOD_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>
        </div>
      )}

      {/* ── LTC-Specific Fields ── */}
      {isLtcPolicy(policyType) && (
        <div className="rounded-lg border border-white/[0.06] bg-transparent p-4 space-y-4">
          <h4 className="text-sm font-medium text-white/60">Long-Term Care Details</h4>

          <FormField label="Daily Benefit" error={errors.ltcDailyBenefit?.message}>
            <Controller
              control={control}
              name="ltcDailyBenefit"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <FormField label="Inflation Protection" error={errors.ltcInflationProtection?.message}>
            <Controller
              control={control}
              name="ltcInflationProtection"
              render={({ field }) => (
                <Select
                  options={LTC_INFLATION_OPTIONS}
                  value={field.value}
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
          className="w-full rounded-lg border border-white/[0.10] bg-white/[0.07] backdrop-blur-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-100"
        />
      </FormField>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-5">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          {initialData?.type ? 'Update' : 'Add'} Policy
        </Button>
      </div>
    </form>
  );
}

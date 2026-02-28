'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Select, Toggle, Divider } from '@/components/prism/atoms';
import { FormField, PercentInput } from '@/components/prism/molecules';

// ==================== ZOD SCHEMA ====================

const planAssumptionsSchema = z.object({
  // Returns
  equityReturn: z.number().min(0).max(1),
  bondReturn: z.number().min(0).max(1),
  cashReturn: z.number().min(0).max(1),
  realEstateReturn: z.number().min(0).max(1),
  peReturn: z.number().min(0).max(1),

  // Inflation
  inflationRate: z.number().min(0).max(1),
  healthcareInflation: z.number().min(0).max(1),
  collegeInflation: z.number().min(0).max(1),

  // Monte Carlo
  monteCarloRuns: z.number().min(100, 'Minimum 100 runs').max(100000, 'Maximum 100,000 runs'),
  mcEquityStdDev: z.number().min(0).max(1),
  mcBondStdDev: z.number().min(0).max(1),
  successThreshold: z.number().min(0).max(1),

  // Social Security
  ssColaRate: z.number().min(0).max(1),
  ssHaircut: z.number().min(0).max(1),

  // Tax
  taxLawScenario: z.string().min(1, 'Tax law scenario is required'),
  tcjaPermanent: z.boolean(),

  // Life Expectancy
  lifeExpectancySource: z.string().min(1, 'Life expectancy source is required'),
  customLifeExpClient: z.number().min(50).max(120).optional(),
  customLifeExpCo: z.number().min(50).max(120).optional(),
});

export type PlanAssumptionsFormData = z.infer<typeof planAssumptionsSchema>;

// ==================== OPTION ARRAYS ====================

const TAX_LAW_SCENARIO_OPTIONS = [
  { value: 'current_law', label: 'Current Law' },
  { value: 'tcja_sunset', label: 'TCJA Sunset' },
  { value: 'custom', label: 'Custom' },
];

const LIFE_EXPECTANCY_SOURCE_OPTIONS = [
  { value: 'ssa_tables', label: 'SSA Tables' },
  { value: 'custom', label: 'Custom' },
];

// ==================== COMPONENT PROPS ====================

export interface PlanAssumptionsFormProps {
  initialData?: Partial<PlanAssumptionsFormData>;
  onSubmit: (data: PlanAssumptionsFormData) => void;
  isLoading?: boolean;
}

// ==================== COMPONENT ====================

export function PlanAssumptionsForm({
  initialData,
  onSubmit,
  isLoading = false,
}: PlanAssumptionsFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PlanAssumptionsFormData>({
    resolver: zodResolver(planAssumptionsSchema) as any,
    defaultValues: {
      // Returns
      equityReturn: 0.07,
      bondReturn: 0.04,
      cashReturn: 0.02,
      realEstateReturn: 0.06,
      peReturn: 0.10,

      // Inflation
      inflationRate: 0.025,
      healthcareInflation: 0.055,
      collegeInflation: 0.05,

      // Monte Carlo
      monteCarloRuns: 1000,
      mcEquityStdDev: 0.17,
      mcBondStdDev: 0.06,
      successThreshold: 0.80,

      // Social Security
      ssColaRate: 0.02,
      ssHaircut: 0,

      // Tax
      taxLawScenario: 'current_law',
      tcjaPermanent: false,

      // Life Expectancy
      lifeExpectancySource: 'ssa_tables',
      customLifeExpClient: undefined,
      customLifeExpCo: undefined,

      ...initialData,
    },
  });

  const lifeExpectancySource = watch('lifeExpectancySource');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Expected Returns ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Expected Returns</h3>
          <p className="mt-0.5 text-sm text-gray-500">Long-term nominal return assumptions by asset class.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Equity Return" required error={errors.equityReturn?.message}>
            <Controller
              control={control}
              name="equityReturn"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.equityReturn}
                />
              )}
            />
          </FormField>

          <FormField label="Bond Return" required error={errors.bondReturn?.message}>
            <Controller
              control={control}
              name="bondReturn"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.bondReturn}
                />
              )}
            />
          </FormField>

          <FormField label="Cash Return" required error={errors.cashReturn?.message}>
            <Controller
              control={control}
              name="cashReturn"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.cashReturn}
                />
              )}
            />
          </FormField>

          <FormField label="Real Estate Return" required error={errors.realEstateReturn?.message}>
            <Controller
              control={control}
              name="realEstateReturn"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.realEstateReturn}
                />
              )}
            />
          </FormField>

          <FormField label="Private Equity Return" required error={errors.peReturn?.message}>
            <Controller
              control={control}
              name="peReturn"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.peReturn}
                />
              )}
            />
          </FormField>
        </div>
      </section>

      <Divider />

      {/* ── Inflation ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Inflation</h3>
          <p className="mt-0.5 text-sm text-gray-500">Annual inflation rate assumptions.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="General Inflation" required error={errors.inflationRate?.message}>
            <Controller
              control={control}
              name="inflationRate"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.inflationRate}
                />
              )}
            />
          </FormField>

          <FormField label="Healthcare Inflation" required error={errors.healthcareInflation?.message}>
            <Controller
              control={control}
              name="healthcareInflation"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.healthcareInflation}
                />
              )}
            />
          </FormField>

          <FormField label="College Inflation" required error={errors.collegeInflation?.message}>
            <Controller
              control={control}
              name="collegeInflation"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.collegeInflation}
                />
              )}
            />
          </FormField>
        </div>
      </section>

      <Divider />

      {/* ── Monte Carlo ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Monte Carlo Simulation</h3>
          <p className="mt-0.5 text-sm text-gray-500">Parameters for probability-based projections.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Number of Runs" required error={errors.monteCarloRuns?.message}>
            <Input
              type="number"
              {...register('monteCarloRuns')}
              error={errors.monteCarloRuns?.message}
              placeholder="1000"
              min={100}
              max={100000}
            />
          </FormField>

          <FormField label="Success Threshold" required error={errors.successThreshold?.message}>
            <Controller
              control={control}
              name="successThreshold"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.successThreshold}
                />
              )}
            />
          </FormField>

          <FormField label="Equity Std Dev" required error={errors.mcEquityStdDev?.message}>
            <Controller
              control={control}
              name="mcEquityStdDev"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.mcEquityStdDev}
                />
              )}
            />
          </FormField>

          <FormField label="Bond Std Dev" required error={errors.mcBondStdDev?.message}>
            <Controller
              control={control}
              name="mcBondStdDev"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.mcBondStdDev}
                />
              )}
            />
          </FormField>
        </div>
      </section>

      <Divider />

      {/* ── Social Security ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Social Security</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="SS COLA Rate" required error={errors.ssColaRate?.message}>
            <Controller
              control={control}
              name="ssColaRate"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.ssColaRate}
                />
              )}
            />
          </FormField>

          <FormField
            label="SS Haircut"
            required
            error={errors.ssHaircut?.message}
            helperText="Assumed reduction in future benefits"
          >
            <Controller
              control={control}
              name="ssHaircut"
              render={({ field }) => (
                <PercentInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.ssHaircut}
                />
              )}
            />
          </FormField>
        </div>
      </section>

      <Divider />

      {/* ── Tax ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Tax</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Tax Law Scenario" required error={errors.taxLawScenario?.message}>
            <Controller
              control={control}
              name="taxLawScenario"
              render={({ field }) => (
                <Select
                  options={TAX_LAW_SCENARIO_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.taxLawScenario?.message}
                />
              )}
            />
          </FormField>

          <div className="flex items-end pb-1">
            <Controller
              control={control}
              name="tcjaPermanent"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  label="TCJA Permanent"
                />
              )}
            />
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Life Expectancy ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Life Expectancy</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Source" required error={errors.lifeExpectancySource?.message}>
            <Controller
              control={control}
              name="lifeExpectancySource"
              render={({ field }) => (
                <Select
                  options={LIFE_EXPECTANCY_SOURCE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.lifeExpectancySource?.message}
                />
              )}
            />
          </FormField>
        </div>

        {lifeExpectancySource === 'custom' && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Custom Life Exp. (Client)"
              error={errors.customLifeExpClient?.message}
              helperText="Age 50-120"
            >
              <Input
                type="number"
                {...register('customLifeExpClient')}
                error={errors.customLifeExpClient?.message}
                placeholder="90"
                min={50}
                max={120}
              />
            </FormField>

            <FormField
              label="Custom Life Exp. (Co-Client)"
              error={errors.customLifeExpCo?.message}
              helperText="Age 50-120"
            >
              <Input
                type="number"
                {...register('customLifeExpCo')}
                error={errors.customLifeExpCo?.message}
                placeholder="90"
                min={50}
                max={120}
              />
            </FormField>
          </div>
        )}
      </section>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Button type="submit" loading={isLoading}>
          Save Assumptions
        </Button>
      </div>
    </form>
  );
}

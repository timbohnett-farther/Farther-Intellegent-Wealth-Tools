'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Select, Toggle } from '@/components/prism/atoms';
import { FormField, CurrencyInput, PercentInput } from '@/components/prism/molecules';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/prism/types';

// ==================== ZOD SCHEMA ====================

const expenseSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    category: z.string().min(1, 'Category is required'),
    isEssential: z.boolean(),
    annualAmount: z.number().min(0, 'Amount must be positive'),
    frequency: z.string().min(1, 'Frequency is required'),
    isInflationAdjusted: z.boolean(),
    inflationOverride: z.number().min(0).max(1).optional(),
    startYear: z.number().min(1900).max(2100),
    endYear: z.number().min(1900).max(2100).optional(),
    appliesToClient: z.string().min(1, 'Applies to is required'),
    isPreRetirementOnly: z.boolean(),
    isPostRetirementOnly: z.boolean(),
    retirementFactor: z.number().min(0).max(1).optional(),
    notes: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.endYear && data.endYear < data.startYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End year must be after start year',
        path: ['endYear'],
      });
    }
    if (data.isPreRetirementOnly && data.isPostRetirementOnly) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot be both pre- and post-retirement only',
        path: ['isPostRetirementOnly'],
      });
    }
  });

export type ExpenseFormData = z.infer<typeof expenseSchema>;

// ==================== OPTION ARRAYS ====================

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
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

const APPLIES_TO_OPTIONS = [
  { value: 'both', label: 'Both' },
  { value: 'client', label: 'Client' },
  { value: 'co_client', label: 'Co-Client' },
];

// ==================== COMPONENT PROPS ====================

export interface ExpenseFormProps {
  initialData?: Partial<ExpenseFormData>;
  onSubmit: (data: ExpenseFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ==================== COMPONENT ====================

export function ExpenseForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      name: '',
      category: '',
      isEssential: false,
      annualAmount: 0,
      frequency: 'annual',
      isInflationAdjusted: true,
      inflationOverride: undefined,
      startYear: new Date().getFullYear(),
      endYear: undefined,
      appliesToClient: 'both',
      isPreRetirementOnly: false,
      isPostRetirementOnly: false,
      retirementFactor: undefined,
      notes: '',
      ...initialData,
    },
  });

  const isInflationAdjusted = watch('isInflationAdjusted');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormField label="Name" required error={errors.name?.message}>
        <Input {...register('name')} error={errors.name?.message} placeholder="Expense name" />
      </FormField>

      <FormField label="Category" required error={errors.category?.message}>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select
              options={CATEGORY_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              placeholder="Select category"
              error={errors.category?.message}
            />
          )}
        />
      </FormField>

      <Controller
        control={control}
        name="isEssential"
        render={({ field }) => (
          <Toggle
            checked={field.value}
            onCheckedChange={field.onChange}
            label="Essential Expense"
          />
        )}
      />

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

      <div className="space-y-3">
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

        {isInflationAdjusted && (
          <FormField
            label="Inflation Override"
            helperText="Leave blank to use plan default"
            error={errors.inflationOverride?.message}
          >
            <Controller
              control={control}
              name="inflationOverride"
              render={({ field }) => (
                <PercentInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  error={!!errors.inflationOverride}
                  placeholder="Plan default"
                />
              )}
            />
          </FormField>
        )}
      </div>

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

      <FormField label="Applies To" required error={errors.appliesToClient?.message}>
        <Controller
          control={control}
          name="appliesToClient"
          render={({ field }) => (
            <Select
              options={APPLIES_TO_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={errors.appliesToClient?.message}
            />
          )}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={control}
          name="isPreRetirementOnly"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onCheckedChange={field.onChange}
              label="Pre-Retirement Only"
            />
          )}
        />

        <div>
          <Controller
            control={control}
            name="isPostRetirementOnly"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onCheckedChange={field.onChange}
                label="Post-Retirement Only"
              />
            )}
          />
          {errors.isPostRetirementOnly && (
            <p className="mt-1 text-xs text-red-600">{errors.isPostRetirementOnly.message}</p>
          )}
        </div>
      </div>

      <FormField
        label="Retirement Factor"
        helperText="Percentage of expense that continues in retirement"
        error={errors.retirementFactor?.message}
      >
        <Controller
          control={control}
          name="retirementFactor"
          render={({ field }) => (
            <PercentInput
              value={field.value ?? 0}
              onChange={field.onChange}
              error={!!errors.retirementFactor}
              placeholder="100.00"
            />
          )}
        />
      </FormField>

      <FormField label="Notes" error={errors.notes?.message}>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Additional notes..."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </FormField>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          {initialData?.name ? 'Update' : 'Add'} Expense
        </Button>
      </div>
    </form>
  );
}

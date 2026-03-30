'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Select } from '@/components/prism/atoms';
import { FormField } from '@/components/prism/molecules';
import type { EstateDocType, EstateDocStatus } from '@/lib/prism/types';

// ==================== OPTION ARRAYS ====================

const DOCUMENT_TYPE_OPTIONS: { value: EstateDocType; label: string }[] = [
  { value: 'will', label: 'Will' },
  { value: 'revocable_trust', label: 'Revocable Trust' },
  { value: 'irrevocable_trust', label: 'Irrevocable Trust' },
  { value: 'pour_over_will', label: 'Pour-Over Will' },
  { value: 'durable_poa', label: 'Durable Power of Attorney' },
  { value: 'healthcare_proxy', label: 'Healthcare Proxy' },
  { value: 'living_will', label: 'Living Will' },
  { value: 'guardianship', label: 'Guardianship Designation' },
  { value: 'premarital_agreement', label: 'Premarital Agreement' },
  { value: 'buy_sell_agreement', label: 'Buy-Sell Agreement' },
];

const STATUS_OPTIONS: { value: EstateDocStatus; label: string }[] = [
  { value: 'in_place', label: 'In Place' },
  { value: 'needs_update', label: 'Needs Update' },
  { value: 'not_in_place', label: 'Not In Place' },
  { value: 'unknown', label: 'Unknown' },
];

// ==================== ZOD SCHEMA ====================

const estateDocumentSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  status: z.string().min(1, 'Status is required'),
  lastUpdated: z.string().optional().or(z.literal('')),
  attorneyName: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type EstateDocumentFormData = z.infer<typeof estateDocumentSchema>;

// ==================== COMPONENT PROPS ====================

export interface EstateDocumentFormProps {
  initialData?: Partial<EstateDocumentFormData>;
  onSubmit: (data: EstateDocumentFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ==================== COMPONENT ====================

export function EstateDocumentForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: EstateDocumentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EstateDocumentFormData>({
    resolver: zodResolver(estateDocumentSchema) as any,
    defaultValues: {
      documentType: '',
      status: 'unknown',
      lastUpdated: '',
      attorneyName: '',
      notes: '',
      ...initialData,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormField label="Document Type" required error={errors.documentType?.message}>
        <Controller
          control={control}
          name="documentType"
          render={({ field }) => (
            <Select
              options={DOCUMENT_TYPE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              placeholder="Select document type"
              error={errors.documentType?.message}
            />
          )}
        />
      </FormField>

      <FormField label="Status" required error={errors.status?.message}>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              options={STATUS_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={errors.status?.message}
            />
          )}
        />
      </FormField>

      <FormField label="Last Updated" error={errors.lastUpdated?.message}>
        <Input type="date" {...register('lastUpdated')} />
      </FormField>

      <FormField label="Attorney Name" error={errors.attorneyName?.message}>
        <Input
          {...register('attorneyName')}
          placeholder="Attorney or firm name"
        />
      </FormField>

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
          {initialData?.documentType ? 'Update' : 'Add'} Document
        </Button>
      </div>
    </form>
  );
}

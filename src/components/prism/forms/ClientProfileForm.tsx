'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle } from 'lucide-react';

import { Button, Input, Select, Toggle, Tooltip, Divider } from '@/components/prism/atoms';
import { FormField, AddressBlock } from '@/components/prism/molecules';
import type { AddressValue } from '@/components/prism/molecules';
import {
  type Gender,
  type MaritalStatus,
  type FilingStatus,
  type EmploymentStatus,
  type WealthTier,
  US_STATES,
  FILING_STATUS_LABELS,
  WEALTH_TIER_LABELS,
} from '@/lib/prism/types';

// ==================== ZOD SCHEMA ====================

const clientProfileSchema = z
  .object({
    // Personal Info
    firstName: z.string().min(1, 'First name is required').max(50),
    middleName: z.string().max(50).optional().or(z.literal('')),
    lastName: z.string().min(1, 'Last name is required').max(50),
    preferredName: z.string().max(50).optional().or(z.literal('')),
    suffix: z.string().optional().or(z.literal('')),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    gender: z.string().optional().or(z.literal('')),
    maritalStatus: z.string().min(1, 'Marital status is required'),
    filingStatus: z.string().min(1, 'Filing status is required'),
    ssnLastFour: z
      .string()
      .regex(/^\d{4}$/, 'Must be exactly 4 digits')
      .optional()
      .or(z.literal('')),

    // Contact
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    phoneMobile: z.string().optional().or(z.literal('')),
    phoneHome: z.string().optional().or(z.literal('')),

    // Address
    address: z.object({
      addressLine1: z.string(),
      addressLine2: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string(),
    }),
    domicileState: z.string().optional().or(z.literal('')),

    // Employment
    employmentStatus: z.string().min(1, 'Employment status is required'),
    employerName: z.string().optional().or(z.literal('')),
    occupation: z.string().optional().or(z.literal('')),
    expectedRetirementAge: z.number().optional(),

    // Planning
    planningHorizon: z
      .number({ error: 'Planning horizon is required' })
      .min(1, 'Planning horizon is required'),
    lifeExpectancy: z.number().optional(),
    wealthTier: z.string().min(1, 'Wealth tier is required'),
  })
  .superRefine((data, ctx) => {
    // Employer name required when employed
    const employed: string[] = ['employed', 'self_employed', 'part_time'];
    if (employed.includes(data.employmentStatus) && !data.employerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Employer name is required when employed',
        path: ['employerName'],
      });
    }
    // Expected retirement age required for employed persons
    if (
      employed.includes(data.employmentStatus) &&
      (data.expectedRetirementAge === undefined || data.expectedRetirementAge === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected retirement age is required',
        path: ['expectedRetirementAge'],
      });
    }
    if (
      data.expectedRetirementAge !== undefined &&
      data.expectedRetirementAge !== 0 &&
      (data.expectedRetirementAge < 45 || data.expectedRetirementAge > 80)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be between 45 and 80',
        path: ['expectedRetirementAge'],
      });
    }
  });

export type ClientProfileFormData = z.infer<typeof clientProfileSchema>;

// ==================== OPTION ARRAYS ====================

const SUFFIX_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Jr', label: 'Jr.' },
  { value: 'Sr', label: 'Sr.' },
  { value: 'II', label: 'II' },
  { value: 'III', label: 'III' },
  { value: 'MD', label: 'M.D.' },
  { value: 'Esq', label: 'Esq.' },
  { value: 'CFP', label: 'CFP' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'domestic_partner', label: 'Domestic Partner' },
  { value: 'separated', label: 'Separated' },
];

const FILING_STATUS_OPTIONS = Object.entries(FILING_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'retired', label: 'Retired' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'not_employed', label: 'Not Employed' },
];

const WEALTH_TIER_OPTIONS = Object.entries(WEALTH_TIER_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STATE_OPTIONS = [{ value: '', label: 'Select...' }, ...US_STATES.map((s) => ({ value: s.value, label: s.label }))];

// ==================== FILING STATUS AUTO-SUGGEST ====================

function suggestFilingStatus(marital: string): FilingStatus | '' {
  switch (marital) {
    case 'single':
    case 'divorced':
    case 'separated':
      return 'single';
    case 'married':
    case 'domestic_partner':
      return 'mfj';
    case 'widowed':
      return 'qw';
    default:
      return '';
  }
}

// ==================== COMPONENT PROPS ====================

export interface ClientProfileFormProps {
  initialData?: Partial<ClientProfileFormData>;
  onSubmit: (data: ClientProfileFormData) => void;
  isLoading?: boolean;
}

// ==================== COMPONENT ====================

export function ClientProfileForm({
  initialData,
  onSubmit,
  isLoading = false,
}: ClientProfileFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientProfileFormData>({
    resolver: zodResolver(clientProfileSchema) as any,
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      preferredName: '',
      suffix: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      filingStatus: '',
      ssnLastFour: '',
      email: '',
      phoneMobile: '',
      phoneHome: '',
      address: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
      },
      domicileState: '',
      employmentStatus: '',
      employerName: '',
      occupation: '',
      expectedRetirementAge: undefined,
      planningHorizon: undefined as unknown as number,
      lifeExpectancy: undefined,
      wealthTier: '',
      ...initialData,
    },
  });

  const maritalStatus = watch('maritalStatus');
  const employmentStatus = watch('employmentStatus');

  // Auto-suggest filing status when marital status changes
  useEffect(() => {
    if (maritalStatus) {
      const suggested = suggestFilingStatus(maritalStatus);
      if (suggested) {
        setValue('filingStatus', suggested);
      }
    }
  }, [maritalStatus, setValue]);

  const isEmployed = ['employed', 'self_employed', 'part_time'].includes(employmentStatus);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Personal Information ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-charcoal-900">Personal Information</h3>
          <p className="mt-0.5 text-sm text-charcoal-500">Basic identifying information for the client.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="First Name" required error={errors.firstName?.message}>
            <Input {...register('firstName')} error={errors.firstName?.message} placeholder="First name" />
          </FormField>

          <FormField label="Middle Name" error={errors.middleName?.message}>
            <Input {...register('middleName')} placeholder="Middle name" />
          </FormField>

          <FormField label="Last Name" required error={errors.lastName?.message}>
            <Input {...register('lastName')} error={errors.lastName?.message} placeholder="Last name" />
          </FormField>

          <FormField label="Preferred Name" error={errors.preferredName?.message}>
            <Input {...register('preferredName')} placeholder="Preferred name" />
          </FormField>

          <FormField label="Suffix" error={errors.suffix?.message}>
            <Controller
              control={control}
              name="suffix"
              render={({ field }) => (
                <Select
                  options={SUFFIX_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select suffix"
                />
              )}
            />
          </FormField>

          <FormField label="Date of Birth" required error={errors.dateOfBirth?.message}>
            <Input type="date" {...register('dateOfBirth')} error={errors.dateOfBirth?.message} />
          </FormField>

          <FormField label="Gender" error={errors.gender?.message}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select
                  options={GENDER_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select gender"
                />
              )}
            />
          </FormField>

          <FormField label="Marital Status" required error={errors.maritalStatus?.message}>
            <Controller
              control={control}
              name="maritalStatus"
              render={({ field }) => (
                <Select
                  options={MARITAL_STATUS_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select marital status"
                  error={errors.maritalStatus?.message}
                />
              )}
            />
          </FormField>

          <FormField
            label="Filing Status"
            required
            error={errors.filingStatus?.message}
            helperText="Auto-suggested from marital status"
          >
            <Controller
              control={control}
              name="filingStatus"
              render={({ field }) => (
                <Select
                  options={FILING_STATUS_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select filing status"
                  error={errors.filingStatus?.message}
                />
              )}
            />
          </FormField>

          <FormField label="SSN (Last 4)" error={errors.ssnLastFour?.message}>
            <Input
              {...register('ssnLastFour')}
              type="password"
              placeholder="****"
              maxLength={4}
              error={errors.ssnLastFour?.message}
            />
          </FormField>
        </div>
      </section>

      <Divider />

      {/* ── Contact Information ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-charcoal-900">Contact Information</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Email" required error={errors.email?.message} className="sm:col-span-2">
            <Input
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="client@example.com"
            />
          </FormField>

          <FormField label="Mobile Phone" error={errors.phoneMobile?.message}>
            <Input type="tel" {...register('phoneMobile')} placeholder="(555) 555-1234" />
          </FormField>

          <FormField label="Home Phone" error={errors.phoneHome?.message}>
            <Input type="tel" {...register('phoneHome')} placeholder="(555) 555-1234" />
          </FormField>
        </div>
      </section>

      <Divider />

      {/* ── Address ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-charcoal-900">Address</h3>
        </div>

        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <AddressBlock value={field.value} onChange={field.onChange} />
          )}
        />

        <div className="mt-4 max-w-xs">
          <FormField label="Domicile State" error={errors.domicileState?.message}>
            <Controller
              control={control}
              name="domicileState"
              render={({ field }) => (
                <Select
                  options={STATE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select domicile state"
                />
              )}
            />
          </FormField>
        </div>
      </section>

      <Divider />

      {/* ── Employment ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-charcoal-900">Employment</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Employment Status" required error={errors.employmentStatus?.message}>
            <Controller
              control={control}
              name="employmentStatus"
              render={({ field }) => (
                <Select
                  options={EMPLOYMENT_STATUS_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select status"
                  error={errors.employmentStatus?.message}
                />
              )}
            />
          </FormField>

          {isEmployed && (
            <FormField label="Employer Name" required error={errors.employerName?.message}>
              <Input
                {...register('employerName')}
                error={errors.employerName?.message}
                placeholder="Employer name"
              />
            </FormField>
          )}

          <FormField label="Occupation" error={errors.occupation?.message}>
            <Input {...register('occupation')} placeholder="Occupation" />
          </FormField>

          {isEmployed && (
            <FormField
              label="Expected Retirement Age"
              required
              error={errors.expectedRetirementAge?.message}
              helperText="Between 45 and 80"
            >
              <Input
                type="number"
                {...register('expectedRetirementAge')}
                error={errors.expectedRetirementAge?.message}
                placeholder="65"
                min={45}
                max={80}
              />
            </FormField>
          )}
        </div>
      </section>

      <Divider />

      {/* ── Planning ── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-charcoal-900">Planning</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Planning Horizon"
            required
            error={errors.planningHorizon?.message}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                {...register('planningHorizon')}
                error={errors.planningHorizon?.message}
                placeholder="90"
              />
              <Tooltip content="Age at which the financial plan ends">
                <button type="button" className="text-charcoal-300 hover:text-charcoal-500">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          </FormField>

          <FormField label="Life Expectancy" error={errors.lifeExpectancy?.message}>
            <Input
              type="number"
              {...register('lifeExpectancy')}
              placeholder="90"
            />
          </FormField>

          <FormField label="Wealth Tier" required error={errors.wealthTier?.message}>
            <Controller
              control={control}
              name="wealthTier"
              render={({ field }) => (
                <Select
                  options={WEALTH_TIER_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select tier"
                  error={errors.wealthTier?.message}
                />
              )}
            />
          </FormField>
        </div>
      </section>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 border-t border-limestone-200 pt-6">
        <Button type="submit" loading={isLoading}>
          Save Profile
        </Button>
      </div>
    </form>
  );
}

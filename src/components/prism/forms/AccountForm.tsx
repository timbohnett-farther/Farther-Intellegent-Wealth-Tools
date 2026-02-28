'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Select, Toggle } from '@/components/prism/atoms';
import { FormField, CurrencyInput, PercentInput } from '@/components/prism/molecules';

// ==================== ACCOUNT TYPE GROUPED OPTIONS ====================

const ACCOUNT_TYPE_GROUPS = {
  Taxable: [
    { value: 'brokerage_individual', label: 'Brokerage (Individual)' },
    { value: 'brokerage_joint', label: 'Brokerage (Joint)' },
    { value: 'checking', label: 'Checking' },
    { value: 'savings', label: 'Savings' },
    { value: 'money_market', label: 'Money Market' },
    { value: 'cd', label: 'CD' },
    { value: 'utma_ugma', label: 'UTMA/UGMA' },
    { value: 'crypto_exchange', label: 'Crypto Exchange' },
    { value: 'collectibles', label: 'Collectibles' },
    { value: 'real_estate_investment', label: 'Real Estate Investment' },
    { value: 'private_equity', label: 'Private Equity' },
    { value: 'hedge_fund', label: 'Hedge Fund' },
    { value: 'private_credit', label: 'Private Credit' },
  ],
  'Tax-Deferred': [
    { value: 'ira_traditional', label: 'Traditional IRA' },
    { value: 'ira_sep', label: 'SEP IRA' },
    { value: 'ira_simple', label: 'SIMPLE IRA' },
    { value: 'ira_rollover', label: 'Rollover IRA' },
    { value: 'ira_inherited', label: 'Inherited IRA' },
    { value: '401k_traditional', label: 'Traditional 401(k)' },
    { value: '403b_traditional', label: 'Traditional 403(b)' },
    { value: '457b', label: '457(b)' },
    { value: 'pension_db', label: 'Pension (DB)' },
    { value: 'nqdc', label: 'NQDC' },
    { value: 'annuity_non_qualified', label: 'Annuity (Non-Qualified)' },
    { value: 'hsa_spendable', label: 'HSA (Spendable)' },
  ],
  'Tax-Free': [
    { value: 'roth_ira', label: 'Roth IRA' },
    { value: 'roth_401k', label: 'Roth 401(k)' },
    { value: 'roth_403b', label: 'Roth 403(b)' },
    { value: '529_plan', label: '529 Plan' },
    { value: 'hsa_investable', label: 'HSA (Investable)' },
    { value: 'life_insurance_csv', label: 'Life Insurance CSV' },
  ],
  'Non-Financial': [
    { value: 'real_estate_primary', label: 'Primary Residence' },
    { value: 'real_estate_vacation', label: 'Vacation Property' },
    { value: 'business_interest', label: 'Business Interest' },
    { value: 'personal_property', label: 'Personal Property' },
    { value: 'other_asset', label: 'Other Asset' },
  ],
  Liability: [
    { value: 'mortgage_primary', label: 'Primary Mortgage' },
    { value: 'mortgage_investment', label: 'Investment Mortgage' },
    { value: 'heloc', label: 'HELOC' },
    { value: 'auto_loan', label: 'Auto Loan' },
    { value: 'student_loan_federal', label: 'Student Loan (Federal)' },
    { value: 'student_loan_private', label: 'Student Loan (Private)' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'margin_loan', label: 'Margin Loan' },
    { value: 'sbloc', label: 'SBLOC' },
    { value: 'personal_loan', label: 'Personal Loan' },
    { value: 'business_loan', label: 'Business Loan' },
    { value: 'other_liability', label: 'Other Liability' },
  ],
} as const;

// Flatten for select options
const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_GROUPS).flatMap(([group, items]) =>
  items.map((item) => ({ value: item.value, label: `${group} - ${item.label}` })),
);

const REGISTRATION_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'joint_tenants', label: 'Joint Tenants' },
  { value: 'joint_community', label: 'Joint Community' },
  { value: 'tenants_common', label: 'Tenants in Common' },
  { value: 'trust', label: 'Trust' },
  { value: 'entity', label: 'Entity' },
  { value: 'beneficiary_ira', label: 'Beneficiary IRA' },
  { value: 'inherited_ira', label: 'Inherited IRA' },
];

const VESTING_SCHEDULE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'immediate', label: 'Immediate' },
  { value: 'cliff_1yr', label: '1-Year Cliff' },
  { value: 'cliff_3yr', label: '3-Year Cliff' },
  { value: 'graded_4yr', label: '4-Year Graded' },
  { value: 'graded_5yr', label: '5-Year Graded' },
  { value: 'graded_6yr', label: '6-Year Graded' },
];

const LOAN_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'fixed', label: 'Fixed Rate' },
  { value: 'variable', label: 'Variable Rate' },
  { value: 'interest_only', label: 'Interest Only' },
  { value: 'balloon', label: 'Balloon' },
  { value: 'arm', label: 'ARM' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'single_family', label: 'Single Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
];

// ==================== ZOD SCHEMA ====================

const accountSchema = z
  .object({
    // Always shown
    name: z.string().min(1, 'Name is required').max(100),
    institution: z.string().min(1, 'Institution is required').max(100),
    accountNumberLast4: z
      .string()
      .regex(/^\d{4}$/, 'Must be exactly 4 digits')
      .optional()
      .or(z.literal('')),
    accountType: z.string().min(1, 'Account type is required'),
    registration: z.string().min(1, 'Registration is required'),
    currentBalance: z.number().min(0, 'Balance must be positive'),
    balanceAsOf: z.string().min(1, 'Balance date is required'),

    // Investment accounts
    costBasis: z.number().optional(),
    equityPct: z.number().min(0).max(1).optional(),
    bondPct: z.number().min(0).max(1).optional(),
    cashPct: z.number().min(0).max(1).optional(),
    alternativePct: z.number().min(0).max(1).optional(),
    expectedReturn: z.number().min(0).max(1).optional(),

    // Employer plans
    employerMatchPct: z.number().min(0).max(1).optional(),
    employerMatchLimitPct: z.number().min(0).max(1).optional(),
    vestingSchedule: z.string().optional().or(z.literal('')),
    vestingYearsComplete: z.number().min(0).optional(),

    // Liabilities
    originalBalance: z.number().optional(),
    interestRate: z.number().min(0).max(1).optional(),
    loanType: z.string().optional().or(z.literal('')),
    monthlyPayment: z.number().optional(),
    remainingTermMonths: z.number().min(0).optional(),
    isTaxDeductible: z.boolean().optional(),

    // Real estate
    propertyType: z.string().optional().or(z.literal('')),
    annualPropertyTax: z.number().optional(),
    annualInsurance: z.number().optional(),
    annualHoa: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate allocation sums to 100% for investment accounts
    if (isInvestmentAccount(data.accountType)) {
      const sum =
        (data.equityPct ?? 0) +
        (data.bondPct ?? 0) +
        (data.cashPct ?? 0) +
        (data.alternativePct ?? 0);
      const sumRounded = Math.round(sum * 10000) / 10000;
      if (sumRounded > 0 && Math.abs(sumRounded - 1) > 0.001) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Allocation must sum to 100% (currently ${(sumRounded * 100).toFixed(1)}%)`,
          path: ['alternativePct'],
        });
      }
    }
  });

export type AccountFormData = z.infer<typeof accountSchema>;

// ==================== HELPERS ====================

const INVESTMENT_TYPES = new Set([
  'brokerage_individual',
  'brokerage_joint',
  'ira_traditional',
  'ira_sep',
  'ira_simple',
  'ira_rollover',
  'ira_inherited',
  'roth_ira',
  'roth_401k',
  'roth_403b',
  '401k_traditional',
  '403b_traditional',
  '457b',
  '529_plan',
  'hsa_investable',
  'private_equity',
  'hedge_fund',
  'private_credit',
]);

const EMPLOYER_PLAN_TYPES = new Set([
  '401k_traditional',
  '403b_traditional',
  '457b',
  'roth_401k',
  'roth_403b',
  'ira_simple',
  'ira_sep',
]);

const LIABILITY_TYPES = new Set([
  'mortgage_primary',
  'mortgage_investment',
  'heloc',
  'auto_loan',
  'student_loan_federal',
  'student_loan_private',
  'credit_card',
  'margin_loan',
  'sbloc',
  'personal_loan',
  'business_loan',
  'other_liability',
]);

const REAL_ESTATE_TYPES = new Set([
  'real_estate_primary',
  'real_estate_vacation',
  'real_estate_investment',
]);

function isInvestmentAccount(type: string): boolean {
  return INVESTMENT_TYPES.has(type);
}

function isEmployerPlan(type: string): boolean {
  return EMPLOYER_PLAN_TYPES.has(type);
}

function isLiability(type: string): boolean {
  return LIABILITY_TYPES.has(type);
}

function isRealEstate(type: string): boolean {
  return REAL_ESTATE_TYPES.has(type);
}

// ==================== COMPONENT PROPS ====================

export interface AccountFormProps {
  initialData?: Partial<AccountFormData>;
  onSubmit: (data: AccountFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ==================== COMPONENT ====================

export function AccountForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: AccountFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      name: '',
      institution: '',
      accountNumberLast4: '',
      accountType: '',
      registration: 'individual',
      currentBalance: 0,
      balanceAsOf: '',
      costBasis: undefined,
      equityPct: 0,
      bondPct: 0,
      cashPct: 0,
      alternativePct: 0,
      expectedReturn: 0,
      employerMatchPct: 0,
      employerMatchLimitPct: 0,
      vestingSchedule: '',
      vestingYearsComplete: undefined,
      originalBalance: 0,
      interestRate: 0,
      loanType: '',
      monthlyPayment: 0,
      remainingTermMonths: undefined,
      isTaxDeductible: false,
      propertyType: '',
      annualPropertyTax: 0,
      annualInsurance: 0,
      annualHoa: 0,
      ...initialData,
    },
  });

  const accountType = watch('accountType');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Core Account Fields ── */}
      <FormField label="Account Name" required error={errors.name?.message}>
        <Input {...register('name')} error={errors.name?.message} placeholder="e.g. Schwab Brokerage" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Institution" required error={errors.institution?.message}>
          <Input
            {...register('institution')}
            error={errors.institution?.message}
            placeholder="e.g. Charles Schwab"
          />
        </FormField>

        <FormField label="Account # (Last 4)" error={errors.accountNumberLast4?.message}>
          <Input
            {...register('accountNumberLast4')}
            type="password"
            error={errors.accountNumberLast4?.message}
            placeholder="****"
            maxLength={4}
          />
        </FormField>
      </div>

      <FormField label="Account Type" required error={errors.accountType?.message}>
        <Controller
          control={control}
          name="accountType"
          render={({ field }) => (
            <Select
              options={ACCOUNT_TYPE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              placeholder="Select account type"
              error={errors.accountType?.message}
            />
          )}
        />
      </FormField>

      <FormField label="Registration" required error={errors.registration?.message}>
        <Controller
          control={control}
          name="registration"
          render={({ field }) => (
            <Select
              options={REGISTRATION_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={errors.registration?.message}
            />
          )}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Current Balance" required error={errors.currentBalance?.message}>
          <Controller
            control={control}
            name="currentBalance"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                error={!!errors.currentBalance}
              />
            )}
          />
        </FormField>

        <FormField label="Balance As Of" required error={errors.balanceAsOf?.message}>
          <Input
            type="date"
            {...register('balanceAsOf')}
            error={errors.balanceAsOf?.message}
          />
        </FormField>
      </div>

      {/* ── Investment Account Fields ── */}
      {isInvestmentAccount(accountType) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Investment Details</h4>

          <FormField label="Cost Basis" error={errors.costBasis?.message}>
            <Controller
              control={control}
              name="costBasis"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Asset Allocation <span className="font-normal text-gray-500">(must total 100%)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Equity %" error={errors.equityPct?.message}>
                <Controller
                  control={control}
                  name="equityPct"
                  render={({ field }) => (
                    <PercentInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      error={!!errors.equityPct}
                      max={1}
                    />
                  )}
                />
              </FormField>

              <FormField label="Bond %" error={errors.bondPct?.message}>
                <Controller
                  control={control}
                  name="bondPct"
                  render={({ field }) => (
                    <PercentInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      error={!!errors.bondPct}
                      max={1}
                    />
                  )}
                />
              </FormField>

              <FormField label="Cash %" error={errors.cashPct?.message}>
                <Controller
                  control={control}
                  name="cashPct"
                  render={({ field }) => (
                    <PercentInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      error={!!errors.cashPct}
                      max={1}
                    />
                  )}
                />
              </FormField>

              <FormField label="Alternative %" error={errors.alternativePct?.message}>
                <Controller
                  control={control}
                  name="alternativePct"
                  render={({ field }) => (
                    <PercentInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      error={!!errors.alternativePct}
                      max={1}
                    />
                  )}
                />
              </FormField>
            </div>
          </div>

          <FormField label="Expected Return" error={errors.expectedReturn?.message}>
            <Controller
              control={control}
              name="expectedReturn"
              render={({ field }) => (
                <PercentInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  error={!!errors.expectedReturn}
                />
              )}
            />
          </FormField>
        </div>
      )}

      {/* ── Employer Plan Fields ── */}
      {isEmployerPlan(accountType) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Employer Plan Details</h4>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Employer Match %" error={errors.employerMatchPct?.message}>
              <Controller
                control={control}
                name="employerMatchPct"
                render={({ field }) => (
                  <PercentInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    error={!!errors.employerMatchPct}
                  />
                )}
              />
            </FormField>

            <FormField label="Match Limit %" error={errors.employerMatchLimitPct?.message}>
              <Controller
                control={control}
                name="employerMatchLimitPct"
                render={({ field }) => (
                  <PercentInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    error={!!errors.employerMatchLimitPct}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vesting Schedule" error={errors.vestingSchedule?.message}>
              <Controller
                control={control}
                name="vestingSchedule"
                render={({ field }) => (
                  <Select
                    options={VESTING_SCHEDULE_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField label="Vesting Years Complete" error={errors.vestingYearsComplete?.message}>
              <Input
                type="number"
                {...register('vestingYearsComplete')}
                error={errors.vestingYearsComplete?.message}
                placeholder="0"
                min={0}
              />
            </FormField>
          </div>
        </div>
      )}

      {/* ── Liability Fields ── */}
      {isLiability(accountType) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Liability Details</h4>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Original Balance" error={errors.originalBalance?.message}>
              <Controller
                control={control}
                name="originalBalance"
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField label="Interest Rate" error={errors.interestRate?.message}>
              <Controller
                control={control}
                name="interestRate"
                render={({ field }) => (
                  <PercentInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    error={!!errors.interestRate}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField label="Loan Type" error={errors.loanType?.message}>
            <Controller
              control={control}
              name="loanType"
              render={({ field }) => (
                <Select
                  options={LOAN_TYPE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Monthly Payment" error={errors.monthlyPayment?.message}>
              <Controller
                control={control}
                name="monthlyPayment"
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField label="Remaining Term (months)" error={errors.remainingTermMonths?.message}>
              <Input
                type="number"
                {...register('remainingTermMonths')}
                error={errors.remainingTermMonths?.message}
                placeholder="360"
                min={0}
              />
            </FormField>
          </div>

          <Controller
            control={control}
            name="isTaxDeductible"
            render={({ field }) => (
              <Toggle
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                label="Tax Deductible"
              />
            )}
          />
        </div>
      )}

      {/* ── Real Estate Fields ── */}
      {isRealEstate(accountType) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Real Estate Details</h4>

          <FormField label="Property Type" error={errors.propertyType?.message}>
            <Controller
              control={control}
              name="propertyType"
              render={({ field }) => (
                <Select
                  options={PROPERTY_TYPE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Annual Property Tax" error={errors.annualPropertyTax?.message}>
              <Controller
                control={control}
                name="annualPropertyTax"
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField label="Annual Insurance" error={errors.annualInsurance?.message}>
              <Controller
                control={control}
                name="annualInsurance"
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField label="Annual HOA" error={errors.annualHoa?.message}>
            <Controller
              control={control}
              name="annualHoa"
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

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          {initialData?.name ? 'Update' : 'Add'} Account
        </Button>
      </div>
    </form>
  );
}

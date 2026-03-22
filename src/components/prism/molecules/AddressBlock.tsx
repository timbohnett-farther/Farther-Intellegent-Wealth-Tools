'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { US_STATES } from '@/lib/prism/types';

export interface AddressValue {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface AddressBlockProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  className?: string;
}

const inputBaseClass =
  'w-full rounded-input border border-limestone-200 bg-white px-3 py-2 text-sm text-charcoal-900 outline-hidden transition-colors placeholder:text-charcoal-300 focus:border-brand-700 focus:ring-2 focus:ring-brand-100';

const labelClass = 'mb-1 block text-sm font-medium text-charcoal-700';

export function AddressBlock({
  value,
  onChange,
  className,
}: AddressBlockProps) {
  const update = useCallback(
    (field: keyof AddressValue, fieldValue: string) => {
      onChange({ ...value, [field]: fieldValue });
    },
    [value, onChange],
  );

  return (
    <div className={cn('grid gap-4', className)}>
      {/* Address Line 1 */}
      <div>
        <label className={labelClass}>
          Address Line 1<span className="ml-0.5 text-critical-500">*</span>
        </label>
        <input
          type="text"
          value={value.addressLine1}
          onChange={(e) => update('addressLine1', e.target.value)}
          placeholder="123 Main Street"
          className={inputBaseClass}
          autoComplete="address-line1"
        />
      </div>

      {/* Address Line 2 */}
      <div>
        <label className={labelClass}>Address Line 2</label>
        <input
          type="text"
          value={value.addressLine2}
          onChange={(e) => update('addressLine2', e.target.value)}
          placeholder="Apt, Suite, Unit (optional)"
          className={inputBaseClass}
          autoComplete="address-line2"
        />
      </div>

      {/* City / State / Zip row */}
      <div className="grid grid-cols-6 gap-3">
        {/* City */}
        <div className="col-span-3">
          <label className={labelClass}>
            City<span className="ml-0.5 text-critical-500">*</span>
          </label>
          <input
            type="text"
            value={value.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="City"
            className={inputBaseClass}
            autoComplete="address-level2"
          />
        </div>

        {/* State */}
        <div className="col-span-2">
          <label className={labelClass}>
            State<span className="ml-0.5 text-critical-500">*</span>
          </label>
          <select
            value={value.state}
            onChange={(e) => update('state', e.target.value)}
            className={cn(inputBaseClass, 'cursor-pointer')}
            autoComplete="address-level1"
          >
            <option value="">Select...</option>
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* ZIP */}
        <div className="col-span-1">
          <label className={labelClass}>
            ZIP<span className="ml-0.5 text-critical-500">*</span>
          </label>
          <input
            type="text"
            value={value.zip}
            onChange={(e) => {
              // Only allow digits and hyphens, max 10 chars (ZIP+4)
              const cleaned = e.target.value.replace(/[^0-9-]/g, '').slice(0, 10);
              update('zip', cleaned);
            }}
            placeholder="00000"
            className={inputBaseClass}
            inputMode="numeric"
            maxLength={10}
            autoComplete="postal-code"
          />
        </div>
      </div>

      {/* Country */}
      <div>
        <label className={labelClass}>Country</label>
        <select
          value={value.country}
          onChange={(e) => update('country', e.target.value)}
          className={cn(inputBaseClass, 'cursor-pointer')}
          autoComplete="country"
        >
          <option value="US">United States</option>
        </select>
      </div>
    </div>
  );
}

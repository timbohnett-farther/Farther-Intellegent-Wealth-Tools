'use client';

import React from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-input border border-gray-300 bg-white px-3',
        'transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}

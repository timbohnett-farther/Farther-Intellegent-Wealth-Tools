'use client';

import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export interface TagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder = 'Add tag...',
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (trimmed && !tags.includes(trimmed)) {
          onAdd(trimmed);
          setInputValue('');
        }
      } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        onRemove(tags[tags.length - 1]);
      }
    },
    [inputValue, tags, onAdd, onRemove],
  );

  const handleBlur = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  }, [inputValue, tags, onAdd]);

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-1.5 rounded-input border border-limestone-200 bg-white px-2 py-1.5',
        'transition-colors focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-100',
        className,
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="inline-flex items-center rounded-sm p-0.5 text-brand-700 transition-colors hover:bg-brand-200 hover:text-brand-800"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[80px] flex-1 bg-transparent py-1 text-sm text-charcoal-900 outline-none placeholder:text-charcoal-300"
      />
    </div>
  );
}

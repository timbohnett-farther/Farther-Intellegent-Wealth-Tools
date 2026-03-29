'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
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
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-input border border-border-subtle bg-surface-soft backdrop-blur-xl px-2 py-1.5',
        'transition-colors focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-brand-100',
        className,
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-accent-primary/15 px-2 py-0.5 text-xs font-medium text-accent-primarySoft"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="inline-flex items-center rounded-sm p-0.5 text-accent-primarySoft transition-colors hover:bg-accent-primary/20 hover:text-brand-400"
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
        className="min-w-[80px] flex-1 bg-transparent py-1 text-sm text-text outline-hidden placeholder:text-text-faint"
      />
    </div>
  );
}

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
        'flex flex-wrap items-center gap-1.5 rounded-input border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-2 py-1.5',
        'transition-colors focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100',
        className,
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-300"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="inline-flex items-center rounded-sm p-0.5 text-teal-300 transition-colors hover:bg-teal-500/20 hover:text-teal-400"
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
        className="min-w-[80px] flex-1 bg-transparent py-1 text-sm text-white outline-hidden placeholder:text-white/30"
      />
    </div>
  );
}

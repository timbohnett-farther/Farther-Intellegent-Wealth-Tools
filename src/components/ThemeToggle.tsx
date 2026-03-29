'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ background: 'var(--s-surface-subtle)' }}
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className="flex items-center justify-center w-8 h-8 rounded-md transition-all duration-150"
          style={{
            background: theme === value ? 'var(--s-card-bg)' : 'transparent',
            color: theme === value ? 'var(--s-text)' : 'var(--s-text-faint)',
            boxShadow: theme === value ? 'var(--s-card-shadow)' : 'none',
          }}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

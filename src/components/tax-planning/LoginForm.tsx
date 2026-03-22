'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/prism/atoms/Spinner';

export interface LoginFormProps {
  /** Async callback when the form is submitted */
  onSubmit: (email: string, password: string) => Promise<void>;
  /** Error message to display */
  error?: string;
  /** Whether the form is in a loading state */
  loading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  error,
  loading = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validate = useCallback((): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = 'Please enter a valid email address.';
      }
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate() || loading) return;
      await onSubmit(email.trim(), password);
    },
    [validate, loading, onSubmit, email, password]
  );

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-700 mb-4">
          <span className="text-white font-bold text-lg">FT</span>
        </div>
        <h1 className="text-2xl font-bold text-charcoal-900">
          Farther Tax Planning
        </h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Sign in to your account
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-critical-100 border border-critical-200 px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-critical-700 mt-0.5" />
          <p className="text-sm text-critical-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-email"
            className="text-sm font-medium text-charcoal-700"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationErrors.email) {
                setValidationErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="you@example.com"
            disabled={loading}
            autoComplete="email"
            className={cn(
              'h-10 w-full rounded-lg border-[1.5px] bg-white px-3 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition-colors focus:outline-hidden focus:shadow-focus',
              'disabled:cursor-not-allowed disabled:bg-limestone-50 disabled:text-charcoal-300',
              validationErrors.email
                ? 'border-critical-500 focus:border-critical-500'
                : 'border-limestone-200 focus:border-brand-700'
            )}
          />
          {validationErrors.email && (
            <p className="text-xs text-critical-500">{validationErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-password"
            className="text-sm font-medium text-charcoal-700"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) {
                setValidationErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
            className={cn(
              'h-10 w-full rounded-lg border-[1.5px] bg-white px-3 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition-colors focus:outline-hidden focus:shadow-focus',
              'disabled:cursor-not-allowed disabled:bg-limestone-50 disabled:text-charcoal-300',
              validationErrors.password
                ? 'border-critical-500 focus:border-critical-500'
                : 'border-limestone-200 focus:border-brand-700'
            )}
          />
          {validationErrors.password && (
            <p className="text-xs text-critical-500">{validationErrors.password}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-medium transition-colors shadow-sm',
            'focus-visible:outline-hidden focus-visible:shadow-focus',
            'disabled:pointer-events-none disabled:opacity-45',
            'bg-brand-700 text-white hover:bg-brand-600 active:bg-brand-800'
          )}
        >
          {loading && <Spinner size="sm" className="text-white" />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

LoginForm.displayName = 'LoginForm';

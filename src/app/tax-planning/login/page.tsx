'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginRequest, LoginResponse, ErrorEnvelope } from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Login Page
// ---------------------------------------------------------------------------
// Centered login card on a canvas background with Farther branding.
// Calls POST /api/v1/auth/login and stores the JWT in localStorage.
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Submit handler ----
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!email.trim() || !password.trim()) {
        setError('Please enter both email and password.');
        return;
      }

      setIsSubmitting(true);

      try {
        const body: LoginRequest = { email: email.trim(), password };

        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData: ErrorEnvelope = await res.json().catch(() => ({
            error: { code: 'UNKNOWN', message: 'Login failed. Please try again.', details: {}, correlationId: '' },
          }));
          setError(errData.error.message);
          return;
        }

        const data: LoginResponse = await res.json();

        // Persist auth state
        localStorage.setItem('tp_access_token', data.accessToken);
        localStorage.setItem('tp_refresh_token', data.refreshToken);
        localStorage.setItem('tp_user', JSON.stringify(data.user));

        // Redirect to authenticated dashboard
        router.push('/tax-planning/dashboard');
      } catch (err) {
        console.error('Login error:', err);
        setError('Network error. Please check your connection and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, router],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-700 shadow-brand">
            <svg
              className="h-8 w-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-charcoal-900">
            Farther Tax Planning
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Sign in to your advisor account
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-lg border border-limestone-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="rounded-sm border border-critical-100 bg-critical-100 px-4 py-3 text-sm text-critical-700"
              >
                {error}
              </div>
            )}

            {/* Email field */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-medium text-charcoal-700"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@farther.com"
                className="w-full border border-limestone-300 rounded-sm px-3 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-300 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-colors"
              />
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-charcoal-700"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full border border-limestone-300 rounded-sm px-3 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-300 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-colors"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-sm bg-brand-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 rounded-sm border border-info-100 bg-info-100 px-4 py-3 text-xs text-info-700">
            <p className="font-medium">Stage 1 Demo Credentials</p>
            <p className="mt-1">
              <strong>Admin:</strong> admin@farther.com / password
            </p>
            <p>
              <strong>Advisor:</strong> advisor@farther.com / password
            </p>
            <p>
              <strong>Ops:</strong> ops@farther.com / password
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-charcoal-500">
          Farther Financial Advisors &middot; Tax Planning Platform v1.0
        </p>
      </div>
    </div>
  );
}

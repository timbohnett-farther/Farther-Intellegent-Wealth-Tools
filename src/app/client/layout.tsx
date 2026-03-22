'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  Home,
  Wallet,
  Target,
  FileText,
  MessageSquare,
  User,
  CalendarPlus,
  Menu,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', href: '/client', icon: Home },
  { label: 'My Finances', href: '/client/finances', icon: Wallet },
  { label: 'My Plan', href: '/client/plan', icon: Target },
  { label: 'Documents', href: '/client/vault', icon: FileText },
  { label: 'Messages', href: '/client/messages', icon: MessageSquare },
  { label: 'Profile', href: '/client/profile', icon: User },
];

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-limestone-50">
      {/* Header */}
      <header className="bg-white border-b border-limestone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-lg font-bold text-brand-900 tracking-tight">
                Farther
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === '/client'
                    ? pathname === '/client'
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-charcoal-500 hover:text-charcoal-900 hover:bg-limestone-100'
                    )}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right section */}
            <div className="flex items-center gap-3">
              <Link
                href="/client/request-meeting"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
              >
                <CalendarPlus size={16} />
                Request a Meeting
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-charcoal-500 hover:bg-limestone-100"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-limestone-200 bg-white">
            <nav className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === '/client'
                    ? pathname === '/client'
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-charcoal-500 hover:bg-limestone-100'
                    )}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/client/request-meeting"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-brand-600 rounded-lg hover:bg-brand-50"
              >
                <CalendarPlus size={18} />
                Request a Meeting
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

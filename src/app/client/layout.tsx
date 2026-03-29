'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/components/ThemeToggle';
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
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header
        className="backdrop-blur-xl sticky top-0 z-40"
        style={{
          background: 'var(--s-nav-bg)',
          borderBottom: '1px solid var(--s-border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-brand-500 to-brand-300 flex items-center justify-center flex-shrink-0">
                <span className="text-text-onBrand font-bold text-sm">F</span>
              </div>
              <span className="text-lg font-bold text-text tracking-tight">
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
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'text-accent-primarySoft'
                        : 'text-text-muted hover:text-text'
                    )}
                    style={isActive ? { background: 'var(--s-nav-active-bg)' } : {}}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right section */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/client/request-meeting"
                className="hidden sm:flex btn btn-primary btn-sm items-center gap-2"
              >
                <CalendarPlus size={16} />
                Request a Meeting
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-text-muted"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div
            className="md:hidden"
            style={{
              borderTop: '1px solid var(--s-border-subtle)',
              background: 'var(--s-sidebar-bg)',
            }}
          >
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
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'text-accent-primarySoft'
                        : 'text-text-muted hover:text-text'
                    )}
                    style={isActive ? { background: 'var(--s-nav-active-bg)' } : {}}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/client/request-meeting"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-accent-primarySoft rounded-lg"
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

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
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
      <header className="bg-white/[0.03] border-b border-white/[0.06] backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-teal-500 to-teal-300 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
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
                        ? 'bg-teal-500/10 text-teal-300'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
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
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-400 transition-colors"
              >
                <CalendarPlus size={16} />
                Request a Meeting
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-white/50 hover:bg-white/[0.06]"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#3D5A6A]">
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
                        ? 'bg-teal-500/10 text-teal-300'
                        : 'text-white/50 hover:bg-white/[0.06]'
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
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-teal-300 rounded-lg hover:bg-teal-500/10"
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

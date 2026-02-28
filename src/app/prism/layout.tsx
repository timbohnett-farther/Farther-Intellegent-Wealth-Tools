'use client';

import React from 'react';
import { Sidebar } from '@/components/prism/layouts/Sidebar';
import { TopBar } from '@/components/prism/layouts/TopBar';

export default function PrismLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-[260px] transition-all duration-200">
        <TopBar />
        <main>{children}</main>
      </div>
    </div>
  );
}

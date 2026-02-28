import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Farther Intelligent Wealth Advisor Platform',
  description: 'Investment lending tools for financial advisors serving UHNW and HNW clients.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}

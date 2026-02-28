import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Box Spread Lending Analysis Tool | Farther',
  description: 'Comprehensive box spread lending calculator for financial advisors and UHNW/HNW clients.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}

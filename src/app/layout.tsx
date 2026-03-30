import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-provider';

export const metadata: Metadata = {
  title: 'Farther Marketing Command Center',
  description: 'Investment lending tools for financial advisors serving UHNW and HNW clients.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-white dark:bg-transparent text-gray-900 dark:text-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farther Tax Planning',
  description:
    'Tax planning and scenario modeling platform for wealth advisors.',
};

export default function TaxPlanningRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

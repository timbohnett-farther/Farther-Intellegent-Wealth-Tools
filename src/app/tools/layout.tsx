import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financial Planning Tools | Farther Intelligent Wealth Tools',
  description: 'Interactive financial calculators and planning tools for wealth management',
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

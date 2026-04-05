import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  redirect(`/proposals/${proposalId}`);
}

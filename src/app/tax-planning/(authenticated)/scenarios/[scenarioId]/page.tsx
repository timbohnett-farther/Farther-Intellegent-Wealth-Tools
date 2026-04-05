import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  redirect(`/tax-scenarios/${scenarioId}`);
}

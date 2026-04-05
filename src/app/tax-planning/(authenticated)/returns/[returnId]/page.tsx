import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ returnId: string }> }) {
  const { returnId } = await params;
  redirect(`/tax-returns/${returnId}`);
}

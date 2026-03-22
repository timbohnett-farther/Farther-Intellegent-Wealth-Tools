import { redirect } from 'next/navigation';

/**
 * Tax Planning root page.
 * For Stage 1, always redirect to the login page.
 * In Stage 2, this will check auth state and redirect accordingly.
 */
export default function TaxPlanningIndexPage() {
  redirect('/tax-planning/login');
}

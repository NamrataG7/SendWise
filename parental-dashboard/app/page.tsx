import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Prefer full_name from user_metadata, fall back to email.
  const metadata = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const parentLabel = metadata.full_name || metadata.name || user.email || 'Parent';

  return <DashboardClient parentLabel={parentLabel} />;
}

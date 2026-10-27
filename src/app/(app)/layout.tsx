import { AppShell } from '@/components/app/app-shell';
import { getCurrentUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getCurrentUser();
  return <AppShell signedIn={Boolean(user)}>{children}</AppShell>;
}

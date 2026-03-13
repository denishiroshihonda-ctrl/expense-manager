import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <AppShell user={{ name: user.user_metadata?.full_name ?? user.email ?? 'Usuário', avatar: user.user_metadata?.avatar_url }} />;
}

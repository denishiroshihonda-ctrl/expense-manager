-- Cole este SQL no Supabase: SQL Editor > New query > Run

-- Habilita RLS (Row Level Security) — cada usuário vê só os próprios dados

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  code text default '',
  color text default '#3b82f6',
  created_at timestamptz default now()
);
alter table public.projects enable row level security;
create policy "users own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);
alter table public.reports enable row level security;
create policy "users own reports" on public.reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  category text default 'other',
  establishment text default '',
  date text default '—',
  value numeric(12,2),
  description text default '',
  confidence int default 50,
  thumb_url text,
  created_at timestamptz default now()
);
alter table public.expenses enable row level security;
create policy "users own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

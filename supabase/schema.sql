create table if not exists public.nexus_profiles (
  profile_id text primary key,
  account_id uuid not null,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.nexus_settings (
  profile_id text primary key,
  account_id uuid not null,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.nexus_saves (
  save_id text primary key,
  profile_id text not null,
  account_id uuid not null,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.nexus_matches (
  match_id text primary key,
  profile_id text not null,
  account_id uuid not null,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists nexus_saves_profile_id_idx on public.nexus_saves (profile_id);
create index if not exists nexus_matches_profile_id_idx on public.nexus_matches (profile_id);

alter table public.nexus_profiles enable row level security;
alter table public.nexus_settings enable row level security;
alter table public.nexus_saves enable row level security;
alter table public.nexus_matches enable row level security;

create policy "Users manage own profiles" on public.nexus_profiles
for all using (auth.uid() = account_id) with check (auth.uid() = account_id);

create policy "Users manage own settings" on public.nexus_settings
for all using (auth.uid() = account_id) with check (auth.uid() = account_id);

create policy "Users manage own saves" on public.nexus_saves
for all using (auth.uid() = account_id) with check (auth.uid() = account_id);

create policy "Users manage own matches" on public.nexus_matches
for all using (auth.uid() = account_id) with check (auth.uid() = account_id);

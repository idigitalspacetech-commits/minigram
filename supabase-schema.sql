-- Run this in your Supabase SQL Editor to set up the database schema
-- Dashboard → SQL Editor → New query → paste this → Run

-- ── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles (extends Supabase auth.users) ───────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro', 'studio')),
  generations_used integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Projects ─────────────────────────────────────────────────────────────────
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  app_name text not null,
  app_description text,
  track integer not null check (track in (1, 2)),
  prompt text not null,
  payments text,
  referral text,
  notification text,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Project Files ─────────────────────────────────────────────────────────────
create table public.project_files (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  filename text not null,
  content text not null,
  updated_at timestamptz default now()
);

-- ── Deployments ───────────────────────────────────────────────────────────────
create table public.deployments (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  vercel_url text,
  bot_username text,
  status text default 'pending' check (status in ('pending','deploying','live','failed')),
  deployed_at timestamptz,
  created_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.deployments enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Projects: users manage their own
create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

-- Project files: access through project ownership
create policy "Users can view own project files" on public.project_files for select
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy "Users can insert own project files" on public.project_files for insert
  with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy "Users can update own project files" on public.project_files for update
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

-- Deployments: access through project ownership
create policy "Users can view own deployments" on public.deployments for select
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy "Users can insert own deployments" on public.deployments for insert
  with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

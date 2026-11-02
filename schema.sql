-- TheHeartOfStars Staff Management
-- Run this entire file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'staff_member'
    check (role in ('administrator','manager','staff_member','studio_director')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.company_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 2000),
  user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  subject_username text not null,
  subject_user_id text not null,
  punishment text not null check (punishment in ('Warning','Kick','Ban','PBAN')),
  reason text not null,
  moderator_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_manager_or_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() in ('administrator','manager'), false) $$;

alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.company_messages enable row level security;
alter table public.moderation_logs enable row level security;

-- Profiles: everyone can see usernames for chat; only managers can read full member directory.
drop policy if exists "profiles visible to signed in users" on public.profiles;
create policy "profiles visible to signed in users" on public.profiles
for select to authenticated using (true);
drop policy if exists "admins can update profiles" on public.profiles;
create policy "admins can update profiles" on public.profiles
for update to authenticated using (public.current_role() = 'administrator')
with check (public.current_role() = 'administrator');

-- Announcements: all portal users can read; managers and administrators can post.
drop policy if exists "signed in users read announcements" on public.announcements;
create policy "signed in users read announcements" on public.announcements
for select to authenticated using (true);
drop policy if exists "managers post announcements" on public.announcements;
create policy "managers post announcements" on public.announcements
for insert to authenticated with check (
  public.is_manager_or_admin() and author_id = auth.uid()
);
drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements" on public.announcements
for delete to authenticated using (public.current_role() = 'administrator');

-- Company chat: all logged-in account types can read and post.
drop policy if exists "signed in users read chat" on public.company_messages;
create policy "signed in users read chat" on public.company_messages
for select to authenticated using (true);
drop policy if exists "signed in users send chat" on public.company_messages;
create policy "signed in users send chat" on public.company_messages
for insert to authenticated with check (user_id = auth.uid());

-- Moderation: only managers and administrators can read and create records.
drop policy if exists "managers read moderation" on public.moderation_logs;
create policy "managers read moderation" on public.moderation_logs
for select to authenticated using (public.is_manager_or_admin());
drop policy if exists "managers create moderation" on public.moderation_logs;
create policy "managers create moderation" on public.moderation_logs
for insert to authenticated with check (
  public.is_manager_or_admin() and moderator_id = auth.uid()
);
drop policy if exists "admins delete moderation" on public.moderation_logs;
create policy "admins delete moderation" on public.moderation_logs
for delete to authenticated using (public.current_role() = 'administrator');

-- Enable realtime for announcements and chat.
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.company_messages;

-- Secure last-login timestamp update. Users can update only their own timestamp.
create or replace function public.record_my_login()
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set last_login_at = now() where id = auth.uid();
end;
$$;
grant execute on function public.record_my_login() to authenticated;

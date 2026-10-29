-- Run once in a NEW Supabase project's SQL Editor. Do not run over an existing
-- database without reviewing its schema and backing up its data first.
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname varchar(64), avatar_url varchar(512), school varchar(128),
  theme_config jsonb, settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id varchar(36) primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title varchar(256) not null, description text,
  task_type varchar(20) not null default 'personal',
  priority varchar(20) not null default 'medium',
  importance varchar(20) not null default 'normal',
  start_time timestamptz, end_time timestamptz,
  is_completed boolean not null default false, completed_at timestamptz,
  recurrence jsonb, metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id varchar(36) primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name varchar(64) not null, color varchar(32),
  created_at timestamptz not null default now()
);

create table if not exists public.task_tags (
  id varchar(36) primary key default gen_random_uuid()::text,
  task_id varchar(36) not null references public.tasks(id) on delete cascade,
  tag_id varchar(36) not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(task_id, tag_id)
);

create index if not exists tasks_user_end_time_idx on public.tasks(user_id, end_time);
create index if not exists tasks_user_completed_idx on public.tasks(user_id, is_completed);
create index if not exists tags_user_id_idx on public.tags(user_id);
create index if not exists task_tags_task_id_idx on public.task_tags(task_id);
create index if not exists task_tags_tag_id_idx on public.task_tags(tag_id);

alter table public.user_profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.tags enable row level security;
alter table public.task_tags enable row level security;

revoke all on public.user_profiles, public.tasks, public.tags, public.task_tags from anon;
grant select, insert, update, delete on public.user_profiles, public.tasks, public.tags, public.task_tags to authenticated;

create policy "own profiles" on public.user_profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own tasks" on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own tags" on public.tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own task tags" on public.task_tags for all to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.tags g where g.id = tag_id and g.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.tags g where g.id = tag_id and g.user_id = (select auth.uid()))
  );

create or replace function public.create_user_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nickname', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.create_user_profile();
revoke execute on function public.create_user_profile() from public, anon, authenticated;

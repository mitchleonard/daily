create schema if not exists private;

create table private.daily_identity_mappings (
  legacy_cognito_user_id text primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  mapped_at timestamptz
);

create table public.habits (
  legacy_cognito_user_id text not null references private.daily_identity_mappings(legacy_cognito_user_id),
  id text not null,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  icon text not null,
  color text not null,
  schedule_days jsonb not null,
  start_date date not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz,
  sort_order bigint not null,
  primary key (legacy_cognito_user_id, id)
);

create table public.habit_logs (
  legacy_cognito_user_id text not null references private.daily_identity_mappings(legacy_cognito_user_id),
  id text not null,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  habit_id text not null,
  date date not null,
  status text not null check (status in ('completed', 'skipped')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (legacy_cognito_user_id, id),
  foreign key (legacy_cognito_user_id, habit_id)
    references public.habits(legacy_cognito_user_id, id)
    on delete cascade
);

create index habits_user_sort_order_idx on public.habits(user_id, sort_order);
create index habit_logs_user_date_idx on public.habit_logs(user_id, date desc);
create index habit_logs_user_habit_date_idx on public.habit_logs(user_id, habit_id, date desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.habit_logs to authenticated;

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Users can view their own habits" on public.habits for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own habits" on public.habits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own habits" on public.habits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own habits" on public.habits for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Users can view their own habit logs" on public.habit_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own habit logs" on public.habit_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own habit logs" on public.habit_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own habit logs" on public.habit_logs for delete to authenticated using ((select auth.uid()) = user_id);

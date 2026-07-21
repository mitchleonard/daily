alter table public.habits drop constraint habits_pkey;
alter table public.habits alter column legacy_cognito_user_id drop not null;
alter table public.habits add primary key (id);

alter table public.habit_logs drop constraint habit_logs_pkey;
alter table public.habit_logs alter column legacy_cognito_user_id drop not null;
alter table public.habit_logs add primary key (id);

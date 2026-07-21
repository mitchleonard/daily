-- Imported rows are linked to their legacy identity during the one-time
-- recovery flow. Cover these foreign keys so mapping and cleanup remain fast.
create index habits_legacy_cognito_user_id_idx
  on public.habits (legacy_cognito_user_id);

create index habit_logs_legacy_cognito_user_id_idx
  on public.habit_logs (legacy_cognito_user_id);

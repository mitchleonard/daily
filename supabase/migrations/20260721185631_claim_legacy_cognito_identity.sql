-- This function is deliberately callable only by the service role used in the
-- recovery Edge Function. The function does not accept arbitrary browser
-- requests, so a legacy owner ID cannot be claimed merely by knowing it.
create or replace function public.claim_daily_legacy_identity(
  p_legacy_cognito_user_id text,
  p_supabase_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  existing_user_id uuid;
begin
  if p_legacy_cognito_user_id is null or p_supabase_user_id is null then
    raise exception 'A legacy Cognito ID and Supabase user ID are required';
  end if;

  select user_id
  into existing_user_id
  from private.daily_identity_mappings
  where legacy_cognito_user_id = p_legacy_cognito_user_id
  for update;

  if not found then
    raise exception 'No imported Daily data exists for this Cognito identity';
  end if;

  if existing_user_id is not null and existing_user_id <> p_supabase_user_id then
    raise exception 'This legacy Daily identity has already been recovered';
  end if;

  update private.daily_identity_mappings
  set user_id = p_supabase_user_id,
      mapped_at = coalesce(mapped_at, now())
  where legacy_cognito_user_id = p_legacy_cognito_user_id;

  update public.habits
  set user_id = p_supabase_user_id
  where legacy_cognito_user_id = p_legacy_cognito_user_id
    and user_id is null;

  update public.habit_logs
  set user_id = p_supabase_user_id
  where legacy_cognito_user_id = p_legacy_cognito_user_id
    and user_id is null;

  return true;
end;
$$;

revoke all on function public.claim_daily_legacy_identity(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_daily_legacy_identity(text, uuid) to service_role;

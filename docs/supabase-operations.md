# Daily Supabase operations

Daily's production backend is Supabase. GitHub Pages serves the Vite app at
`https://daily.mitchleonard.com`; Supabase provides password authentication,
Postgres storage, and the one-time legacy-account migration function.

## Production configuration

- GitHub Actions requires `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` repository secrets.
- The Supabase Auth Site URL and allowed redirect URL are both
  `https://daily.mitchleonard.com`. Email confirmation remains enabled for
  newly created accounts, but established Daily users sign in with a password.
- For a local cloud-auth test, add `http://localhost:5173` to the redirect
  allow-list temporarily; remove it again if it is no longer needed.
- Only the publishable key belongs in browser configuration. Never expose a
  Supabase secret or service-role key in `VITE_*` variables, committed files,
  or GitHub Actions build configuration.

## Data security

- `public.habits` and `public.habit_logs` have Row Level Security enabled.
  Authenticated users can only read or mutate rows whose `user_id` equals their
  Supabase Auth user ID.
- The historical Cognito-to-Supabase identity mapping is in the unexposed
  `private` schema. Imported data stays unassigned until it is recovered.
- `claim_daily_legacy_identity` is a security-definer function that is callable
  only by `service_role`; anonymous and normal authenticated roles are denied.
- The `claim-legacy-cognito-session` Edge Function requires a Supabase user JWT
  before it runs. It verifies the signature, issuer, audience, token type, and
  freshness of the old Cognito ID token before assigning data.
- The `migrate-legacy-cognito-password` Edge Function is deliberately public
  because it runs before a Supabase session exists. It accepts requests only
  from the Daily origin, verifies the supplied password directly with the
  legacy Cognito user pool, returns only generic failures, and creates or
  updates the Supabase password identity with `email_confirm` set. The password
  is not logged, exported, or stored in application data.

## Legacy account migration

Passwords cannot be exported from Cognito, even by an account administrator.
Instead, the first password sign-in for an established Daily account invokes
the one-time migration function. Cognito validates the existing password; only
then does Supabase create the corresponding password account and claim the
matching imported profile. This works in the installed mobile PWA because the
Supabase session is persisted in that app's browser storage and does not rely
on a magic link opening in the same storage context.

The original protected token-based recovery remains available for a browser
that still has an old Cognito session. The legacy ID token is never sent to the
database; it is sent only to that protected recovery function and is removed
from browser storage after a successful recovery.

If recovery does not occur, do not manually assign an imported identity based
on record counts or guessed email addresses. Preserve the AWS DynamoDB backups
and use the migration audit trail to establish the correct identity first.

## Routine checks

Before a release:

1. Run `npm run build` and `npm audit --omit=dev`.
2. Confirm all tracked migrations appear in Supabase and run both database
   security and performance advisors.
3. Confirm the recovery Edge Function is active with JWT verification enabled.
4. Verify the production site returns successfully and test a password sign-in
   with a non-production account when practical. Test the one-time Cognito
   migration path only with an approved legacy test account.

The old `infra/` CDK project is retained as historical migration reference only.
It must not be deployed or receive new production configuration.

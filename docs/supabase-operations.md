# Daily Supabase operations

Daily's production backend is Supabase. GitHub Pages serves the Vite app at
`https://daily.mitchleonard.com`; Supabase provides email-link authentication,
Postgres storage, and the one-time legacy recovery function.

## Production configuration

- GitHub Actions requires `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` repository secrets.
- The Supabase Auth Site URL and allowed redirect URL are both
  `https://daily.mitchleonard.com`.
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

## Legacy recovery

The first Supabase sign-in on the same browser used with the old Daily app can
recover the matching profile automatically. The legacy ID token is never sent
to the database; it is sent only to the protected recovery function and is
removed from browser storage after a successful recovery.

If recovery does not occur, do not manually assign an imported identity based
on record counts or guessed email addresses. Preserve the AWS DynamoDB backups
and use the migration audit trail to establish the correct identity first.

## Routine checks

Before a release:

1. Run `npm run build` and `npm audit --omit=dev`.
2. Confirm all tracked migrations appear in Supabase and run both database
   security and performance advisors.
3. Confirm the recovery Edge Function is active with JWT verification enabled.
4. Verify the production site returns successfully and test a passwordless
   sign-in with a non-production account when practical.

The old `infra/` CDK project is retained as historical migration reference only.
It must not be deployed or receive new production configuration.

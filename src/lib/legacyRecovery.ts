import { supabase } from './supabase';

const LEGACY_STORAGE_KEY = 'habit-tracker-auth';

function getLegacyIdToken(): string | null {
  const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as { idToken?: unknown };
    return typeof parsed.idToken === 'string' ? parsed.idToken : null;
  } catch {
    return null;
  }
}

/**
 * If this browser still has its old Cognito ID token, the recovery function
 * verifies its AWS signature before attaching that exact legacy profile to the
 * newly authenticated Supabase user. Invalid or absent old sessions are a
 * no-op, so normal new accounts remain unaffected.
 */
export async function recoverLegacyDailyProfile(): Promise<void> {
  const idToken = getLegacyIdToken();
  if (!supabase || !idToken) return;

  const { data, error } = await supabase.functions.invoke('claim-legacy-cognito-session', {
    body: { idToken },
  });

  if (!error && data?.recovered) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

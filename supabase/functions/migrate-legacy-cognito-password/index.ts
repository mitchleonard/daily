import { createClient } from 'npm:@supabase/supabase-js@2';

const COGNITO_ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_LIdHlmTap';
const COGNITO_CLIENT_ID = '72b4pk5ko04os1uabj16euo739';
const COGNITO_API_URL = 'https://cognito-idp.us-east-1.amazonaws.com/';
const DAILY_ORIGIN = 'https://daily.mitchleonard.com';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': DAILY_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CognitoAuthResponse = { AuthenticationResult?: { IdToken?: string } };
type CognitoClaims = { email?: string; email_verified?: boolean; iss?: string; sub?: string; token_use?: string };

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function decodeJwtPayload(token: string): CognitoClaims {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Missing Cognito ID token payload');
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)))) as CognitoClaims;
}

async function authenticateWithLegacyCognito(email: string, password: string) {
  const result = await fetch(COGNITO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  });
  if (!result.ok) throw new Error('Legacy credentials were not accepted');

  const body = await result.json() as CognitoAuthResponse;
  const idToken = body.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error('Legacy authentication did not return an ID token');

  const claims = decodeJwtPayload(idToken);
  if (
    claims.iss !== COGNITO_ISSUER ||
    claims.token_use !== 'id' ||
    typeof claims.sub !== 'string' ||
    typeof claims.email !== 'string' ||
    claims.email_verified !== true ||
    claims.email.toLowerCase() !== email.toLowerCase()
  ) {
    throw new Error('Legacy identity verification failed');
  }
  return claims.sub;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  if (request.headers.get('Origin') !== DAILY_ORIGIN) return response({ error: 'Not allowed' }, 403);

  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 320 || password.length < 8) {
      throw new Error('Invalid credentials');
    }

    const legacyCognitoUserId = await authenticateWithLegacyCognito(email, password);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    const existingUser = existingUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

    const userId = existingUser?.id ?? (await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })).data.user?.id;
    if (!userId) throw new Error('Could not create Supabase account');

    if (existingUser) {
      const { error } = await admin.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
      if (error) throw error;
    }

    const { error: claimError } = await admin.rpc('claim_daily_legacy_identity', {
      p_legacy_cognito_user_id: legacyCognitoUserId,
      p_supabase_user_id: userId,
    });
    if (claimError) throw claimError;

    return response({ migrated: true });
  } catch (error) {
    // Keep the browser response generic so the endpoint cannot reveal whether
    // an email address exists in either authentication system.
    console.error('Legacy password migration failed');
    return response({ error: 'Email or password was incorrect.' }, 401);
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const COGNITO_ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_LIdHlmTap';
const COGNITO_AUDIENCE = '72b4pk5ko04os1uabj16euo739';
const JWKS_URL = `${COGNITO_ISSUER}/.well-known/jwks.json`;
const MAX_EXPIRED_TOKEN_AGE_SECONDS = 7 * 24 * 60 * 60;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://daily.mitchleonard.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type JwtHeader = { alg?: string; kid?: string };
type CognitoClaims = { aud?: string; exp?: number; iat?: number; iss?: string; sub?: string; token_use?: string };

function base64UrlBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value))) as T;
}

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function verifyLegacyIdToken(token: string): Promise<string> {
  const [encodedHeader, encodedPayload, encodedSignature, ...rest] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature || rest.length) throw new Error('Malformed legacy token');

  const header = decodeJson<JwtHeader>(encodedHeader);
  const claims = decodeJson<CognitoClaims>(encodedPayload);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported legacy token signature');

  const now = Math.floor(Date.now() / 1000);
  if (
    claims.iss !== COGNITO_ISSUER ||
    claims.aud !== COGNITO_AUDIENCE ||
    claims.token_use !== 'id' ||
    typeof claims.sub !== 'string' ||
    typeof claims.iat !== 'number' ||
    typeof claims.exp !== 'number' ||
    claims.iat > now + 300 ||
    claims.exp < now - MAX_EXPIRED_TOKEN_AGE_SECONDS
  ) {
    throw new Error('Legacy token is not eligible for recovery');
  }

  const jwks = await fetch(JWKS_URL).then(async (result) => {
    if (!result.ok) throw new Error('Cognito signing keys are unavailable');
    return result.json() as Promise<{ keys?: JsonWebKey[] }>;
  });
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error('Legacy token signing key was not found');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signed = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlBytes(encodedSignature), signed);
  if (!valid) throw new Error('Legacy token signature is invalid');

  return claims.sub;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return response({ error: 'A Supabase session is required' }, 401);

  try {
    const { idToken } = await request.json();
    if (typeof idToken !== 'string') return response({ error: 'A legacy ID token is required' }, 400);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return response({ error: 'A valid Supabase session is required' }, 401);

    const legacyCognitoUserId = await verifyLegacyIdToken(idToken);
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await adminClient.rpc('claim_daily_legacy_identity', {
      p_legacy_cognito_user_id: legacyCognitoUserId,
      p_supabase_user_id: user.id,
    });
    if (error) throw new Error('This legacy profile could not be recovered');

    return response({ recovered: true });
  } catch (error) {
    console.error('Legacy Daily recovery failed', error instanceof Error ? error.message : error);
    return response({ recovered: false, error: 'Legacy recovery could not be completed' }, 403);
  }
});

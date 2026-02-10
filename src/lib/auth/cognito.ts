/**
 * Cognito Authentication Client
 * Uses Amazon Cognito User Pools directly without Amplify
 */

import { awsConfig } from './config';

const COGNITO_ENDPOINT = `https://cognito-idp.${awsConfig.region}.amazonaws.com/`;

interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface CognitoUser {
  userId: string;
  email: string;
}

const STORAGE_KEY = 'habit-tracker-auth';

/**
 * Store tokens securely
 */
function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Get stored tokens
 */
function getStoredTokens(): AuthTokens | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear stored tokens
 */
function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Decode JWT token payload
 */
function decodeToken(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

/**
 * Make request to Cognito API
 */
async function cognitoRequest(action: string, params: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  
  if (!response.ok) {
    const errorType = data.__type || 'UnknownError';
    const errorMessage = data.message || 'Authentication failed';
    throw new CognitoError(errorType, errorMessage);
  }

  return data;
}

/**
 * Custom error class for Cognito errors
 */
export class CognitoError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'CognitoError';
  }
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string): Promise<{ userConfirmed: boolean }> {
  const result = await cognitoRequest('SignUp', {
    ClientId: awsConfig.userPoolClientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
    ],
  }) as { UserConfirmed: boolean };

  return { userConfirmed: result.UserConfirmed };
}

/**
 * Confirm sign up with verification code
 */
export async function confirmSignUp(email: string, code: string): Promise<void> {
  await cognitoRequest('ConfirmSignUp', {
    ClientId: awsConfig.userPoolClientId,
    Username: email,
    ConfirmationCode: code,
  });
}

/**
 * Sign in user
 */
export async function signIn(email: string, password: string): Promise<CognitoUser> {
  const result = await cognitoRequest('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: awsConfig.userPoolClientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  }) as { AuthenticationResult: { IdToken: string; AccessToken: string; RefreshToken: string; ExpiresIn: number } };

  const { IdToken, AccessToken, RefreshToken, ExpiresIn } = result.AuthenticationResult;
  
  const tokens: AuthTokens = {
    idToken: IdToken,
    accessToken: AccessToken,
    refreshToken: RefreshToken,
    expiresAt: Date.now() + ExpiresIn * 1000,
  };
  
  storeTokens(tokens);
  
  const decoded = decodeToken(IdToken);
  return {
    userId: decoded.sub as string,
    email: decoded.email as string,
  };
}

/**
 * Sign out user
 */
export async function signOut(): Promise<void> {
  const tokens = getStoredTokens();
  
  if (tokens?.accessToken) {
    try {
      await cognitoRequest('GlobalSignOut', {
        AccessToken: tokens.accessToken,
      });
    } catch {
      // Ignore errors, clear tokens anyway
    }
  }
  
  clearTokens();
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<CognitoUser | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  
  // Check if token is expired
  if (Date.now() >= tokens.expiresAt - 60000) {
    // Try to refresh
    try {
      await refreshSession();
    } catch {
      clearTokens();
      return null;
    }
  }
  
  const decoded = decodeToken(tokens.idToken);
  return {
    userId: decoded.sub as string,
    email: decoded.email as string,
  };
}

/**
 * Refresh the session using refresh token
 */
export async function refreshSession(): Promise<void> {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const result = await cognitoRequest('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: awsConfig.userPoolClientId,
    AuthParameters: {
      REFRESH_TOKEN: tokens.refreshToken,
    },
  }) as { AuthenticationResult: { IdToken: string; AccessToken: string; ExpiresIn: number } };

  const { IdToken, AccessToken, ExpiresIn } = result.AuthenticationResult;
  
  const newTokens: AuthTokens = {
    idToken: IdToken,
    accessToken: AccessToken,
    refreshToken: tokens.refreshToken, // Keep the same refresh token
    expiresAt: Date.now() + ExpiresIn * 1000,
  };
  
  storeTokens(newTokens);
}

/**
 * Get current ID token for API requests
 */
export async function getIdToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  
  // Refresh if needed
  if (Date.now() >= tokens.expiresAt - 60000) {
    try {
      await refreshSession();
      const newTokens = getStoredTokens();
      return newTokens?.idToken || null;
    } catch {
      clearTokens();
      return null;
    }
  }
  
  return tokens.idToken;
}

/**
 * Forgot password - request reset code
 */
export async function forgotPassword(email: string): Promise<void> {
  await cognitoRequest('ForgotPassword', {
    ClientId: awsConfig.userPoolClientId,
    Username: email,
  });
}

/**
 * Confirm forgot password with code and new password
 */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  await cognitoRequest('ConfirmForgotPassword', {
    ClientId: awsConfig.userPoolClientId,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
}

/**
 * Resend confirmation code
 */
export async function resendConfirmationCode(email: string): Promise<void> {
  await cognitoRequest('ResendConfirmationCode', {
    ClientId: awsConfig.userPoolClientId,
    Username: email,
  });
}

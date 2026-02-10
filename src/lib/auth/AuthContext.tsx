import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  signOut as cognitoSignOut,
  confirmSignUp as cognitoConfirmSignUp,
  getCurrentUser,
  forgotPassword as cognitoForgotPassword,
  confirmForgotPassword as cognitoConfirmForgotPassword,
  resendConfirmationCode as cognitoResendCode,
  CognitoError,
} from './cognito';
import { isAwsConfigured } from './config';

interface User {
  userId: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isAwsConfigured();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [isConfigured]);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await cognitoSignIn(email, password);
    setUser(user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await cognitoSignUp(email, password);
    return { needsConfirmation: !result.userConfirmed };
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    await cognitoConfirmSignUp(email, code);
  }, []);

  const signOut = useCallback(async () => {
    await cognitoSignOut();
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await cognitoForgotPassword(email);
  }, []);

  const confirmForgotPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    await cognitoConfirmForgotPassword(email, code, newPassword);
  }, []);

  const resendConfirmationCode = useCallback(async (email: string) => {
    await cognitoResendCode(email);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
        forgotPassword,
        confirmForgotPassword,
        resendConfirmationCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { CognitoError };

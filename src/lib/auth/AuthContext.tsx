import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '../supabase';

interface User {
  userId: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string) => Promise<void>;
  signUp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(user: { id: string; email?: string | null }): User {
  return { userId: user.id, email: user.email ?? '' };
}

function emailRedirectTo() {
  return window.location.origin;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    const syncUser = async () => {
      const { data, error } = await client.auth.getUser();
      setUser(error || !data.user ? null : toUser(data.user));
      setLoading(false);
    };

    void syncUser();
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toUser(session.user) : null);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const sendMagicLink = useCallback(async (email: string, shouldCreateUser: boolean) => {
    if (!supabase) throw new Error('Daily is not configured yet.');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: emailRedirectTo(), shouldCreateUser },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback((email: string) => sendMagicLink(email, false), [sendMagicLink]);
  const signUp = useCallback((email: string) => sendMagicLink(email, true), [sendMagicLink]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isConfigured: isSupabaseConfigured, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

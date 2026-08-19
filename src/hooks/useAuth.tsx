import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  clearSupabaseAuthStorage,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase";
import { siteUnavailableMessage } from "../lib/userMessages";

interface AuthOperationResult {
  error: Error | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<AuthOperationResult>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<AuthOperationResult>;
  sendMagicLink: (email: string) => Promise<AuthOperationResult>;
  signOut: () => Promise<AuthOperationResult>;
  clearLocalSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function configurationError() {
  return new Error(siteUnavailableMessage);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithPassword: async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
          return { error: configurationError() };
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return { error };
      },
      signUpWithPassword: async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
          return { error: configurationError() };
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        return { error };
      },
      sendMagicLink: async (email: string) => {
        if (!isSupabaseConfigured) {
          return { error: configurationError() };
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        return { error };
      },
      signOut: async () => {
        if (!isSupabaseConfigured) {
          return { error: null };
        }

        const { error } = await supabase.auth.signOut();

        return { error };
      },
      clearLocalSession: () => {
        clearSupabaseAuthStorage();
        setSession(null);
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return value;
}

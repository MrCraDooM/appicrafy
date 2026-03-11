import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserPlan = "free" | "paid";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  plan: UserPlan;
  hasGeneratedFreeApp: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<UserPlan>("free");
  const [hasGeneratedFreeApp, setHasGeneratedFreeApp] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPlan = async (currentSession: Session | null) => {
    if (!currentSession) return;
    try {
      const { data, error } = await supabase
        .from("user_plans")
        .select("plan, has_generated_free_app")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (!error && data) {
        setPlan(data.plan as UserPlan);
        setHasGeneratedFreeApp(data.has_generated_free_app ?? false);
      }
    } catch (err) {
      console.error("Failed to fetch user plan:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchPlan(session).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchPlan(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPlan("free");
    setHasGeneratedFreeApp(false);
  };

  const refreshPlan = async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    await fetchPlan(current);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, plan, hasGeneratedFreeApp, loading, signIn, signUp, signOut, refreshPlan }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UsagePlan = "free" | "starter" | "pro";

export interface UserUsage {
  id: string;
  user_id: string;
  plan: UsagePlan;
  generations: number;
  monthly_limit: number;
  reset_date: string;
  created_at: string;
}

const PLAN_LIMITS: Record<UsagePlan, number> = {
  free: 5,
  starter: 20,
  pro: Infinity,
};

export function useUserUsage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let { data, error } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Auto-create record for existing users who pre-date this migration
    if (!error && !data) {
      const { data: inserted, error: insertError } = await supabase
        .from("user_usage")
        .insert({
          user_id: user.id,
          plan: "free",
          generations: 0,
          monthly_limit: 5,
          reset_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      if (!insertError) data = inserted;
    }

    setUsage(data as UserUsage | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  /**
   * Check if the user is within their monthly limit.
   * Resets the counter automatically if reset_date has passed.
   */
  const checkAndResetIfNeeded = useCallback(async (): Promise<{
    allowed: boolean;
    usage: UserUsage | null;
  }> => {
    if (!user || !usage) return { allowed: false, usage: null };

    let currentUsage = { ...usage };
    const now = new Date();
    const resetDate = new Date(currentUsage.reset_date);

    if (now >= resetDate) {
      const newResetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("user_usage")
        .update({ generations: 0, reset_date: newResetDate })
        .eq("user_id", user.id)
        .select()
        .single();

      if (data) {
        currentUsage = data as UserUsage;
        setUsage(currentUsage);
      }
    }

    const limit = PLAN_LIMITS[currentUsage.plan as UsagePlan] ?? 1;
    const allowed = currentUsage.plan === "pro" || currentUsage.generations < limit;

    return { allowed, usage: currentUsage };
  }, [user, usage]);

  /**
   * Increment the generation counter by 1.
   */
  const incrementGenerations = useCallback(async () => {
    if (!user || !usage) return;
    const newCount = usage.generations + 1;
    const { data } = await supabase
      .from("user_usage")
      .update({ generations: newCount })
      .eq("user_id", user.id)
      .select()
      .single();
    if (data) setUsage(data as UserUsage);
  }, [user, usage]);

  return { usage, loading, fetchUsage, checkAndResetIfNeeded, incrementGenerations };
}

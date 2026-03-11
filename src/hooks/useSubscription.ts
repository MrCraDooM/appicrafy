import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Subscription {
  id: string;
  user_id: string;
  paddle_subscription_id: string;
  plan: string;
  status: "active" | "canceled" | "paused" | string;
  monthly_limit: number;
  next_billing_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) setSubscription(data as Subscription);
    else setSubscription(null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return { success: false, error: "Not authenticated" };

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/cancel-subscription`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? "Failed to cancel subscription" };

    await fetchSubscription();
    return { success: true };
  }, [fetchSubscription]);

  return { subscription, loading, fetchSubscription, cancelSubscription };
}

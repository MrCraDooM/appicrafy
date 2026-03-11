import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SidebarProject {
  id: string;
  name: string;
  created_at: string;
  last_generated_at: string;
  generations_count: number;
}

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<SidebarProject[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("id, name, created_at, last_generated_at, generations_count")
      .eq("user_id", user.id)
      .order("last_generated_at", { ascending: false });
    setProjects((data as SidebarProject[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, refetch: fetchProjects };
}

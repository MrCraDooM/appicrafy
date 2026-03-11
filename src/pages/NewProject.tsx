import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function NewProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !user) return;

    if (trimmedName.length > 60) {
      toast.error("App name must be 60 characters or fewer.");
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length > 300) {
      toast.error("Description must be 300 characters or fewer.");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: trimmedName,
          description: trimmedDesc,
          user_id: user.id,
          files: [],
          screens: [],
          generations_count: 0,
          last_generated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      navigate(`/dashboard/project/${data.id}`);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.code === "23505"
          ? "A project with that name already exists."
          : (err.message ?? "Failed to create project. Please try again.");
      toast.error(msg);
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-xl mx-auto animate-fade-in">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </button>

        <h1 className="text-2xl font-black mb-1">New Project</h1>
        <p className="text-muted-foreground text-sm mb-8">Give your app a name to get started</p>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">App name</Label>
            <Input
              id="name"
              placeholder="e.g. Fitness Tracker, Recipe Book…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">
              Brief description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="desc"
              placeholder="Describe what your app does in a sentence or two…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>
          <Button
            className="w-full h-10 brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-xl"
            onClick={handleCreate}
            disabled={!name.trim() || creating}
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</>
            ) : (
              <><Zap className="w-4 h-4 mr-1.5" /> Create &amp; open builder</>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

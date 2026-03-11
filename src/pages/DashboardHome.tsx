import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Clock, Zap, FolderOpen, Crown, Loader2,
  CalendarDays, Settings, Trash2, Sparkles, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useUserUsage } from "@/hooks/useUserUsage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { projects, loading: projectsLoading, refetch } = useProjects();
  const { usage, loading: usageLoading } = useUserUsage();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [user, loading, navigate]);

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;
    setDeletingId(projectId);
    const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", user!.id);
    if (error) toast.error("Failed to delete project.");
    else { toast.success(`"${projectName}" deleted.`); refetch(); }
    setDeletingId(null);
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </DashboardLayout>
  );

  const plan = usage?.plan ?? "free";
  const isPro = plan === "pro";
  const isStarter = plan === "starter";
  const generations = usage?.generations ?? 0;
  const monthlyLimit = usage?.monthly_limit ?? 1;
  const resetDate = usage?.reset_date ? new Date(usage.reset_date) : null;
  const atLimit = !isPro && generations >= monthlyLimit;
  const progressPct = isPro ? 100 : Math.min((generations / monthlyLimit) * 100, 100);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-y-auto">

        {/* ── Hero prompt bar ── */}
        <div className="border-b border-border bg-background flex-shrink-0">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 brand-gradient rounded-xl flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">What are you building today?</h1>
                <p className="text-xs text-muted-foreground">Describe your idea and get a full React Native app in seconds</p>
              </div>
            </div>

            <button
              onClick={() => navigate("/dashboard/new")}
              disabled={atLimit}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-left transition-all group ${
                atLimit
                  ? "border-destructive/30 bg-destructive/5 cursor-not-allowed opacity-70"
                  : "border-border bg-secondary/50 hover:border-accent/40 hover:bg-secondary cursor-text"
              }`}
            >
              <Zap className={`w-4 h-4 flex-shrink-0 ${atLimit ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="text-sm text-muted-foreground flex-1">
                {atLimit ? "Monthly limit reached — upgrade to keep building" : "A simple todo app with dark mode and purple accents…"}
              </span>
              {!atLimit && (
                <div className="w-8 h-8 brand-gradient rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              )}
            </button>

            {atLimit && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-destructive">You've used your {monthlyLimit} free generation{monthlyLimit !== 1 ? "s" : ""} today.</p>
                <button onClick={() => setShowUpgrade(true)} className="text-xs font-semibold text-accent hover:underline">
                  Upgrade now →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-6 w-full space-y-8">

          {/* ── Plan card ── */}
          {!usageLoading && (
            <div className={`rounded-2xl border p-5 ${atLimit ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      isPro ? "bg-accent/10 text-accent border-accent/20"
                      : isStarter ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-secondary text-muted-foreground border-border"
                    }`}>
                      {isPro ? "Pro" : isStarter ? "Starter" : "Free"}
                    </span>
                    {atLimit && <span className="text-xs font-semibold text-destructive">Limit reached</span>}
                  </div>

                  {isPro ? (
                    <p className="text-sm font-semibold text-accent flex items-center gap-1.5 mt-2">
                      <Zap className="w-4 h-4" /> Unlimited generations
                    </p>
                  ) : (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold">{generations} / {monthlyLimit} generation{monthlyLimit !== 1 ? "s" : ""} used today</span>
                        <span className="text-xs text-muted-foreground">{Math.round(progressPct)}%</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${atLimit ? "bg-destructive" : "bg-accent"}`}
                          style={{ width: `${progressPct}%` }} />
                      </div>
                      {resetDate && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          Resets {resetDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {isPro ? (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => navigate("/dashboard/subscription")}>
                      <Settings className="w-3.5 h-3.5 mr-1.5" /> Manage
                    </Button>
                  ) : (
                    <>
                      <Button size="sm"
                        className={`rounded-xl border-0 text-xs ${atLimit ? "bg-destructive text-white hover:bg-destructive/90" : "brand-gradient text-white hover:opacity-90"}`}
                        onClick={() => setShowUpgrade(true)}>
                        <Crown className="w-3.5 h-3.5 mr-1.5" />
                        {isStarter ? "Upgrade to Pro" : atLimit ? "Upgrade now" : "Upgrade plan"}
                      </Button>
                      {isStarter && (
                        <button className="text-xs text-muted-foreground hover:text-foreground text-center" onClick={() => navigate("/dashboard/subscription")}>
                          Manage subscription
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Projects ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">Your projects</h2>
              <span className="text-xs text-muted-foreground">{projectsLoading ? "…" : projects.length} project{projects.length !== 1 ? "s" : ""}</span>
            </div>

            {projectsLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
                    <div className="w-8 h-8 bg-secondary rounded-xl mb-3" />
                    <div className="h-4 bg-secondary rounded w-2/3 mb-2" />
                    <div className="h-3 bg-secondary rounded w-full" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center">
                <FolderOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-bold text-base mb-2">No projects yet</h3>
                <p className="text-muted-foreground text-sm mb-5">Create your first app — describe it above to get started</p>
                <Button className="brand-gradient text-white border-0 hover:opacity-90 rounded-xl" onClick={() => navigate("/dashboard/new")}>
                  <Plus className="w-4 h-4 mr-1.5" /> New project
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {projects.map(project => (
                  <div key={project.id} className="relative group">
                    <button onClick={() => navigate(`/dashboard/project/${project.id}`)}
                      className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-accent/30 transition-all">
                      <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                        <FolderOpen className="w-4 h-4 text-accent" />
                      </div>
                      <h3 className="font-bold text-sm mb-1 truncate pr-7">{project.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{project.generations_count} gen{project.generations_count !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(project.last_generated_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                    <button onClick={e => handleDelete(e, project.id, project.name)} disabled={deletingId === project.id}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      {deletingId === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}

                <button onClick={() => navigate("/dashboard/new")} disabled={atLimit}
                  className={`text-left border-2 border-dashed rounded-2xl p-5 transition-all flex flex-col items-center justify-center gap-2 min-h-[110px] ${
                    atLimit
                      ? "border-border opacity-40 cursor-not-allowed"
                      : "border-border hover:border-accent/40 hover:bg-accent/5 cursor-pointer"
                  }`}>
                  <div className="w-8 h-8 bg-secondary rounded-xl flex items-center justify-center">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">New project</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </DashboardLayout>
  );
}

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Zap, FolderOpen, Plus, ChevronRight, LogOut, Settings,
  User, Crown, Clock,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onProjectsRefetch?: (refetch: () => void) => void;
}

export function DashboardLayout({ children, onProjectsRefetch }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, plan, signOut } = useAuth();
  const { projects, loading: projectsLoading, refetch } = useProjects();
  const [collapsed, setCollapsed] = useState(false);

  // Expose refetch upward if needed
  if (onProjectsRefetch) onProjectsRefetch(refetch);

  const isPaid = plan === "paid";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-3 border-b border-sidebar-border gap-2 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <AppLogo size="md" showLabel={false} />
          </button>
          {!collapsed && (
            <button
              className="font-bold text-sm text-sidebar-foreground hover:text-white transition-colors"
              onClick={() => navigate("/dashboard")}
            >
              AppicraFy
            </button>
          )}
        </div>

        {/* New project */}
        <div className="p-2 border-b border-sidebar-border flex-shrink-0">
          <Button
            size="sm"
            className={cn(
              "brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-lg",
              collapsed ? "w-10 h-10 p-0 justify-center" : "w-full h-9"
            )}
            onClick={() => navigate("/dashboard/new")}
            title="New Project"
          >
            <Plus className="w-4 h-4" />
            {!collapsed && <span className="ml-1.5 text-xs font-medium">New Project</span>}
          </Button>
        </div>

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto py-2">
          {!collapsed && (
            <div className="px-3 pb-1.5">
              <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                Projects
              </span>
            </div>
          )}

          {projectsLoading ? (
            !collapsed ? (
              <div className="space-y-1 px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-sidebar-accent/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : null
          ) : projects.length === 0 ? (
            !collapsed ? (
              <div className="px-3 py-3 text-xs text-sidebar-foreground/40 text-center">
                No projects yet
              </div>
            ) : null
          ) : (
            projects.map((project) => {
              const isActive = location.pathname === `/dashboard/project/${project.id}`;
              return (
                <Link
                  key={project.id}
                  to={`/dashboard/project/${project.id}`}
                  className={cn(
                    "flex items-center gap-2 mx-2 px-2 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                  title={collapsed ? project.name : undefined}
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-xs font-medium">{project.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-sidebar-foreground/40 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(project.last_generated_at).toLocaleDateString()}
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />}
                    </>
                  )}
                </Link>
              );
            })
          )}
        </div>

        {/* Plan badge + bottom actions */}
        <div className="border-t border-sidebar-border p-2 space-y-1 flex-shrink-0">
          {/* Plan badge */}
          {!collapsed && (
            <div className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1",
              isPaid ? "bg-accent/10" : "bg-sidebar-accent/40"
            )}>
              <Crown className={cn("w-3.5 h-3.5 flex-shrink-0", isPaid ? "text-accent" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium", isPaid ? "text-accent" : "text-sidebar-foreground/60")}>
                {isPaid ? "Pro plan" : "Free plan"}
              </span>
            </div>
          )}

          {/* User info */}
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-accent" />
              </div>
              <span className="text-xs text-sidebar-foreground/60 truncate flex-1">
                {user.email}
              </span>
            </div>
          )}

          <button
            className={cn(
              "flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors",
              collapsed && "justify-center",
              location.pathname === "/dashboard/subscription" && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            onClick={() => navigate("/dashboard/subscription")}
            title="Subscription"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-xs">Subscription</span>}
          </button>

          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors",
              collapsed && "justify-center"
            )}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-xs">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

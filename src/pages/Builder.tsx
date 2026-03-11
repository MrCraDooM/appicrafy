import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Download, ArrowLeft, Loader2, Crown, Trash2, Send,
  Smartphone, Code2, FolderOpen, Zap, FileCode2, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { UpgradeModal } from "@/components/UpgradeModal";
import { AppPreviewRenderer } from "@/components/AppPreviewRenderer";
import { useAuth } from "@/contexts/AuthContext";
import { useUserUsage } from "@/hooks/useUserUsage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeneratedFile { name: string; path: string; content: string; language: string; }
interface GeneratedApp { id: string; name: string; description: string; files: GeneratedFile[]; screens: string[]; generatedAt: string; }
interface DBProject { id: string; name: string; description: string; files: GeneratedFile[]; screens: string[]; generations_count: number; last_generated_at: string; }
interface Message { id: string; role: "user" | "assistant"; content: string; type: "text" | "success" | "error"; timestamp: string; }

const LANG_COLORS: Record<string, string> = { tsx: "text-blue-500", ts: "text-blue-400", json: "text-yellow-500", js: "text-yellow-400" };

const GENERATION_STEPS = [
  "Analyzing your idea…",
  "Designing app architecture…",
  "Building screen components…",
  "Applying styles and theme…",
  "Setting up navigation…",
  "Finalizing your app…",
];

function FileTree({ files, activeFile, onSelect }: { files: GeneratedFile[]; activeFile: GeneratedFile | null; onSelect: (f: GeneratedFile) => void }) {
  const grouped: Record<string, GeneratedFile[]> = {};
  files.forEach(f => { const dir = f.path.includes("/") ? f.path.split("/")[0] : ""; if (!grouped[dir]) grouped[dir] = []; grouped[dir].push(f); });
  return (
    <div className="text-sm font-mono space-y-0.5 p-2">
      {Object.entries(grouped).map(([dir, dirFiles]) => dir ? (
        <div key={dir}>
          <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-xs"><FolderOpen className="w-3.5 h-3.5" /><span>{dir}/</span></div>
          {dirFiles.map(f => (
            <button key={f.path} onClick={() => onSelect(f)} className={`w-full flex items-center gap-1.5 pl-6 pr-2 py-1 rounded-lg text-xs transition-colors ${activeFile?.path === f.path ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <FileCode2 className={`w-3 h-3 flex-shrink-0 ${LANG_COLORS[f.language] ?? ""}`} /><span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      ) : dirFiles.map(f => (
        <button key={f.path} onClick={() => onSelect(f)} className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${activeFile?.path === f.path ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
          <FileCode2 className={`w-3 h-3 flex-shrink-0 ${LANG_COLORS[f.language] ?? ""}`} /><span className="truncate">{f.name}</span>
        </button>
      )))}
    </div>
  );
}

export default function Builder() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const { usage, checkAndResetIfNeeded, fetchUsage } = useUserUsage();

  const [project, setProject] = useState<DBProject | null>(null);
  const [generatedApp, setGeneratedApp] = useState<GeneratedApp | null>(null);
  const [activeFile, setActiveFile] = useState<GeneratedFile | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [activeTab, setActiveTab] = useState("preview");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackId, setSnackId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isPro = usage?.plan === "pro";
  const isStarter = usage?.plan === "starter";

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !projectId) return;
    fetchProject();
    try {
      const saved = localStorage.getItem(`chat_${projectId}`);
      if (saved) setMessages(JSON.parse(saved));
    } catch { localStorage.removeItem(`chat_${projectId}`); }
  }, [user, projectId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, generating]);

  useEffect(() => {
    if (!generating) { setGenerationStep(0); return; }
    const t = setInterval(() => setGenerationStep(p => Math.min(p + 1, GENERATION_STEPS.length - 1)), 6000);
    return () => clearInterval(t);
  }, [generating]);

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
    const m: Message = { ...msg, id: Date.now().toString(), timestamp: new Date().toISOString() };
    setMessages(prev => { const next = [...prev, m]; if (projectId) localStorage.setItem(`chat_${projectId}`, JSON.stringify(next)); return next; });
  }, [projectId]);

  const fetchProject = async () => {
    setLoadingProject(true);
    try {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId!).eq("user_id", user!.id).maybeSingle();
      if (data) {
        const p = data as unknown as DBProject;
        setProject(p);
        const files = p.files as unknown as GeneratedFile[];
        if (Array.isArray(files) && files.length > 0) {
          setGeneratedApp({ id: p.id, name: p.name, description: p.description, files, screens: p.screens ?? ["Home"], generatedAt: p.last_generated_at });
          setActiveFile(files[0]);
          publishToSnack(files, p.name);
        }
      }
    } finally { setLoadingProject(false); }
  };

  const publishToSnack = async (files: GeneratedFile[], appName: string) => {
    try {
      const code: Record<string, { type: "CODE"; contents: string }> = {};
      let deps: Record<string, string> = {};
      for (const f of files) {
        if (!f.path || !f.content) continue;
        if (f.name === "package.json") { try { deps = JSON.parse(f.content).dependencies ?? {}; } catch {} continue; }
        code[f.path] = { type: "CODE", contents: f.content };
      }
      const res = await fetch("https://exp.host/--/api/v2/snack/save", {
        method: "POST", headers: { "Content-Type": "application/json", "Snack-Api-Version": "3.0.0" },
        body: JSON.stringify({ manifest: { sdkVersion: "50.0.0", name: appName, description: "Generated by AppicraFy" }, dependencies: deps, code }),
      });
      if (res.ok) { const d = await res.json(); setSnackId(d.id); }
    } catch {}
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !session || generating) return;
    setInput("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    addMessage({ role: "user", content: text, type: "text" });

    const { allowed } = await checkAndResetIfNeeded();
    if (!allowed) {
      setShowUpgradeModal(true);
      addMessage({ role: "assistant", content: "You've reached your monthly limit of 5 generations. Upgrade your plan to generate more apps.", type: "error" });
      return;
    }

    setGenerating(true);
    const prompt = generatedApp
      ? `Original app: ${generatedApp.description}\n\nRequested change: ${text}\n\nApply this change while keeping the overall app structure and purpose intact.`
      : text;

    try {
      const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-app`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ prompt, projectId: project?.id, projectName: project?.name }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "LIMIT_REACHED" || data.error === "FREE_LIMIT_REACHED") setShowUpgradeModal(true);
        addMessage({
          role: "assistant",
          content: data.error === "LIMIT_REACHED" || data.error === "FREE_LIMIT_REACHED"
            ? "You've reached your monthly limit. Upgrade to generate more apps."
            : data.error === "RATE_LIMITED" ? "Please wait a moment before trying again."
            : data.error ?? "Generation failed. Please try again.",
          type: "error",
        });
        return;
      }

      const app = data.app;
      setGeneratedApp(app);
      setActiveFile(app.files[0] ?? null);
      setSnackId(null);
      await fetchProject();
      fetchUsage();
      publishToSnack(app.files, app.name);
      addMessage({
        role: "assistant",
        content: generatedApp
          ? `Done! Updated your app based on your request. The preview has refreshed.`
          : `Your app is ready! Generated ${app.files?.length ?? 0} files across ${app.screens?.length ?? 1} screen${app.screens?.length !== 1 ? "s" : ""} (${(app.screens ?? ["Home"]).join(", ")}). Check out the preview →`,
        type: "success",
      });
    } catch {
      addMessage({ role: "assistant", content: "Generation failed. Check your connection and try again.", type: "error" });
    } finally { setGenerating(false); }
  };

  const handleDownload = async () => {
    if (!generatedApp || !session) return;
    try {
      const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/download-app`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ projectId: generatedApp.id, projectName: project?.name, files: generatedApp.files }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error((e as any).error ?? "Download failed."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${project?.name?.replace(/\s+/g, "-").toLowerCase()}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Downloaded! Run: npm install && npx expo start");
    } catch { toast.error("Download failed."); }
  };

  const handleDelete = async () => {
    if (!project || !user || !confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", project.id).eq("user_id", user.id);
    if (error) { toast.error("Failed to delete project."); setDeleting(false); }
    else { toast.success(`"${project.name}" deleted.`); navigate("/dashboard"); }
  };

  if (authLoading || loadingProject) return (
    <DashboardLayout><div className="flex-1 flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></DashboardLayout>
  );
  if (!project) return (
    <DashboardLayout><div className="p-6 text-center text-muted-foreground">Project not found.</div></DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate("/dashboard")} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">{project.name}</span>
            <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isPro
              ? <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent"><Crown className="w-3 h-3" /> Pro</span>
              : <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{isStarter ? "Starter" : "Free"}</span>
            }
            {generatedApp && <>
              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={handleDownload}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </>}
          </div>
        </div>

        {/* ── Main ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT: Chat */}
          <div className="w-[300px] flex-shrink-0 border-r border-border flex flex-col bg-sidebar">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !generating && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
                  <div className="w-10 h-10 brand-gradient rounded-2xl flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold">What do you want to build?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[190px]">
                    Describe your app idea below and I'll generate the full React Native source code instantly.
                  </p>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 brand-gradient rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[210px] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user" ? "bg-accent text-white rounded-tr-sm"
                    : msg.type === "error" ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm"
                    : msg.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-tl-sm"
                    : "bg-secondary text-foreground rounded-tl-sm"
                  }`}>
                    {msg.type === "success" && <CheckCircle2 className="w-3.5 h-3.5 mb-1 inline-block mr-1" />}
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* AI thinking bubble */}
              {generating && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 brand-gradient rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse shadow-sm">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-3 space-y-2 max-w-[210px]">
                    {GENERATION_STEPS.map((step, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs transition-all ${i > generationStep ? "opacity-20" : ""}`}>
                        {i < generationStep
                          ? <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          : i === generationStep
                          ? <Loader2 className="w-3 h-3 text-accent animate-spin flex-shrink-0" />
                          : <div className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />}
                        <span className={i === generationStep ? "text-foreground" : "text-muted-foreground"}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Usage strip */}
            {usage && usage.plan !== "pro" && (
              <div className="px-4 py-2 border-t border-sidebar-border flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">{usage.generations}/{usage.monthly_limit} used today</span>
                  <button onClick={() => navigate("/dashboard/subscription")} className="text-[10px] text-accent hover:underline">Upgrade</button>
                </div>
                <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${usage.generations >= usage.monthly_limit ? "bg-destructive" : "bg-accent"}`}
                    style={{ width: `${Math.min((usage.generations / usage.monthly_limit) * 100, 100)}%` }} />
                </div>
              </div>
            )}

            {/* Chat input */}
            <div className="p-3 border-t border-sidebar-border flex-shrink-0">
              <div className="flex items-end gap-2 bg-background border border-border rounded-xl px-3 py-2.5 focus-within:border-accent/50 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={generatedApp ? "Describe a change…" : "Describe your app idea…"}
                  disabled={generating}
                  rows={1}
                  className="flex-1 bg-transparent text-xs outline-none resize-none text-foreground placeholder:text-muted-foreground/50 leading-relaxed"
                  style={{ minHeight: "20px", maxHeight: "120px" }}
                />
                <button onClick={handleSend} disabled={!input.trim() || generating}
                  className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-all disabled:opacity-30 shadow-sm">
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">↵ Send · Shift+↵ new line</p>
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="flex-1 overflow-hidden flex flex-col bg-[#0c0c0e]">
            {!generatedApp ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <div className="relative">
                  <div className="w-52 h-[420px] bg-[#1c1c1e] rounded-[3rem] border border-[#2a2a2c] shadow-2xl flex flex-col items-center justify-center gap-3 px-6">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full" />
                    <Zap className="w-10 h-10 text-accent/25" />
                    <p className="text-xs text-center text-muted-foreground/35 leading-relaxed">Your app preview will appear here</p>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/10 rounded-full" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-base mb-1">Ready to build</h3>
                  <p className="text-sm text-muted-foreground">Send a message on the left to get started</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-border/40 flex-shrink-0 bg-[#0c0c0e]">
                  {[
                    { key: "preview", icon: <Smartphone className="w-3 h-3" />, label: "Preview" },
                    { key: "code", icon: <Code2 className="w-3 h-3" />, label: "Code" },
                    { key: "files", icon: <FolderOpen className="w-3 h-3" />, label: "Files" },
                  ].map(({ key, icon, label }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === key ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {activeTab === "preview" && (
                  <div className="flex-1 overflow-hidden">
                    <AppPreviewRenderer files={generatedApp.files} appName={generatedApp.name} snackId={snackId} />
                  </div>
                )}

                {activeTab === "code" && (
                  <div className="flex-1 overflow-hidden flex">
                    <div className="w-48 flex-shrink-0 border-r border-border overflow-y-auto bg-sidebar">
                      <FileTree files={generatedApp.files} activeFile={activeFile} onSelect={setActiveFile} />
                    </div>
                    <div className="flex-1 overflow-auto bg-background">
                      {activeFile ? (
                        <pre className="p-4 text-xs font-mono leading-relaxed text-foreground/90 whitespace-pre-wrap">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                            <FileCode2 className={`w-4 h-4 ${LANG_COLORS[activeFile.language] ?? "text-muted-foreground"}`} />
                            <span className="font-semibold text-sm">{activeFile.path}</span>
                          </div>
                          {activeFile.content}
                        </pre>
                      ) : <div className="p-6 text-sm text-muted-foreground">Select a file to view code</div>}
                    </div>
                  </div>
                )}

                {activeTab === "files" && (
                  <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-lg">
                      <p className="text-xs text-muted-foreground mb-4">Complete React Native + Expo project — run with <code className="bg-secondary px-1 py-0.5 rounded">npx expo start</code></p>
                      <div className="space-y-2 mb-6">
                        {generatedApp.files.map(f => (
                          <div key={f.path} className="flex items-center gap-2 p-2.5 bg-secondary rounded-xl">
                            <FileCode2 className={`w-4 h-4 flex-shrink-0 ${LANG_COLORS[f.language] ?? "text-muted-foreground"}`} />
                            <span className="font-mono text-xs flex-1">{f.path}</span>
                            <span className="text-xs text-muted-foreground">{f.content.length} chars</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button className="brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-xl" onClick={handleDownload}>
                          <Download className="w-4 h-4 mr-2" /> Download source code
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">🔒 You own this code. No lock-in.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </DashboardLayout>
  );
}

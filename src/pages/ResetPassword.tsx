import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL hash on PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Could not update password. Please request a new reset link.");
      toast.error("Password update failed");
    } else {
      toast.success("Password updated! Please sign in.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 brand-gradient flex-col justify-between p-12">
        <Link to="/">
          <AppLogo size="md" variant="brand" />
        </Link>
        <div>
          <blockquote className="text-brand-foreground/90 text-2xl font-medium leading-snug mb-4">
            "Set a strong new password and get back to building."
          </blockquote>
          <div className="text-brand-foreground/60 text-sm">AppicraFy security</div>
        </div>
        <div className="text-brand-foreground/50 text-xs">
          You own your app. Download the full source code anytime. No lock-in.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-7 h-7 brand-gradient rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-brand-foreground" />
            </div>
            <span className="font-bold text-lg">AppicraFy</span>
          </div>

          {!ready ? (
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-black">Verifying link…</h1>
              <p className="text-muted-foreground text-sm">
                If this page doesn't load, your reset link may have expired.{" "}
                <Link to="/forgot-password" className="text-accent hover:underline">
                  Request a new one.
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-black mb-2">Set new password</h1>
              <p className="text-muted-foreground text-sm mb-8">
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-3 py-2.5">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-10 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-10 brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-xl"
                  disabled={loading}
                >
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("Could not send reset email. Please try again.");
      toast.error("Failed to send reset email");
    } else {
      setSent(true);
      toast.success("Reset link sent!");
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
            "Secure, fast and reliable. Reset your password in seconds."
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

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 brand-gradient rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-brand-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-black">Check your email</h1>
              <p className="text-muted-foreground text-sm">
                We sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Check your inbox and click the link.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full h-10 rounded-xl mt-2">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>

              <h1 className="text-3xl font-black mb-2">Forgot password?</h1>
              <p className="text-muted-foreground text-sm mb-8">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-3 py-2.5">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-10 brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-xl"
                  disabled={loading}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

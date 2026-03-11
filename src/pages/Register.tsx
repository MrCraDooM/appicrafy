import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check, Zap } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("You must agree to our Terms of Service and Privacy Policy to create an account.");
      return;
    }
    setError("");
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      setError(error.message ?? "Registration failed. Please try again.");
      toast.error("Sign up failed");
    } else {
      toast.success("Account created! Check your email to confirm.");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 brand-gradient flex-col justify-between p-12">
        <Link to="/">
          <AppLogo size="md" variant="brand" />
        </Link>
        <div className="space-y-4">
          {["1 free app generation on signup", "Download full source code", "iOS & Android ready", "No lock-in — you own everything"].map((item) => (
            <div key={item} className="flex items-center gap-3 text-brand-foreground/90">
              <div className="w-5 h-5 bg-brand-foreground/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-brand-foreground" />
              </div>
              <span className="text-sm font-medium">{item}</span>
            </div>
          ))}
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

          <h1 className="text-3xl font-black mb-2">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-8">Start building for free — 1 app generation included</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-3 py-2.5">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
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
            <Button
              type="submit"
              className="w-full h-10 brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-xl"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          {/* Explicit consent */}
          <label className="flex items-start gap-2.5 cursor-pointer mt-4">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <div className={`w-4 h-4 rounded border-2 transition-colors flex items-center justify-center ${
                consent ? "bg-accent border-accent" : "border-border bg-background"
              }`}>
                {consent && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
            </div>
            <span className="text-xs text-muted-foreground leading-relaxed">
              I agree to AppicraFy's{" "}
              <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>,
              and consent to the collection of my email and usage data as described therein.
            </span>
          </label>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

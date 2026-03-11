import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight, Check, Smartphone, Download, Unlock, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { BadgeChip } from "@/components/BadgeChip";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/contexts/AuthContext";
import { openPaddleCheckout } from "@/lib/paddle";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  {
    icon: Download,
    title: "Full Source Code Export",
    desc: "Download your complete React Native + Expo project as a zip. No black boxes.",
  },
  {
    icon: Smartphone,
    title: "iOS & Android Ready",
    desc: "Every generated app runs on both platforms out of the box.",
  },
  {
    icon: Unlock,
    title: "Zero Lock-in",
    desc: "You own 100% of the code. Cancel anytime, keep everything.",
  },
  {
    icon: Code2,
    title: "React Native + Expo",
    desc: "Industry-standard stack. Hire any developer to continue your project.",
  },
];

const STEPS = [
  { num: "01", title: "Describe your idea", desc: "Type what your app should do in plain English. No technical knowledge needed." },
  { num: "02", title: "Generate instantly", desc: "Our AI builds your complete React Native app with screens, navigation, and logic." },
  { num: "03", title: "Download & own it", desc: "Get the full source code. Run it with Expo, customize it, ship it." },
];

const PLANS = [
  {
    key: "free" as const,
    name: "Free",
    price: "$0",
    period: "free forever",
    features: ["5 generations / month", "Full source code download", "Zero lock-in"],
    cta: "Get started free",
    highlight: false,
  },
  {
    key: "starter" as const,
    name: "Starter",
    price: "$19.99",
    period: "per month",
    features: ["10 generations / month", "Full source code download", "Zero lock-in"],
    cta: "Upgrade to Starter",
    highlight: false,
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: "$59.99",
    period: "per month",
    features: ["Unlimited generations", "Priority generation queue", "Full source code download"],
    cta: "Upgrade to Pro",
    highlight: true,
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async (planKey: "starter" | "pro") => {
    if (!session?.access_token) {
      navigate("/register");
      return;
    }
    setUpgrading(true);
    try {
      await openPaddleCheckout(planKey, session.user.email!);
    } catch (err: any) {
      toast({
        title: "Upgrade failed",
        description: err.message ?? "Could not start checkout. Please try again.",
        variant: "destructive",
      });
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl text-center mx-auto">
          <BadgeChip className="mb-6">
            <Zap className="w-3 h-3" /> Now in Beta — Free to try
          </BadgeChip>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Build Mobile Apps<br />
            <span className="brand-text">Instantly</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed">
            Describe your idea → Generate → Download your app.
          </p>
          <p className="text-sm font-semibold text-foreground mb-10 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            You own your app. Download the full source code anytime. No lock-in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="brand-gradient text-brand-foreground border-0 hover:opacity-90 text-base px-8 h-12 rounded-xl"
              onClick={() => navigate("/register")}
            >
              Start Building <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 h-12 rounded-xl" onClick={() => navigate("/login")}>
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-4 bg-secondary/30">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <BadgeChip className="mb-5">
              <Zap className="w-3 h-3" /> Simple process
            </BadgeChip>
            <h2 className="text-4xl font-black tracking-tight mb-3">How it works</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">Three steps from idea to a fully working mobile app</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex flex-col items-start bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center mb-4">
                  <span className="text-brand-foreground font-black text-sm">{step.num}</span>
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="md:hidden mt-6 self-center text-accent/40 text-2xl font-light">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <BadgeChip className="mb-5">
              <Zap className="w-3 h-3" /> Built different
            </BadgeChip>
            <h2 className="text-4xl font-black tracking-tight mb-3">Everything you need</h2>
            <p className="text-muted-foreground text-lg">Built for developers and non-developers alike</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col items-start bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-brand-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-secondary/30">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-3">Simple pricing</h2>
            <p className="text-muted-foreground text-lg">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((pricingPlan) => (
              <div
                key={pricingPlan.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  pricingPlan.highlight
                    ? "border-accent shadow-lg shadow-accent/10 bg-card"
                    : "border-border bg-card"
                }`}
              >
                {pricingPlan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="brand-gradient text-brand-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-sm font-medium text-muted-foreground mb-1">{pricingPlan.name}</div>
                  <div className="text-4xl font-black">{pricingPlan.price}</div>
                  <div className="text-sm text-muted-foreground">{pricingPlan.period}</div>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {pricingPlan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full rounded-xl h-10 ${
                    pricingPlan.highlight ? "brand-gradient text-brand-foreground border-0 hover:opacity-90" : ""
                  }`}
                  variant={pricingPlan.highlight ? "default" : "outline"}
                  disabled={upgrading && pricingPlan.key !== "free"}
                  onClick={
                    pricingPlan.key === "free"
                      ? () => navigate("/register")
                      : () => handleUpgrade(pricingPlan.key as "starter" | "pro")
                  }
                >
                  {upgrading && pricingPlan.key !== "free" ? "Redirecting…" : pricingPlan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="brand-gradient rounded-3xl p-12">
            <h2 className="text-4xl font-black text-brand-foreground mb-4">Ready to build your app?</h2>
            <p className="text-brand-foreground/80 text-lg mb-8">Join thousands of makers who ship mobile apps without code.</p>
            <Button
              size="lg"
              className="bg-background text-foreground hover:bg-background/90 text-base px-10 h-12 rounded-xl"
              onClick={() => navigate("/register")}
            >
              Start for free <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <AppLogo size="sm" />
          <p>© {new Date().getFullYear()} AppicraFy. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

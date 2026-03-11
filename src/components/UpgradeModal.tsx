import { Crown, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { openPaddleCheckout } from "@/lib/paddle";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    price: "$19.99",
    period: "/mo",
    features: [
      "5 app generations per month",
      "GPT-4o powered",
      "Full source code download",
      "Mobile QR install preview",
    ],
    gradient: false,
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: "$59.99",
    period: "/mo",
    features: [
      "Unlimited app generations",
      "GPT-4o — most powerful AI",
      "Priority generation queue",
      "Full source code download",
      "Mobile QR install preview",
    ],
    gradient: true,
  },
];

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planKey: "starter" | "pro") => {
    if (!user?.email) {
      navigate("/login");
      return;
    }
    setLoading(planKey);
    try {
      await openPaddleCheckout(planKey, user.email);
    } catch (err: any) {
      toast.error(err.message ?? "Could not open checkout. Please try again.");
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border-border rounded-2xl">
        {/* Header */}
        <div className="brand-gradient px-6 py-7 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, hsl(270 80% 75%) 0%, transparent 60%), radial-gradient(circle at 80% 20%, hsl(260 90% 80%) 0%, transparent 50%)",
          }} />
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-black text-white mb-1">Generation limit reached</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              You have reached your monthly generation limit.<br />
              Upgrade your plan to generate more apps.
            </p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-5 py-5 grid grid-cols-2 gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                plan.gradient
                  ? "border-accent/40 bg-accent/5"
                  : "border-border bg-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{plan.name}</span>
                {plan.gradient && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full brand-gradient text-brand-foreground">
                    Best value
                  </span>
                )}
              </div>

              <div>
                <span className="text-2xl font-black">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-px" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="sm"
                className={`w-full rounded-xl h-9 text-xs font-semibold border-0 ${
                  plan.gradient
                    ? "brand-gradient text-brand-foreground hover:opacity-90"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
                onClick={() => handleUpgrade(plan.key)}
                disabled={loading !== null}
              >
                {loading === plan.key ? (
                  "Opening checkout…"
                ) : (
                  <>{plan.gradient && <Crown className="w-3.5 h-3.5 mr-1.5" />} Upgrade Plan</>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 text-center">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

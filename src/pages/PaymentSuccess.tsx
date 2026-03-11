import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refreshPlan } = useAuth();

  useEffect(() => {
    // Refresh plan state so UI reflects the new Pro status immediately
    refreshPlan();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-accent" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <Zap className="w-3 h-3" /> Pro Activated
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-3">
          Subscription activated
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Welcome to Pro! You now have unlimited app generations. Start building right away.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-xl px-8"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-xl px-8"
            onClick={() => navigate("/dashboard/new")}
          >
            Build my app
          </Button>
        </div>
      </div>
    </div>
  );
}

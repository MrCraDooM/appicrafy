import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-destructive" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Payment canceled
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-3">
          Payment canceled
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          No worries — you haven't been charged. You can upgrade to Pro anytime
          from your dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-xl px-8"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Dashboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-xl px-8 flex items-center gap-2"
            onClick={() => navigate("/#pricing")}
          >
            <Zap className="w-4 h-4" /> View plans
          </Button>
        </div>
      </div>
    </div>
  );
}

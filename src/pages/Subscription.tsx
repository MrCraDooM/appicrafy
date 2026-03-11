import { useState } from "react";
import { Crown, CalendarDays, Zap, AlertCircle, CheckCircle2, Loader2, ExternalLink, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserUsage } from "@/hooks/useUserUsage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PLAN_META: Record<string, { label: string; color: string; iconColor: string; bg: string }> = {
  pro: {
    label: "Pro",
    color: "text-accent border-accent/30 bg-accent/10",
    iconColor: "text-accent",
    bg: "border-accent/20 bg-accent/5",
  },
  starter: {
    label: "Starter",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    iconColor: "text-blue-400",
    bg: "border-blue-500/20 bg-blue-500/5",
  },
  free: {
    label: "Free",
    color: "text-muted-foreground border-border bg-secondary",
    iconColor: "text-muted-foreground",
    bg: "border-border bg-card",
  },
};

export default function SubscriptionPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { subscription, loading: subLoading, cancelSubscription, fetchSubscription } = useSubscription();
  const { usage, loading: usageLoading } = useUserUsage();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const plan = usage?.plan ?? "free";
  const planMeta = PLAN_META[plan] ?? PLAN_META.free;
  const isPaid = plan === "starter" || plan === "pro";
  const isActive = subscription?.status === "active";
  const isCanceled = subscription?.status === "canceled";
  const generations = usage?.generations ?? 0;
  const monthlyLimit = usage?.monthly_limit ?? 1;
  const nextBillingDate = subscription?.next_billing_date
    ? new Date(subscription.next_billing_date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const resetDate = usage?.reset_date
    ? new Date(usage.reset_date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleCancel = async () => {
    setCanceling(true);
    const result = await cancelSubscription();
    setCanceling(false);
    setShowCancelConfirm(false);
    if (result.success) {
      toast.success("Subscription canceled. You've been moved to the Free plan.");
    } else {
      toast.error(result.error ?? "Could not cancel subscription. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fnUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/delete-account`;
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete account");
      await signOut();
      toast.success("Account deleted. We're sorry to see you go.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Could not delete account. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1">Subscription</h1>
          <p className="text-sm text-muted-foreground">Manage your plan and billing</p>
        </div>

        {subLoading || usageLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Plan Card */}
            <div className={`rounded-2xl border p-5 ${planMeta.bg}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${planMeta.color}`}>
                      {planMeta.label}
                    </span>
                    {isActive && isPaid && (
                      <span className="flex items-center gap-1 text-xs text-accent">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    )}
                    {isCanceled && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <XCircle className="w-3 h-3" />
                        Canceled
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className={`w-3.5 h-3.5 ${planMeta.iconColor}`} />
                      <span>
                        {plan === "pro"
                          ? "Unlimited generations"
                          : `${generations} / ${monthlyLimit} generations used today`}
                      </span>
                    </div>

                    {nextBillingDate && isActive && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>Next billing: {nextBillingDate}</span>
                      </div>
                    )}

                    {resetDate && !isPaid && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>Resets: {resetDate}</span>
                      </div>
                    )}

                    {subscription?.paddle_subscription_id && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs font-mono opacity-60">
                          ID: {subscription.paddle_subscription_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Crown className={`w-5 h-5 flex-shrink-0 mt-0.5 ${planMeta.iconColor}`} />
              </div>
            </div>

            {/* Plan Features */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Your plan includes</h3>
              <ul className="space-y-2">
                {plan === "pro" ? (
                  <>
                    <PlanFeature>Unlimited app generations</PlanFeature>
                    <PlanFeature>Priority generation queue</PlanFeature>
                    <PlanFeature>Full source code download</PlanFeature>
                  </>
                ) : plan === "starter" ? (
                  <>
                    <PlanFeature>5 app generations per month</PlanFeature>
                    <PlanFeature>Full source code download</PlanFeature>
                    <PlanFeature>Mobile QR install preview</PlanFeature>
                  </>
                ) : (
                  <>
                    <PlanFeature>5 app generations per day</PlanFeature>
                    <PlanFeature>Full source code download</PlanFeature>
                  </>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold mb-1">Actions</h3>

              {/* Upgrade CTA for free / starter */}
              {plan !== "pro" && (
                <Button
                  className="w-full brand-gradient text-brand-foreground border-0 hover:opacity-90 rounded-xl"
                  onClick={() => setShowUpgrade(true)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {plan === "starter" ? "Upgrade to Pro" : "Upgrade Plan"}
                </Button>
              )}

              {/* Cancel button for active paid subscriptions */}
              {isPaid && isActive && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={canceling}
                >
                  {canceling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Cancel Subscription
                </Button>
              )}

              {/* Canceled state info */}
              {isCanceled && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your subscription has been canceled. You are now on the Free plan.
                    Upgrade anytime to get more generations.
                  </p>
                </div>
              )}
            </div>

            {/* Account info + delete */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Account</h3>
              <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
              <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-border">
                <div>
                  <p className="text-xs font-semibold text-destructive">Delete account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Permanently removes all your projects and data.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive text-xs"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete account
                </Button>
              </div>
            </div>

            {/* Legal links */}
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal open={showUpgrade} onClose={() => { setShowUpgrade(false); fetchSubscription(); }} />

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will be canceled at the end of the current billing period.
              You will be moved to the Free plan (1 generation/month). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep plan</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
              onClick={handleCancel}
              disabled={canceling}
            >
              {canceling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all your projects, usage data, and account. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep account</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Yes, delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
      {children}
    </li>
  );
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, paddle-signature",
};

// Plan config
const PLAN_CONFIG: Record<string, { plan: string; monthly_limit: number }> = {
  starter: { plan: "starter", monthly_limit: 5 },
  pro:     { plan: "pro",     monthly_limit: 999999 },
  free:    { plan: "free",    monthly_limit: 1 },
};

async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      signatureHeader.split(";").map((p) => p.split("=", 2))
    );
    const ts = parts["ts"];
    const h1 = parts["h1"];
    if (!ts || !h1) return false;

    const payload = `${ts}:${rawBody}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hex === h1;
  } catch {
    return false;
  }
}

async function getUserIdByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error || !data) return null;
  const match = data.users.find((u) => u.email === email);
  return match?.id ?? null;
}

async function updateUserPlan(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  planKey: string
) {
  const config = PLAN_CONFIG[planKey] ?? PLAN_CONFIG["free"];

  await Promise.all([
    adminClient
      .from("user_plans")
      .upsert(
        {
          user_id: userId,
          plan: config.plan,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      ),
    adminClient
      .from("user_usage")
      .upsert(
        {
          user_id: userId,
          plan: config.plan,
          monthly_limit: config.monthly_limit,
        },
        { onConflict: "user_id" }
      ),
  ]);
}

async function upsertSubscription(
  adminClient: ReturnType<typeof createClient>,
  {
    userId,
    paddleSubscriptionId,
    plan,
    status,
    monthlyLimit,
    nextBillingDate,
  }: {
    userId: string;
    paddleSubscriptionId: string;
    plan: string;
    status: string;
    monthlyLimit: number;
    nextBillingDate: string | null;
  }
) {
  await adminClient.from("subscriptions").upsert(
    {
      user_id: userId,
      paddle_subscription_id: paddleSubscriptionId,
      plan,
      status,
      monthly_limit: monthlyLimit,
      next_billing_date: nextBillingDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("PADDLE_WEBHOOK_SECRET is not configured");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("paddle-signature") ?? "";

  const isValid = await verifyPaddleSignature(rawBody, signatureHeader, webhookSecret);
  if (!isValid) {
    console.error("Invalid Paddle webhook signature");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventType: string = event?.event_type ?? "";
  const data = event?.data ?? {};

  console.log(`Paddle event received: ${eventType}`);

  try {
    if (
      eventType === "subscription.created" ||
      eventType === "subscription.updated"
    ) {
      const email: string =
        data?.customer_email ??
        data?.customer?.email ??
        data?.billing_details?.email ??
        "";

      if (!email) {
        console.error("No customer email found in event", JSON.stringify(data));
        return new Response(JSON.stringify({ error: "No customer email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customPlan: string = data?.custom_data?.plan ?? "";
      const starterPriceId = Deno.env.get("PADDLE_STARTER_PRICE_ID") ?? "";
      const proPriceId = Deno.env.get("PADDLE_PRO_PRICE_ID") ?? "";
      const lineItemPriceId: string =
        data?.items?.[0]?.price?.id ?? data?.items?.[0]?.price_id ?? "";

      let planKey = customPlan;
      if (!planKey) {
        if (lineItemPriceId && lineItemPriceId === starterPriceId) planKey = "starter";
        else if (lineItemPriceId && lineItemPriceId === proPriceId) planKey = "pro";
        else planKey = "free";
      }

      const userId = await getUserIdByEmail(adminClient, email);
      if (!userId) {
        console.error(`No user found for email: ${email}`);
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine subscription status and next billing date
      const paddleSubscriptionId: string = data?.id ?? "";
      const subStatus: string = data?.status ?? "active";
      const nextBillingDate: string | null =
        data?.next_billed_at ?? data?.billing_cycle?.next_transaction?.billed_at ?? null;

      const planConfig = PLAN_CONFIG[planKey] ?? PLAN_CONFIG["free"];

      await Promise.all([
        updateUserPlan(adminClient, userId, planKey),
        paddleSubscriptionId
          ? upsertSubscription(adminClient, {
              userId,
              paddleSubscriptionId,
              plan: planKey,
              status: subStatus === "active" || subStatus === "trialing" ? "active" : subStatus,
              monthlyLimit: planConfig.monthly_limit,
              nextBillingDate,
            })
          : Promise.resolve(),
      ]);

      console.log(`Updated ${email} → plan: ${planKey}, sub: ${paddleSubscriptionId}`);

    } else if (eventType === "subscription.cancelled") {
      const email: string =
        data?.customer_email ??
        data?.customer?.email ??
        data?.billing_details?.email ??
        "";

      const paddleSubscriptionId: string = data?.id ?? "";

      if (email) {
        const userId = await getUserIdByEmail(adminClient, email);
        if (userId) {
          await Promise.all([
            updateUserPlan(adminClient, userId, "free"),
            paddleSubscriptionId
              ? adminClient
                  .from("subscriptions")
                  .update({ status: "canceled", updated_at: new Date().toISOString() })
                  .eq("paddle_subscription_id", paddleSubscriptionId)
              : Promise.resolve(),
          ]);
          console.log(`Cancelled subscription — downgraded ${email} → free`);
        }
      }
    } else {
      console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

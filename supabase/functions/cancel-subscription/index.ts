import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paddleApiKey = Deno.env.get("PADDLE_API_KEY") ?? "";

  // Verify the user's JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } =
    await userClient.auth.getClaims(token);

  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Fetch the user's subscription
  const { data: subscription, error: subError } = await adminClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (subError || !subscription) {
    return new Response(
      JSON.stringify({ error: "No active subscription found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const paddleSubId = subscription.paddle_subscription_id;

  // Call Paddle API to cancel the subscription
  if (!paddleApiKey) {
    return new Response(
      JSON.stringify({ error: "Paddle API key not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const paddleRes = await fetch(
    `https://api.paddle.com/subscriptions/${paddleSubId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ effective_from: "next_billing_period" }),
    }
  );

  if (!paddleRes.ok) {
    const errBody = await paddleRes.text();
    console.error("Paddle cancel error:", errBody);
    return new Response(
      JSON.stringify({ error: "Failed to cancel subscription with Paddle" }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Mark subscription as canceled in DB and downgrade user
  await Promise.all([
    adminClient
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", subscription.id),
    adminClient
      .from("user_usage")
      .update({ plan: "free", monthly_limit: 1 })
      .eq("user_id", userId),
    adminClient
      .from("user_plans")
      .update({ plan: "free", updated_at: new Date().toISOString() })
      .eq("user_id", userId),
  ]);

  console.log(`Subscription ${paddleSubId} canceled for user ${userId}`);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

/**
 * Creates a Paddle hosted checkout URL server-side.
 * Returns a URL the frontend redirects to — no domain whitelisting required.
 */

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

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { planKey } = await req.json();
  if (planKey !== "starter" && planKey !== "pro") {
    return new Response(JSON.stringify({ error: "Invalid plan" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("PADDLE_API_KEY");
  const starterPriceId = Deno.env.get("PADDLE_STARTER_PRICE_ID");
  const proPriceId = Deno.env.get("PADDLE_PRO_PRICE_ID");

  if (!apiKey || !starterPriceId || !proPriceId) {
    return new Response(
      JSON.stringify({ error: "Paddle not configured" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const priceId = planKey === "starter" ? starterPriceId : proPriceId;

  // Paddle Billing v2 API key format: may be stored as full pdl_live_apikey_xxx or just the raw key
  const authKey = apiKey.startsWith("pdl_") ? apiKey : `pdl_live_apikey_${apiKey}`;

  const paddleRes = await fetch("https://api.paddle.com/transactions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      customer: { email: user.email },
      custom_data: { user_id: user.id, plan: planKey },
      checkout: {
        url: "https://appicrafy.com/success",
      },
    }),
  });

  const paddleData = await paddleRes.json();

  if (!paddleRes.ok) {
    console.error("Paddle API error:", JSON.stringify(paddleData));
    return new Response(
      JSON.stringify({ error: paddleData?.error?.detail ?? "Paddle error" }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const checkoutUrl = paddleData?.data?.checkout?.url;
  if (!checkoutUrl) {
    console.error("No checkout URL in Paddle response:", JSON.stringify(paddleData));
    return new Response(
      JSON.stringify({ error: "No checkout URL returned from Paddle" }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ checkoutUrl }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

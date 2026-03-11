/**
 * Returns public Paddle configuration (client token + price IDs) to the frontend.
 * These values are publishable / non-secret, but we serve them from an edge function
 * so they don't need to be baked into the Vite build.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientToken = Deno.env.get("PADDLE_CLIENT_TOKEN");
  const starterPriceId = Deno.env.get("PADDLE_STARTER_PRICE_ID");
  const proPriceId = Deno.env.get("PADDLE_PRO_PRICE_ID");

  if (!clientToken || !starterPriceId || !proPriceId) {
    return new Response(
      JSON.stringify({ error: "Paddle is not fully configured yet." }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ clientToken, starterPriceId, proPriceId }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});

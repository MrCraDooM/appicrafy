import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (req.method === "GET") {
      const { data } = await supabase.from("user_plans").select("gemini_api_key").eq("user_id", user.id).maybeSingle();
      const key = data?.gemini_api_key ?? null;
      // Mask key: show first 8 + last 4 chars
      const masked = key ? `${key.slice(0, 8)}${"•".repeat(key.length - 12)}${key.slice(-4)}` : null;
      return new Response(JSON.stringify({ hasKey: !!key, masked }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      // Only paid users (starter/pro) can set a custom API key
      const { data: planData } = await supabase.from("user_plans").select("plan, gemini_api_key").eq("user_id", user.id).maybeSingle();
      if (!planData || planData.plan === "free") {
        return new Response(JSON.stringify({ error: "Upgrade to a paid plan to use your own API key." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { apiKey } = await req.json();
      if (apiKey && !apiKey.startsWith("AIza")) {
        return new Response(JSON.stringify({ error: "Invalid Gemini API key format. Keys start with 'AIza'." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("user_plans").update({ gemini_api_key: apiKey || null }).eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

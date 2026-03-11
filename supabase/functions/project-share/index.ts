import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: resolve a share token → return project ZIP
    if (req.method === "GET") {
      const url = new URL(req.url);
      const shareToken = url.searchParams.get("token");
      if (!shareToken) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: share } = await supabase
        .from("project_shares")
        .select("*")
        .eq("token", shareToken)
        .eq("user_id", user.id)
        .single();

      if (!share) {
        return new Response(JSON.stringify({ error: "Share not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(share.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Share link expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ share }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: create a new share link for a project
    if (req.method === "POST") {
      const { projectId, expiresInHours = 24 } = await req.json();

      if (!projectId) {
        return new Response(JSON.stringify({ error: "projectId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify user owns the project
      const { data: project } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete old shares for this project to keep it clean
      await supabase
        .from("project_shares")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", user.id);

      // Create new share
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
      const { data: share, error: insertError } = await supabase
        .from("project_shares")
        .insert({
          project_id: projectId,
          user_id: user.id,
          expires_at: expiresAt,
        })
        .select("token, expires_at")
        .single();

      if (insertError || !share) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create share" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ token: share.token, expires_at: share.expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("project-share error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

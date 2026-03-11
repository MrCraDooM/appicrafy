import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { zipSync, strToU8 } from "https://esm.sh/fflate@0.8.2";

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

    const { projectId, files: inlineFiles, projectName } = await req.json();

    let downloadFiles: any[] = inlineFiles ?? [];
    let appName = projectName ?? "app";

    // If projectId given, load from DB (available for ALL plans)
    if (projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      downloadFiles = Array.isArray(project.files) ? (project.files as any[]) : [];
      appName = project.name ?? appName;
    }

    if (!downloadFiles || downloadFiles.length === 0) {
      return new Response(JSON.stringify({ error: "No files to download" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const folderName = slug || "app";

    // Build ZIP entries: each file placed under folderName/
    const zipEntries: Record<string, Uint8Array> = {};

    for (const f of downloadFiles) {
      const filePath: string = f.path ?? f.name ?? "unknown.txt";
      // Normalise path separators, strip leading slashes, and block path traversal
      const cleanPath = filePath
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\.\.\//g, "")
        .replace(/\/\.\./g, "");
      const zipPath = `${folderName}/${cleanPath}`;
      const content: string = typeof f.content === "string" ? f.content : JSON.stringify(f.content, null, 2);
      zipEntries[zipPath] = strToU8(content);
    }

    // Create ZIP synchronously (edge function has no async zip support via fflate)
    const zipped = zipSync(zipEntries, { level: 6 });

    const filename = `${folderName}.zip`;

    return new Response(zipped, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipped.byteLength),
      },
    });
  } catch (err) {
    console.error("download-app error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

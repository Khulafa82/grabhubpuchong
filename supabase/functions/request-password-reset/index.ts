import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "INVALID_BODY", message: "Invalid request body" }, 400);
    }

    const { email } = body as { email?: string };
    if (!email || typeof email !== "string" || !email.trim()) {
      return json({ error: "INVALID_EMAIL", message: "Email is required" }, 400);
    }

    const trimmed = email.trim().toLowerCase();

    const { data: profile, error: profErr } = await admin
      .from("staff_profiles")
      .select("id, email, status, full_name")
      .ilike("email", trimmed)
      .maybeSingle();

    if (profErr) {
      return json({ error: "LOOKUP_FAILED", message: profErr.message }, 500);
    }

    if (!profile) {
      return json({ error: "NOT_FOUND", message: "No staff account found with this email." }, 200);
    }

    const { data: existing, error: dupErr } = await admin
      .from("staff_password_reset_requests")
      .select("id")
      .eq("staff_id", profile.id)
      .eq("request_status", "pending")
      .limit(1);

    if (dupErr) {
      return json({ error: "DUPLICATE_CHECK_FAILED", message: dupErr.message }, 500);
    }

    if (existing && existing.length > 0) {
      return json({ error: "ALREADY_PENDING", message: "A password reset request is already pending." }, 200);
    }

    const { error: insertErr } = await admin
      .from("staff_password_reset_requests")
      .insert({
        staff_id: profile.id,
        email: profile.email ?? trimmed,
        request_status: "pending",
        requested_by_staff: true,
      });

    if (insertErr) {
      return json({ error: "INSERT_FAILED", message: insertErr.message }, 500);
    }

    return json({ success: true, message: "Reset request submitted." }, 200);
  } catch (e) {
    return json({ error: "UNEXPECTED", message: (e as Error).message }, 500);
  }
});

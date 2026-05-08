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

    // Uniform response — never reveal whether email exists.
    const uniform = json(
      { success: true, message: "If this email is registered, a reset request has been submitted." },
      200,
    );

    const { data: profile, error: profErr } = await admin
      .from("staff_profiles")
      .select("id, email, status, full_name")
      .ilike("email", trimmed)
      .maybeSingle();

    if (profErr) {
      console.error("[request-password-reset] lookup failed:", profErr.message);
      return uniform;
    }

    if (!profile) {
      return uniform;
    }

    // Per-email rate limit: max 3 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent, error: rateErr } = await admin
      .from("staff_password_reset_requests")
      .select("id, created_at, request_status")
      .eq("staff_id", profile.id)
      .gte("created_at", oneHourAgo);

    if (rateErr) {
      console.error("[request-password-reset] rate check failed:", rateErr.message);
      return uniform;
    }

    if (recent && recent.length >= 3) {
      console.warn("[request-password-reset] rate limit hit for staff", profile.id);
      return uniform;
    }

    const { data: existing, error: dupErr } = await admin
      .from("staff_password_reset_requests")
      .select("id")
      .eq("staff_id", profile.id)
      .eq("request_status", "pending")
      .limit(1);

    if (dupErr) {
      console.error("[request-password-reset] dup check failed:", dupErr.message);
      return uniform;
    }

    if (existing && existing.length > 0) {
      return uniform;
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
      console.error("[request-password-reset] insert failed:", insertErr.message);
      return uniform;
    }

    return uniform;
  } catch (e) {
    console.error("[request-password-reset] unexpected:", (e as Error).message);
    return json(
      { success: true, message: "If this email is registered, a reset request has been submitted." },
      200,
    );
  }
});

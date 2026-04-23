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

const generateTempPassword = (len = 12) => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: caller, error: callerErr } = await admin
      .from("staff_profiles")
      .select("id, role, status, full_name")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (callerErr || !caller) return json({ error: "Staff profile not found" }, 403);
    if (caller.status !== "active") return json({ error: "Account not active" }, 403);
    if (caller.role !== "boss" && caller.role !== "super_admin") {
      return json({ error: "Only Boss can reset staff passwords" }, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const { request_id, temporary_password } = body as {
      request_id?: string;
      temporary_password?: string;
    };

    if (!request_id || typeof request_id !== "string") {
      return json({ error: "request_id is required" }, 400);
    }

    const { data: reqRow, error: reqErr } = await admin
      .from("staff_password_reset_requests")
      .select("id, staff_id, email, request_status")
      .eq("id", request_id)
      .maybeSingle();

    if (reqErr || !reqRow) return json({ error: "Reset request not found" }, 404);
    if (reqRow.request_status === "completed") {
      return json({ error: "Request already completed" }, 400);
    }

    const tempPassword =
      typeof temporary_password === "string" && temporary_password.trim().length >= 8
        ? temporary_password.trim()
        : generateTempPassword(12);

    // Update auth user password
    const { error: updErr } = await admin.auth.admin.updateUserById(reqRow.staff_id, {
      password: tempPassword,
    });
    if (updErr) return json({ error: `Failed to update password: ${updErr.message}` }, 500);

    // Force first-login change on next sign in
    await admin
      .from("staff_profiles")
      .update({ first_login_completed: false })
      .eq("id", reqRow.staff_id);

    // Mark request completed
    const { error: markErr } = await admin
      .from("staff_password_reset_requests")
      .update({
        request_status: "completed",
        reviewed_by: caller.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request_id);
    if (markErr) {
      return json({ error: `Password reset, but failed to update request: ${markErr.message}` }, 500);
    }

    return json({ success: true, temporary_password: tempPassword }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = ["admin", "boss", "it_tech", "super_admin"] as const;
type Role = (typeof ALLOWED_ROLES)[number];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const empty = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : null;

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

    // Validate caller's session
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Look up caller's staff profile to determine permissions
    const { data: callerProfile, error: callerErr } = await admin
      .from("staff_profiles")
      .select("role, status")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (callerErr || !callerProfile) return json({ error: "Staff profile not found" }, 403);
    if (callerProfile.status !== "active") return json({ error: "Account not active" }, 403);

    const callerRole = callerProfile.role as Role;
    if (!["boss", "it_tech", "super_admin"].includes(callerRole)) {
      return json({ error: "You are not allowed to create staff accounts" }, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const {
      full_name, username, email, phone_number, role, temporary_password,
      status, availability_status, employment_status, branch_hub, joined_date,
      emergency_contact, assigned_service_scope, assigned_location_scope,
      assigned_application_scope, assigned_channel_scope,
    } = body as Record<string, unknown>;

    if (!empty(full_name)) return json({ error: "full_name is required" }, 400);
    if (!empty(email)) return json({ error: "email is required" }, 400);
    if (typeof temporary_password !== "string" || temporary_password.length < 8) {
      return json({ error: "temporary_password must be at least 8 characters" }, 400);
    }
    if (!ALLOWED_ROLES.includes(role as Role)) {
      return json({ error: "Invalid role" }, 400);
    }
    const targetRole = role as Role;

    // Role gating
    if (targetRole === "super_admin" && callerRole !== "super_admin") {
      return json({ error: "Only super admin can create super admin accounts" }, 403);
    }

    // Create auth user with email confirmed so they can log in immediately
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: temporary_password,
      email_confirm: true,
      user_metadata: { full_name: empty(full_name), created_by: userData.user.id },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Failed to create auth user" }, 400);
    }

    const newUserId = created.user.id;

    const profilePayload = {
      id: newUserId,
      full_name: empty(full_name),
      username: empty(username),
      email: empty(email),
      phone_number: empty(phone_number),
      role: targetRole,
      status: empty(status) ?? "active",
      availability_status: empty(availability_status) ?? "available",
      employment_status: empty(employment_status) ?? "full_time",
      branch_hub: empty(branch_hub),
      joined_date: empty(joined_date),
      emergency_contact: empty(emergency_contact),
      assigned_service_scope: empty(assigned_service_scope) ?? "both",
      assigned_location_scope: empty(assigned_location_scope) ?? "all",
      assigned_application_scope: empty(assigned_application_scope) ?? "both",
      assigned_channel_scope: empty(assigned_channel_scope) ?? "both",
      first_login_completed: false,
      account_locked: false,
    };

    // Upsert in case a trigger already created the profile row
    const { error: profileErr } = await admin
      .from("staff_profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (profileErr) {
      // Roll back the auth user so we don't leave a half-created account
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return json({ error: `Profile creation failed: ${profileErr.message}` }, 500);
    }

    return json({ success: true, user_id: newUserId }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
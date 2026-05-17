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

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerProfile, error: callerErr } = await admin
      .from("staff_profiles")
      .select("role, status")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (callerErr || !callerProfile) return json({ error: "Staff profile not found" }, 403);
    if (callerProfile.status !== "active") return json({ error: "Account not active" }, 403);

    const callerRole = callerProfile.role as Role;
    if (!["boss", "it_tech", "super_admin"].includes(callerRole)) {
      return json({ error: "You are not allowed to update staff accounts" }, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const {
      user_id,
      full_name, username, email, phone_number, role,
      status, availability_status, employment_status, branch_hub, joined_date,
      emergency_contact, assigned_service_scope, assigned_location_scope,
      assigned_application_scope, assigned_channel_scope,
    } = body as Record<string, unknown>;

    if (!empty(user_id)) return json({ error: "user_id is required" }, 400);
    const targetId = String(user_id);

    if (role !== undefined && role !== null && !ALLOWED_ROLES.includes(role as Role)) {
      return json({ error: "Invalid role" }, 400);
    }
    const targetRole = (role as Role | undefined) ?? undefined;

    // Load existing target profile
    const { data: target, error: targetErr } = await admin
      .from("staff_profiles")
      .select("id, role, email")
      .eq("id", targetId)
      .maybeSingle();
    if (targetErr || !target) return json({ error: "Target staff not found" }, 404);

    // Role gating: only super_admin may touch super_admin accounts or assign super_admin role
    if (target.role === "super_admin" && callerRole !== "super_admin") {
      return json({ error: "Only super admin can update a super admin account" }, 403);
    }
    if (targetRole === "super_admin" && callerRole !== "super_admin") {
      return json({ error: "Only super admin can assign the super admin role" }, 403);
    }

    // IT Technician can only manage admin accounts and cannot edit own account here
    if (callerRole === "it_tech") {
      if (target.role !== "admin") {
        return json(
          { error: "Access denied. IT Technician can only manage Admin accounts." },
          403,
        );
      }
      if (targetId === userData.user.id) {
        return json({ error: "You cannot edit your own account here." }, 403);
      }
      if (targetRole && targetRole !== "admin") {
        return json(
          { error: "IT Technician cannot change a staff role away from Admin." },
          403,
        );
      }
    }

    const newEmail = empty(email);

    // Update auth email if it changed
    if (newEmail && newEmail.toLowerCase() !== String(target.email ?? "").toLowerCase()) {
      const { error: authErr } = await admin.auth.admin.updateUserById(targetId, {
        email: newEmail,
        email_confirm: true,
      });
      if (authErr) {
        const msg = authErr.message || "Failed to update auth email";
        if (/already|exists|registered|duplicate/i.test(msg)) {
          return json({ error: "This email is already used by another account." }, 409);
        }
        return json({ error: msg }, 400);
      }
    }

    const profilePayload: Record<string, unknown> = {
      full_name: empty(full_name),
      username: empty(username),
      email: newEmail,
      phone_number: empty(phone_number),
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
    };
    if (targetRole) profilePayload.role = targetRole;

    const { error: profileErr } = await admin
      .from("staff_profiles")
      .update(profilePayload)
      .eq("id", targetId);

    if (profileErr) {
      return json({ error: `Profile update failed: ${profileErr.message}` }, 500);
    }

    return json({ success: true, user_id: targetId }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
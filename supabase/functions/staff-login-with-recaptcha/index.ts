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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, password, recaptchaToken } = await req.json();

    if (!email || !password) return json({ error: "Email and password are required" }, 400);
    if (!recaptchaToken) return json({ error: "Please complete the reCAPTCHA verification." }, 400);

    const SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!SECRET) return json({ error: "reCAPTCHA secret not configured" }, 500);

    // Verify recaptcha
    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: SECRET, response: recaptchaToken }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return json({ error: "reCAPTCHA verification failed" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Sign in to obtain session tokens
    const authClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password),
    });

    if (signInError || !signInData.session || !signInData.user) {
      return json({ error: signInError?.message || "Invalid credentials. Please try again." }, 401);
    }

    // Fetch staff profile with service role
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile, error: profErr } = await admin
      .from("staff_profiles")
      .select("*")
      .eq("id", signInData.user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return json({ error: "Access denied. No staff profile found for this account." }, 403);
    }

    if (profile.status !== "active") {
      return json({ error: "Your account is inactive. Please contact your administrator." }, 403);
    }

    return json({
      session: signInData.session,
      user: signInData.user,
      profile,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
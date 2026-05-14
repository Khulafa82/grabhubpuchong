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
    const { token } = await req.json().catch(() => ({ token: "" }));
    if (!token || typeof token !== "string") {
      return json({ success: false, error: "Missing token" }, 400);
    }

    const SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!SECRET) return json({ success: false, error: "reCAPTCHA secret not configured" }, 500);

    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: SECRET, response: token }),
    });
    const data = await verifyRes.json();
    return json({ success: !!data.success, score: data.score ?? null, errors: data["error-codes"] ?? null });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
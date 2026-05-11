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

const ALLOWED_ROLES = ["GrabCar", "GrabFood"] as const;
const ALLOWED_LOCATIONS = ["Klang Valley", "Outside Klang Valley", "Sabah & Sarawak"] as const;
const ALLOWED_ACCOUNT_STATUS = ["new", "reactivation"] as const;
const ALLOWED_CRIMINAL = ["clean", "has_record"] as const;
const ALLOWED_PSV = ["have_psv", "no_psv", null, undefined, ""] as const;
const ALLOWED_STATES = new Set([
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya",
]);

const isStr = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";

// Simple in-memory IP rate limit (per warm instance).
const ipHits = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 10;

const rateLimited = (ip: string): boolean => {
  const now = Date.now();
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    ipHits.set(ip, arr);
    return true;
  }
  arr.push(now);
  ipHits.set(ip, arr);
  return false;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (rateLimited(ip)) {
      return json({ error: "RATE_LIMITED", message: "Too many submissions. Please try again later." }, 429);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "INVALID_BODY", message: "Invalid request." }, 400);
    }

    const b = body as Record<string, unknown>;

    // ---- Validation ----
    const fullName = isStr(b.full_name) ? b.full_name.trim() : "";
    const ic = isStr(b.ic_number) ? b.ic_number.trim() : "";
    const email = isStr(b.email_address) ? b.email_address.trim() : "";
    const phone = isStr(b.phone_number) ? b.phone_number.trim() : "";
    const userRole = isStr(b.user_role) ? b.user_role : "";
    const location = isStr(b.location_choice) ? b.location_choice : "";
    const state = isStr(b.state) ? b.state : "";
    const accountStatus = isStr(b.account_status) ? b.account_status : "";
    const licenseType = isStr(b.license_type) ? b.license_type.trim() : "";
    const criminal = isStr(b.criminal_record_status) ? b.criminal_record_status : "";
    const psv = isStr(b.psv_license_status) ? b.psv_license_status : "";
    const carModel = isStr(b.car_model) ? b.car_model.trim() : null;
    const motorDetails = isStr(b.motorcycle_details) ? b.motorcycle_details.trim() : null;
    const vehicleType = isStr(b.vehicle_type) ? b.vehicle_type : null;
    const vehicleModel = isStr(b.vehicle_model) ? b.vehicle_model.trim() : null;
    const walkInFlag = isBool(b.walk_in_flag) ? b.walk_in_flag : false;
    const blueIc = isBool(b.blue_ic_status) ? b.blue_ic_status : false;
    const hasCar = isBool(b.has_car) ? b.has_car : false;
    const hasMotorcycle = isBool(b.has_motorcycle) ? b.has_motorcycle : false;

    if (fullName.length < 2 || fullName.length > 120) {
      return json({ error: "VALIDATION", message: "Invalid full name." }, 400);
    }
    if (!/^\d{12}$/.test(ic)) {
      return json({ error: "VALIDATION", message: "IC number must be 12 digits." }, 400);
    }
    if (email && !/^[\w.+-]+@gmail\.com$/i.test(email)) {
      return json({ error: "VALIDATION", message: "Email must be a valid Gmail address." }, 400);
    }
    if (!/^60(10|11|12|13|14|16|17|18|19)[0-9]{7,8}$/.test(phone)) {
      return json({ error: "VALIDATION", message: "Invalid mobile number." }, 400);
    }
    if (!ALLOWED_ROLES.includes(userRole as typeof ALLOWED_ROLES[number])) {
      return json({ error: "VALIDATION", message: "Invalid registration type." }, 400);
    }
    if (!ALLOWED_LOCATIONS.includes(location as typeof ALLOWED_LOCATIONS[number])) {
      return json({ error: "VALIDATION", message: "Invalid location." }, 400);
    }
    if (!ALLOWED_ACCOUNT_STATUS.includes(accountStatus as typeof ALLOWED_ACCOUNT_STATUS[number])) {
      return json({ error: "VALIDATION", message: "Invalid account status." }, 400);
    }
    if (!ALLOWED_STATES.has(state)) {
      return json({ error: "VALIDATION", message: "Invalid state." }, 400);
    }
    if (criminal && !ALLOWED_CRIMINAL.includes(criminal as typeof ALLOWED_CRIMINAL[number])) {
      return json({ error: "VALIDATION", message: "Invalid criminal record value." }, 400);
    }
    if (psv && !["have_psv", "no_psv"].includes(psv)) {
      return json({ error: "VALIDATION", message: "Invalid PSV value." }, 400);
    }
    if (licenseType.length > 80) {
      return json({ error: "VALIDATION", message: "Invalid license type." }, 400);
    }
    if (carModel && carModel.length > 120) {
      return json({ error: "VALIDATION", message: "Invalid car model." }, 400);
    }
    if (motorDetails && motorDetails.length > 200) {
      return json({ error: "VALIDATION", message: "Invalid motorcycle details." }, 400);
    }

    // car_year — accept number or short string
    let carYear: number | string | null = null;
    if (b.car_year !== null && b.car_year !== undefined && b.car_year !== "") {
      const n = Number(b.car_year);
      if (Number.isFinite(n) && n >= 1980 && n <= new Date().getFullYear() + 1) {
        carYear = n;
      } else if (isStr(b.car_year) && b.car_year.trim().length <= 10) {
        carYear = b.car_year.trim();
      } else {
        return json({ error: "VALIDATION", message: "Invalid car year." }, 400);
      }
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Per-phone rate limit: max 3 registrations per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: phoneRecent } = await admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", phone)
      .gte("created_at", oneHourAgo);
    if ((phoneRecent ?? 0) >= 3) {
      return json({ error: "RATE_LIMITED", message: "Too many submissions for this number." }, 429);
    }

    const payload: Record<string, unknown> = {
      full_name: fullName.toUpperCase(),
      ic_number: ic,
      email_address: email || null,
      phone_number: phone,
      user_role: userRole,
      location_choice: location,
      state,
      account_status: accountStatus,
      blue_ic_status: blueIc,
      license_type: licenseType || null,
      criminal_record_status: criminal || null,
      walk_in_flag: walkInFlag,
      priority_status: walkInFlag ? "walk_in_priority" : "normal",
    };

    if (userRole === "GrabCar") {
      payload.psv_license_status = psv || null;
      payload.has_car = hasCar;
      payload.car_model = hasCar ? carModel : null;
      payload.car_year = hasCar ? carYear : null;
      payload.vehicle_type = "Car";
      payload.vehicle_model = hasCar ? vehicleModel : null;
    } else {
      payload.has_motorcycle = hasMotorcycle;
      payload.motorcycle_details = motorDetails;
      payload.vehicle_type = "Motorcycle";
      payload.vehicle_model = vehicleModel;
    }

    const { error: insertErr } = await admin.from("customers").insert(payload);
    if (insertErr) {
      console.error("[register-customer] insert failed:", insertErr.message);
      return json({ error: "INSERT_FAILED", message: "Could not submit your registration. Please try again later." }, 500);
    }

    return json({ success: true }, 200);
  } catch (e) {
    console.error("[register-customer] unexpected:", (e as Error).message);
    return json({ error: "UNEXPECTED", message: "Something went wrong. Please try again." }, 500);
  }
});
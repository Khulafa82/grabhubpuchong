import { supabase } from "@/lib/supabase";

export const STAFF_SESSION_TOKEN_KEY = "staff_session_token";

export const getStaffSessionToken = (): string | null => {
  try {
    return localStorage.getItem(STAFF_SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStaffSessionToken = (token: string) => {
  try {
    localStorage.setItem(STAFF_SESSION_TOKEN_KEY, token);
  } catch {
    /* noop */
  }
};

export const clearStaffSessionToken = () => {
  try {
    localStorage.removeItem(STAFF_SESSION_TOKEN_KEY);
  } catch {
    /* noop */
  }
};

export const startStaffSession = async (): Promise<string> => {
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { data: authData } = await supabase.auth.getUser();
  console.log("startStaffSession: auth user id =", authData?.user?.id);
  console.log("startStaffSession: generated token =", token);

  const { data, error } = await supabase.rpc("start_staff_session", {
    p_session_token: token,
    p_device_info:
      typeof navigator !== "undefined" ? navigator.platform || "unknown" : "unknown",
    p_user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent || "unknown" : "unknown",
    p_ip_address: null,
  });

  console.log("start_staff_session response:", { data, error });

  if (error) {
    console.error("Failed to start staff session:", error);
    await supabase.auth.signOut();
    clearStaffSessionToken();
    throw new Error("Failed to initialize secure staff session.");
  }

  setStaffSessionToken(token);
  return token;
};

export const validateStaffSession = async (): Promise<boolean> => {
  const token = getStaffSessionToken();
  if (!token) return false;
  const { data, error } = await supabase.rpc("validate_staff_session", {
    p_session_token: token,
  });
  if (error) {
    console.error("validate_staff_session failed", error);
    return false;
  }
  return data === true;
};
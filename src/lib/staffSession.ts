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

export const startStaffSession = async (): Promise<string | null> => {
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { error } = await supabase.rpc("start_staff_session", {
    p_session_token: token,
    p_device_info: typeof navigator !== "undefined" ? navigator.platform : null,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    p_ip_address: null,
  });

  if (error) {
    console.error("start_staff_session failed", error);
    return null;
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
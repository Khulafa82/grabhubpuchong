import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rhrizimhevsqalohmgyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocml6aW1oZXZzcWFsb2htZ3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDQxMDUsImV4cCI6MjA5MjE4MDEwNX0.g1Goyguoc7E-5GDfJDbhd3LrOWxnznWhAy-0RBoxg4A";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});

export type StaffRole = "admin" | "boss" | "it_tech" | "super_admin";

export interface StaffProfile {
  id: string;
  role: StaffRole;
  status: string;
  full_name?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  avatar_color?: string | null;
}

export const ROLE_TO_PATH: Record<StaffRole, string> = {
  admin: "/admin",
  boss: "/boss",
  it_tech: "/it-tech",
  super_admin: "/super-admin",
};

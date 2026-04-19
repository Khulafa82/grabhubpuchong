import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface RecentCustomer {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  customer_status: string | null;
  user_role: string | null;
  updated_at: string | null;
}

export interface UrgentCustomer {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  priority_status: string | null;
  customer_status: string | null;
  next_follow_up_date: string | null;
}

export interface AdminWorkload {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  availability_status: string | null;
  customer_count: number;
}

export interface PendingLeave {
  id: string;
  staff_id: string | null;
  leave_type: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  leave_status: string | null;
  created_at: string | null;
  staff_name?: string | null;
}

export interface Breakdown {
  grabCar: number;
  grabFood: number;
  klangValley: number;
  outsideKlangValley: number;
  sabahSarawak: number;
}

export interface BossOverviewData {
  recent: RecentCustomer[];
  urgent: UrgentCustomer[];
  workload: AdminWorkload[];
  pendingLeaves: PendingLeave[];
  breakdown: Breakdown;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const KV_STATES = ["selangor", "kuala lumpur", "putrajaya"];
const SS_STATES = ["sabah", "sarawak", "labuan"];

export const useBossOverview = (): BossOverviewData => {
  const [data, setData] = useState<Omit<BossOverviewData, "loading" | "error" | "refetch">>({
    recent: [],
    urgent: [],
    workload: [],
    pendingLeaves: [],
    breakdown: { grabCar: 0, grabFood: 0, klangValley: 0, outsideKlangValley: 0, sabahSarawak: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const [recentRes, urgentRes, adminsRes, leavesRes, allCustomersRes] = await Promise.all([
          supabase
            .from("customers")
            .select("id, applicant_id, full_name, customer_status, user_role, updated_at")
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(8),
          supabase
            .from("customers")
            .select("id, applicant_id, full_name, phone_number, priority_status, customer_status, next_follow_up_date")
            .in("priority_status", ["urgent", "walk_in_priority", "overdue"])
            .limit(10),
          supabase
            .from("staff_profiles")
            .select("id, full_name, email, status, availability_status")
            .eq("role", "admin"),
          supabase
            .from("leave_applications")
            .select("id, staff_id, leave_type, start_date, end_date, reason, leave_status, created_at")
            .eq("leave_status", "submitted")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("customers")
            .select("admin_in_charge, user_role, location_choice, state"),
        ]);

        for (const r of [recentRes, urgentRes, adminsRes, leavesRes, allCustomersRes]) {
          if (r.error) throw r.error;
        }

        const customers = (allCustomersRes.data ?? []) as Array<{
          admin_in_charge: string | null;
          user_role: string | null;
          location_choice: string | null;
          state: string | null;
        }>;

        const workloadMap = new Map<string, number>();
        const breakdown: Breakdown = { grabCar: 0, grabFood: 0, klangValley: 0, outsideKlangValley: 0, sabahSarawak: 0 };
        for (const c of customers) {
          if (c.admin_in_charge) workloadMap.set(c.admin_in_charge, (workloadMap.get(c.admin_in_charge) ?? 0) + 1);
          const role = (c.user_role ?? "").toLowerCase();
          if (role.includes("car")) breakdown.grabCar++;
          else if (role.includes("food")) breakdown.grabFood++;
          const loc = (c.location_choice ?? "").toLowerCase();
          const st = (c.state ?? "").toLowerCase();
          if (loc.includes("klang") || KV_STATES.some((s) => st.includes(s))) breakdown.klangValley++;
          else if (loc.includes("sabah") || loc.includes("sarawak") || SS_STATES.some((s) => st.includes(s))) breakdown.sabahSarawak++;
          else if (st || loc) breakdown.outsideKlangValley++;
        }

        const admins = (adminsRes.data ?? []) as Array<{
          id: string;
          full_name: string | null;
          email: string | null;
          status: string | null;
          availability_status: string | null;
        }>;
        const workload: AdminWorkload[] = admins
          .map((a) => ({ ...a, customer_count: workloadMap.get(a.id) ?? 0 }))
          .sort((a, b) => b.customer_count - a.customer_count);

        const leaves = (leavesRes.data ?? []) as PendingLeave[];
        const staffIds = Array.from(new Set(leaves.map((l) => l.staff_id).filter(Boolean))) as string[];
        let staffNameMap = new Map<string, string>();
        if (staffIds.length) {
          const { data: staff } = await supabase
            .from("staff_profiles")
            .select("id, full_name")
            .in("id", staffIds);
          staffNameMap = new Map((staff ?? []).map((s) => [s.id as string, (s.full_name as string) ?? ""]));
        }
        const pendingLeaves = leaves.map((l) => ({
          ...l,
          staff_name: l.staff_id ? staffNameMap.get(l.staff_id) ?? null : null,
        }));

        if (!cancelled) {
          setData({
            recent: (recentRes.data ?? []) as RecentCustomer[],
            urgent: (urgentRes.data ?? []) as UrgentCustomer[],
            workload,
            pendingLeaves,
            breakdown,
          });
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Boss overview.");
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { ...data, loading, error, refetch: () => setTick((t) => t + 1) };
};

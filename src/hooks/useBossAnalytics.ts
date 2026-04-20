import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AdminPerfPoint {
  date: string;
  [adminName: string]: string | number;
}

export interface AdminAssignVsComplete {
  admin: string;
  assigned: number;
  completed: number;
}

export interface AdminWorkloadPoint {
  admin: string;
  customers: number;
}

export interface RatePoint {
  label: string;
  total: number;
  completed: number;
  rate: number; // 0..100
}

export interface BossAnalyticsData {
  perfSeries: AdminPerfPoint[];
  perfAdmins: string[];
  assignVsComplete: AdminAssignVsComplete[];
  workload: AdminWorkloadPoint[];
  overallRate: { total: number; completed: number; rate: number };
  locationRates: RatePoint[];
  serviceRates: RatePoint[];
  pendingVsCompleted: { pending: number; completed: number };
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const PENDING_STATUSES = new Set([
  "new", "contacted", "pending_documents", "waiting_customer_response", "psv_required", "under_review",
]);
const KV_STATES = ["selangor", "kuala lumpur", "putrajaya"];
const SS_STATES = ["sabah", "sarawak", "labuan"];

const locationBucket = (loc?: string | null, st?: string | null): "Klang Valley" | "Outside Klang Valley" | "Sabah & Sarawak" | null => {
  const l = (loc ?? "").toLowerCase();
  const s = (st ?? "").toLowerCase();
  if (l.includes("klang") || KV_STATES.some((x) => s.includes(x))) return "Klang Valley";
  if (l.includes("sabah") || l.includes("sarawak") || SS_STATES.some((x) => s.includes(x))) return "Sabah & Sarawak";
  if (l || s) return "Outside Klang Valley";
  return null;
};

const serviceBucket = (role?: string | null): "GrabCar" | "GrabFood" | null => {
  const r = (role ?? "").toLowerCase();
  if (r.includes("car")) return "GrabCar";
  if (r.includes("food")) return "GrabFood";
  return null;
};

const weekKey = (iso: string): string => {
  const d = new Date(iso);
  // Use Monday as start
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
};

export const useBossAnalytics = (): BossAnalyticsData => {
  const [state, setState] = useState<Omit<BossAnalyticsData, "loading" | "error" | "refetch">>({
    perfSeries: [],
    perfAdmins: [],
    assignVsComplete: [],
    workload: [],
    overallRate: { total: 0, completed: 0, rate: 0 },
    locationRates: [],
    serviceRates: [],
    pendingVsCompleted: { pending: 0, completed: 0 },
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
        const [adminsRes, custRes] = await Promise.all([
          supabase.from("staff_profiles").select("id, full_name").eq("role", "admin"),
          supabase
            .from("customers")
            .select("admin_in_charge, customer_status, created_at, location_choice, state, user_role"),
        ]);
        if (adminsRes.error) throw adminsRes.error;
        if (custRes.error) throw custRes.error;

        const admins = (adminsRes.data ?? []) as Array<{ id: string; full_name: string | null }>;
        const adminNameMap = new Map(admins.map((a) => [a.id, a.full_name ?? "Unknown"]));
        const customers = (custRes.data ?? []) as Array<{
          admin_in_charge: string | null;
          customer_status: string | null;
          created_at: string | null;
          location_choice: string | null;
          state: string | null;
          user_role: string | null;
        }>;

        // Workload + Assigned vs Completed
        const workloadMap = new Map<string, number>();
        const completedMap = new Map<string, number>();
        for (const c of customers) {
          if (c.admin_in_charge) {
            workloadMap.set(c.admin_in_charge, (workloadMap.get(c.admin_in_charge) ?? 0) + 1);
            if (c.customer_status === "completed") {
              completedMap.set(c.admin_in_charge, (completedMap.get(c.admin_in_charge) ?? 0) + 1);
            }
          }
        }
        const workload: AdminWorkloadPoint[] = admins
          .map((a) => ({ admin: a.full_name ?? "Unknown", customers: workloadMap.get(a.id) ?? 0 }))
          .sort((a, b) => b.customers - a.customers);
        const assignVsComplete: AdminAssignVsComplete[] = admins
          .map((a) => ({
            admin: a.full_name ?? "Unknown",
            assigned: workloadMap.get(a.id) ?? 0,
            completed: completedMap.get(a.id) ?? 0,
          }))
          .sort((a, b) => b.assigned - a.assigned);

        // Performance time series (weekly), top 5 admins by workload
        const topAdminIds = [...admins]
          .sort((a, b) => (workloadMap.get(b.id) ?? 0) - (workloadMap.get(a.id) ?? 0))
          .slice(0, 5)
          .map((a) => a.id);
        const topAdminNames = topAdminIds.map((id) => adminNameMap.get(id) ?? "Unknown");
        // week -> admin -> count
        const seriesMap = new Map<string, Map<string, number>>();
        for (const c of customers) {
          if (!c.created_at || !c.admin_in_charge) continue;
          if (!topAdminIds.includes(c.admin_in_charge)) continue;
          const wk = weekKey(c.created_at);
          if (!seriesMap.has(wk)) seriesMap.set(wk, new Map());
          const inner = seriesMap.get(wk)!;
          const name = adminNameMap.get(c.admin_in_charge) ?? "Unknown";
          inner.set(name, (inner.get(name) ?? 0) + 1);
        }
        const perfSeries: AdminPerfPoint[] = [...seriesMap.keys()]
          .sort()
          .map((wk) => {
            const row: AdminPerfPoint = { date: wk };
            const inner = seriesMap.get(wk)!;
            for (const name of topAdminNames) row[name] = inner.get(name) ?? 0;
            return row;
          });

        // Overall rate
        const total = customers.length;
        const completedTotal = customers.filter((c) => c.customer_status === "completed").length;
        const overallRate = {
          total,
          completed: completedTotal,
          rate: total ? Math.round((completedTotal / total) * 1000) / 10 : 0,
        };

        // Location rate
        const locAgg = new Map<string, { total: number; completed: number }>();
        for (const c of customers) {
          const b = locationBucket(c.location_choice, c.state);
          if (!b) continue;
          const cur = locAgg.get(b) ?? { total: 0, completed: 0 };
          cur.total++;
          if (c.customer_status === "completed") cur.completed++;
          locAgg.set(b, cur);
        }
        const locationRates: RatePoint[] = ["Klang Valley", "Outside Klang Valley", "Sabah & Sarawak"].map((label) => {
          const v = locAgg.get(label) ?? { total: 0, completed: 0 };
          return { label, total: v.total, completed: v.completed, rate: v.total ? Math.round((v.completed / v.total) * 1000) / 10 : 0 };
        });

        // Service rate
        const svcAgg = new Map<string, { total: number; completed: number }>();
        for (const c of customers) {
          const b = serviceBucket(c.user_role);
          if (!b) continue;
          const cur = svcAgg.get(b) ?? { total: 0, completed: 0 };
          cur.total++;
          if (c.customer_status === "completed") cur.completed++;
          svcAgg.set(b, cur);
        }
        const serviceRates: RatePoint[] = ["GrabCar", "GrabFood"].map((label) => {
          const v = svcAgg.get(label) ?? { total: 0, completed: 0 };
          return { label, total: v.total, completed: v.completed, rate: v.total ? Math.round((v.completed / v.total) * 1000) / 10 : 0 };
        });

        // Pending vs completed
        let pending = 0;
        for (const c of customers) if (c.customer_status && PENDING_STATUSES.has(c.customer_status)) pending++;

        if (!cancelled) {
          setState({
            perfSeries,
            perfAdmins: topAdminNames,
            assignVsComplete,
            workload,
            overallRate,
            locationRates,
            serviceRates,
            pendingVsCompleted: { pending, completed: completedTotal },
          });
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load analytics.");
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { ...state, loading, error, refetch: () => setTick((t) => t + 1) };
};

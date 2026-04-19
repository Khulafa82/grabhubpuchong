import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface StaffRow {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  availability_status: string | null;
  account_locked: boolean | null;
}

export interface CustomerAssignmentRow {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  ic_number: string | null;
  admin_in_charge: string | null;
  assignment_status: string | null;
}

export interface ActivityLogRow {
  id: string;
  action_type: string | null;
  target_table: string | null;
  performed_by: string | null;
  created_at: string | null;
  performed_by_name?: string | null;
}

export interface ITTechData {
  staff: StaffRow[];
  customers: CustomerAssignmentRow[];
  logs: ActivityLogRow[];
  duplicateCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useITTechData = (): ITTechData => {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [customers, setCustomers] = useState<CustomerAssignmentRow[]>([]);
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const [staffRes, customersRes, logsRes] = await Promise.all([
          supabase
            .from("staff_profiles")
            .select("id, full_name, username, email, role, status, availability_status, account_locked")
            .order("role", { ascending: true })
            .order("full_name", { ascending: true }),
          supabase
            .from("customers")
            .select("id, applicant_id, full_name, ic_number, admin_in_charge, assignment_status")
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(200),
          supabase
            .from("activity_logs")
            .select("id, action_type, target_table, performed_by, created_at")
            .order("created_at", { ascending: false })
            .limit(30),
        ]);

        if (staffRes.error) throw staffRes.error;
        if (customersRes.error) throw customersRes.error;
        // activity_logs may not exist or be empty — non-fatal
        const logRows = (logsRes.error ? [] : (logsRes.data ?? [])) as ActivityLogRow[];

        const staffRows = (staffRes.data ?? []) as StaffRow[];
        const custRows = (customersRes.data ?? []) as CustomerAssignmentRow[];

        // Duplicate detection by ic_number
        const icMap = new Map<string, number>();
        for (const c of custRows) {
          const ic = (c.ic_number ?? "").trim();
          if (!ic) continue;
          icMap.set(ic, (icMap.get(ic) ?? 0) + 1);
        }
        let dups = 0;
        for (const v of icMap.values()) if (v > 1) dups += v;

        // Map performer names
        const performerIds = Array.from(
          new Set(logRows.map((l) => l.performed_by).filter(Boolean)),
        ) as string[];
        const nameMap = new Map<string, string>();
        if (performerIds.length) {
          const matched = staffRows.filter((s) => performerIds.includes(s.id));
          for (const s of matched) nameMap.set(s.id, s.full_name ?? "");
          const missing = performerIds.filter((id) => !nameMap.has(id));
          if (missing.length) {
            const { data: extra } = await supabase
              .from("staff_profiles")
              .select("id, full_name")
              .in("id", missing);
            for (const s of (extra ?? []) as Array<{ id: string; full_name: string | null }>) {
              nameMap.set(s.id, s.full_name ?? "");
            }
          }
        }
        const enrichedLogs = logRows.map((l) => ({
          ...l,
          performed_by_name: l.performed_by ? nameMap.get(l.performed_by) ?? null : null,
        }));

        if (!cancelled) {
          setStaff(staffRows);
          setCustomers(custRows);
          setLogs(enrichedLogs);
          setDuplicateCount(dups);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load IT data.");
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { staff, customers, logs, duplicateCount, loading, error, refetch };
};

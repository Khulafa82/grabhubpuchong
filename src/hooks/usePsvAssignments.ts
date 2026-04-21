import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PsvAssignment } from "@/lib/psv";

export interface PsvAssignmentEnriched extends PsvAssignment {
  customer?: (PsvAssignment["customer"] & {
    user_role?: string | null;
    applicant_id?: string | null;
    customer_status?: string | null;
  }) | null;
  admin_name?: string | null;
}

export const usePsvAssignments = (classId?: string | null) => {
  const [data, setData] = useState<PsvAssignmentEnriched[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!classId) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("psv_class_customers")
      .select("id, class_id, customer_id, assigned_by, attendance_status, psv_workflow_status, updated_at")
      .eq("class_id", classId);
    if (err) {
      setError(err.message);
      setData([]);
      setLoading(false);
      return;
    }
    const list = (rows ?? []) as PsvAssignmentEnriched[];
    const ids = Array.from(new Set(list.map((r) => r.customer_id)));
    if (ids.length) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, full_name, phone_number, admin_in_charge, user_role, applicant_id, customer_status")
        .in("id", ids);
      const map = new Map<string, any>();
      (customers ?? []).forEach((c: any) => map.set(c.id, c));
      list.forEach((r) => {
        r.customer = map.get(r.customer_id) ?? null;
      });
      const adminIds = Array.from(
        new Set(list.map((r) => r.customer?.admin_in_charge).filter(Boolean) as string[]),
      );
      if (adminIds.length) {
        const { data: admins } = await supabase
          .from("staff_profiles")
          .select("id, full_name")
          .in("id", adminIds);
        const aMap = new Map<string, string | null>();
        (admins ?? []).forEach((a: any) => aMap.set(a.id, a.full_name ?? null));
        list.forEach((r) => {
          r.admin_name = r.customer?.admin_in_charge ? aMap.get(r.customer.admin_in_charge) ?? null : null;
        });
      }
    }
    setData(list);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
};

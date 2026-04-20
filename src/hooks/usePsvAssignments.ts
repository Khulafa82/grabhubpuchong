import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PsvAssignment } from "@/lib/psv";

export const usePsvAssignments = (classId?: string | null) => {
  const [data, setData] = useState<PsvAssignment[]>([]);
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
    const list = (rows ?? []) as PsvAssignment[];
    const ids = Array.from(new Set(list.map((r) => r.customer_id)));
    if (ids.length) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, full_name, phone_number, admin_in_charge")
        .in("id", ids);
      const map = new Map<string, PsvAssignment["customer"]>();
      (customers ?? []).forEach((c: any) => map.set(c.id, c));
      list.forEach((r) => {
        r.customer = map.get(r.customer_id) ?? null;
      });
    }
    setData(list);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
};

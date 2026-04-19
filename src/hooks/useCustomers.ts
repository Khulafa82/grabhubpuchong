import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Customer } from "@/lib/customers";

interface Options {
  adminId?: string | null;
  scope: "mine" | "all";
}

export const useCustomers = ({ adminId, scope }: Options) => {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from("customers")
      .select(
        "id, applicant_id, full_name, phone_number, user_role, location_choice, state, customer_status, priority_status, next_follow_up_date, remarks, admin_in_charge, assignment_status, last_contacted_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (scope === "mine") {
      if (!adminId) {
        setData([]);
        setLoading(false);
        return;
      }
      q = q.eq("admin_in_charge", adminId);
    }
    const { data: rows, error: err } = await q;
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      setData((rows ?? []) as Customer[]);
    }
    setLoading(false);
  }, [adminId, scope]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
};

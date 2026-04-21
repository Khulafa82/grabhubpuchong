import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Customer } from "@/lib/customers";

interface Options {
  adminId?: string | null;
  scope: "mine" | "all";
}

// Pull all columns so the full detail drawer can render every field that
// exists in the customers table without needing extra round-trips.
const SELECT_COLUMNS = "*";

export const useCustomers = ({ adminId, scope }: Options) => {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from("customers")
      .select(SELECT_COLUMNS)
      .order("updated_at", { ascending: false, nullsFirst: false });
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
      setLoading(false);
      return;
    }
    const customers = (rows ?? []) as Customer[];

    // Resolve assigned admin names in a second query (avoids relying on FK relation).
    const adminIds = Array.from(
      new Set(customers.map((c) => c.admin_in_charge).filter((v): v is string => !!v)),
    );
    if (adminIds.length) {
      const { data: staff } = await supabase
        .from("staff_profiles")
        .select("id, full_name")
        .in("id", adminIds);
      const nameMap = new Map<string, string>();
      (staff ?? []).forEach((s: { id: string; full_name: string | null }) => {
        if (s.full_name) nameMap.set(s.id, s.full_name);
      });
      customers.forEach((c) => {
        if (c.admin_in_charge) c.assigned_admin_name = nameMap.get(c.admin_in_charge) ?? null;
      });
    }

    setData(customers);
    setLoading(false);
  }, [adminId, scope]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
};

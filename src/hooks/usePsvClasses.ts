import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PsvClass } from "@/lib/psv";

export const usePsvClasses = () => {
  const [data, setData] = useState<PsvClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("psv_classes")
      .select("*")
      .order("class_date", { ascending: true, nullsFirst: false })
      .order("start_time", { ascending: true, nullsFirst: true });
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      setData((rows ?? []) as PsvClass[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
};

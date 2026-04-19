import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type StatQuery = {
  key: string;
  table: string;
  filters?: { column: string; value: unknown }[];
};

export type StatsResult = {
  counts: Record<string, number | null>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export const useDashboardStats = (queries: StatQuery[]): StatsResult => {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const results = await Promise.all(
          queries.map(async (q) => {
            let query = supabase.from(q.table).select("*", { count: "exact", head: true });
            for (const f of q.filters ?? []) {
              query = query.eq(f.column, f.value as never);
            }
            const { count, error } = await query;
            if (error) throw error;
            return [q.key, count ?? 0] as const;
          }),
        );
        if (!cancelled) {
          setCounts(Object.fromEntries(results));
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard stats.");
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return { counts, loading, error, refetch: () => setTick((t) => t + 1) };
};

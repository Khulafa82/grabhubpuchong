import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type StatFilter =
  | { column: string; op?: "eq"; value: unknown }
  | { column: string; op: "in"; value: unknown[] }
  | { column: string; op: "lte" | "gte" | "lt" | "gt"; value: unknown }
  | { column: string; op: "is"; value: null | boolean }
  | { column: string; op: "not"; not: "is"; value: null | boolean };

export type StatQuery = {
  key: string;
  table: string;
  filters?: StatFilter[];
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
              const op = (f as { op?: string }).op ?? "eq";
              if (op === "eq") query = query.eq(f.column, (f as { value: unknown }).value as never);
              else if (op === "in") query = query.in(f.column, (f as { value: unknown[] }).value as never);
              else if (op === "lte") query = query.lte(f.column, (f as { value: unknown }).value as never);
              else if (op === "gte") query = query.gte(f.column, (f as { value: unknown }).value as never);
              else if (op === "lt") query = query.lt(f.column, (f as { value: unknown }).value as never);
              else if (op === "gt") query = query.gt(f.column, (f as { value: unknown }).value as never);
              else if (op === "is") query = query.is(f.column, (f as { value: null | boolean }).value as never);
              else if (op === "not") query = query.not(f.column, (f as { not: string }).not, (f as { value: unknown }).value as never);
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

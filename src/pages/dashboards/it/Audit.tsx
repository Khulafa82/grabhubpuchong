import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Log {
  id: string;
  module: string | null;
  action: string | null;
  description: string | null;
  performed_by: string | null;
  performed_by_role: string | null;
  created_at: string | null;
  performed_by_name?: string | null;
}

const Audit = () => {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, module, action, description, performed_by, performed_by_role, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const logs = (data ?? []) as Log[];
      const ids = Array.from(new Set(logs.map((l) => l.performed_by).filter(Boolean))) as string[];
      let map: Record<string, string> = {};
      if (ids.length) {
        const { data: staff } = await supabase.from("staff_profiles").select("id, full_name").in("id", ids);
        map = Object.fromEntries((staff ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"]));
      }
      setRows(logs.map((l) => ({ ...l, performed_by_name: l.performed_by ? map[l.performed_by] ?? null : null })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">System Logs & Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Read-only feed of recent system activity.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading audit trail…</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No activity logs recorded.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((l) => (
              <li key={l.id} className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">{l.module ?? "system"}</Badge>
                    <span className="text-sm font-medium text-charcoal">{l.action ?? "action"}</span>
                  </div>
                  {l.description && <div className="text-sm text-muted-foreground">{l.description}</div>}
                  <div className="text-xs text-muted-foreground">
                    by {l.performed_by_name ?? l.performed_by ?? "system"}
                    {l.performed_by_role ? ` (${l.performed_by_role})` : ""}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default Audit;

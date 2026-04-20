import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Row {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  admin_in_charge: string | null;
  assignment_status: string | null;
  created_at: string | null;
  admin_name?: string | null;
}

const Assignments = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("id, applicant_id, full_name, admin_in_charge, assignment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const customers = (data ?? []) as Row[];
      const ids = Array.from(new Set(customers.map((c) => c.admin_in_charge).filter(Boolean))) as string[];
      let nameMap: Record<string, string> = {};
      if (ids.length) {
        const { data: staff } = await supabase.from("staff_profiles").select("id, full_name").in("id", ids);
        nameMap = Object.fromEntries((staff ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"]));
      }
      setRows(customers.map((c) => ({ ...c, admin_name: c.admin_in_charge ? nameMap[c.admin_in_charge] ?? "—" : null })));
      setLoading(false);
    })();
  }, []);

  const unassignedCount = rows.filter((r) => !r.admin_in_charge).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Customer Assignment Oversight</h1>
          <p className="text-sm text-muted-foreground">View who is handling which customer (read-only).</p>
        </div>
        {!loading && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            {unassignedCount} unassigned
          </Badge>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No customer assignments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Applicant ID</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Admin in Charge</th>
                  <th className="py-3 px-4 font-medium">Assignment Status</th>
                  <th className="py-3 px-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const unassigned = !r.admin_in_charge;
                  return (
                    <tr key={r.id} className={`border-b border-border/60 ${unassigned ? "bg-destructive/5" : "hover:bg-surface-muted/40"}`}>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{r.applicant_id ?? "—"}</td>
                      <td className="py-2.5 px-4 font-medium text-charcoal">{r.full_name ?? "—"}</td>
                      <td className="py-2.5 px-4">
                        {unassigned ? (
                          <span className="text-destructive font-medium">Unassigned</span>
                        ) : (
                          <span className="text-charcoal">{r.admin_name}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className={unassigned ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-brand/10 text-brand border-brand/20"}>
                          {r.assignment_status ?? (unassigned ? "unassigned" : "assigned")}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Assignments;

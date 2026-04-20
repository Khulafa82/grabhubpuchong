import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Admin {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  total: number;
  completed: number;
  pending: number;
}

const PENDING = ["new", "contacted", "pending_documents", "waiting_customer_response", "psv_required", "under_review", "in_progress", "documents_pending"];

const Performance = () => {
  const [rows, setRows] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [staffRes, custRes] = await Promise.all([
        supabase.from("staff_profiles").select("id, full_name, email, status").eq("role", "admin"),
        supabase.from("customers").select("admin_in_charge, customer_status").not("admin_in_charge", "is", null),
      ]);
      if (staffRes.error || custRes.error) {
        setError(staffRes.error?.message ?? custRes.error?.message ?? "Failed");
        setLoading(false);
        return;
      }
      const counts: Record<string, { total: number; completed: number; pending: number }> = {};
      (custRes.data ?? []).forEach((c: { admin_in_charge: string | null; customer_status: string | null }) => {
        const id = c.admin_in_charge!;
        if (!counts[id]) counts[id] = { total: 0, completed: 0, pending: 0 };
        counts[id].total += 1;
        if (c.customer_status === "completed") counts[id].completed += 1;
        else if (c.customer_status && PENDING.includes(c.customer_status)) counts[id].pending += 1;
      });
      const merged: Admin[] = (staffRes.data ?? []).map((s: { id: string; full_name: string | null; email: string | null; status: string | null }) => ({
        ...s,
        total: counts[s.id]?.total ?? 0,
        completed: counts[s.id]?.completed ?? 0,
        pending: counts[s.id]?.pending ?? 0,
      }));
      merged.sort((a, b) => b.total - a.total);
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Admin Performance Monitoring</h1>
        <p className="text-sm text-muted-foreground">Per-admin breakdown of assigned, completed and pending customers.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading performance…</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No admins found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Admin</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Assigned</th>
                  <th className="py-3 px-4 font-medium text-right">Completed</th>
                  <th className="py-3 px-4 font-medium text-right">Pending</th>
                  <th className="py-3 px-4 font-medium text-right">Success %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const rate = a.total ? Math.round((a.completed / a.total) * 100) : 0;
                  return (
                    <tr key={a.id} className="border-b border-border/60">
                      <td className="py-2.5 px-4 font-medium text-charcoal">{a.full_name ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{a.email ?? "—"}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className={a.status === "active" ? "bg-brand/10 text-brand border-brand/20" : "bg-muted text-muted-foreground border-border"}>{a.status ?? "—"}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-charcoal">{a.total}</td>
                      <td className="py-2.5 px-4 text-right text-brand font-medium">{a.completed}</td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground">{a.pending}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={`font-medium ${rate >= 60 ? "text-brand" : rate >= 30 ? "text-charcoal" : "text-muted-foreground"}`}>{rate}%</span>
                      </td>
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

export default Performance;

import { useEffect, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Leave {
  id: string;
  staff_id: string | null;
  leave_type: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  leave_status: string | null;
  created_at: string | null;
  staff_name?: string | null;
}

const statusClass = (s?: string | null) => {
  switch (s) {
    case "approved": return "bg-brand/10 text-brand border-brand/20";
    case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
    case "submitted": return "bg-charcoal/10 text-charcoal border-charcoal/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const LeaveApproval = () => {
  const [rows, setRows] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leave_applications")
      .select("id, staff_id, leave_type, start_date, end_date, reason, leave_status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const leaves = (data ?? []) as Leave[];
    const ids = Array.from(new Set(leaves.map((l) => l.staff_id).filter(Boolean))) as string[];
    let nameMap: Record<string, string> = {};
    if (ids.length) {
      const { data: staff } = await supabase.from("staff_profiles").select("id, full_name").in("id", ids);
      nameMap = Object.fromEntries((staff ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"]));
    }
    setRows(leaves.map((l) => ({ ...l, staff_name: l.staff_id ? nameMap[l.staff_id] ?? "—" : "—" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setActingId(id);
    const { error } = await supabase.from("leave_applications").update({ leave_status: decision }).eq("id", id);
    if (error) {
      toast.error(`Failed to ${decision === "approved" ? "approve" : "reject"}: ${error.message}`);
    } else {
      toast.success(`Leave ${decision}`);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, leave_status: decision } : r)));
    }
    setActingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Leave Approval Management</h1>
        <p className="text-sm text-muted-foreground">Review and decide on staff leave requests.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading leave requests…</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No leave applications.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Staff</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">From</th>
                  <th className="py-3 px-4 font-medium">To</th>
                  <th className="py-3 px-4 font-medium">Reason</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const pending = l.leave_status === "submitted" || l.leave_status === "pending";
                  const busy = actingId === l.id;
                  return (
                    <tr key={l.id} className="border-b border-border/60">
                      <td className="py-2.5 px-4 font-medium text-charcoal">{l.staff_name}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{l.leave_type ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{l.start_date ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{l.end_date ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-[260px] truncate" title={l.reason ?? ""}>{l.reason ?? "—"}</td>
                      <td className="py-2.5 px-4"><Badge variant="outline" className={statusClass(l.leave_status)}>{l.leave_status ?? "—"}</Badge></td>
                      <td className="py-2.5 px-4 text-right">
                        {pending ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" disabled={busy} onClick={() => decide(l.id, "approved")} className="gradient-brand">
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(l.id, "rejected")}>
                              <X className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Decided</span>
                        )}
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

export default LeaveApproval;

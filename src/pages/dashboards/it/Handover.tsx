import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
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
  leave_status: string | null;
  handover_required: boolean | null;
  handover_completed: boolean | null;
  staff_name?: string | null;
}

const Handover = () => {
  const [rows, setRows] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leave_applications")
      .select("id, staff_id, leave_type, start_date, end_date, leave_status, handover_required, handover_completed")
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const leaves = (data ?? []) as Leave[];
    const ids = Array.from(new Set(leaves.map((l) => l.staff_id).filter(Boolean))) as string[];
    let map: Record<string, string> = {};
    if (ids.length) {
      const { data: staff } = await supabase.from("staff_profiles").select("id, full_name").in("id", ids);
      map = Object.fromEntries((staff ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"]));
    }
    setRows(leaves.map((l) => ({ ...l, staff_name: l.staff_id ? map[l.staff_id] ?? "—" : "—" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markDone = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("leave_applications").update({ handover_completed: true }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Handover marked complete");
      setRows((p) => p.map((r) => (r.id === id ? { ...r, handover_completed: true } : r)));
    }
    setBusy(null);
  };

  const pending = rows.filter((r) => r.leave_status === "approved" && !r.handover_completed);
  const others = rows.filter((r) => !(r.leave_status === "approved" && !r.handover_completed));

  const renderTable = (list: Leave[], showAction: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
            <th className="py-3 px-4 font-medium">Staff</th>
            <th className="py-3 px-4 font-medium">Type</th>
            <th className="py-3 px-4 font-medium">From</th>
            <th className="py-3 px-4 font-medium">To</th>
            <th className="py-3 px-4 font-medium">Leave</th>
            <th className="py-3 px-4 font-medium">Handover</th>
            {showAction && <th className="py-3 px-4 font-medium text-right">Action</th>}
          </tr>
        </thead>
        <tbody>
          {list.map((l) => (
            <tr key={l.id} className="border-b border-border/60">
              <td className="py-2.5 px-4 font-medium text-charcoal">{l.staff_name}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.leave_type ?? "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.start_date ?? "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.end_date ?? "—"}</td>
              <td className="py-2.5 px-4"><Badge variant="outline" className={l.leave_status === "approved" ? "bg-brand/10 text-brand border-brand/20" : "bg-muted text-muted-foreground border-border"}>{l.leave_status ?? "—"}</Badge></td>
              <td className="py-2.5 px-4">
                {l.handover_completed ? (
                  <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">completed</Badge>
                ) : l.handover_required ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">required</Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">not required</Badge>
                )}
              </td>
              {showAction && (
                <td className="py-2.5 px-4 text-right">
                  <Button size="sm" disabled={busy === l.id} onClick={() => markDone(l.id)} className="gradient-brand">
                    {busy === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Mark done
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Leave Handover Execution</h1>
        <p className="text-sm text-muted-foreground">Track and complete handovers for approved staff leave.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-charcoal">Pending handovers</h3>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{pending.length}</Badge>
        </div>
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No pending handovers.</div>
        ) : renderTable(pending, true)}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-charcoal">All other leave records</h3>
        </div>
        {loading ? null : others.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No other leave records.</div>
        ) : renderTable(others, false)}
      </Card>
    </div>
  );
};

export default Handover;

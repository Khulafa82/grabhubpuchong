import { useEffect, useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HandoverWizard, { LeaveRow } from "./HandoverWizard";

const Handover = () => {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLeave, setActiveLeave] = useState<LeaveRow | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("leave_applications")
      .select("id, staff_id, leave_type, start_date, end_date, leave_status, reason, handover_note, handover_required, handover_completed")
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const leaves = (data ?? []) as LeaveRow[];
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

  const pending = rows.filter((r) => r.leave_status === "approved" && r.handover_required && !r.handover_completed);
  const others = rows.filter((r) => !(r.leave_status === "approved" && r.handover_required && !r.handover_completed));

  const renderPendingTable = (list: LeaveRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
            <th className="py-3 px-4 font-medium">Staff</th>
            <th className="py-3 px-4 font-medium">Type</th>
            <th className="py-3 px-4 font-medium">From</th>
            <th className="py-3 px-4 font-medium">To</th>
            <th className="py-3 px-4 font-medium">Reason</th>
            <th className="py-3 px-4 font-medium">Handover note</th>
            <th className="py-3 px-4 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {list.map((l) => (
            <tr key={l.id} className="border-b border-border/60">
              <td className="py-2.5 px-4 font-medium text-charcoal">{l.staff_name}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.leave_type ?? "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.start_date ?? "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.end_date ?? "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground max-w-[180px] truncate" title={l.reason ?? ""}>{l.reason ?? "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground max-w-[180px] truncate" title={l.handover_note ?? ""}>{l.handover_note ?? "—"}</td>
              <td className="py-2.5 px-4 text-right">
                <Button size="sm" onClick={() => setActiveLeave(l)} className="gradient-brand">
                  <PlayCircle className="w-3.5 h-3.5" /> Start handover
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOthersTable = (list: LeaveRow[]) => (
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
          </tr>
        </thead>
        <tbody>
          {list.map((l) => (
            <tr key={l.id} className="border-b border-border/60">
              <td className="py-2.5 px-4 font-medium text-charcoal">{l.staff_name}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.leave_type ?? "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.start_date ?? "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.end_date ?? "—"}</td>
              <td className="py-2.5 px-4">
                <Badge variant="outline" className={l.leave_status === "approved" ? "bg-brand/10 text-brand border-brand/20" : "bg-muted text-muted-foreground border-border"}>
                  {l.leave_status ?? "—"}
                </Badge>
              </td>
              <td className="py-2.5 px-4">
                {l.handover_completed ? (
                  <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">completed</Badge>
                ) : l.handover_required ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">required</Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">not required</Badge>
                )}
              </td>
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
        <p className="text-sm text-muted-foreground">Guided wizard for reassigning customers when an admin goes on approved leave.</p>
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
        ) : renderPendingTable(pending)}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-charcoal">All other leave records</h3>
        </div>
        {loading ? null : others.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No other leave records.</div>
        ) : renderOthersTable(others)}
      </Card>

      {activeLeave && (
        <HandoverWizard
          leave={activeLeave}
          open={!!activeLeave}
          onClose={() => setActiveLeave(null)}
          onCompleted={load}
        />
      )}
    </div>
  );
};

export default Handover;

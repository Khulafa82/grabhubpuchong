import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PlayCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HandoverWizard, { LeaveRow } from "./HandoverWizard";

interface EnrichedLeave extends LeaveRow {
  replacement_admin_name?: string | null;
  handover_completed_at?: string | null;
}

const Handover = () => {
  const [rows, setRows] = useState<EnrichedLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLeave, setActiveLeave] = useState<LeaveRow | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

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

    // Fetch staff names for absent admins
    let nameMap: Record<string, string> = {};
    if (ids.length) {
      const { data: staff } = await supabase.from("staff_profiles").select("id, full_name").in("id", ids);
      nameMap = Object.fromEntries((staff ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"]));
    }

    // Derive replacement admin + completion timestamp from customer_assignment_logs
    // for completed handovers (best-effort; table may be empty for older records)
    const completedStaffIds = leaves
      .filter((l) => l.handover_completed && l.staff_id)
      .map((l) => l.staff_id!) as string[];
    const repByPrev: Record<string, { new_admin_id: string; created_at: string | null }> = {};
    if (completedStaffIds.length) {
      const { data: logRows } = await supabase
        .from("customer_assignment_logs")
        .select("previous_admin_id, new_admin_id, created_at")
        .in("previous_admin_id", completedStaffIds)
        .order("created_at", { ascending: false })
        .limit(500);
      for (const r of (logRows ?? []) as Array<{ previous_admin_id: string | null; new_admin_id: string | null; created_at: string | null }>) {
        if (!r.previous_admin_id || !r.new_admin_id) continue;
        if (!repByPrev[r.previous_admin_id]) {
          repByPrev[r.previous_admin_id] = { new_admin_id: r.new_admin_id, created_at: r.created_at };
        }
      }
    }
    // Fetch replacement admin names
    const repIds = Array.from(new Set(Object.values(repByPrev).map((v) => v.new_admin_id)));
    let repNameMap: Record<string, string> = {};
    const missing = repIds.filter((id) => !nameMap[id]);
    if (missing.length) {
      const { data: extra } = await supabase.from("staff_profiles").select("id, full_name").in("id", missing);
      repNameMap = Object.fromEntries((extra ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"]));
    }
    const resolveName = (id: string) => nameMap[id] ?? repNameMap[id] ?? "—";

    setRows(
      leaves.map((l) => {
        const rep = l.staff_id ? repByPrev[l.staff_id] : undefined;
        return {
          ...l,
          staff_name: l.staff_id ? nameMap[l.staff_id] ?? "—" : "—",
          replacement_admin_name: rep ? resolveName(rep.new_admin_id) : null,
          handover_completed_at: rep?.created_at ?? null,
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pending = rows.filter((r) => r.leave_status === "approved" && r.handover_required && !r.handover_completed);
  const others = rows.filter((r) => !(r.leave_status === "approved" && r.handover_required && !r.handover_completed));

  const handleCompleted = () => {
    setSuccessBanner("Handover completed successfully.");
    load();
    window.setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handoverBadge = (l: EnrichedLeave) => {
    if (l.leave_status === "rejected") {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
    }
    if (l.handover_completed) {
      return <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">Completed</Badge>;
    }
    if (l.handover_required) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Required</Badge>;
    }
    return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Not Required</Badge>;
  };

  const formatTs = (ts: string | null | undefined) => {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const renderPendingTable = (list: EnrichedLeave[]) => (
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

  const renderOthersTable = (list: EnrichedLeave[]) => (
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
            <th className="py-3 px-4 font-medium">Replacement</th>
            <th className="py-3 px-4 font-medium">Completed at</th>
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
                <Badge variant="outline" className={l.leave_status === "approved" ? "bg-brand/10 text-brand border-brand/20" : l.leave_status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground border-border"}>
                  {l.leave_status ?? "—"}
                </Badge>
              </td>
              <td className="py-2.5 px-4">{handoverBadge(l)}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.handover_completed ? (l.replacement_admin_name ?? "—") : "—"}</td>
              <td className="py-2.5 px-4 text-muted-foreground">{l.handover_completed ? formatTs(l.handover_completed_at) : "—"}</td>
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

      {successBanner && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-brand/70 hover:text-brand">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-charcoal">All other leave records</h3>
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">{others.length}</Badge>
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
          onCompleted={handleCompleted}
        />
      )}
    </div>
  );
};

export default Handover;

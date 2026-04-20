import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PlayCircle, X, Check, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import HandoverWizard, { LeaveRow } from "./HandoverWizard";

interface EnrichedLeave extends LeaveRow {
  replacement_admin_name?: string | null;
  handover_completed_at?: string | null;
}

const Handover = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<EnrichedLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLeave, setActiveLeave] = useState<LeaveRow | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "done" | "delete"; leave: EnrichedLeave } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

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

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, leave } = confirmAction;
    if (!leave?.id) {
      toast.error("Missing leave id — cannot perform action.");
      return;
    }
    setActionBusy(true);
    try {
      if (type === "done") {
        console.log("[Handover] Mark done → leave id:", leave.id);
        const { data: updRows, error: updErr } = await supabase
          .from("leave_applications")
          .update({ handover_completed: true })
          .eq("id", leave.id)
          .select("id, handover_completed");
        console.log("[Handover] update response:", { updRows, updErr });
        if (updErr) throw updErr;
        if (!updRows || updRows.length === 0) {
          throw new Error(
            "Update did not affect any row. A Row-Level Security policy is likely blocking updates on leave_applications for the IT Tech role."
          );
        }
        // Verify the change actually persisted
        const { data: verify, error: verifyErr } = await supabase
          .from("leave_applications")
          .select("id, handover_completed")
          .eq("id", leave.id)
          .maybeSingle();
        console.log("[Handover] verify after update:", { verify, verifyErr });
        if (verifyErr) throw verifyErr;
        if (!verify || verify.handover_completed !== true) {
          throw new Error("Update did not persist. Check RLS policies on leave_applications.");
        }
        if (user) {
          await supabase.from("activity_logs").insert({
            module: "leave_handover",
            action: "MARK_HANDOVER_DONE",
            description: `Marked handover done (no reassignment) for ${leave.staff_name ?? leave.staff_id} · leave ${leave.start_date} → ${leave.end_date}`,
            performed_by: user.id,
            performed_by_role: "it_tech",
          }).then(({ error: e }) => { if (e) console.warn("activity_logs insert failed:", e.message); });
        }
        toast.success("Handover marked as done.");
        setSuccessBanner("Handover marked as done.");
        window.setTimeout(() => setSuccessBanner(null), 6000);
      } else {
        console.log("[Handover] Delete → leave id:", leave.id);
        const { data: delRows, error: delErr } = await supabase
          .from("leave_applications")
          .delete()
          .eq("id", leave.id)
          .select("id");
        console.log("[Handover] delete response:", { delRows, delErr });
        if (delErr) throw delErr;
        if (!delRows || delRows.length === 0) {
          throw new Error(
            "Delete did not remove any row. RLS may be blocking deletes on leave_applications."
          );
        }
        if (user) {
          await supabase.from("activity_logs").insert({
            module: "leave_handover",
            action: "DELETE_LEAVE_REQUEST",
            description: `Deleted leave request for ${leave.staff_name ?? leave.staff_id} · ${leave.start_date} → ${leave.end_date}`,
            performed_by: user.id,
            performed_by_role: "it_tech",
          }).then(({ error: e }) => { if (e) console.warn("activity_logs insert failed:", e.message); });
        }
        toast.success("Leave request deleted.");
      }
      setConfirmAction(null);
      await load();
    } catch (e) {
      console.error("[Handover] action failed:", e);
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionBusy(false);
    }
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
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                  <Button type="button" size="sm" onClick={(e) => { e.stopPropagation(); setActiveLeave(l); }} className="gradient-brand">
                    <PlayCircle className="w-3.5 h-3.5" /> Start handover
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "done", leave: l }); }}>
                    <Check className="w-3.5 h-3.5" /> Mark done
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "delete", leave: l }); }} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
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

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => !v && !actionBusy && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete" ? "Delete leave request?" : "Mark handover as done?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "delete" ? (
                <>This will permanently delete the leave request for <span className="font-medium text-charcoal">{confirmAction.leave.staff_name}</span> ({confirmAction.leave.start_date} → {confirmAction.leave.end_date}). This action cannot be undone.</>
              ) : (
                <>This marks the handover as completed for <span className="font-medium text-charcoal">{confirmAction?.leave.staff_name}</span> without running the guided wizard. No customers will be reassigned. The record will move to "All other leave records".</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); runConfirmedAction(); }}
              disabled={actionBusy}
              className={confirmAction?.type === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmAction?.type === "delete" ? "Delete" : "Mark done"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Handover;

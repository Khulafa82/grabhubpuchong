import { useEffect, useState } from "react";
import { Loader2, Check, X, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Leave {
  id: string;
  staff_id: string | null;
  leave_type: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  leave_status: string | null;
  handover_required: boolean | null;
  handover_completed: boolean | null;
  created_at: string | null;
  staff_name?: string | null;
  staff_role?: string | null;
}

const statusClass = (s?: string | null) => {
  switch (s) {
    case "approved": return "bg-brand/10 text-brand border-brand/20";
    case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
    case "pending":
    case "submitted": return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const daysBetween = (a?: string | null, b?: string | null) => {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 86400000) + 1;
};

const LeaveManagement = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Leave | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leave_applications")
      .select("id, staff_id, leave_type, start_date, end_date, reason, leave_status, handover_required, handover_completed, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const leaves = (data ?? []) as Leave[];
    const ids = Array.from(new Set(leaves.map((l) => l.staff_id).filter(Boolean))) as string[];
    let nameMap: Record<string, { name: string; role: string }> = {};
    if (ids.length) {
      const { data: staff } = await supabase.from("staff_profiles").select("id, full_name, role").in("id", ids);
      nameMap = Object.fromEntries((staff ?? []).map((s: { id: string; full_name: string | null; role: string | null }) => [s.id, { name: s.full_name ?? "—", role: s.role ?? "—" }]));
    }
    setRows(leaves.map((l) => ({
      ...l,
      staff_name: l.staff_id ? nameMap[l.staff_id]?.name ?? "—" : "—",
      staff_role: l.staff_id ? nameMap[l.staff_id]?.role ?? "—" : "—",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logActivity = async (action: string, description: string) => {
    if (!user) return;
    await supabase.from("activity_logs").insert({
      module: "leave_management",
      action,
      description,
      performed_by: user.id,
      performed_by_role: "super_admin",
    }).then(({ error }) => { if (error) console.warn("activity_logs insert failed:", error.message); });
  };

  const setStatus = async (l: Leave, status: "approved" | "rejected") => {
    setBusy(l.id);
    const { error } = await supabase.from("leave_applications").update({ leave_status: status }).eq("id", l.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Leave ${status} (override)`);
      logActivity("OVERRIDE_LEAVE_STATUS", `Super Admin set leave ${l.id} → ${status} for ${l.staff_name}`);
      setRows((prev) => prev.map((r) => r.id === l.id ? { ...r, leave_status: status } : r));
    }
    setBusy(null);
  };

  const forceCompleteHandover = async (l: Leave) => {
    setBusy(l.id);
    const { error } = await supabase.from("leave_applications").update({ handover_completed: true }).eq("id", l.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Handover force-marked complete");
      logActivity("FORCE_COMPLETE_HANDOVER", `Super Admin force-completed handover for leave ${l.id} (${l.staff_name})`);
      setRows((prev) => prev.map((r) => r.id === l.id ? { ...r, handover_completed: true } : r));
    }
    setBusy(null);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const l = confirmDelete;
    setBusy(l.id);
    const { error } = await supabase.from("leave_applications").delete().eq("id", l.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Leave record deleted");
      logActivity("DELETE_LEAVE", `Super Admin deleted leave ${l.id} for ${l.staff_name}`);
      setRows((prev) => prev.filter((r) => r.id !== l.id));
    }
    setBusy(null);
    setConfirmDelete(null);
  };

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && (r.leave_status ?? "") !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(r.staff_name ?? "").toLowerCase().includes(s) && !(r.leave_type ?? "").toLowerCase().includes(s) && !(r.reason ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.leave_status === "pending" || r.leave_status === "submitted").length,
    approved: rows.filter((r) => r.leave_status === "approved").length,
    handoverPending: rows.filter((r) => r.leave_status === "approved" && r.handover_required && !r.handover_completed).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Leave Management</h1>
          <p className="text-sm text-muted-foreground">Full visibility and override controls for all leave records.</p>
        </div>
        <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20"><ShieldCheck className="w-3 h-3 mr-1" /> Super Admin</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div><div className="text-2xl font-bold text-charcoal mt-1">{counts.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground uppercase tracking-wider">Pending</div><div className="text-2xl font-bold text-charcoal mt-1">{counts.pending}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground uppercase tracking-wider">Approved</div><div className="text-2xl font-bold text-charcoal mt-1">{counts.approved}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground uppercase tracking-wider">Handover pending</div><div className="text-2xl font-bold text-charcoal mt-1">{counts.handoverPending}</div></Card>
      </div>

      <Card className="p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-muted-foreground">Search</label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Staff, type, reason…" />
        </div>
        <div className="w-44">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No leave records.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Staff</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Period</th>
                  <th className="py-3 px-4 font-medium">Days</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Handover</th>
                  <th className="py-3 px-4 font-medium text-right">Override actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const isBusy = busy === l.id;
                  return (
                    <tr key={l.id} className="border-b border-border/60">
                      <td className="py-2.5 px-4 font-medium text-charcoal">{l.staff_name}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{l.staff_role}</td>
                      <td className="py-2.5 px-4 text-muted-foreground capitalize">{l.leave_type ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{l.start_date ?? "—"} → {l.end_date ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{daysBetween(l.start_date, l.end_date)}</td>
                      <td className="py-2.5 px-4"><Badge variant="outline" className={statusClass(l.leave_status)}>{l.leave_status ?? "—"}</Badge></td>
                      <td className="py-2.5 px-4">
                        {!l.handover_required ? <span className="text-xs text-muted-foreground">Not required</span>
                          : l.handover_completed ? <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">Completed</Badge>
                          : <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Pending</Badge>}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <Button size="sm" variant="outline" disabled={isBusy || l.leave_status === "approved"} onClick={() => setStatus(l, "approved")}>
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" disabled={isBusy || l.leave_status === "rejected"} onClick={() => setStatus(l, "rejected")}>
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                          {l.handover_required && !l.handover_completed && (
                            <Button size="sm" variant="outline" disabled={isBusy} onClick={() => forceCompleteHandover(l)}>
                              Force handover done
                            </Button>
                          )}
                          <Button size="sm" variant="outline" disabled={isBusy} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(l)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete leave record?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete the leave request for <span className="font-medium text-charcoal">{confirmDelete?.staff_name}</span> ({confirmDelete?.start_date} → {confirmDelete?.end_date}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveManagement;

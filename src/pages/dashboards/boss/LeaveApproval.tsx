import { useEffect, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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

const LeaveApproval = () => {
  const [rows, setRows] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<Leave | null>(null);
  const [handoverChoice, setHandoverChoice] = useState<"required" | "not_required">("required");
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leave_applications")
      .select("id, staff_id, leave_type, start_date, end_date, reason, leave_status, handover_required, handover_completed, created_at")
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

  const openApprove = (l: Leave) => {
    setApproveTarget(l);
    setHandoverChoice(l.handover_required === false ? "not_required" : "required");
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setConfirming(true);
    const required = handoverChoice === "required";
    const { error } = await supabase
      .from("leave_applications")
      .update({
        leave_status: "approved",
        handover_required: required,
        handover_completed: required ? false : true,
      })
      .eq("id", approveTarget.id);
    setConfirming(false);
    if (error) {
      toast.error(`Failed to approve: ${error.message}`);
      return;
    }
    toast.success(`Leave approved${required ? " (handover required)" : " (no handover needed)"}`);
    setRows((prev) => prev.map((r) => (r.id === approveTarget.id ? {
      ...r,
      leave_status: "approved",
      handover_required: required,
      handover_completed: required ? false : true,
    } : r)));
    setApproveTarget(null);
  };

  const reject = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.from("leave_applications").update({ leave_status: "rejected" }).eq("id", id);
    if (error) toast.error(`Failed to reject: ${error.message}`);
    else {
      toast.success("Leave rejected");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, leave_status: "rejected" } : r)));
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
                  <th className="py-3 px-4 font-medium">Days</th>
                  <th className="py-3 px-4 font-medium">Reason</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Handover</th>
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
                      <td className="py-2.5 px-4 text-muted-foreground">{daysBetween(l.start_date, l.end_date)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-[220px] truncate" title={l.reason ?? ""}>{l.reason ?? "—"}</td>
                      <td className="py-2.5 px-4"><Badge variant="outline" className={statusClass(l.leave_status)}>{l.leave_status ?? "—"}</Badge></td>
                      <td className="py-2.5 px-4">
                        {l.handover_completed ? (
                          <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">Completed</Badge>
                        ) : l.handover_required === false ? (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Not required</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Required</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {pending ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" disabled={busy} onClick={() => openApprove(l)} className="gradient-brand">
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => reject(l.id)}>
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Reject
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

      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>Confirm leave details and decide on handover.</DialogDescription>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-surface-muted p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span className="font-medium text-charcoal">{approveTarget.staff_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium text-charcoal">{approveTarget.leave_type ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date range</span><span className="font-medium text-charcoal">{approveTarget.start_date} → {approveTarget.end_date}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium text-charcoal">{daysBetween(approveTarget.start_date, approveTarget.end_date)} day(s)</span></div>
                <div className="pt-1.5">
                  <div className="text-muted-foreground mb-1">Reason</div>
                  <div className="text-charcoal whitespace-pre-wrap">{approveTarget.reason ?? "—"}</div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Handover decision</Label>
                <RadioGroup value={handoverChoice} onValueChange={(v) => setHandoverChoice(v as "required" | "not_required")}>
                  <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer" onClick={() => setHandoverChoice("required")}>
                    <RadioGroupItem value="required" id="ho-required" className="mt-0.5" />
                    <div>
                      <Label htmlFor="ho-required" className="cursor-pointer">Handover Required</Label>
                      <p className="text-xs text-muted-foreground">IT Tech will reassign customers during the leave period.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer" onClick={() => setHandoverChoice("not_required")}>
                    <RadioGroupItem value="not_required" id="ho-not" className="mt-0.5" />
                    <div>
                      <Label htmlFor="ho-not" className="cursor-pointer">Handover Not Required</Label>
                      <p className="text-xs text-muted-foreground">No customer reassignment needed for this leave.</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={confirming}>Cancel</Button>
            <Button onClick={confirmApprove} disabled={confirming} className="gradient-brand">
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveApproval;

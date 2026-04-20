import { useEffect, useMemo, useState } from "react";
import { Loader2, ArrowLeft, ArrowRight, Check, AlertTriangle, Users, UserCheck, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface LeaveRow {
  id: string;
  staff_id: string | null;
  leave_type: string | null;
  start_date: string | null;
  end_date: string | null;
  leave_status: string | null;
  reason: string | null;
  handover_note: string | null;
  handover_required: boolean | null;
  handover_completed: boolean | null;
  staff_name?: string | null;
}

interface AbsentAdmin {
  id: string;
  full_name: string | null;
  username: string | null;
  status: string | null;
  availability_status: string | null;
}

interface CustomerRow {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  customer_status: string | null;
  priority_status: string | null;
  next_follow_up_date: string | null;
  assignment_status: string | null;
}

interface ReplacementAdmin {
  id: string;
  full_name: string | null;
  username: string | null;
  customer_count: number;
}

type Scope = "all" | "active" | "pending" | "today" | "selected";
type HandoverType = "temporary" | "permanent";

const SCOPE_LABELS: Record<Scope, string> = {
  all: "All customers",
  active: "Active customers only",
  pending: "Pending customers only",
  today: "Today contact list only",
  selected: "Selected customers only",
};

const PENDING_STATUSES = ["new", "contacted", "pending_documents", "waiting_customer_response", "psv_required", "under_review"];
const INACTIVE_STATUSES = ["completed", "rejected", "inactive", "cancelled", "closed"];

const todayStr = () => new Date().toISOString().slice(0, 10);

const scopeFilter = (c: CustomerRow, scope: Scope, selectedIds: Set<string>) => {
  if (scope === "all") return true;
  if (scope === "selected") return selectedIds.has(c.id);
  if (scope === "active") return !INACTIVE_STATUSES.includes((c.customer_status ?? "").toLowerCase());
  if (scope === "pending") return PENDING_STATUSES.includes((c.customer_status ?? "").toLowerCase());
  if (scope === "today") {
    if (!c.next_follow_up_date) return false;
    return c.next_follow_up_date <= todayStr();
  }
  return false;
};

interface Props {
  leave: LeaveRow;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

const HandoverWizard = ({ leave, open, onClose, onCompleted }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [absent, setAbsent] = useState<AbsentAdmin | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [replacements, setReplacements] = useState<ReplacementAdmin[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<Scope>("all");
  const [replacementId, setReplacementId] = useState<string>("");
  const [handoverType, setHandoverType] = useState<HandoverType>("temporary");
  const [restoreAfterLeave, setRestoreAfterLeave] = useState(true);
  const [startDate, setStartDate] = useState(leave.start_date ?? todayStr());
  const [endDate, setEndDate] = useState(leave.end_date ?? todayStr());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedCustomers(new Set());
    setScope("all");
    setReplacementId("");
    setHandoverType("temporary");
    setRestoreAfterLeave(true);
    setStartDate(leave.start_date ?? todayStr());
    setEndDate(leave.end_date ?? todayStr());
    setError(null);
  }, [open, leave]);

  // Load data once
  useEffect(() => {
    if (!open || !leave.staff_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [absentRes, custRes, repRes] = await Promise.all([
          supabase
            .from("staff_profiles")
            .select("id, full_name, username, status, availability_status")
            .eq("id", leave.staff_id!)
            .maybeSingle(),
          supabase
            .from("customers")
            .select("id, applicant_id, full_name, phone_number, customer_status, priority_status, next_follow_up_date, assignment_status")
            .eq("admin_in_charge", leave.staff_id!)
            .order("next_follow_up_date", { ascending: true, nullsFirst: false }),
          supabase
            .from("staff_profiles")
            .select("id, full_name, username, status, availability_status, account_locked, role")
            .eq("role", "admin")
            .eq("status", "active")
            .eq("availability_status", "available")
            .neq("id", leave.staff_id!),
        ]);
        if (cancelled) return;
        if (absentRes.error) throw absentRes.error;
        if (custRes.error) throw custRes.error;
        if (repRes.error) throw repRes.error;
        setAbsent(absentRes.data as AbsentAdmin);
        setCustomers((custRes.data ?? []) as CustomerRow[]);

        const reps = ((repRes.data ?? []) as Array<ReplacementAdmin & { account_locked: boolean | null }>)
          .filter((r) => !r.account_locked);
        const repIds = reps.map((r) => r.id);
        let counts: Record<string, number> = {};
        if (repIds.length) {
          const { data: countRows } = await supabase
            .from("customers")
            .select("admin_in_charge")
            .in("admin_in_charge", repIds);
          (countRows ?? []).forEach((r: { admin_in_charge: string | null }) => {
            if (r.admin_in_charge) counts[r.admin_in_charge] = (counts[r.admin_in_charge] ?? 0) + 1;
          });
        }
        setReplacements(reps.map((r) => ({ id: r.id, full_name: r.full_name, username: r.username, customer_count: counts[r.id] ?? 0 })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, leave.staff_id]);

  const customersToReassign = useMemo(
    () => customers.filter((c) => scopeFilter(c, scope, selectedCustomers)),
    [customers, scope, selectedCustomers]
  );

  const replacement = replacements.find((r) => r.id === replacementId);
  const projectedCount = (replacement?.customer_count ?? 0) + customersToReassign.length;
  const projectedHigh = projectedCount > 15;

  const toggleCustomer = (id: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const canNext = () => {
    if (step === 2) return !!absent;
    if (step === 3) return true;
    if (step === 4) return scope !== "selected" || selectedCustomers.size > 0;
    if (step === 5) return !!replacementId;
    if (step === 6) return !!startDate && !!endDate;
    return true;
  };

  const next = () => setStep((s) => Math.min(8, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const execute = async () => {
    if (!user || !replacement || customersToReassign.length === 0) {
      toast.error("Missing required selections.");
      return;
    }
    setSubmitting(true);
    try {
      const ids = customersToReassign.map((c) => c.id);
      const { error: updErr } = await supabase
        .from("customers")
        .update({ admin_in_charge: replacement.id, assignment_status: "assigned" })
        .in("id", ids);
      if (updErr) throw updErr;

      // Per-customer assignment logs (best-effort)
      const logs = customersToReassign.map((c) => ({
        customer_id: c.id,
        previous_admin_id: leave.staff_id,
        new_admin_id: replacement.id,
        assignment_type: handoverType,
        reason: `Leave handover (${SCOPE_LABELS[scope]})${restoreAfterLeave && handoverType === "temporary" ? " · restore after leave" : ""}`,
        changed_by: user.id,
      }));
      const { error: logErr } = await supabase.from("customer_assignment_logs").insert(logs);
      if (logErr) console.warn("customer_assignment_logs insert failed:", logErr.message);

      // Mark leave handover complete
      const { error: leaveErr } = await supabase
        .from("leave_applications")
        .update({ handover_completed: true })
        .eq("id", leave.id);
      if (leaveErr) throw leaveErr;

      // Activity log (best-effort)
      const description = `Handover: ${absent?.full_name ?? "absent admin"} → ${replacement.full_name ?? "replacement"} · scope=${scope} · type=${handoverType} · ${ids.length} customers · ${startDate} → ${endDate}${restoreAfterLeave && handoverType === "temporary" ? " · restore after leave" : ""}`;
      const { error: actErr } = await supabase.from("activity_logs").insert({
        module: "leave_handover",
        action: "EXECUTE_HANDOVER",
        description,
        performed_by: user.id,
        performed_by_role: "it_tech",
      });
      if (actErr) console.warn("activity_logs insert failed:", actErr.message);

      toast.success(`Handover completed · ${ids.length} customer(s) reassigned`);
      onCompleted();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to execute handover");
    } finally {
      setSubmitting(false);
    }
  };

  const StepHeader = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
    <div className="flex items-start gap-3 pb-2">
      <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-semibold shrink-0">{n}</div>
      <div>
        <h3 className="font-semibold text-charcoal">{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Handover wizard · Step {step} of 8</DialogTitle>
          <DialogDescription>
            Guided reassignment for approved leave of {leave.staff_name ?? "staff"} ({leave.start_date} → {leave.end_date})
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading handover context…
          </div>
        ) : error ? (
          <div className="py-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : (
          <div className="space-y-4">
            {/* Step 1 already done (selection happened on the page) -> show summary */}
            {step === 1 && (
              <div className="space-y-3">
                <StepHeader n={1} title="Approved leave selected" desc="Verify the leave request being handed over." />
                <div className="rounded-lg border border-border bg-surface-muted p-4 space-y-1 text-sm">
                  <div><span className="text-muted-foreground">Staff:</span> <span className="font-medium text-charcoal">{leave.staff_name ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> {leave.leave_type ?? "—"}</div>
                  <div><span className="text-muted-foreground">Period:</span> {leave.start_date ?? "—"} → {leave.end_date ?? "—"}</div>
                  <div><span className="text-muted-foreground">Reason:</span> {leave.reason ?? "—"}</div>
                  <div><span className="text-muted-foreground">Handover note:</span> {leave.handover_note ?? "—"}</div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <StepHeader n={2} title="Unavailable admin details" desc="Confirm the absent admin you are covering." />
                <div className="rounded-lg border border-border bg-surface-muted p-4 grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Full name</div><div className="font-medium text-charcoal">{absent?.full_name ?? "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Username</div><div className="font-medium text-charcoal">{absent?.username ?? "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Status</div><Badge variant="outline">{absent?.status ?? "—"}</Badge></div>
                  <div><div className="text-xs text-muted-foreground">Availability</div><Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{absent?.availability_status ?? "—"}</Badge></div>
                  <div className="col-span-2"><div className="text-xs text-muted-foreground">Leave period</div><div className="font-medium text-charcoal flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{leave.start_date} → {leave.end_date}</div></div>
                  <div className="col-span-2"><div className="text-xs text-muted-foreground">Handover note</div><div className="text-charcoal">{leave.handover_note ?? "—"}</div></div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <StepHeader n={3} title="Customer list" desc={`Customers currently assigned to ${absent?.full_name ?? "this admin"}.`} />
                {customers.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center border border-dashed border-border rounded-lg">No customers assigned to this admin.</div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface-muted">
                        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                          <th className="py-2 px-3 w-10"></th>
                          <th className="py-2 px-3">Applicant</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Phone</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Priority</th>
                          <th className="py-2 px-3">Next FU</th>
                          <th className="py-2 px-3">Assign</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((c) => (
                          <tr key={c.id} className="border-b border-border/60">
                            <td className="py-2 px-3"><Checkbox checked={selectedCustomers.has(c.id)} onCheckedChange={() => toggleCustomer(c.id)} /></td>
                            <td className="py-2 px-3 text-muted-foreground">{c.applicant_id ?? "—"}</td>
                            <td className="py-2 px-3 font-medium text-charcoal">{c.full_name ?? "—"}</td>
                            <td className="py-2 px-3 text-muted-foreground">{c.phone_number ?? "—"}</td>
                            <td className="py-2 px-3"><Badge variant="outline">{c.customer_status ?? "—"}</Badge></td>
                            <td className="py-2 px-3 text-muted-foreground">{c.priority_status ?? "—"}</td>
                            <td className="py-2 px-3 text-muted-foreground">{c.next_follow_up_date ?? "—"}</td>
                            <td className="py-2 px-3 text-muted-foreground">{c.assignment_status ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Tick rows now if you plan to use the "Selected customers" scope in the next step.</p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <StepHeader n={4} title="Reassignment scope" desc="Pick which customers should be moved to the replacement admin." />
                <RadioGroup value={scope} onValueChange={(v) => setScope(v as Scope)} className="grid grid-cols-1 gap-2">
                  {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => {
                    const count = customers.filter((c) => scopeFilter(c, s, selectedCustomers)).length;
                    return (
                      <Label key={s} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-surface-muted cursor-pointer">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={s} id={`scope-${s}`} />
                          <span className="text-sm">{SCOPE_LABELS[s]}</span>
                        </div>
                        <Badge variant="outline">{count} customer{count === 1 ? "" : "s"}</Badge>
                      </Label>
                    );
                  })}
                </RadioGroup>
                {scope === "selected" && selectedCustomers.size === 0 && (
                  <div className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Go back to step 3 and select at least one customer.</div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <StepHeader n={5} title="Replacement admin" desc="Available, active admins (not the absent admin)." />
                {replacements.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center border border-dashed border-border rounded-lg">No available replacement admins right now.</div>
                ) : (
                  <RadioGroup value={replacementId} onValueChange={setReplacementId} className="grid grid-cols-1 gap-2">
                    {replacements.map((r) => (
                      <Label key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-surface-muted cursor-pointer">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={r.id} id={`rep-${r.id}`} />
                          <div>
                            <div className="text-sm font-medium text-charcoal">{r.full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{r.username ?? "—"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" /> {r.customer_count} current</div>
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <StepHeader n={6} title="Handover type & period" desc="Temporary handovers can auto-restore after leave." />
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                  <Select value={handoverType} onValueChange={(v) => { const t = v as HandoverType; setHandoverType(t); if (t === "permanent") setRestoreAfterLeave(false); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="permanent">Permanent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">End date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium text-charcoal">Restore after leave</div>
                    <div className="text-xs text-muted-foreground">Only applies to temporary handovers.</div>
                  </div>
                  <Switch checked={restoreAfterLeave && handoverType === "temporary"} disabled={handoverType === "permanent"} onCheckedChange={setRestoreAfterLeave} />
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-3">
                <StepHeader n={7} title="Workload preview" desc="Confirm the impact on the replacement admin." />
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-4">
                    <div className="text-xs text-muted-foreground">Current load</div>
                    <div className="text-2xl font-bold text-charcoal mt-1">{replacement?.customer_count ?? 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">{replacement?.full_name ?? "—"}</div>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <div className="text-xs text-muted-foreground">To reassign</div>
                    <div className="text-2xl font-bold text-charcoal mt-1">{customersToReassign.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">{SCOPE_LABELS[scope]}</div>
                  </div>
                  <div className={`rounded-lg border p-4 ${projectedHigh ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                    <div className="text-xs text-muted-foreground">Projected total</div>
                    <div className="text-2xl font-bold text-charcoal mt-1">{projectedCount}</div>
                    {projectedHigh && <div className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> High workload</div>}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm space-y-1">
                  <div><span className="text-muted-foreground">From:</span> {absent?.full_name ?? "—"}</div>
                  <div><span className="text-muted-foreground">To:</span> {replacement?.full_name ?? "—"}</div>
                  <div><span className="text-muted-foreground">Type:</span> {handoverType}{restoreAfterLeave && handoverType === "temporary" ? " · restore after leave" : ""}</div>
                  <div><span className="text-muted-foreground">Period:</span> {startDate} → {endDate}</div>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-3">
                <StepHeader n={8} title="Confirm & execute" desc="This will reassign customers and mark the handover complete." />
                <div className="rounded-lg border border-border p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 text-charcoal font-medium"><UserCheck className="w-4 h-4" /> Ready to execute</div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Reassign <strong className="text-charcoal">{customersToReassign.length}</strong> customer(s) to <strong className="text-charcoal">{replacement?.full_name}</strong></li>
                    <li>Set assignment_status = "assigned"</li>
                    <li>Mark leave handover complete</li>
                    <li>Log to customer_assignment_logs and activity_logs</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="outline" onClick={back} disabled={step === 1 || submitting}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {step < 8 ? (
            <Button onClick={next} disabled={loading || !canNext()}>
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={execute} disabled={submitting || customersToReassign.length === 0} className="gradient-brand">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm handover
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HandoverWizard;

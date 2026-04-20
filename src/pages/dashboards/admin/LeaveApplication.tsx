import { useEffect, useMemo, useState } from "react";
import { Loader2, CalendarOff, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Leave {
  id: string;
  leave_type: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  leave_status: string | null;
  handover_required: boolean | null;
  handover_completed: boolean | null;
  created_at: string | null;
}

const LEAVE_TYPES = ["Annual", "Medical", "Emergency", "Unpaid", "Resignation"];

const statusBadge = (s?: string | null) => {
  switch (s) {
    case "approved":
    case "completed": return "bg-brand/10 text-brand border-brand/20";
    case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
    case "cancelled": return "bg-muted text-muted-foreground border-border";
    case "submitted": return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const statusLabel = (s?: string | null) => {
  switch (s) {
    case "submitted": return "Waiting for boss approval";
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    case "cancelled": return "Cancelled";
    case "completed": return "Completed";
    default: return s ?? "—";
  }
};

const daysBetween = (a?: string | null, b?: string | null) => {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 86400000) + 1;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const LeaveApplication = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [leaveType, setLeaveType] = useState("Annual");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [reason, setReason] = useState("");

  const duration = useMemo(() => daysBetween(startDate, endDate), [startDate, endDate]);
  const handoverRequired = duration > 1;

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leave_applications")
      .select("id, leave_type, start_date, end_date, reason, leave_status, handover_required, handover_completed, created_at")
      .eq("staff_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(`Failed to load: ${error.message}`);
    else setRows((data ?? []) as Leave[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    if (!startDate || !endDate) return toast.error("Pick start and end dates");
    if (duration < 1) return toast.error("End date must be on or after start date");
    if (!reason.trim()) return toast.error("Provide a reason");

    setSubmitting(true);
    const { error } = await supabase.from("leave_applications").insert({
      staff_id: user.id,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
      leave_status: "submitted",
      handover_required: handoverRequired,
      handover_completed: false,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`Submit failed: ${error.message}`);
      return;
    }
    toast.success("Leave application submitted");
    setReason("");
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Leave Application</h1>
        <p className="text-sm text-muted-foreground">Submit a leave request and track its approval & handover status.</p>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2"><CalendarOff className="w-4 h-4" /> Apply for leave</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Leave type</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="h-10 px-3 flex items-center rounded-md border border-input bg-surface-muted text-sm">
              {duration} day{duration === 1 ? "" : "s"}
              {handoverRequired && <Badge variant="outline" className="ml-2 bg-destructive/10 text-destructive border-destructive/20">Handover required</Badge>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Reason</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason for your leave request" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={submit} disabled={submitting} className="gradient-brand">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit application
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-charcoal">My leave history</h3>
          <Badge variant="outline">{rows.length}</Badge>
        </div>
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No leave applications yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">From</th>
                  <th className="py-3 px-4 font-medium">To</th>
                  <th className="py-3 px-4 font-medium">Days</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Handover required</th>
                  <th className="py-3 px-4 font-medium">Handover completed</th>
                  <th className="py-3 px-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2.5 px-4 font-medium text-charcoal">{r.leave_type ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.start_date ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.end_date ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{daysBetween(r.start_date, r.end_date)}</td>
                    <td className="py-2.5 px-4"><Badge variant="outline" className={statusBadge(r.leave_status)}>{statusLabel(r.leave_status)}</Badge></td>
                    <td className="py-2.5 px-4">{r.handover_required ? <Badge variant="outline" className="bg-charcoal/10 text-charcoal border-charcoal/20">Yes</Badge> : <span className="text-muted-foreground">No</span>}</td>
                    <td className="py-2.5 px-4">{r.handover_completed ? <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">Done</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LeaveApplication;

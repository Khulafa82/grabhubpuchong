import { useMemo, useState } from "react";
import { Loader2, Calendar, Clock, MapPin, Users, GraduationCap, UserPlus, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  PsvClass,
  ATTENDANCE_STATUSES,
  AttendanceStatus,
  attendanceBadgeClass,
  attendanceToWorkflow,
  classBadgeClass,
  classCapacityState,
  formatTimeRange,
  PSV_WORKFLOW,
} from "@/lib/psv";
import { usePsvAssignments } from "@/hooks/usePsvAssignments";
import { PsvRole } from "./PsvCalendarPage";
import { AssignCustomerDialog } from "./AssignCustomerDialog";

interface Props {
  psvClass: PsvClass | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  role: PsvRole;
  myId: string | null;
  onChanged: () => void;
}

export const PsvClassDetailDialog = ({ psvClass, open, onOpenChange, role, myId, onChanged }: Props) => {
  const { data, loading, error, refetch } = usePsvAssignments(open ? psvClass?.id : null);
  const [assignOpen, setAssignOpen] = useState(false);

  if (!psvClass) return null;

  const state = classCapacityState(psvClass);
  const cap = psvClass.capacity ?? 0;
  const booked = psvClass.booked_count ?? 0;
  const available = psvClass.available_slots ?? Math.max(cap - booked, 0);
  const dateStr = psvClass.class_date
    ? new Date(psvClass.class_date).toLocaleDateString(undefined, {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const canAssign = role === "admin" || role === "super_admin";
  const canEditAttendance = role === "admin" || role === "it_tech" || role === "super_admin";
  const isFull = state === "Full" || state === "Cancelled" || state === "Completed";

  const refreshAll = () => {
    refetch();
    onChanged();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl">{psvClass.title ?? "Untitled class"}</DialogTitle>
                <DialogDescription>PSV class details and attendance.</DialogDescription>
              </div>
              <Badge variant="outline" className={classBadgeClass(state)}>{state}</Badge>
            </div>
          </DialogHeader>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Info icon={Calendar} label="Date" value={dateStr} />
            <Info icon={Clock} label="Time" value={formatTimeRange(psvClass.start_time, psvClass.end_time)} />
            <Info icon={MapPin} label="Location" value={psvClass.location ?? "—"} />
            <Info icon={GraduationCap} label="Instructor" value={psvClass.instructor ?? "—"} />
            <Info icon={Users} label="Capacity" value={`${booked}/${cap || "—"} booked`} />
            <Info icon={Users} label="Available" value={`${available} slots`} />
          </div>

          <div className="flex items-center justify-between mt-4 mb-2">
            <h4 className="font-semibold text-charcoal">Assigned customers ({data.length})</h4>
            {canAssign && (
              <Button size="sm" onClick={() => setAssignOpen(true)} disabled={isFull}>
                <UserPlus className="w-4 h-4 mr-1.5" /> Assign customer
              </Button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded border border-destructive/40 bg-destructive/5 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-brand" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No customers assigned to this class yet.</div>
          ) : (
            <div className="space-y-2">
              {data.map((row) => {
                const ownedByMe = row.customer?.admin_in_charge === myId;
                const allowEdit =
                  canEditAttendance && (role === "it_tech" || role === "super_admin" || ownedByMe);
                return (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-charcoal truncate">
                        {row.customer?.full_name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {row.customer?.phone_number ?? "—"}
                        <span className="mx-1">·</span>
                        <span>{row.psv_workflow_status ?? PSV_WORKFLOW.ASSIGNED}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={attendanceBadgeClass(row.attendance_status)}>
                        {row.attendance_status ?? "Pending"}
                      </Badge>
                      {allowEdit && (
                        <AttendanceSelect
                          value={(row.attendance_status as AttendanceStatus) ?? "Pending"}
                          onChange={async (v) => {
                            const { error: err } = await supabase
                              .from("psv_class_customers")
                              .update({
                                attendance_status: v,
                                psv_workflow_status: attendanceToWorkflow(v),
                              })
                              .eq("id", row.id);
                            if (err) {
                              toast.error(err.message);
                              return;
                            }
                            toast.success("Attendance updated");
                            refreshAll();
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AssignCustomerDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        psvClass={psvClass}
        myId={myId}
        role={role}
        existingCustomerIds={useMemo(() => new Set(data.map((d) => d.customer_id)), [data])}
        onAssigned={refreshAll}
      />
    </>
  );
};

const Info = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-muted">
    <Icon className="w-4 h-4 text-brand mt-0.5 shrink-0" />
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm text-charcoal truncate">{value}</div>
    </div>
  </div>
);

const AttendanceSelect = ({
  value,
  onChange,
}: {
  value: AttendanceStatus;
  onChange: (v: AttendanceStatus) => void;
}) => (
  <Select value={value} onValueChange={(v) => onChange(v as AttendanceStatus)}>
    <SelectTrigger className="h-8 w-36 text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {ATTENDANCE_STATUSES.map((s) => (
        <SelectItem key={s} value={s}>
          {s}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

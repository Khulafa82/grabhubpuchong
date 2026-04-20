export interface PsvClass {
  id: string;
  title: string | null;
  class_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  instructor: string | null;
  capacity: number | null;
  booked_count: number | null;
  available_slots: number | null;
  status: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PsvAssignment {
  id: string;
  class_id: string;
  customer_id: string;
  assigned_by: string | null;
  attendance_status: string | null;
  psv_workflow_status: string | null;
  updated_at?: string | null;
  customer?: {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    admin_in_charge: string | null;
  } | null;
}

// Exact valid workflow values
export const PSV_WORKFLOW = {
  WAITING: "waiting_for_psv_class",
  ASSIGNED: "assigned_to_psv_class",
  ATTENDED: "attended_psv_class",
  COMPLETED: "completed_psv",
  FAILED: "failed_psv",
  RESCHEDULED: "rescheduled_psv",
} as const;

export const ATTENDANCE_STATUSES = ["Pending", "Attended", "Absent", "Rescheduled"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const attendanceToWorkflow = (a: AttendanceStatus): string => {
  switch (a) {
    case "Attended":
      return PSV_WORKFLOW.ATTENDED;
    case "Absent":
      return PSV_WORKFLOW.FAILED;
    case "Rescheduled":
      return PSV_WORKFLOW.RESCHEDULED;
    case "Pending":
    default:
      return PSV_WORKFLOW.ASSIGNED;
  }
};

export const classCapacityState = (c: PsvClass): "Open" | "Almost Full" | "Full" | "Completed" | "Cancelled" => {
  const status = (c.status ?? "").toLowerCase();
  if (status === "completed") return "Completed";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  const cap = c.capacity ?? 0;
  const booked = c.booked_count ?? 0;
  const available = c.available_slots ?? Math.max(cap - booked, 0);
  if (cap > 0 && available <= 0) return "Full";
  if (cap > 0 && available <= Math.max(1, Math.ceil(cap * 0.2))) return "Almost Full";
  return "Open";
};

export const classBadgeClass = (state: ReturnType<typeof classCapacityState>) => {
  switch (state) {
    case "Open":
      return "bg-brand/10 text-brand border-brand/20";
    case "Almost Full":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
    case "Full":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "Completed":
      return "bg-charcoal/10 text-charcoal border-charcoal/20";
    case "Cancelled":
      return "bg-muted text-muted-foreground border-border";
  }
};

export const attendanceBadgeClass = (a?: string | null) => {
  switch (a) {
    case "Attended":
      return "bg-brand/10 text-brand border-brand/20";
    case "Absent":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "Rescheduled":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
    case "Pending":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const formatTimeRange = (start?: string | null, end?: string | null) => {
  const trim = (t?: string | null) => (t ? t.slice(0, 5) : "");
  if (!start && !end) return "—";
  return `${trim(start)}${end ? ` – ${trim(end)}` : ""}`;
};

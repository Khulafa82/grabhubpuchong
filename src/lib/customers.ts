export interface Customer {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  ic_number?: string | null;
  user_role: string | null;
  location_choice: string | null;
  state: string | null;
  customer_status: string | null;
  priority_status: string | null;
  account_status?: string | null;
  next_follow_up_date: string | null;
  remarks: string | null;
  admin_in_charge: string | null;
  assigned_admin_name?: string | null;
  assignment_status: string | null;
  registration_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const CUSTOMER_STATUS_OPTIONS = [
  "new",
  "contacted",
  "pending_documents",
  "waiting_customer_response",
  "psv_required",
  "under_review",
  "completed",
  "rejected",
  "inactive",
  "cold_lead",
];

export const PRIORITY_OPTIONS = ["normal", "urgent", "walk_in", "vip"];

export const statusBadgeClass = (status?: string | null) => {
  switch (status) {
    case "approved":
    case "completed":
      return "bg-brand/10 text-brand border-brand/20";
    case "rejected":
    case "inactive":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "contacted":
    case "under_review":
    case "in_progress":
      return "bg-charcoal/10 text-charcoal border-charcoal/20";
    case "pending_documents":
    case "waiting_customer_response":
    case "psv_required":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
    case "cold_lead":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const priorityBadgeClass = (p?: string | null) => {
  switch (p) {
    case "urgent":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "walk_in":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
    case "vip":
      return "bg-brand/10 text-brand border-brand/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const isOverdue = (date?: string | null) => {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

export const isToday = (date?: string | null) => {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

export const waLink = (phone?: string | null) => {
  if (!phone) return "#";
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}`;
};

export const telLink = (phone?: string | null) => (phone ? `tel:${phone}` : "#");

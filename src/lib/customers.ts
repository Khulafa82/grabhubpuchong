export interface Customer {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  user_role: string | null;
  location_choice: string | null;
  state: string | null;
  customer_status: string | null;
  priority_status: string | null;
  next_follow_up_date: string | null;
  remarks: string | null;
  admin_in_charge: string | null;
  assignment_status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const CUSTOMER_STATUS_OPTIONS = [
  "new",
  "contacted",
  "in_progress",
  "documents_pending",
  "approved",
  "rejected",
  "completed",
];

export const statusBadgeClass = (status?: string | null) => {
  switch (status) {
    case "approved":
    case "completed":
      return "bg-brand/10 text-brand border-brand/20";
    case "rejected":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "contacted":
    case "in_progress":
      return "bg-charcoal/10 text-charcoal border-charcoal/20";
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

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Admin {
  id: string;
  full_name: string | null;
  username: string | null;
  status: string | null;
  availability_status: string | null;
  customer_count: number;
}

const STATUS = ["active", "inactive", "suspended", "resigned"];
const AVAIL = ["available", "unavailable", "on_leave", "medical_leave"];

const statusClass = (s?: string | null) => {
  switch (s) {
    case "active": return "bg-brand/10 text-brand border-brand/20";
    case "suspended": return "bg-destructive/10 text-destructive border-destructive/20";
    case "resigned": return "bg-muted text-muted-foreground border-border line-through";
    default: return "bg-muted text-muted-foreground border-border";
  }
};
const availClass = (s?: string | null) => {
  switch (s) {
    case "available": return "bg-brand/10 text-brand border-brand/20";
    case "on_leave":
    case "medical_leave": return "bg-charcoal/10 text-charcoal border-charcoal/20";
    case "unavailable": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const AdminState = () => {
  const [rows, setRows] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [staffRes, custRes] = await Promise.all([
      supabase.from("staff_profiles").select("id, full_name, username, status, availability_status").eq("role", "admin").order("full_name"),
      supabase.from("customers").select("admin_in_charge").not("admin_in_charge", "is", null),
    ]);
    if (staffRes.error || custRes.error) {
      setError(staffRes.error?.message ?? custRes.error?.message ?? "Failed");
      setLoading(false);
      return;
    }
    const counts: Record<string, number> = {};
    (custRes.data ?? []).forEach((c: { admin_in_charge: string | null }) => {
      if (c.admin_in_charge) counts[c.admin_in_charge] = (counts[c.admin_in_charge] ?? 0) + 1;
    });
    setRows((staffRes.data ?? []).map((s: Omit<Admin, "customer_count">) => ({ ...s, customer_count: counts[s.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Admin>) => {
    setBusy(id);
    const { error } = await supabase.from("staff_profiles").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }
    setBusy(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Admin State & Availability</h1>
        <p className="text-sm text-muted-foreground">Monitor and adjust each admin's status, availability and live workload.</p>
      </div>

      {loading ? (
        <Card className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading admins…</Card>
      ) : error ? (
        <Card className="p-8 text-sm text-destructive">Failed to load: {error}</Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-sm text-muted-foreground text-center">No admin accounts found.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((a) => (
            <Card key={a.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-charcoal truncate">{a.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">@{a.username ?? "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand leading-none">{a.customer_count}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">customers</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={statusClass(a.status)}>{a.status ?? "—"}</Badge>
                <Badge variant="outline" className={availClass(a.availability_status)}>{a.availability_status ?? "—"}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Select value={a.status ?? undefined} onValueChange={(v) => update(a.id, { status: v })} disabled={busy === a.id}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="status" /></SelectTrigger>
                  <SelectContent>{STATUS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={a.availability_status ?? undefined} onValueChange={(v) => update(a.id, { availability_status: v })} disabled={busy === a.id}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="availability" /></SelectTrigger>
                  <SelectContent>{AVAIL.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminState;

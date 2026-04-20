import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusBadgeClass } from "@/lib/customers";
import { toast } from "sonner";

interface Customer {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  admin_in_charge: string | null;
  assignment_status: string | null;
  customer_status: string | null;
  priority_status: string | null;
  admin_name?: string | null;
}
interface Admin { id: string; full_name: string | null; }

const Reassignment = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [newAdmin, setNewAdmin] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [custRes, adminRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id, applicant_id, full_name, phone_number, admin_in_charge, assignment_status, customer_status, priority_status")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(500),
      supabase.from("staff_profiles").select("id, full_name").eq("role", "admin").eq("status", "active").order("full_name"),
    ]);
    if (custRes.error || adminRes.error) {
      setError(custRes.error?.message ?? adminRes.error?.message ?? "Failed");
      setLoading(false);
      return;
    }
    const adminList = (adminRes.data ?? []) as Admin[];
    const nameMap = Object.fromEntries(adminList.map((a) => [a.id, a.full_name ?? "—"]));
    setAdmins(adminList);
    setCustomers(((custRes.data ?? []) as Customer[]).map((c) => ({ ...c, admin_name: c.admin_in_charge ? nameMap[c.admin_in_charge] ?? "Unknown" : null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) =>
      (c.full_name ?? "").toLowerCase().includes(term) ||
      (c.phone_number ?? "").toLowerCase().includes(term) ||
      (c.applicant_id ?? "").toLowerCase().includes(term),
    );
  }, [customers, q]);

  const submit = async () => {
    if (!editing || !newAdmin) return;
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({ admin_in_charge: newAdmin, assignment_status: "assigned" })
      .eq("id", editing.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Customer reassigned");
      setEditing(null);
      setNewAdmin("");
      load();
    }
  };

  const openDialog = (c: Customer) => { setEditing(c); setNewAdmin(c.admin_in_charge ?? ""); };

  const isUrgent = (c: Customer) => c.priority_status && ["urgent", "walk_in_priority", "overdue"].includes(c.priority_status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Customer Assignment & Reassignment</h1>
        <p className="text-sm text-muted-foreground">Reassign customers to a different admin in one click.</p>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or applicant ID" className="pl-9" />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading customers…</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No customers match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Applicant</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Phone</th>
                  <th className="py-3 px-4 font-medium">Admin</th>
                  <th className="py-3 px-4 font-medium">Assignment</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const unassigned = !c.admin_in_charge;
                  const urgent = isUrgent(c);
                  return (
                    <tr key={c.id} className={`border-b border-border/60 ${unassigned ? "bg-destructive/5" : urgent ? "bg-charcoal/5" : ""}`}>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{c.applicant_id ?? "—"}</td>
                      <td className="py-2.5 px-4 font-medium text-charcoal">{c.full_name ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{c.phone_number ?? "—"}</td>
                      <td className="py-2.5 px-4">{unassigned ? <span className="text-destructive font-medium">Unassigned</span> : c.admin_name}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className={unassigned ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-brand/10 text-brand border-brand/20"}>
                          {c.assignment_status ?? (unassigned ? "unassigned" : "assigned")}
                        </Badge>
                        {urgent && <Badge variant="outline" className="ml-1 bg-charcoal/10 text-charcoal border-charcoal/20">{c.priority_status}</Badge>}
                      </td>
                      <td className="py-2.5 px-4"><Badge variant="outline" className={statusBadgeClass(c.customer_status)}>{c.customer_status ?? "—"}</Badge></td>
                      <td className="py-2.5 px-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => openDialog(c)}>Reassign</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setNewAdmin(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reassign customer</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Customer</div>
              <div className="font-medium text-charcoal">{editing?.full_name ?? "—"} <span className="text-muted-foreground font-normal">· {editing?.applicant_id ?? "—"}</span></div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Current admin</div>
              <div className="text-charcoal">{editing?.admin_name ?? <span className="text-destructive">Unassigned</span>}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">New admin</div>
              <Select value={newAdmin} onValueChange={setNewAdmin}>
                <SelectTrigger><SelectValue placeholder="Select an active admin" /></SelectTrigger>
                <SelectContent>{admins.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={!newAdmin || newAdmin === editing?.admin_in_charge || saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reassignment;

import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, UserCog, Activity, Shuffle, ClipboardCheck, Copy, ScrollText,
  ShieldAlert, Settings, AlertTriangle, Users, Lock, Loader2, RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import StaffAccounts from "./it/StaffAccounts";
import AdminState from "./it/AdminState";
import Reassignment from "./it/Reassignment";
import Handover from "./it/Handover";
import Duplicates from "./it/Duplicates";
import Audit from "./it/Audit";
import TechSettings from "./it/TechSettings";
import ItSettings from "./it/Settings";
import { Card } from "@/components/ui/card";
import { PsvCalendarPage } from "@/components/psv/PsvCalendarPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useITTechData, StaffRow, CustomerAssignmentRow } from "@/hooks/useITTechData";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const items = [
  { label: "Dashboard Overview", to: "/it-tech", icon: LayoutDashboard },
  { label: "Staff Account Mgmt", to: "/it-tech/accounts", icon: UserCog },
  { label: "Admin State", to: "/it-tech/state", icon: Activity },
  { label: "Reassignment", to: "/it-tech/reassignment", icon: Shuffle },
  { label: "Leave Handover", to: "/it-tech/handover", icon: ClipboardCheck },
  { label: "Duplicates", to: "/it-tech/duplicates", icon: Copy },
  { label: "PSV Calendar", to: "/it-tech/psv-calendar", icon: ClipboardCheck },
  { label: "Audit Trail", to: "/it-tech/audit", icon: ScrollText },
  { label: "Tech Settings", to: "/it-tech/tech-settings", icon: ShieldAlert },
  { label: "Biodata & Settings", to: "/it-tech/settings", icon: Settings },
];

const AVAILABILITY_OPTIONS = ["available", "unavailable", "on_leave", "medical_leave"];
const STATUS_OPTIONS = ["active", "inactive", "suspended"];

const availabilityClass = (s?: string | null) => {
  switch (s) {
    case "available":
      return "bg-brand/10 text-brand border-brand/20";
    case "on_leave":
    case "medical_leave":
      return "bg-charcoal/10 text-charcoal border-charcoal/20";
    case "unavailable":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const statusClass = (s?: string | null) =>
  s === "active"
    ? "bg-brand/10 text-brand border-brand/20"
    : "bg-muted text-muted-foreground border-border";

interface RecentLog {
  id: string;
  module: string | null;
  action: string | null;
  description: string | null;
  performed_by_role: string | null;
  created_at: string | null;
}

const useRecentAuditLogs = (limit = 5) => {
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, module, action, description, performed_by_role, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (cancelled) return;
      if (error) setError(error.message);
      else setLogs((data ?? []) as RecentLog[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return { logs, loading, error };
};

const Overview = () => {
  const { counts, loading: statsLoading, error: statsError } = useDashboardStats([
    {
      key: "activeAdmins",
      table: "staff_profiles",
      filters: [{ column: "role", value: "admin" }, { column: "status", value: "active" }],
    },
    {
      key: "pendingHandover",
      table: "customers",
      filters: [{ column: "assignment_status", value: "unassigned" }],
    },
    {
      key: "unassigned",
      table: "customers",
      filters: [{ column: "admin_in_charge", op: "is", value: null }],
    },
    {
      key: "lockedAccounts",
      table: "staff_profiles",
      filters: [{ column: "account_locked", value: true }],
    },
  ]);

  const { staff, customers, duplicateCount, loading, error, refetch } = useITTechData();
  const { logs: recentLogs, loading: logsLoading, error: logsError } = useRecentAuditLogs(5);
  const [editing, setEditing] = useState<CustomerAssignmentRow | null>(null);

  const admins = useMemo(() => staff.filter((s) => s.role === "admin"), [staff]);
  const unassignedCustomers = useMemo(
    () => customers.filter((c) => !c.admin_in_charge || c.assignment_status === "unassigned"),
    [customers],
  );

  const v = (k: string) => {
    if (statsLoading) return "…";
    if (statsError) return "—";
    const n = counts[k];
    return typeof n === "number" ? n.toLocaleString() : "0";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Technical operations</h1>
          <p className="text-sm text-muted-foreground">Account, assignment and integrity controls.</p>
        </div>
        <div className="flex items-center gap-3">
          {(loading || statsLoading) && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {(error || statsError) && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          {error || statsError}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active Admins" value={v("activeAdmins")} icon={Users} />
        <StatCard label="Pending Handover Tasks" value={v("pendingHandover")} icon={ClipboardCheck} accent="charcoal" />
        <StatCard label="Unassigned Customers" value={v("unassigned")} icon={Shuffle} />
        <StatCard label="Duplicate Alerts" value={loading ? "…" : duplicateCount.toLocaleString()} icon={Copy} accent="muted" />
        <StatCard label="Locked Accounts" value={v("lockedAccounts")} icon={Lock} />
        <StatCard label="System Alerts" value="—" icon={AlertTriangle} accent="muted" />
      </div>

      {/* Staff Account Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-charcoal">Staff account management</h3>
          <Badge variant="outline">{staff.length}</Badge>
        </div>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
        ) : staff.length === 0 ? (
          <div className="text-sm text-muted-foreground">No staff accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Username</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Availability</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <StaffActionRow key={s.id} row={s} onChange={refetch} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Admin Availability */}
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Admin availability monitoring</h3>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
        ) : admins.length === 0 ? (
          <div className="text-sm text-muted-foreground">No admins to monitor.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {admins.map((a) => (
              <div key={a.id} className="rounded-xl border border-border p-4 space-y-2">
                <div className="font-medium text-charcoal truncate">{a.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{a.email ?? "—"}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={availabilityClass(a.availability_status)}>
                    {a.availability_status ?? "unknown"}
                  </Badge>
                  <Badge variant="outline" className={statusClass(a.status)}>
                    {a.status ?? "—"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Customer Assignment Monitoring */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-charcoal">Customer assignment monitoring</h3>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            {unassignedCustomers.length} unassigned
          </Badge>
        </div>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
        ) : customers.length === 0 ? (
          <div className="text-sm text-muted-foreground">No customers in the system.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Applicant ID</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Admin in charge</th>
                  <th className="py-2 pr-4 font-medium">Assignment</th>
                  <th className="py-2 pr-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.slice(0, 30).map((c) => {
                  const admin = admins.find((a) => a.id === c.admin_in_charge);
                  const isUnassigned = !c.admin_in_charge || c.assignment_status === "unassigned";
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border/60 ${isUnassigned ? "bg-destructive/5" : ""}`}
                    >
                      <td className="py-2.5 pr-4 text-muted-foreground">{c.applicant_id ?? "—"}</td>
                      <td className="py-2.5 pr-4 font-medium text-charcoal">{c.full_name ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {admin?.full_name ?? (c.admin_in_charge ? "Unknown" : "—")}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant="outline"
                          className={
                            isUnassigned
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-brand/10 text-brand border-brand/20"
                          }
                        >
                          {c.assignment_status ?? (c.admin_in_charge ? "assigned" : "unassigned")}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                          Reassign
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Audit Logs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-charcoal">Recent activity & audit trail</h3>
          <Link to="/it-tech/audit" className="text-xs text-brand hover:underline">View all</Link>
        </div>
        {logsLoading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
        ) : logsError ? (
          <div className="text-sm text-destructive">Failed to load: {logsError}</div>
        ) : recentLogs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No activity logs available.</div>
        ) : (
          <ul className="divide-y divide-border">
            {recentLogs.map((l) => (
              <li key={l.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">
                      {l.module ?? "system"}
                    </Badge>
                    <span className="text-sm font-medium text-charcoal">{l.action ?? "action"}</span>
                    {l.performed_by_role && (
                      <span className="text-xs text-muted-foreground">({l.performed_by_role})</span>
                    )}
                  </div>
                  {l.description && (
                    <div className="text-xs text-muted-foreground">{l.description}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ReassignDialog
        customer={editing}
        admins={admins}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />
    </div>
  );
};

const StaffActionRow = ({ row, onChange }: { row: StaffRow; onChange: () => void }) => {
  const [busy, setBusy] = useState(false);

  const update = async (patch: Partial<StaffRow>) => {
    setBusy(true);
    const { error } = await supabase.from("staff_profiles").update(patch).eq("id", row.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      onChange();
    }
  };

  return (
    <tr className="border-b border-border/60">
      <td className="py-2.5 pr-4 font-medium text-charcoal">{row.full_name ?? "—"}</td>
      <td className="py-2.5 pr-4 text-muted-foreground">{row.username ?? "—"}</td>
      <td className="py-2.5 pr-4 text-muted-foreground">{row.email ?? "—"}</td>
      <td className="py-2.5 pr-4 text-muted-foreground">{row.role ?? "—"}</td>
      <td className="py-2.5 pr-4">
        <Select
          value={row.status ?? undefined}
          onValueChange={(value) => update({ status: value })}
          disabled={busy}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2.5 pr-4">
        <Select
          value={row.availability_status ?? undefined}
          onValueChange={(value) => update({ availability_status: value })}
          disabled={busy}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="availability" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2.5 pr-4 text-right">
        <Button
          size="sm"
          variant={row.account_locked ? "default" : "outline"}
          disabled={busy}
          onClick={() => update({ account_locked: !row.account_locked })}
        >
          <Lock className="w-3 h-3 mr-1" />
          {row.account_locked ? "Unlock" : "Lock"}
        </Button>
      </td>
    </tr>
  );
};

const ReassignDialog = ({
  customer,
  admins,
  onClose,
  onSaved,
}: {
  customer: CustomerAssignmentRow | null;
  admins: StaffRow[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [adminId, setAdminId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!customer || !adminId) return;
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({ admin_in_charge: adminId, assignment_status: "assigned" })
      .eq("id", customer.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Customer reassigned");
      onSaved();
    }
  };

  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Customer</div>
            <div className="font-medium text-charcoal">
              {customer?.full_name ?? "—"}{" "}
              <span className="text-muted-foreground font-normal">· {customer?.applicant_id ?? "—"}</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">New admin</div>
            <Select value={adminId} onValueChange={setAdminId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an admin" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name ?? a.email ?? a.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={!adminId || saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ITTech = () => (
  <Routes>
    <Route element={<DashboardLayout role="it" roleLabel="IT Technician" items={items} />}>
      <Route index element={<Overview />} />
      <Route path="accounts" element={<StaffAccounts />} />
      <Route path="state" element={<AdminState />} />
      <Route path="reassignment" element={<Reassignment />} />
      <Route path="handover" element={<Handover />} />
      <Route path="duplicates" element={<Duplicates />} />
      <Route path="audit" element={<Audit />} />
      <Route path="psv-calendar" element={<PsvCalendarPage role="it_tech" />} />
      <Route path="tech-settings" element={<TechSettings />} />
      <Route path="settings" element={<ItSettings />} />
    </Route>
  </Routes>
);
export default ITTech;

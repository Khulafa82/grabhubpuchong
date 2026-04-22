import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Lock, RefreshCw, Settings2, Pencil, Plus, ShieldAlert, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { ManageScopeDialog } from "@/components/staff/ManageScopeDialog";
import { scopeLabel, StaffScope } from "@/lib/scope";
import { StaffFormDialog, StaffFormValues } from "@/components/staff/StaffFormDialog";

interface Staff {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  status: string | null;
  availability_status: string | null;
  employment_status: string | null;
  branch_hub: string | null;
  joined_date: string | null;
  emergency_contact: string | null;
  account_locked: boolean | null;
  created_at: string | null;
  assigned_service_scope: string | null;
  assigned_location_scope: string | null;
  assigned_application_scope: string | null;
  assigned_channel_scope: string | null;
}

const STATUS = ["active", "inactive", "suspended", "resigned"];
const AVAIL = ["available", "unavailable", "on_leave", "medical_leave"];

const ALL_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "boss", label: "Boss" },
  { value: "it_tech", label: "IT Technician" },
  { value: "super_admin", label: "Super Admin" },
];

const StaffAccounts = () => {
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scopeTarget, setScopeTarget] = useState<Staff | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitial, setFormInitial] = useState<Partial<StaffFormValues> | null>(null);
  const [q, setQ] = useState("");
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const urlQ = searchParams.get("q");
    if (urlQ) setQ(urlQ);
  }, [searchParams]);
  const { profile } = useAuth();
  const role = profile?.role;
  const canEditScope = role === "it_tech" || role === "boss" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";
  const isBoss = role === "boss";
  const isItTech = role === "it_tech";
  const canManageStaff = isSuperAdmin || isBoss || isItTech;

  // Roles this user is allowed to assign in the create/edit form
  const allowedRoles = useMemo(() => {
    if (isSuperAdmin) return ALL_ROLE_OPTIONS;
    if (isBoss || isItTech) return ALL_ROLE_OPTIONS.filter((r) => r.value !== "super_admin");
    return [];
  }, [isSuperAdmin, isBoss, isItTech]);

  // Can the current user manage (edit/lock/scope/status) this row?
  const canManageRow = (s: Staff) => {
    if (!canManageStaff) return false;
    if (s.role === "super_admin") return isSuperAdmin;
    return true;
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staff_profiles")
      .select(
        "id, full_name, username, email, phone_number, role, status, availability_status, employment_status, branch_hub, joined_date, emergency_contact, account_locked, created_at, assigned_service_scope, assigned_location_scope, assigned_application_scope, assigned_channel_scope",
      )
      .order("role", { ascending: true })
      .order("full_name", { ascending: true });
    if (error) setError(error.message);
    else setRows((data ?? []) as Staff[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visibleRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((s) =>
      [s.full_name, s.username, s.email, s.phone_number, s.role, s.branch_hub]
        .some((v) => (v ?? "").toLowerCase().includes(term)),
    );
  }, [rows, q]);

  const update = async (id: string, patch: Partial<Staff>) => {
    setBusyId(id);
    const { error } = await supabase.from("staff_profiles").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }
    setBusyId(null);
  };

  const openCreate = () => {
    setFormMode("create");
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (s: Staff) => {
    setFormMode("edit");
    setFormInitial({
      id: s.id,
      full_name: s.full_name,
      username: s.username,
      email: s.email,
      phone_number: s.phone_number,
      role: s.role,
      status: s.status,
      availability_status: s.availability_status,
      employment_status: s.employment_status,
      branch_hub: s.branch_hub,
      joined_date: s.joined_date,
      emergency_contact: s.emergency_contact,
      assigned_service_scope: s.assigned_service_scope,
      assigned_location_scope: s.assigned_location_scope,
      assigned_application_scope: s.assigned_application_scope,
      assigned_channel_scope: s.assigned_channel_scope,
    });
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Staff Account Management</h1>
          <p className="text-sm text-muted-foreground">Manage status, availability and lock state for every staff account.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-background w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, role…"
              className="border-0 focus-visible:ring-0 px-0 h-7 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh</Button>
          {canManageStaff && allowedRoles.length > 0 && (
            <Button size="sm" onClick={openCreate} className="gradient-brand">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Staff Account
            </Button>
          )}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading staff…</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No staff accounts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Username</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Phone</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Availability</th>
                  <th className="py-3 px-4 font-medium">Employment</th>
                  <th className="py-3 px-4 font-medium">Assignment Scope</th>
                  <th className="py-3 px-4 font-medium">Joined</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const manage = canManageRow(s);
                  const restricted = s.role === "super_admin" && !isSuperAdmin;
                  return (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-2.5 px-4 font-medium text-charcoal">{s.full_name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.username ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.email ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.phone_number ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={s.role === "super_admin" ? "bg-charcoal/10 text-charcoal border-charcoal/20" : ""}>
                          {s.role ?? "—"}
                        </Badge>
                        {restricted && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-[10px]">
                            <ShieldAlert className="w-3 h-3" /> Read-only
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <Select value={s.status ?? undefined} onValueChange={(v) => update(s.id, { status: v })} disabled={busyId === s.id || !manage}>
                        <SelectTrigger className="h-8 w-32"><SelectValue placeholder="status" /></SelectTrigger>
                        <SelectContent>{STATUS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="py-2.5 px-4">
                      <Select value={s.availability_status ?? undefined} onValueChange={(v) => update(s.id, { availability_status: v })} disabled={busyId === s.id || !manage}>
                        <SelectTrigger className="h-8 w-36"><SelectValue placeholder="availability" /></SelectTrigger>
                        <SelectContent>{AVAIL.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">{s.employment_status ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      {s.role === "admin" ? (
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          <Badge variant="outline" className="bg-brand/5 text-charcoal border-border text-[10px]">
                            {scopeLabel("service", s.assigned_service_scope)}
                          </Badge>
                          <Badge variant="outline" className="bg-brand/5 text-charcoal border-border text-[10px]">
                            {scopeLabel("location", s.assigned_location_scope)}
                          </Badge>
                          <Badge variant="outline" className="bg-brand/5 text-charcoal border-border text-[10px]">
                            {scopeLabel("account", s.assigned_application_scope)}
                          </Badge>
                          <Badge variant="outline" className="bg-brand/5 text-charcoal border-border text-[10px]">
                            {scopeLabel("channel", s.assigned_channel_scope)}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">{s.joined_date ? new Date(s.joined_date).toLocaleDateString() : (s.created_at ? new Date(s.created_at).toLocaleDateString() : "—")}</td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {manage && (
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        )}
                        {s.role === "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setScopeTarget(s)}
                          >
                            <Settings2 className="w-3 h-3 mr-1" />
                            {canEditScope && manage ? "Manage Scope" : "View Scope"}
                          </Button>
                        )}
                        <Button size="sm" variant={s.account_locked ? "default" : "outline"} disabled={busyId === s.id || !manage} onClick={() => update(s.id, { account_locked: !s.account_locked })}>
                          <Lock className="w-3 h-3 mr-1" />{s.account_locked ? "Unlock" : "Lock"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ManageScopeDialog
        open={!!scopeTarget}
        onOpenChange={(v) => !v && setScopeTarget(null)}
        staffId={scopeTarget?.id ?? null}
        staffName={scopeTarget?.full_name ?? null}
        initial={scopeTarget as Partial<StaffScope> | null}
        readOnly={!canEditScope || (scopeTarget ? !canManageRow(scopeTarget) : true)}
        onSaved={load}
      />

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={formInitial}
        allowedRoles={allowedRoles}
        onSaved={load}
      />
    </div>
  );
};

export default StaffAccounts;

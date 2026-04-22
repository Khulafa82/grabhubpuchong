import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  SERVICE_SCOPE_OPTIONS, LOCATION_SCOPE_OPTIONS, ACCOUNT_SCOPE_OPTIONS, CHANNEL_SCOPE_OPTIONS,
} from "@/lib/scope";

export interface StaffFormValues {
  id?: string;
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
  assigned_service_scope: string | null;
  assigned_location_scope: string | null;
  assigned_application_scope: string | null;
  assigned_channel_scope: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: Partial<StaffFormValues> | null;
  /** Roles the current user is allowed to assign in this form */
  allowedRoles: ReadonlyArray<{ value: string; label: string }>;
  onSaved?: () => void;
}

const STATUS = ["active", "inactive", "suspended", "resigned"];
const AVAIL = ["available", "unavailable", "on_leave", "medical_leave"];
const EMPLOY = ["full_time", "part_time", "contract", "intern", "probation"];

const empty = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export const StaffFormDialog = ({
  open, onOpenChange, mode, initial, allowedRoles, onSaved,
}: Props) => {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<StaffFormValues>({
    full_name: "", username: "", email: "", phone_number: "",
    role: allowedRoles[0]?.value ?? "admin",
    status: "active", availability_status: "available",
    employment_status: "full_time", branch_hub: "", joined_date: null, emergency_contact: "",
    assigned_service_scope: "both", assigned_location_scope: "all",
    assigned_application_scope: "both", assigned_channel_scope: "both",
  });

  useEffect(() => {
    if (!open) return;
    setF({
      id: initial?.id,
      full_name: initial?.full_name ?? "",
      username: initial?.username ?? "",
      email: initial?.email ?? "",
      phone_number: initial?.phone_number ?? "",
      role: initial?.role ?? allowedRoles[0]?.value ?? "admin",
      status: initial?.status ?? "active",
      availability_status: initial?.availability_status ?? "available",
      employment_status: initial?.employment_status ?? "full_time",
      branch_hub: initial?.branch_hub ?? "",
      joined_date: initial?.joined_date ?? null,
      emergency_contact: initial?.emergency_contact ?? "",
      assigned_service_scope: initial?.assigned_service_scope ?? "both",
      assigned_location_scope: initial?.assigned_location_scope ?? "all",
      assigned_application_scope: initial?.assigned_application_scope ?? "both",
      assigned_channel_scope: initial?.assigned_channel_scope ?? "both",
    });
  }, [open, initial, allowedRoles]);

  const set = <K extends keyof StaffFormValues>(k: K, v: StaffFormValues[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.full_name?.trim()) { toast.error("Full name is required"); return; }
    if (!f.role) { toast.error("Role is required"); return; }
    if (!allowedRoles.find((r) => r.value === f.role)) {
      toast.error("You are not allowed to assign this role"); return;
    }

    const payload = {
      full_name: empty(f.full_name),
      username: empty(f.username),
      email: empty(f.email),
      phone_number: empty(f.phone_number),
      role: f.role,
      status: f.status,
      availability_status: f.availability_status,
      employment_status: f.employment_status,
      branch_hub: empty(f.branch_hub),
      joined_date: f.joined_date || null,
      emergency_contact: empty(f.emergency_contact),
      assigned_service_scope: f.assigned_service_scope,
      assigned_location_scope: f.assigned_location_scope,
      assigned_application_scope: f.assigned_application_scope,
      assigned_channel_scope: f.assigned_channel_scope,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        const { error } = await supabase.from("staff_profiles").insert(payload);
        if (error) throw error;
        toast.success("Staff account created");
      } else {
        if (!f.id) throw new Error("Missing staff id");
        const { error } = await supabase.from("staff_profiles").update(payload).eq("id", f.id);
        if (error) throw error;
        toast.success("Staff account updated");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const showScope = f.role === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Staff Account" : "Edit Staff Account"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new staff profile. A login account may need to be provisioned separately."
              : "Update profile details and assignment scope."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name *">
              <Input value={f.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Username">
              <Input value={f.username ?? ""} onChange={(e) => set("username", e.target.value)} maxLength={60} />
            </Field>
            <Field label="Email">
              <Input type="email" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} maxLength={255} />
            </Field>
            <Field label="Phone number">
              <Input value={f.phone_number ?? ""} onChange={(e) => set("phone_number", e.target.value)} maxLength={32} />
            </Field>
            <Field label="Role *">
              <Select value={f.role ?? undefined} onValueChange={(v) => set("role", v)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <PlainSelect value={f.status} onChange={(v) => set("status", v)} options={STATUS} />
            </Field>
            <Field label="Availability">
              <PlainSelect value={f.availability_status} onChange={(v) => set("availability_status", v)} options={AVAIL} />
            </Field>
            <Field label="Employment status">
              <PlainSelect value={f.employment_status} onChange={(v) => set("employment_status", v)} options={EMPLOY} />
            </Field>
            <Field label="Branch / Hub">
              <Input value={f.branch_hub ?? ""} onChange={(e) => set("branch_hub", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Joined date">
              <Input type="date" value={f.joined_date ?? ""} onChange={(e) => set("joined_date", e.target.value || null)} />
            </Field>
            <Field label="Emergency contact" className="sm:col-span-2">
              <Input value={f.emergency_contact ?? ""} onChange={(e) => set("emergency_contact", e.target.value)} maxLength={160} />
            </Field>
          </section>

          {showScope && (
            <section className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-charcoal">Assignment Scope</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Service Coverage">
                  <ScopeSelect value={f.assigned_service_scope} onChange={(v) => set("assigned_service_scope", v)} options={SERVICE_SCOPE_OPTIONS} />
                </Field>
                <Field label="Location Coverage">
                  <ScopeSelect value={f.assigned_location_scope} onChange={(v) => set("assigned_location_scope", v)} options={LOCATION_SCOPE_OPTIONS} />
                </Field>
                <Field label="Account Coverage">
                  <ScopeSelect value={f.assigned_application_scope} onChange={(v) => set("assigned_application_scope", v)} options={ACCOUNT_SCOPE_OPTIONS} />
                </Field>
                <Field label="Channel Coverage">
                  <ScopeSelect value={f.assigned_channel_scope} onChange={(v) => set("assigned_channel_scope", v)} options={CHANNEL_SCOPE_OPTIONS} />
                </Field>
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gradient-brand">
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {mode === "create" ? "Create staff" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-1.5 ${className ?? ""}`}>
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const PlainSelect = ({ value, onChange, options }: { value: string | null; onChange: (v: string) => void; options: string[] }) => (
  <Select value={value ?? undefined} onValueChange={onChange}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      {options.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
    </SelectContent>
  </Select>
);

const ScopeSelect = ({
  value, onChange, options,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) => (
  <Select value={value ?? undefined} onValueChange={onChange}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);
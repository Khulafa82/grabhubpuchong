import { useEffect, useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MessageCircle, Copy, Lock, Loader2, Save, AlertTriangle, Pencil, ExternalLink,
} from "lucide-react";
import {
  Customer, CUSTOMER_STATUS_OPTIONS, PRIORITY_OPTIONS,
  statusBadgeClass, priorityBadgeClass, waLink,
  BOLT_STATUS_OPTIONS, BOLT_STATUS_LABEL, boltStatusBadgeClass,
} from "@/lib/customers";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  EFText, EFTextarea, EFSelect, EFBool,
} from "./customer-detail/EditableField";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** True only when current auth.uid() === customer.admin_in_charge */
  editable: boolean;
  onSaved: () => void;
}

const SectionCard = ({
  title, children,
}: { title: string; children: React.ReactNode }) => (
  <Card className="p-5">
    <h4 className="text-sm font-semibold text-charcoal mb-4">{title}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
  </Card>
);

/* All editable string-ish keys in public.customers we expose to admins */
type FormState = {
  full_name: string;
  ic_number: string;
  email_address: string;
  phone_number: string;
  user_role: string;
  location_choice: string;
  state: string;
  account_status: string;
  blue_ic_status: boolean | null;
  license_type: string;
  criminal_record_status: string;
  eligibility_status: string;
  psv_license_status: string;
  has_car: boolean | null;
  car_model: string;
  car_year: string;
  has_motorcycle: boolean | null;
  motorcycle_details: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_manufacturer: string;
  insurance_status: string;
  insurance_name: string;
  insurance_expired_date: string;
  insurance_notes: string;
  psv_class_id: string;
  psv_class: string;
  psv_class_date: string;
  psv_class_location: string;
  bolt_url: string;
  remarks: string;
  bolt_status: string;
  customer_status: string;
  priority_status: string;
  next_follow_up_date: string;
  next_follow_up_time: string;
  walk_in_flag: boolean | null;
  duplicate_flag: boolean | null;
  duplicate_reason: string;
};

const toForm = (c: Customer): FormState => ({
  full_name: c.full_name ?? "",
  ic_number: c.ic_number ?? "",
  email_address: c.email_address ?? "",
  phone_number: c.phone_number ?? "",
  user_role: c.user_role ?? "",
  location_choice: c.location_choice ?? "",
  state: c.state ?? "",
  account_status: c.account_status ?? "",
  blue_ic_status: c.blue_ic_status ?? null,
  license_type: c.license_type ?? "",
  criminal_record_status: c.criminal_record_status ?? "",
  eligibility_status: c.eligibility_status ?? "",
  psv_license_status: c.psv_license_status ?? "",
  has_car: c.has_car ?? null,
  car_model: c.car_model ?? "",
  car_year: c.car_year != null ? String(c.car_year) : "",
  has_motorcycle: c.has_motorcycle ?? null,
  motorcycle_details: c.motorcycle_details ?? "",
  vehicle_type: c.vehicle_type ?? "",
  vehicle_model: c.vehicle_model ?? "",
  vehicle_manufacturer: c.vehicle_manufacturer ?? "",
  insurance_status: c.insurance_status ?? "",
  insurance_name: c.insurance_name ?? "",
  insurance_expired_date: c.insurance_expired_date?.slice(0, 10) ?? "",
  insurance_notes: c.insurance_notes ?? "",
  psv_class_id: c.psv_class_id ?? "",
  psv_class: c.psv_class ?? "",
  psv_class_date: c.psv_class_date?.slice(0, 10) ?? "",
  psv_class_location: c.psv_class_location ?? "",
  bolt_url: c.bolt_url ?? "",
  remarks: c.remarks ?? "",
  bolt_status: c.bolt_status ?? "bolt_submitted",
  customer_status: c.customer_status ?? "",
  priority_status: c.priority_status ?? "",
  next_follow_up_date: c.next_follow_up_date?.slice(0, 10) ?? "",
  next_follow_up_time: c.next_follow_up_time ?? "",
  walk_in_flag: c.walk_in_flag ?? null,
  duplicate_flag: c.duplicate_flag ?? null,
  duplicate_reason: c.duplicate_reason ?? "",
});

const USER_ROLE_OPTIONS = ["GrabCar", "GrabFood", "GrabExpress", "Bolt"];
const ACCOUNT_STATUS_OPTIONS = ["new", "active", "suspended", "closed"];
const ELIGIBILITY_OPTIONS = ["eligible", "not_eligible", "pending_review"];
const LICENSE_TYPE_OPTIONS = ["B", "B2", "D", "DA", "E", "E1", "E2", "GDL"];
const CRIMINAL_RECORD_OPTIONS = ["clean", "minor", "major", "pending_check"];
const PSV_LICENSE_OPTIONS = ["have", "dont_have", "in_progress", "expired"];
const INSURANCE_STATUS_OPTIONS = ["active", "expired", "pending", "none"];

export const CustomerDetailDrawer = ({
  customer, open, onOpenChange, editable, onSaved,
}: Props) => {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm(toForm(customer));
      // Debug ownership decision
      // eslint-disable-next-line no-console
      console.debug("[CustomerDetailDrawer] customer:", customer.id,
        "admin_in_charge:", customer.admin_in_charge,
        "editable:", editable);
    } else {
      setForm(null);
    }
  }, [customer, editable]);

  const isGrabCar = useMemo(
    () => (form?.user_role ?? customer?.user_role ?? "").toLowerCase() === "grabcar",
    [form, customer],
  );
  const isGrabFood = useMemo(
    () => (form?.user_role ?? customer?.user_role ?? "").toLowerCase() === "grabfood",
    [form, customer],
  );

  if (!customer || !form) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const copyPhone = () => {
    if (!customer.phone_number) return;
    navigator.clipboard?.writeText(customer.phone_number);
    toast.success("Phone copied");
  };

  const save = async () => {
    if (!editable) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      full_name: form.full_name || null,
      ic_number: form.ic_number || null,
      email_address: form.email_address || null,
      phone_number: form.phone_number || null,
      user_role: form.user_role || null,
      location_choice: form.location_choice || null,
      state: form.state || null,
      account_status: form.account_status || null,
      blue_ic_status: form.blue_ic_status,
      license_type: form.license_type || null,
      criminal_record_status: form.criminal_record_status || null,
      eligibility_status: form.eligibility_status || null,
      psv_license_status: form.psv_license_status || null,
      has_car: form.has_car,
      car_model: form.car_model || null,
      car_year: form.car_year ? Number(form.car_year) || null : null,
      has_motorcycle: form.has_motorcycle,
      motorcycle_details: form.motorcycle_details || null,
      vehicle_type: form.vehicle_type || null,
      vehicle_model: form.vehicle_model || null,
      vehicle_manufacturer: form.vehicle_manufacturer || null,
      insurance_status: form.insurance_status || null,
      insurance_name: form.insurance_name || null,
      insurance_expired_date: form.insurance_expired_date || null,
      insurance_notes: form.insurance_notes || null,
      psv_class_id: form.psv_class_id || null,
      psv_class: form.psv_class || null,
      psv_class_date: form.psv_class_date || null,
      psv_class_location: form.psv_class_location || null,
      bolt_url: form.bolt_url || null,
      remarks: form.remarks || null,
      bolt_status: form.bolt_status || "bolt_submitted",
      customer_status: form.customer_status || null,
      priority_status: form.priority_status || null,
      next_follow_up_date: form.next_follow_up_date || null,
      next_follow_up_time: form.next_follow_up_time || null,
      walk_in_flag: form.walk_in_flag,
      duplicate_flag: form.duplicate_flag,
      duplicate_reason: form.duplicate_reason || null,
    };

    const { error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", customer.id);
    setSaving(false);

    if (error) {
      console.error("[CustomerDetailDrawer] update failed:", error);
      toast.error(error.message || "Failed to update customer");
      return;
    }
    toast.success("Customer updated");
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <SheetHeader className="p-6 pb-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <SheetTitle className="text-xl text-charcoal truncate">
                  {customer.full_name ?? "Unnamed customer"}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {customer.applicant_id ?? "—"} · {customer.phone_number ?? "—"}
                </SheetDescription>
              </div>
              {editable ? (
                <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20 shrink-0">
                  <Pencil className="w-3 h-3 mr-1" /> Editable
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground shrink-0">
                  <Lock className="w-3 h-3 mr-1" /> Read-only
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customer.user_role && (
                <Badge variant="outline" className="bg-charcoal/5 text-charcoal border-charcoal/20">
                  {customer.user_role}
                </Badge>
              )}
              <Badge variant="outline" className={statusBadgeClass(customer.customer_status)}>
                {(customer.customer_status ?? "new").replace(/_/g, " ")}
              </Badge>
              {customer.walk_in_flag ? (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400">
                  Walk-in customer
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                    Registered online
                  </Badge>
                  <Badge variant="outline" className={priorityBadgeClass(customer.priority_status)}>
                    {(customer.priority_status ?? "normal").replace(/_/g, " ")}
                  </Badge>
                </>
              )}
              {customer.duplicate_flag && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  <AlertTriangle className="w-3 h-3 mr-1" /> duplicate
                </Badge>
              )}
              <Badge
                variant="outline"
                className={boltStatusBadgeClass(customer.bolt_status ?? "bolt_submitted")}
              >
                {BOLT_STATUS_LABEL[customer.bolt_status ?? "bolt_submitted"]}
              </Badge>
            </div>

            {/* Quick actions (always shown) */}
            <div className="flex flex-wrap gap-2 pt-2">
              {customer.bolt_url && customer.bolt_url.trim() !== "" && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  title="Open Bolt application link"
                  className="cursor-pointer"
                >
                  <a href={customer.bolt_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> BOLT LINK
                  </a>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <a href={waLink(customer.phone_number)} target="_blank" rel="noreferrer">
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={copyPhone}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy phone
              </Button>
              {editable && (
                <Button
                  size="sm"
                  className="bg-brand text-brand-foreground hover:bg-brand/90 ml-auto"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 pt-4">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="application">Application</TabsTrigger>
              <TabsTrigger value="vehicle">Vehicle / PSV</TabsTrigger>
              <TabsTrigger value="notes">Admin Notes</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-4">
              <SectionCard title="Workflow status">
                <EFSelect
                  label="Customer status"
                  editable={editable}
                  value={form.customer_status}
                  onChange={(v) => set("customer_status", v)}
                  options={CUSTOMER_STATUS_OPTIONS}
                />
                <EFSelect
                  label="Priority status"
                  editable={editable}
                  value={form.priority_status}
                  onChange={(v) => set("priority_status", v)}
                  options={PRIORITY_OPTIONS}
                />
                <EFBool
                  label="Walk-in"
                  editable={editable}
                  value={form.walk_in_flag}
                  onChange={(v) =>
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            walk_in_flag: v,
                            // Auto-elevate priority when marked walk-in
                            priority_status: v ? "urgent" : f.priority_status,
                          }
                        : f,
                    )
                  }
                />
                <EFBool
                  label="Duplicate"
                  editable={editable}
                  value={form.duplicate_flag}
                  onChange={(v) => set("duplicate_flag", v)}
                />
                <div className="sm:col-span-2">
                  <EFTextarea
                    label="Duplicate reason"
                    editable={editable}
                    value={form.duplicate_reason}
                    onChange={(v) => set("duplicate_reason", v)}
                    rows={2}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Registration summary">
                <EFText
                  label="Applicant ID"
                  editable={false}
                  value={customer.applicant_id}
                  onChange={() => {}}
                  mono
                  capitalize={false}
                />
                <EFText
                  label="Registration date"
                  editable={false}
                  value={
                    customer.registration_date
                      ? new Date(customer.registration_date).toLocaleDateString()
                      : customer.created_at
                        ? new Date(customer.created_at).toLocaleDateString()
                        : ""
                  }
                  onChange={() => {}}
                />
                <EFText
                  label="Last edited at"
                  editable={false}
                  value={customer.updated_at ? new Date(customer.updated_at).toLocaleString() : ""}
                  onChange={() => {}}
                />
                <EFText
                  label="Assigned admin"
                  editable={false}
                  value={editable ? "You" : (customer.assigned_admin_name ?? "Unassigned")}
                  onChange={() => {}}
                />
              </SectionCard>
            </TabsContent>

            {/* PERSONAL */}
            <TabsContent value="personal" className="space-y-4">
              <SectionCard title="Personal information">
                <EFText label="Full name" editable={editable} value={form.full_name} onChange={(v) => set("full_name", v)} />
                <EFText label="IC number" editable={editable} value={form.ic_number} onChange={(v) => set("ic_number", v)} mono capitalize={false} />
                <EFText label="Email address" editable={editable} value={form.email_address} onChange={(v) => set("email_address", v)} type="email" capitalize={false} />
                <EFText label="Phone number" editable={editable} value={form.phone_number} onChange={(v) => set("phone_number", v)} type="tel" mono capitalize={false} />
                <EFText label="State" editable={editable} value={form.state} onChange={(v) => set("state", v)} />
                <EFText label="Location choice" editable={editable} value={form.location_choice} onChange={(v) => set("location_choice", v)} />
              </SectionCard>
            </TabsContent>

            {/* APPLICATION */}
            <TabsContent value="application" className="space-y-4">
              <SectionCard title="Application information">
                <EFSelect
                  label="Service / user role"
                  editable={editable}
                  value={form.user_role}
                  onChange={(v) => set("user_role", v)}
                  options={USER_ROLE_OPTIONS}
                />
                <EFSelect
                  label="Account status"
                  editable={editable}
                  value={form.account_status}
                  onChange={(v) => set("account_status", v)}
                  options={ACCOUNT_STATUS_OPTIONS}
                />
                <EFSelect
                  label="Eligibility status"
                  editable={editable}
                  value={form.eligibility_status}
                  onChange={(v) => set("eligibility_status", v)}
                  options={ELIGIBILITY_OPTIONS}
                />
                <EFBool
                  label="Blue IC"
                  editable={editable}
                  value={form.blue_ic_status}
                  onChange={(v) => set("blue_ic_status", v)}
                />
                <EFSelect
                  label="License type"
                  editable={editable}
                  value={form.license_type}
                  onChange={(v) => set("license_type", v)}
                  options={LICENSE_TYPE_OPTIONS}
                />
                <EFSelect
                  label="Criminal record"
                  editable={editable}
                  value={form.criminal_record_status}
                  onChange={(v) => set("criminal_record_status", v)}
                  options={CRIMINAL_RECORD_OPTIONS}
                />
              </SectionCard>
            </TabsContent>

            {/* VEHICLE / PSV */}
            <TabsContent value="vehicle" className="space-y-4">
              {(isGrabCar || (!isGrabFood && (form.has_car || form.car_model))) && (
                <SectionCard title="GrabCar / Vehicle / PSV">
                  <EFSelect
                    label="PSV license"
                    editable={editable}
                    value={form.psv_license_status}
                    onChange={(v) => set("psv_license_status", v)}
                    options={PSV_LICENSE_OPTIONS}
                  />
                  <EFBool label="Has car" editable={editable} value={form.has_car} onChange={(v) => set("has_car", v)} />
                  <EFText label="Car model" editable={editable} value={form.car_model} onChange={(v) => set("car_model", v)} />
                  <EFText label="Car year" editable={editable} value={form.car_year} onChange={(v) => set("car_year", v)} type="number" capitalize={false} />
                  <EFText label="Vehicle type" editable={editable} value={form.vehicle_type} onChange={(v) => set("vehicle_type", v)} />
                  <EFText label="Vehicle model" editable={editable} value={form.vehicle_model} onChange={(v) => set("vehicle_model", v)} />
                  <EFText label="Vehicle manufacturer" editable={editable} value={form.vehicle_manufacturer} onChange={(v) => set("vehicle_manufacturer", v)} />
                  <EFSelect
                    label="Insurance status"
                    editable={editable}
                    value={form.insurance_status}
                    onChange={(v) => set("insurance_status", v)}
                    options={INSURANCE_STATUS_OPTIONS}
                  />
                  <EFText label="Insurance name" editable={editable} value={form.insurance_name} onChange={(v) => set("insurance_name", v)} />
                  <EFText label="Insurance expired" editable={editable} value={form.insurance_expired_date} onChange={(v) => set("insurance_expired_date", v)} type="date" capitalize={false} />
                  <div className="sm:col-span-2">
                    <EFTextarea label="Insurance notes" editable={editable} value={form.insurance_notes} onChange={(v) => set("insurance_notes", v)} rows={2} />
                  </div>
                </SectionCard>
              )}

              {(isGrabFood || form.has_motorcycle || form.motorcycle_details) && (
                <SectionCard title="GrabFood / Motorcycle">
                  <EFBool label="Has motorcycle" editable={editable} value={form.has_motorcycle} onChange={(v) => set("has_motorcycle", v)} />
                  <EFText label="Vehicle type" editable={editable} value={form.vehicle_type} onChange={(v) => set("vehicle_type", v)} />
                  <EFText label="Vehicle model" editable={editable} value={form.vehicle_model} onChange={(v) => set("vehicle_model", v)} />
                  <EFText label="Vehicle manufacturer" editable={editable} value={form.vehicle_manufacturer} onChange={(v) => set("vehicle_manufacturer", v)} />
                  <div className="sm:col-span-2">
                    <EFTextarea label="Motorcycle details" editable={editable} value={form.motorcycle_details} onChange={(v) => set("motorcycle_details", v)} rows={2} />
                  </div>
                </SectionCard>
              )}

              <SectionCard title="PSV class info">
                <EFText label="PSV class ID" editable={editable} value={form.psv_class_id} onChange={(v) => set("psv_class_id", v)} mono capitalize={false} />
                <EFText label="PSV class" editable={editable} value={form.psv_class} onChange={(v) => set("psv_class", v)} />
                <EFText label="PSV class date" editable={editable} value={form.psv_class_date} onChange={(v) => set("psv_class_date", v)} type="date" capitalize={false} />
                <EFText label="PSV class location" editable={editable} value={form.psv_class_location} onChange={(v) => set("psv_class_location", v)} />
              </SectionCard>
            </TabsContent>

            {/* NOTES */}
            <TabsContent value="notes" className="space-y-4">
              <SectionCard title="Admin internal fields">
                <div className="sm:col-span-2 min-w-0 space-y-1">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-normal">
                    Bolt status
                  </Label>
                  {editable ? (
                    <Select
                      value={form.bolt_status || "bolt_submitted"}
                      onValueChange={(v) => set("bolt_status", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BOLT_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>{BOLT_STATUS_LABEL[o]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-0.5">
                      <Badge
                        variant="outline"
                        className={boltStatusBadgeClass(form.bolt_status || "bolt_submitted")}
                      >
                        {BOLT_STATUS_LABEL[form.bolt_status || "bolt_submitted"]}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <EFText
                    label="Bolt URL"
                    editable={editable}
                    value={form.bolt_url}
                    onChange={(v) => set("bolt_url", v)}
                    type="url"
                    capitalize={false}
                  />
                  {!editable && form.bolt_url && (
                    <a
                      href={form.bolt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand underline break-all text-xs"
                    >
                      {form.bolt_url}
                    </a>
                  )}
                </div>
                <EFText
                  label="Next follow-up date"
                  editable={editable}
                  value={form.next_follow_up_date}
                  onChange={(v) => set("next_follow_up_date", v)}
                  type="date"
                  capitalize={false}
                />
                <EFText
                  label="Next follow-up time"
                  editable={editable}
                  value={form.next_follow_up_time}
                  onChange={(v) => set("next_follow_up_time", v)}
                  type="time"
                  capitalize={false}
                />
                <div className="sm:col-span-2">
                  <EFTextarea
                    label="Remarks"
                    editable={editable}
                    value={form.remarks}
                    onChange={(v) => set("remarks", v)}
                    rows={4}
                    placeholder="Add notes about this customer..."
                  />
                </div>
              </SectionCard>

              {editable ? (
                <div className="flex justify-end">
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save changes
                  </Button>
                </div>
              ) : (
                <Card className="p-4 text-sm text-muted-foreground border-dashed">
                  This customer is not assigned to you. You have read-only access.
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CustomerDetailDrawer;

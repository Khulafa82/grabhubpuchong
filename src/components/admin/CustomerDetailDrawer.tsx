import { useEffect, useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Phone, MessageCircle, Copy, CheckCircle2, Lock, Loader2, Save, AlertTriangle,
} from "lucide-react";
import {
  Customer, CUSTOMER_STATUS_OPTIONS, statusBadgeClass, priorityBadgeClass,
  telLink, waLink,
} from "@/lib/customers";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editable: boolean;
  onSaved: () => void;
}

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
const fmtDateTime = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");
const dash = (v?: string | number | null) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const Field = ({
  label, value, mono, capitalize = true,
}: { label: string; value?: React.ReactNode; mono?: boolean; capitalize?: boolean }) => (
  <div className="min-w-0">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div
      className={`mt-0.5 text-sm text-charcoal break-words ${mono ? "font-mono" : ""} ${
        capitalize ? "first-letter:uppercase" : ""
      }`}
    >
      {typeof value === "string" || typeof value === "number"
        ? String(value).replace(/_/g, " ")
        : value ?? "—"}
    </div>
  </div>
);

const YesNo = ({ value }: { value?: boolean | null }) => {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge
      variant="outline"
      className={
        value
          ? "bg-brand/10 text-brand border-brand/20"
          : "bg-muted text-muted-foreground border-border"
      }
    >
      {value ? "Yes" : "No"}
    </Badge>
  );
};

const SectionCard = ({
  title, children,
}: { title: string; children: React.ReactNode }) => (
  <Card className="p-5">
    <h4 className="text-sm font-semibold text-charcoal mb-4">{title}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
  </Card>
);

export const CustomerDetailDrawer = ({
  customer, open, onOpenChange, editable, onSaved,
}: Props) => {
  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [followTime, setFollowTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setStatus(customer.customer_status ?? "");
      setRemarks(customer.remarks ?? "");
      setFollowDate(customer.next_follow_up_date?.slice(0, 10) ?? "");
      setFollowTime(customer.next_follow_up_time ?? "");
    }
  }, [customer]);

  const isGrabCar = useMemo(() => (customer?.user_role ?? "").toLowerCase() === "grabcar", [customer]);
  const isGrabFood = useMemo(() => (customer?.user_role ?? "").toLowerCase() === "grabfood", [customer]);

  if (!customer) return null;

  const copyPhone = () => {
    if (!customer.phone_number) return;
    navigator.clipboard?.writeText(customer.phone_number);
    toast.success("Phone copied");
  };

  const markContacted = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({ customer_status: "contacted" })
      .eq("id", customer.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setStatus("contacted");
    toast.success("Marked as contacted");
    onSaved();
  };

  const save = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      remarks: remarks || null,
      next_follow_up_date: followDate || null,
      next_follow_up_time: followTime || null,
    };
    if (status) payload.customer_status = status;
    const { error } = await supabase.from("customers").update(payload).eq("id", customer.id);
    setSaving(false);
    if (error) return toast.error(error.message || "Failed to update");
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
              {!editable && (
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
              <Badge variant="outline" className={priorityBadgeClass(customer.priority_status)}>
                {(customer.priority_status ?? "normal").replace(/_/g, " ")}
              </Badge>
              {customer.account_status && (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  {customer.account_status}
                </Badge>
              )}
              {customer.duplicate_flag && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  <AlertTriangle className="w-3 h-3 mr-1" /> duplicate
                </Badge>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" variant="outline">
                <a href={telLink(customer.phone_number)}>
                  <Phone className="w-3.5 h-3.5 mr-1" /> Call
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={waLink(customer.phone_number)} target="_blank" rel="noreferrer">
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={copyPhone}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy phone
              </Button>
              {editable && (
                <Button size="sm" variant="outline" onClick={markContacted} disabled={saving}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark contacted
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
              <SectionCard title="Registration summary">
                <Field label="Applicant ID" value={customer.applicant_id} mono capitalize={false} />
                <Field label="Registration date" value={fmtDate(customer.registration_date ?? customer.created_at)} />
                <Field label="Created at" value={fmtDateTime(customer.created_at)} />
                <Field label="Updated at" value={fmtDateTime(customer.updated_at)} />
                <Field label="Last edited at" value={fmtDateTime(customer.updated_at)} />
                <Field
                  label="Assigned admin"
                  value={
                    editable
                      ? <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">You</Badge>
                      : customer.assigned_admin_name ?? <span className="text-muted-foreground italic">Unassigned</span>
                  }
                />
                <Field
                  label="Assignment status"
                  value={
                    customer.assignment_status
                      ? <Badge variant="outline" className="bg-muted text-muted-foreground">{customer.assignment_status.replace(/_/g, " ")}</Badge>
                      : null
                  }
                />
                <Field
                  label="Customer status"
                  value={
                    <Badge variant="outline" className={statusBadgeClass(customer.customer_status)}>
                      {(customer.customer_status ?? "new").replace(/_/g, " ")}
                    </Badge>
                  }
                />
                <Field
                  label="Priority status"
                  value={
                    <Badge variant="outline" className={priorityBadgeClass(customer.priority_status)}>
                      {(customer.priority_status ?? "normal").replace(/_/g, " ")}
                    </Badge>
                  }
                />
                <Field label="Walk-in" value={<YesNo value={customer.walk_in_flag ?? customer.priority_status === "walk_in"} />} />
                <Field label="Duplicate" value={<YesNo value={customer.duplicate_flag} />} />
                {customer.duplicate_flag && (
                  <div className="sm:col-span-2">
                    <Field label="Duplicate reason" value={customer.duplicate_reason} />
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            {/* PERSONAL */}
            <TabsContent value="personal" className="space-y-4">
              <SectionCard title="Personal information">
                <Field label="Full name" value={customer.full_name} />
                <Field label="IC number" value={customer.ic_number} mono capitalize={false} />
                <Field label="Email address" value={customer.email_address} capitalize={false} />
                <Field label="Phone number" value={customer.phone_number} mono capitalize={false} />
                <Field label="State" value={customer.state} />
                <Field label="Location choice" value={customer.location_choice} />
              </SectionCard>
            </TabsContent>

            {/* APPLICATION */}
            <TabsContent value="application" className="space-y-4">
              <SectionCard title="Application information">
                <Field
                  label="Service / user role"
                  value={
                    customer.user_role
                      ? <Badge variant="outline" className="bg-charcoal/5 text-charcoal border-charcoal/20">{customer.user_role}</Badge>
                      : null
                  }
                />
                <Field
                  label="Account status"
                  value={
                    customer.account_status
                      ? <Badge variant="outline" className="bg-muted text-muted-foreground">{customer.account_status}</Badge>
                      : null
                  }
                />
                <Field
                  label="Eligibility status"
                  value={
                    customer.eligibility_status
                      ? <Badge variant="outline" className={statusBadgeClass(customer.eligibility_status)}>{customer.eligibility_status.replace(/_/g, " ")}</Badge>
                      : null
                  }
                />
                <Field label="Blue IC" value={<YesNo value={customer.blue_ic_status} />} />
                <Field label="License type" value={customer.license_type} />
                <Field label="Criminal record" value={customer.criminal_record_status} />
              </SectionCard>
            </TabsContent>

            {/* VEHICLE / PSV */}
            <TabsContent value="vehicle" className="space-y-4">
              {isGrabCar && (
                <>
                  <SectionCard title="GrabCar / Vehicle / PSV">
                    <Field label="PSV license status" value={customer.psv_license_status} />
                    <Field label="Has car" value={<YesNo value={customer.has_car} />} />
                    <Field label="Car model" value={customer.car_model} />
                    <Field label="Car year" value={dash(customer.car_year)} capitalize={false} />
                    <Field label="Vehicle type" value={customer.vehicle_type} />
                    <Field label="Vehicle model" value={customer.vehicle_model} />
                    <Field label="Vehicle manufacturer" value={customer.vehicle_manufacturer} />
                    <Field label="Insurance status" value={customer.insurance_status} />
                    <Field label="Insurance name" value={customer.insurance_name} />
                    <Field label="Insurance expired" value={fmtDate(customer.insurance_expired_date)} />
                    <div className="sm:col-span-2">
                      <Field label="Insurance notes" value={customer.insurance_notes} />
                    </div>
                  </SectionCard>
                  <SectionCard title="PSV class info">
                    <Field label="PSV class ID" value={customer.psv_class_id} mono capitalize={false} />
                    <Field label="PSV class" value={customer.psv_class} />
                    <Field label="PSV class date" value={fmtDate(customer.psv_class_date)} />
                    <Field label="PSV class location" value={customer.psv_class_location} />
                  </SectionCard>
                </>
              )}

              {isGrabFood && (
                <SectionCard title="GrabFood / Motorcycle">
                  <Field label="Has motorcycle" value={<YesNo value={customer.has_motorcycle} />} />
                  <Field label="Vehicle type" value={customer.vehicle_type} />
                  <Field label="Vehicle model" value={customer.vehicle_model} />
                  <Field label="Vehicle manufacturer" value={customer.vehicle_manufacturer} />
                  <div className="sm:col-span-2">
                    <Field label="Motorcycle details" value={customer.motorcycle_details} />
                  </div>
                </SectionCard>
              )}

              {!isGrabCar && !isGrabFood && (
                <Card className="p-6 text-sm text-muted-foreground border-dashed text-center">
                  No service type set for this customer — vehicle details are unavailable.
                </Card>
              )}
            </TabsContent>

            {/* NOTES */}
            <TabsContent value="notes" className="space-y-4">
              <SectionCard title="Admin internal fields">
                <div className="sm:col-span-2">
                  <Field
                    label="Bolt URL"
                    capitalize={false}
                    value={
                      customer.bolt_url
                        ? (
                          <a
                            href={customer.bolt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand underline break-all"
                          >
                            {customer.bolt_url}
                          </a>
                        )
                        : null
                    }
                  />
                </div>
                <Field label="Next follow-up date" value={fmtDate(customer.next_follow_up_date)} />
                <Field label="Next follow-up time" value={dash(customer.next_follow_up_time)} capitalize={false} />
                <div className="sm:col-span-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Remarks</div>
                  <div className="mt-1 p-3 rounded-md bg-surface-muted text-sm whitespace-pre-wrap min-h-[60px]">
                    {customer.remarks ?? "—"}
                  </div>
                </div>
              </SectionCard>

              {editable ? (
                <Card className="p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-charcoal">Update workflow</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          {CUSTOMER_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Next follow-up date</Label>
                      <Input type="date" value={followDate} onChange={(e) => setFollowDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Next follow-up time</Label>
                      <Input type="time" value={followTime} onChange={(e) => setFollowTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Remarks</Label>
                    <Textarea
                      rows={4}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add notes about this customer..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={save} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save changes
                    </Button>
                  </div>
                </Card>
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
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PsvClass, PSV_WORKFLOW, classCapacityState, derivePsvClassStatus } from "@/lib/psv";
import { PsvRole } from "./PsvCalendarPage";

interface Eligible {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  applicant_id: string | null;
  customer_status: string | null;
  admin_in_charge: string | null;
  psv_license_status: string | null;
  admin_name?: string | null;
}

// Eligible = GrabCar customers without a PSV license, not yet assigned to any class.
const ELIGIBLE_STATUSES = ["new", "contacted", "psv_required", "under_review"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  psvClass: PsvClass;
  myId: string | null;
  role: PsvRole;
  existingCustomerIds: Set<string>;
  onAssigned: () => void;
}

export const AssignCustomerDialog = ({
  open,
  onOpenChange,
  psvClass,
  myId,
  role,
  existingCustomerIds,
  onAssigned,
}: Props) => {
  const [rows, setRows] = useState<Eligible[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("customers")
        .select("id, full_name, phone_number, applicant_id, customer_status, admin_in_charge, psv_license_status")
        .eq("user_role", "GrabCar")
        .or("psv_license_status.is.null,psv_license_status.eq.no_psv")
        .is("psv_class_id", null)
        .in("customer_status", ELIGIBLE_STATUSES)
        .order("updated_at", { ascending: false, nullsFirst: false });
      const { data, error } = await q.limit(200);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setRows([]);
      } else {
        const list = (data ?? []) as Eligible[];
        const adminIds = Array.from(
          new Set(list.map((r) => r.admin_in_charge).filter(Boolean) as string[]),
        );
        if (adminIds.length) {
          const { data: admins } = await supabase
            .from("staff_profiles")
            .select("id, full_name")
            .in("id", adminIds);
          const map = new Map<string, string | null>();
          (admins ?? []).forEach((a: any) => map.set(a.id, a.full_name ?? null));
          list.forEach((r) => {
            r.admin_name = r.admin_in_charge ? map.get(r.admin_in_charge) ?? null : null;
          });
        }
        setRows(list);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const state = classCapacityState(psvClass);
  const cap = psvClass.capacity ?? 0;
  const booked = psvClass.booked_count ?? 0;
  const available = psvClass.available_slots ?? Math.max(cap - booked, 0);
  const isFull = state === "Full" || available <= 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !existingCustomerIds.has(r.id))
      .filter((r) => {
        if (!q) return true;
        return (
          (r.full_name ?? "").toLowerCase().includes(q) ||
          (r.phone_number ?? "").toLowerCase().includes(q) ||
          (r.applicant_id ?? "").toLowerCase().includes(q)
        );
      });
  }, [rows, search, existingCustomerIds]);

  const assign = async (customer: Eligible) => {
    if (isFull) {
      toast.error("This class is full. Cannot assign more customers.");
      return;
    }
    if (!myId) {
      toast.error("You must be signed in.");
      return;
    }
    setBusyId(customer.id);
    const { error } = await supabase.from("psv_class_customers").insert({
      class_id: psvClass.id,
      customer_id: customer.id,
      assigned_by: myId,
      attendance_status: "Pending",
      psv_workflow_status: PSV_WORKFLOW.ASSIGNED,
    });
    if (error) {
      setBusyId(null);
      toast.error(error.message);
      return;
    }
    // Mirror class info onto the customer record.
    const { error: custErr } = await supabase
      .from("customers")
      .update({
        psv_class_id: psvClass.id,
        psv_class: psvClass.title,
        psv_class_date: psvClass.class_date,
        psv_class_location: psvClass.location,
        customer_status: "psv_required",
      })
      .eq("id", customer.id);
    if (custErr) {
      setBusyId(null);
      toast.error(custErr.message);
      return;
    }
    // Increment booked_count / decrement available_slots and keep status in sync.
    const newBooked = booked + 1;
    const newAvail = Math.max(cap - newBooked, 0);
    const { error: classErr } = await supabase
      .from("psv_classes")
      .update({
        booked_count: newBooked,
        available_slots: newAvail,
        status: derivePsvClassStatus(cap, newBooked, psvClass.status),
      })
      .eq("id", psvClass.id);
    if (classErr) {
      setBusyId(null);
      toast.error(classErr.message);
      return;
    }
    setBusyId(null);
    toast.success(`${customer.full_name ?? "Customer"} assigned to class`);
    onAssigned();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Customer to PSV Class</DialogTitle>
          <DialogDescription>
            {psvClass.title ?? "PSV class"} · {available} slot{available === 1 ? "" : "s"} available
          </DialogDescription>
        </DialogHeader>

        {isFull && (
          <div className="p-3 rounded border border-destructive/40 bg-destructive/5 text-sm text-destructive">
            Class is full. New assignments are blocked.
          </div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or applicant ID…"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No eligible customers found.
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-charcoal truncate">{c.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.applicant_id ?? "—"} · {c.phone_number ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    Admin: {c.admin_name ?? "—"} · PSV: {c.psv_license_status ?? "no_psv"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline">{c.customer_status ?? "—"}</Badge>
                  <Button
                    size="sm"
                    disabled={isFull || busyId === c.id}
                    onClick={() => assign(c)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {busyId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

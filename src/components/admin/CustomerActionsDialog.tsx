import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Customer, CUSTOMER_STATUS_OPTIONS } from "@/lib/customers";
import { Loader2 } from "lucide-react";

interface Props {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

export const CustomerActionsDialog = ({ customer, open, onOpenChange, onSaved }: Props) => {
  const [status, setStatus] = useState(customer?.customer_status ?? "");
  const [remarks, setRemarks] = useState(customer?.remarks ?? "");
  const [followUp, setFollowUp] = useState(customer?.next_follow_up_date?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  // Re-sync when customer changes
  if (customer && customer.id !== (customer as Customer & { _last?: string })._last) {
    // noop placeholder; we rely on key on dialog
  }

  const save = async () => {
    if (!customer) return;
    setSaving(true);
    const payload: Record<string, unknown> = {};
    if (status) payload.customer_status = status;
    payload.remarks = remarks || null;
    payload.next_follow_up_date = followUp || null;
    const { error } = await supabase.from("customers").update(payload).eq("id", customer.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to update customer");
      return;
    }
    toast.success("Customer updated");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer?.full_name ?? "Customer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            {customer?.applicant_id} · {customer?.phone_number}
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label>Next follow-up date</Label>
            <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add notes about this customer..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

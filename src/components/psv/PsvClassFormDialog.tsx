import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CLASS_STATUS_OPTIONS, PsvClass } from "@/lib/psv";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: PsvClass | null;
  defaultDate?: string | null;
  onSaved: () => void;
}

const empty = (date?: string | null) => ({
  title: "",
  class_date: date ?? "",
  start_time: "",
  end_time: "",
  location: "",
  capacity: "20",
  instructor: "",
  notes: "",
  status: "Open",
});

export const PsvClassFormDialog = ({ open, onOpenChange, initial, defaultDate, onSaved }: Props) => {
  const [form, setForm] = useState(empty(defaultDate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title ?? "",
        class_date: initial.class_date?.slice(0, 10) ?? "",
        start_time: initial.start_time?.slice(0, 5) ?? "",
        end_time: initial.end_time?.slice(0, 5) ?? "",
        location: initial.location ?? "",
        capacity: String(initial.capacity ?? 20),
        instructor: initial.instructor ?? "",
        notes: initial.notes ?? "",
        status: initial.status ?? "Open",
      });
    } else {
      setForm(empty(defaultDate));
    }
  }, [open, initial, defaultDate]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.class_date) return toast.error("Date is required");
    const cap = Number(form.capacity);
    if (!Number.isFinite(cap) || cap <= 0) return toast.error("Capacity must be > 0");

    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      class_date: form.class_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      capacity: cap,
      instructor: form.instructor || null,
      notes: form.notes || null,
      status: form.status,
    };
    const q = initial
      ? supabase.from("psv_classes").update(payload).eq("id", initial.id)
      : supabase.from("psv_classes").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Class updated" : "Class created");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit PSV class" : "New PSV class"}</DialogTitle>
          <DialogDescription>Schedule a class. Capacity controls overbooking.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. PSV Class — Batch A" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date">
              <Input type="date" value={form.class_date} onChange={(e) => set("class_date", e.target.value)} />
            </Field>
            <Field label="Start time">
              <Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
            </Field>
            <Field label="End time">
              <Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Venue / address" />
            </Field>
            <Field label="Instructor">
              <Input value={form.instructor} onChange={(e) => set("instructor", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity">
              <Input type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASS_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {initial ? "Save changes" : "Create class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
  </div>
);
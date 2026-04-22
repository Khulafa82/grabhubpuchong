import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  SERVICE_SCOPE_OPTIONS, LOCATION_SCOPE_OPTIONS, ACCOUNT_SCOPE_OPTIONS, CHANNEL_SCOPE_OPTIONS,
  StaffScope,
} from "@/lib/scope";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staffId: string | null;
  staffName?: string | null;
  initial?: Partial<StaffScope> | null;
  readOnly?: boolean;
  onSaved?: () => void;
}

export const ManageScopeDialog = ({
  open, onOpenChange, staffId, staffName, initial, readOnly, onSaved,
}: Props) => {
  const [service, setService] = useState<string>("both");
  const [location, setLocation] = useState<string>("all");
  const [account, setAccount] = useState<string>("both");
  const [channel, setChannel] = useState<string>("both");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setService(initial?.assigned_service_scope ?? "both");
    setLocation(initial?.assigned_location_scope ?? "all");
    setAccount(initial?.assigned_application_scope ?? "both");
    setChannel(initial?.assigned_channel_scope ?? "both");
  }, [open, initial]);

  const save = async () => {
    if (!staffId) return;
    setSaving(true);
    const { error } = await supabase
      .from("staff_profiles")
      .update({
        assigned_service_scope: service,
        assigned_location_scope: location,
        assigned_application_scope: account,
        assigned_channel_scope: channel,
      })
      .eq("id", staffId);
    setSaving(false);
    if (error) {
      toast.error(`Failed to save scope: ${error.message}`);
      return;
    }
    toast.success("Scope updated");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Assignment Scope</DialogTitle>
          <DialogDescription>
            {staffName ? `Configure which customers ${staffName} handles.` : "Configure assignment scope."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ScopeSelect
            label="Service Coverage"
            value={service}
            onChange={setService}
            options={SERVICE_SCOPE_OPTIONS}
            disabled={readOnly}
          />
          <ScopeSelect
            label="Location Coverage"
            value={location}
            onChange={setLocation}
            options={LOCATION_SCOPE_OPTIONS}
            disabled={readOnly}
          />
          <ScopeSelect
            label="Account Coverage"
            value={account}
            onChange={setAccount}
            options={ACCOUNT_SCOPE_OPTIONS}
            disabled={readOnly}
          />
          <ScopeSelect
            label="Channel Coverage"
            value={channel}
            onChange={setChannel}
            options={CHANNEL_SCOPE_OPTIONS}
            disabled={readOnly}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button onClick={save} disabled={saving || !staffId}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Save scope
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ScopeSelect = ({
  label, value, onChange, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled?: boolean;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
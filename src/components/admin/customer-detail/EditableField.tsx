import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Common = {
  label: string;
  editable: boolean;
  capitalize?: boolean;
  mono?: boolean;
};

const ReadOnlyValue = ({
  value, mono, capitalize = true, format,
}: { value: unknown; mono?: boolean; capitalize?: boolean; format?: (v: unknown) => string }) => {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : format
        ? format(value)
        : typeof value === "boolean"
          ? (value ? "Yes" : "No")
          : String(value).replace(/_/g, " ");
  return (
    <div
      className={`mt-0.5 text-sm text-charcoal break-words ${mono ? "font-mono" : ""} ${
        capitalize && display !== "—" ? "first-letter:uppercase" : ""
      }`}
    >
      {display}
    </div>
  );
};

const FieldShell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0 space-y-1">
    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-normal">
      {label}
    </Label>
    {children}
  </div>
);

/* ---------- Text input ---------- */
export const EFText = ({
  label, value, onChange, editable, type = "text", mono, capitalize, placeholder,
}: Common & {
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel" | "number" | "url" | "date" | "time";
  placeholder?: string;
}) => (
  <FieldShell label={label}>
    {editable ? (
      <Input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9"
      />
    ) : (
      <ReadOnlyValue
        value={value}
        mono={mono}
        capitalize={capitalize}
        format={type === "date" ? (v) => new Date(String(v)).toLocaleDateString() : undefined}
      />
    )}
  </FieldShell>
);

/* ---------- Textarea ---------- */
export const EFTextarea = ({
  label, value, onChange, editable, rows = 3, placeholder,
}: Common & {
  value: string | null | undefined;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) => (
  <FieldShell label={label}>
    {editable ? (
      <Textarea
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div className="mt-0.5 p-3 rounded-md bg-surface-muted text-sm whitespace-pre-wrap min-h-[60px]">
        {value ?? "—"}
      </div>
    )}
  </FieldShell>
);

/* ---------- Select ---------- */
export const EFSelect = ({
  label, value, onChange, editable, options, placeholder,
}: Common & {
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) => (
  <FieldShell label={label}>
    {editable ? (
      <Select value={value ?? ""} onValueChange={(v) => onChange(v)}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder ?? "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <ReadOnlyValue value={value} />
    )}
  </FieldShell>
);

/* ---------- Boolean (Yes/No switch) ---------- */
export const EFBool = ({
  label, value, onChange, editable,
}: Common & {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
}) => (
  <FieldShell label={label}>
    {editable ? (
      <div className="h-9 flex items-center gap-2">
        <Switch checked={!!value} onCheckedChange={onChange} />
        <span className="text-sm text-muted-foreground">{value ? "Yes" : "No"}</span>
      </div>
    ) : (
      <ReadOnlyValue value={value} />
    )}
  </FieldShell>
);
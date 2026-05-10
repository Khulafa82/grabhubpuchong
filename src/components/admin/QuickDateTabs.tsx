import { Customer } from "@/lib/customers";
import { cn } from "@/lib/utils";

export type QuickDateRange = "today" | "week" | "month" | "all";

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  // Monday as start of week
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
};

const startOfMonth = (d: Date) => {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
};

export const inQuickRange = (
  dateStr: string | null | undefined,
  range: QuickDateRange,
): boolean => {
  if (range === "all") return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === "today") {
    return startOfDay(d).getTime() === startOfDay(now).getTime();
  }
  if (range === "week") {
    const ws = startOfWeek(now).getTime();
    const we = ws + 7 * 86400000;
    const t = d.getTime();
    return t >= ws && t < we;
  }
  if (range === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  return true;
};

export const filterByQuickRange = (rows: Customer[], range: QuickDateRange) =>
  rows.filter((r) => inQuickRange(r.registration_date ?? r.created_at, range));

interface Props {
  rows: Customer[];
  value: QuickDateRange;
  onChange: (v: QuickDateRange) => void;
}

export const QuickDateTabs = ({ rows, value, onChange }: Props) => {
  const tabs: { key: QuickDateRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const count = filterByQuickRange(rows, t.key).length;
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
              active
                ? "bg-brand text-brand-foreground border-brand"
                : "bg-card text-charcoal border-border hover:bg-surface-muted",
            )}
          >
            {t.label} ({count})
          </button>
        );
      })}
    </div>
  );
};
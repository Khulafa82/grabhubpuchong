import type { ComponentType } from "react";
import { Card } from "@/components/ui/card";

export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  accent?: "brand" | "charcoal" | "muted";
}) => (
  <Card className="p-5 shadow-card-hover">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-charcoal mt-2">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        accent === "brand" ? "bg-brand/10 text-brand" : accent === "charcoal" ? "bg-charcoal/10 text-charcoal" : "bg-muted text-muted-foreground"
      }`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </Card>
);

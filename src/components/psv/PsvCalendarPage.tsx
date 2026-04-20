import { useMemo, useState } from "react";
import { Calendar, Clock, MapPin, Users, Loader2, Plus, RefreshCcw, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAuth } from "@/context/AuthContext";
import { usePsvClasses } from "@/hooks/usePsvClasses";
import {
  PsvClass,
  classBadgeClass,
  classCapacityState,
  formatTimeRange,
} from "@/lib/psv";
import { PsvClassDetailDialog } from "./PsvClassDetailDialog";

export type PsvRole = "admin" | "boss" | "it_tech" | "super_admin";

interface Props {
  role: PsvRole;
  title?: string;
  description?: string;
}

export const PsvCalendarPage = ({
  role,
  title = "PSV Calendar",
  description,
}: Props) => {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const { data, loading, error, refetch } = usePsvClasses();
  const [active, setActive] = useState<PsvClass | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = useMemo(() => {
    const upcoming = data.filter((c) => {
      if (!c.class_date) return false;
      return new Date(c.class_date) >= today;
    });
    const open = data.filter((c) => classCapacityState(c) === "Open").length;
    const almost = data.filter((c) => classCapacityState(c) === "Almost Full").length;
    const full = data.filter((c) => classCapacityState(c) === "Full").length;
    return { total: data.length, upcoming: upcoming.length, open, almost, full };
  }, [data]);

  const grouped = useMemo(() => {
    const upcoming: PsvClass[] = [];
    const past: PsvClass[] = [];
    data.forEach((c) => {
      const d = c.class_date ? new Date(c.class_date) : null;
      if (d && d >= today) upcoming.push(c);
      else past.push(c);
    });
    return { upcoming, past };
  }, [data, today]);

  const desc =
    description ??
    (role === "admin"
      ? "Schedule of upcoming PSV classes. Assign your eligible customers to a class."
      : role === "boss"
        ? "Monitoring view of all PSV classes (read-only)."
        : role === "it_tech"
          ? "Manage class issues, correct assignments and attendance."
          : "Full management of PSV classes and assignments.");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          {role === "super_admin" && (
            <Button disabled>
              <Plus className="w-4 h-4 mr-1.5" /> New class
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total classes" value={loading ? "…" : stats.total} icon={Calendar} />
        <StatCard label="Upcoming" value={loading ? "…" : stats.upcoming} icon={Clock} accent="charcoal" />
        <StatCard label="Open" value={loading ? "…" : stats.open} icon={GraduationCap} />
        <StatCard label="Full" value={loading ? "…" : stats.full} icon={Users} accent="muted" />
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
      )}

      <ClassSection
        heading="Upcoming classes"
        classes={grouped.upcoming}
        loading={loading}
        onOpen={setActive}
        emptyText="No upcoming PSV classes."
      />
      <ClassSection
        heading="Past classes"
        classes={grouped.past}
        loading={loading}
        onOpen={setActive}
        emptyText="No past classes."
        muted
      />

      <PsvClassDetailDialog
        key={active?.id ?? "none"}
        psvClass={active}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        role={role}
        myId={myId}
        onChanged={refetch}
      />
    </div>
  );
};

const ClassSection = ({
  heading,
  classes,
  loading,
  onOpen,
  emptyText,
  muted,
}: {
  heading: string;
  classes: PsvClass[];
  loading: boolean;
  onOpen: (c: PsvClass) => void;
  emptyText: string;
  muted?: boolean;
}) => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-charcoal">{heading}</h3>
      <Badge variant="outline">{classes.length}</Badge>
    </div>
    {loading ? (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand" />
      </div>
    ) : classes.length === 0 ? (
      <div className="text-sm text-muted-foreground py-4">{emptyText}</div>
    ) : (
      <div className="grid md:grid-cols-2 gap-3">
        {classes.map((c) => (
          <ClassCard key={c.id} psvClass={c} onOpen={onOpen} muted={muted} />
        ))}
      </div>
    )}
  </Card>
);

const ClassCard = ({
  psvClass,
  onOpen,
  muted,
}: {
  psvClass: PsvClass;
  onOpen: (c: PsvClass) => void;
  muted?: boolean;
}) => {
  const state = classCapacityState(psvClass);
  const cap = psvClass.capacity ?? 0;
  const booked = psvClass.booked_count ?? 0;
  const available = psvClass.available_slots ?? Math.max(cap - booked, 0);
  const dateStr = psvClass.class_date
    ? new Date(psvClass.class_date).toLocaleDateString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <button
      type="button"
      onClick={() => onOpen(psvClass)}
      className={`text-left p-4 rounded-lg border transition-colors hover:border-brand/40 hover:bg-surface-muted ${
        muted ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-charcoal truncate">{psvClass.title ?? "Untitled class"}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {dateStr}
            <span className="mx-1">·</span>
            <Clock className="w-3 h-3" />
            {formatTimeRange(psvClass.start_time, psvClass.end_time)}
          </div>
        </div>
        <Badge variant="outline" className={classBadgeClass(state)}>
          {state}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">{psvClass.location ?? "Location TBA"}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          <Users className="w-3 h-3 inline mr-1" />
          {booked}/{cap || "—"} booked
        </span>
        <span className="text-muted-foreground">{available} slots left</span>
      </div>
    </button>
  );
};

export default PsvCalendarPage;

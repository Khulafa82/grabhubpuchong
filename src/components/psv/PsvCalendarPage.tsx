import { useMemo, useState } from "react";
import {
  Calendar as CalIcon, Clock, MapPin, Users, Loader2, Plus, RefreshCcw,
  GraduationCap, AlertTriangle, Search, LayoutGrid, CalendarDays,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAuth } from "@/context/AuthContext";
import { usePsvClasses } from "@/hooks/usePsvClasses";
import {
  PsvClass,
  classBadgeClass,
  classCapacityState,
  formatTimeRange,
  CLASS_STATUS_OPTIONS,
} from "@/lib/psv";
import { PsvClassDetailDialog } from "./PsvClassDetailDialog";
import { PsvClassFormDialog } from "./PsvClassFormDialog";
import { PsvCalendarView } from "./PsvCalendarView";
import { View } from "react-big-calendar";

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
  const [editing, setEditing] = useState<PsvClass | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<View>("month");
  const [calDate, setCalDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const canCreate = true; // all 4 roles can create per spec
  const canDelete = true; // per user choice: anyone who can create

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = today.toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((c) => {
      if (statusFilter !== "all" && classCapacityState(c) !== statusFilter) return false;
      if (locationFilter !== "all" && (c.location ?? "") !== locationFilter) return false;
      if (q) {
        const hay = `${c.title ?? ""} ${c.location ?? ""} ${c.instructor ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, locationFilter]);

  const locations = useMemo(() => {
    const s = new Set<string>();
    data.forEach((c) => c.location && s.add(c.location));
    return Array.from(s).sort();
  }, [data]);

  const stats = useMemo(() => {
    const upcoming = data.filter((c) => {
      if (!c.class_date) return false;
      return new Date(c.class_date) >= today;
    });
    const open = data.filter((c) => classCapacityState(c) === "Open").length;
    const almost = data.filter((c) => classCapacityState(c) === "Almost Full").length;
    const full = data.filter((c) => classCapacityState(c) === "Full").length;
    const todayClasses = data.filter((c) => c.class_date === todayStr).length;
    const tomorrow = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
    const tomorrowClasses = data.filter((c) => c.class_date === tomorrow).length;
    const totalSlots = data.reduce((acc, c) => acc + (c.capacity ?? 0), 0);
    const totalBooked = data.reduce((acc, c) => acc + (c.booked_count ?? 0), 0);
    const utilization = totalSlots > 0 ? Math.round((totalBooked / totalSlots) * 100) : 0;
    return {
      total: data.length,
      upcoming: upcoming.length,
      open, almost, full,
      todayClasses, tomorrowClasses, utilization,
    };
  }, [data, today, todayStr]);

  const alerts = useMemo(() => {
    const list: { kind: "warning" | "error" | "info"; text: string }[] = [];
    data.forEach((c) => {
      const state = classCapacityState(c);
      if (state === "Full") list.push({ kind: "error", text: `${c.title ?? "Class"} on ${c.class_date} is FULL.` });
      else if (state === "Almost Full") list.push({ kind: "warning", text: `${c.title ?? "Class"} on ${c.class_date} is almost full.` });
      const tomorrow = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
      if (c.class_date === tomorrow) list.push({ kind: "info", text: `Reminder: ${c.title ?? "Class"} runs tomorrow.` });
    });
    return list.slice(0, 6);
  }, [data, today]);

  const grouped = useMemo(() => {
    const upcoming: PsvClass[] = [];
    const past: PsvClass[] = [];
    filtered.forEach((c) => {
      const d = c.class_date ? new Date(c.class_date) : null;
      if (d && d >= today) upcoming.push(c);
      else past.push(c);
    });
    return { upcoming, past };
  }, [filtered, today]);

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
          {canCreate && (
            <Button onClick={() => { setEditing(null); setCreatingFor(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1.5" /> New class
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Total classes" value={loading ? "…" : stats.total} icon={CalIcon} />
        <StatCard label="Today" value={loading ? "…" : stats.todayClasses} icon={Clock} accent="charcoal" />
        <StatCard label="Tomorrow" value={loading ? "…" : stats.tomorrowClasses} icon={CalendarDays} />
        <StatCard label="Open" value={loading ? "…" : stats.open} icon={GraduationCap} />
        <StatCard label="Full" value={loading ? "…" : stats.full} icon={Users} accent="muted" />
        <StatCard label="Utilization %" value={loading ? "…" : `${stats.utilization}%`} icon={LayoutGrid} accent="charcoal" />
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
      )}

      {alerts.length > 0 && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-charcoal text-sm">Alerts</h3>
          </div>
          <ul className="space-y-1 text-sm">
            {alerts.map((a, i) => (
              <li key={i} className={
                a.kind === "error" ? "text-destructive"
                  : a.kind === "warning" ? "text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground"
              }>• {a.text}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, location, instructor…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CLASS_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4">
          <PsvCalendarView
            classes={filtered}
            view={view}
            onViewChange={setView}
            date={calDate}
            onDateChange={setCalDate}
            onSelectClass={setActive}
            onSelectSlot={canCreate ? (d) => {
              const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
              setEditing(null);
              setCreatingFor(iso);
              setFormOpen(true);
            } : undefined}
          />
        </TabsContent>
        <TabsContent value="list" className="mt-4 space-y-6">
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
        </TabsContent>
      </Tabs>

      <PsvClassDetailDialog
        key={active?.id ?? "none"}
        psvClass={active}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        role={role}
        myId={myId}
        onChanged={refetch}
        canEdit={canCreate}
        canDelete={canDelete}
        onEdit={(c) => { setActive(null); setEditing(c); setCreatingFor(null); setFormOpen(true); }}
      />

      <PsvClassFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        defaultDate={creatingFor}
        onSaved={refetch}
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

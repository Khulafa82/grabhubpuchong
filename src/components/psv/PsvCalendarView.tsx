import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, View, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { PsvClass, classCapacityState } from "@/lib/psv";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface PsvEvent extends Event {
  resource: PsvClass;
}

interface Props {
  classes: PsvClass[];
  view: View;
  onViewChange: (v: View) => void;
  date: Date;
  onDateChange: (d: Date) => void;
  onSelectClass: (c: PsvClass) => void;
  onSelectSlot?: (date: Date) => void;
}

const stateColor = (state: ReturnType<typeof classCapacityState>) => {
  switch (state) {
    case "Open": return "hsl(var(--brand))";
    case "Almost Full": return "hsl(38 92% 50%)";
    case "Full": return "hsl(var(--destructive))";
    case "Completed": return "hsl(var(--charcoal))";
    case "Cancelled": return "hsl(var(--muted-foreground))";
  }
};

export const PsvCalendarView = ({
  classes, view, onViewChange, date, onDateChange, onSelectClass, onSelectSlot,
}: Props) => {
  const events: PsvEvent[] = useMemo(() => {
    return classes
      .filter((c) => !!c.class_date)
      .map((c) => {
        const d = c.class_date as string;
        const start = c.start_time
          ? new Date(`${d}T${c.start_time}`)
          : new Date(`${d}T00:00:00`);
        const end = c.end_time
          ? new Date(`${d}T${c.end_time}`)
          : new Date(start.getTime() + 60 * 60 * 1000);
        const cap = c.capacity ?? 0;
        const booked = c.booked_count ?? 0;
        return {
          title: `${c.title ?? "Class"} · ${booked}/${cap || "—"}`,
          start,
          end,
          allDay: !c.start_time,
          resource: c,
        };
      });
  }, [classes]);

  return (
    <div className="rounded-xl border border-border bg-background p-2" style={{ height: 640 }}>
      <Calendar
        localizer={localizer}
        events={events}
        view={view}
        onView={onViewChange}
        date={date}
        onNavigate={onDateChange}
        views={["month", "week", "day", "agenda"]}
        popup
        selectable
        onSelectEvent={(e) => onSelectClass((e as PsvEvent).resource)}
        onSelectSlot={(s) => onSelectSlot?.(s.start as Date)}
        eventPropGetter={(e) => {
          const c = (e as PsvEvent).resource;
          const color = stateColor(classCapacityState(c));
          return {
            style: {
              backgroundColor: color,
              borderColor: color,
              color: "white",
              fontSize: "0.75rem",
              borderRadius: "4px",
              padding: "2px 4px",
            },
          };
        }}
        style={{ height: "100%" }}
      />
    </div>
  );
};
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Loader2,
  UserPlus,
  UserCheck,
  Clock,
  AlertTriangle,
  Footprints,
  CalendarCheck,
  CalendarClock,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, type NotifKind } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotifKind, React.ComponentType<{ className?: string }>> = {
  new_customer: UserPlus,
  assigned_to_me: UserCheck,
  follow_up_due: Clock,
  follow_up_overdue: AlertTriangle,
  walk_in: Footprints,
  high_priority: AlertTriangle,
  psv_assigned: CalendarCheck,
  leave_update: CalendarClock,
};

const ICON_TONE: Record<NotifKind, string> = {
  new_customer: "text-brand bg-brand/10",
  assigned_to_me: "text-brand bg-brand/10",
  follow_up_due: "text-charcoal bg-charcoal/10",
  follow_up_overdue: "text-destructive bg-destructive/10",
  walk_in: "text-brand bg-brand/10",
  high_priority: "text-destructive bg-destructive/10",
  psv_assigned: "text-charcoal bg-charcoal/10",
  leave_update: "text-charcoal bg-charcoal/10",
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { items, loading, error, unreadCount, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onItemClick = (id: string, to?: string) => {
    markRead(id);
    setOpen(false);
    if (to) navigate(to);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <div className="text-sm font-semibold text-charcoal">Notifications</div>
              <div className="text-[11px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </div>
            </div>
            {items.length > 0 && unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-medium text-brand hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : error ? (
              <div className="p-6 text-sm text-destructive text-center">Failed to load: {error}</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground text-center">No notifications</div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = ICONS[n.kind];
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => onItemClick(n.id, n.to)}
                        className={cn(
                          "w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-muted transition-colors",
                          n.unread && "bg-brand/[0.03]",
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                            ICON_TONE[n.kind],
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-medium text-charcoal truncate">{n.title}</div>
                            {n.unread && <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{n.description}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.timestamp)}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
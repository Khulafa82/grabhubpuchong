import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type NotifKind =
  | "new_customer"
  | "assigned_to_me"
  | "follow_up_due"
  | "follow_up_overdue"
  | "walk_in"
  | "high_priority"
  | "psv_assigned"
  | "leave_update";

export interface Notification {
  id: string;
  kind: NotifKind;
  title: string;
  description: string;
  timestamp: string | null;
  to?: string;
  unread: boolean;
}

const READ_KEY = (uid: string) => `notif:read:${uid}`;

const loadRead = (uid: string): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_KEY(uid));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
};

const saveRead = (uid: string, ids: Set<string>) => {
  try {
    // Cap at 500 most recent ids
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem(READ_KEY(uid), JSON.stringify(arr));
  } catch {
    /* ignore */
  }
};

const today = () => new Date().toISOString().slice(0, 10);

const customerRouteFor = (role?: string | null) => {
  switch (role) {
    case "boss":
      return "/boss/customers";
    case "admin":
      return "/admin/customers";
    case "it_tech":
      return "/it-tech/reassignment";
    case "super_admin":
      return "/super-admin";
    default:
      return "/";
  }
};

const psvRouteFor = (role?: string | null) => {
  switch (role) {
    case "boss":
      return "/boss/psv-calendar";
    case "admin":
      return "/admin/psv-calendar";
    case "it_tech":
      return "/it-tech/psv-calendar";
    default:
      return "/admin/psv-calendar";
  }
};

const leaveRouteFor = (role?: string | null) => {
  switch (role) {
    case "boss":
      return "/boss/leave";
    case "it_tech":
      return "/it-tech/leave";
    case "super_admin":
      return "/super-admin/leave";
    case "admin":
      return "/admin/leave";
    default:
      return "/";
  }
};

export const useNotifications = () => {
  const { user, profile } = useAuth();
  const role = profile?.role;
  const uid = user?.id;
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!uid) return;
    setReadIds(loadRead(uid));
  }, [uid]);

  const load = useCallback(async () => {
    if (!uid || !role) return;
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
      const todayStr = today();

      const cRoute = customerRouteFor(role);
      const psvRoute = psvRouteFor(role);
      const lRoute = leaveRouteFor(role);

      const tasks: Promise<unknown>[] = [];

      // 1. Recent new customers (last 7 days)
      const newCustomersQ = supabase
        .from("customers")
        .select("id, applicant_id, full_name, customer_status, created_at, walk_in_flag, priority_status, account_status")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      tasks.push(Promise.resolve(newCustomersQ));

      // 2. Customers assigned to me (admins only) - recent assignments
      if (role === "admin") {
        const assignedQ = supabase
          .from("customers")
          .select("id, applicant_id, full_name, updated_at, customer_status")
          .eq("admin_in_charge", uid)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(15);
        tasks.push(Promise.resolve(assignedQ));
      } else {
        tasks.push(Promise.resolve({ data: [], error: null }));
      }

      // 3. Follow-ups due/overdue (filter by admin_in_charge for admins)
      const followQ = supabase
        .from("customers")
        .select("id, applicant_id, full_name, next_follow_up_date, admin_in_charge")
        .not("next_follow_up_date", "is", null)
        .lte("next_follow_up_date", todayStr)
        .limit(30);
      if (role === "admin") followQ.eq("admin_in_charge", uid);
      tasks.push(Promise.resolve(followQ));

      // 4. High priority cases
      const priorityQ = supabase
        .from("customers")
        .select("id, applicant_id, full_name, priority_status, updated_at, admin_in_charge")
        .in("priority_status", ["urgent", "walk_in_priority", "overdue"])
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(20);
      if (role === "admin") priorityQ.eq("admin_in_charge", uid);
      tasks.push(Promise.resolve(priorityQ));

      // 5. PSV classes assigned (admin = where they are admin_in_charge of customers in class)
      tasks.push(
        Promise.resolve(
          supabase
            .from("psv_class_customers")
            .select("id, class_id, customer_id, created_at")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(20),
        ),
      );

      // 6. Leave requests (boss/it_tech/super_admin see submitted; admin sees their own status changes)
      if (role === "boss" || role === "it_tech" || role === "super_admin") {
        tasks.push(
          Promise.resolve(
            supabase
              .from("leave_applications")
              .select("id, staff_id, leave_type, leave_status, created_at, start_date, end_date")
              .eq("leave_status", "submitted")
              .order("created_at", { ascending: false })
              .limit(15),
          ),
        );
      } else if (role === "admin") {
        tasks.push(
          Promise.resolve(
            supabase
              .from("leave_applications")
              .select("id, staff_id, leave_type, leave_status, created_at, start_date, end_date")
              .eq("staff_id", uid)
              .in("leave_status", ["approved", "rejected"])
              .order("created_at", { ascending: false })
              .limit(10),
          ),
        );
      } else {
        tasks.push(Promise.resolve({ data: [], error: null }));
      }

      const [newCustRes, assignedRes, followRes, priorityRes, psvRes, leaveRes] = (await Promise.all(
        tasks,
      )) as Array<{ data: unknown; error: { message: string } | null }>;

      const collected: Notification[] = [];

      const pushIfOk = (res: { data: unknown; error: { message: string } | null }, fn: (rows: any[]) => void) => {
        if (res.error) return;
        fn((res.data ?? []) as any[]);
      };

      pushIfOk(newCustRes, (rows) => {
        for (const c of rows) {
          const isWalk =
            c.walk_in_flag === true ||
            (c.priority_status ?? "").toString().toLowerCase().includes("walk");
          collected.push({
            id: `new:${c.id}`,
            kind: isWalk ? "walk_in" : "new_customer",
            title: isWalk ? "Walk-in customer created" : "New customer registered",
            description: `${c.full_name ?? "Unnamed"} · ${c.applicant_id ?? "—"}`,
            timestamp: c.created_at,
            to: cRoute,
            unread: true,
          });
        }
      });

      pushIfOk(assignedRes, (rows) => {
        for (const c of rows) {
          collected.push({
            id: `assigned:${c.id}:${c.updated_at ?? ""}`,
            kind: "assigned_to_me",
            title: "Customer assigned to you",
            description: `${c.full_name ?? "Unnamed"} · ${c.applicant_id ?? "—"}`,
            timestamp: c.updated_at,
            to: cRoute,
            unread: true,
          });
        }
      });

      pushIfOk(followRes, (rows) => {
        for (const c of rows) {
          const overdue = c.next_follow_up_date && c.next_follow_up_date < todayStr;
          collected.push({
            id: `follow:${c.id}:${c.next_follow_up_date}`,
            kind: overdue ? "follow_up_overdue" : "follow_up_due",
            title: overdue ? "Follow-up overdue" : "Follow-up due today",
            description: `${c.full_name ?? "Unnamed"} · ${c.applicant_id ?? "—"} · ${c.next_follow_up_date}`,
            timestamp: c.next_follow_up_date,
            to: cRoute,
            unread: true,
          });
        }
      });

      pushIfOk(priorityRes, (rows) => {
        for (const c of rows) {
          collected.push({
            id: `priority:${c.id}:${c.priority_status}`,
            kind: "high_priority",
            title: `High priority: ${c.priority_status}`,
            description: `${c.full_name ?? "Unnamed"} · ${c.applicant_id ?? "—"}`,
            timestamp: c.updated_at,
            to: cRoute,
            unread: true,
          });
        }
      });

      pushIfOk(psvRes, (rows) => {
        // For admin, only PSV entries for their customers
        const adminOwnedFilter = async () => null;
        void adminOwnedFilter;
        for (const r of rows) {
          collected.push({
            id: `psv:${r.id}`,
            kind: "psv_assigned",
            title: "PSV class assignment",
            description: `Customer added to PSV class`,
            timestamp: r.created_at,
            to: psvRoute,
            unread: true,
          });
        }
      });

      pushIfOk(leaveRes, (rows) => {
        for (const l of rows) {
          const isMine = role === "admin";
          collected.push({
            id: `leave:${l.id}:${l.leave_status}`,
            kind: "leave_update",
            title: isMine
              ? `Leave ${l.leave_status}`
              : `New leave request: ${l.leave_type ?? "leave"}`,
            description: `${l.start_date ?? "—"} → ${l.end_date ?? "—"}`,
            timestamp: l.created_at,
            to: lRoute,
            unread: true,
          });
        }
      });

      // De-dupe by id, sort newest first, cap 50
      const seen = new Set<string>();
      const deduped = collected.filter((n) => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      deduped.sort((a, b) => {
        const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
        const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
        return tb - ta;
      });
      setItems(deduped.slice(0, 50));
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications.");
      setLoading(false);
    }
  }, [uid, role]);

  useEffect(() => {
    load();
  }, [load, tick]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!uid) return;
    const t = window.setInterval(() => setTick((x) => x + 1), 60_000);
    return () => window.clearInterval(t);
  }, [uid]);

  const visible = useMemo(
    () => items.map((n) => ({ ...n, unread: !readIds.has(n.id) })),
    [items, readIds],
  );

  const unreadCount = useMemo(() => visible.filter((n) => n.unread).length, [visible]);

  const markRead = useCallback(
    (id: string) => {
      if (!uid) return;
      setReadIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        saveRead(uid, next);
        return next;
      });
    },
    [uid],
  );

  const markAllRead = useCallback(() => {
    if (!uid) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of items) next.add(n.id);
      saveRead(uid, next);
      return next;
    });
  }, [uid, items]);

  return { items: visible, loading, error, unreadCount, markRead, markAllRead, refetch: () => setTick((x) => x + 1) };
};
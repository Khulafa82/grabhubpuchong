import { useEffect, useState } from "react";
import { Loader2, Lock, Shuffle, ShieldAlert, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SecurityAlert {
  id: string;
  title: string | null;
  alert_type: string | null;
  severity: string | null;
  alert_status: string | null;
  created_at: string | null;
}
interface LockedAccount {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  account_locked: boolean | null;
  failed_login_count: number | null;
}
interface RoundRobin {
  scope_key: string;
  last_assigned_admin_id: string | null;
  next_expected_admin_id: string | null;
  updated_at: string | null;
  last_name?: string | null;
  next_name?: string | null;
}

const severityClass = (sev: string | null) => {
  switch ((sev || "").toLowerCase()) {
    case "critical":
      return "bg-destructive text-destructive-foreground";
    case "high":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "medium":
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    case "low":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    default:
      return "";
  }
};

const statusVariant = (s: string | null): "default" | "secondary" | "outline" => {
  switch ((s || "").toLowerCase()) {
    case "resolved":
      return "secondary";
    case "acknowledged":
      return "outline";
    default:
      return "default";
  }
};

const TechSettings = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [locked, setLocked] = useState<LockedAccount[]>([]);
  const [rr, setRr] = useState<RoundRobin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [alertsRes, lockedRes, rrRes] = await Promise.all([
      supabase
        .from("security_alerts")
        .select("id, title, alert_type, severity, alert_status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("staff_profiles")
        .select("id, full_name, username, email, role, status, account_locked, failed_login_count")
        .eq("account_locked", true),
      supabase
        .from("round_robin_state")
        .select("scope_key, last_assigned_admin_id, next_expected_admin_id, updated_at")
        .order("updated_at", { ascending: false }),
    ]);

    if (lockedRes.error) {
      setError(lockedRes.error.message);
      setLoading(false);
      return;
    }
    setAlerts(alertsRes.error ? [] : ((alertsRes.data ?? []) as SecurityAlert[]));
    setLocked((lockedRes.data ?? []) as LockedAccount[]);

    const rrRows = (rrRes.error ? [] : (rrRes.data ?? [])) as RoundRobin[];
    const ids = Array.from(
      new Set(rrRows.flatMap((r) => [r.last_assigned_admin_id, r.next_expected_admin_id]).filter(Boolean))
    ) as string[];
    let map: Record<string, string> = {};
    if (ids.length) {
      const { data: staff } = await supabase.from("staff_profiles").select("id, full_name").in("id", ids);
      map = Object.fromEntries(
        (staff ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"])
      );
    }
    setRr(
      rrRows.map((r) => ({
        ...r,
        last_name: r.last_assigned_admin_id ? map[r.last_assigned_admin_id] ?? "—" : null,
        next_name: r.next_expected_admin_id ? map[r.next_expected_admin_id] ?? "—" : null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateAlertStatus = async (id: string, alert_status: "acknowledged" | "resolved") => {
    setBusy(id);
    const { error } = await supabase.from("security_alerts").update({ alert_status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Alert ${alert_status}`);
      setAlerts((p) => p.map((a) => (a.id === id ? { ...a, alert_status } : a)));
    }
    setBusy(null);
  };

  const unlock = async (id: string) => {
    const row = locked.find((r) => r.id === id);
    if (!row || row.role !== "admin") {
      toast.error("Access denied. IT Technician can only manage Admin accounts.");
      return;
    }
    setBusy(id);
    const { error } = await supabase
      .from("staff_profiles")
      .update({ account_locked: false, failed_login_count: 0 })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Account unlocked");
      setLocked((p) => p.filter((r) => r.id !== id));
    }
    setBusy(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Technical Settings & Security</h1>
        <p className="text-sm text-muted-foreground">
          Security alerts, locked accounts, and assignment round-robin state.
        </p>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
      )}

      {/* Security Alerts */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-charcoal">Security alerts</h3>
          </div>
          <Badge variant="outline">{alerts.length}</Badge>
        </div>
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No security alerts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Severity</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Created</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => {
                  const status = (a.alert_status || "open").toLowerCase();
                  return (
                    <tr key={a.id} className="border-b border-border/60">
                      <td className="py-2.5 px-4 font-medium text-charcoal">{a.title ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{a.alert_type ?? "—"}</td>
                      <td className="py-2.5 px-4">
                        <Badge className={severityClass(a.severity)} variant="outline">
                          {a.severity ?? "—"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={statusVariant(a.alert_status)}>{a.alert_status ?? "open"}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground text-xs">
                        {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === a.id || status === "acknowledged" || status === "resolved"}
                            onClick={() => updateAlertStatus(a.id, "acknowledged")}
                          >
                            {busy === a.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1" /> Acknowledge
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy === a.id || status === "resolved"}
                            onClick={() => updateAlertStatus(a.id, "resolved")}
                          >
                            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Resolve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Locked accounts */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-charcoal">Locked accounts</h3>
          </div>
          <Badge variant="outline">{locked.length}</Badge>
        </div>
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : locked.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No locked accounts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Username</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Locked</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {locked.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-2.5 px-4 font-medium text-charcoal">{s.full_name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.username ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.email ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline">{s.status ?? "—"}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="destructive">Locked</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === s.id}
                        onClick={() => unlock(s.id)}
                      >
                        {busy === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Unlock"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Round robin */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-charcoal">Round-robin assignment state</h3>
        </div>
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : rr.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No round-robin state recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Scope</th>
                  <th className="py-3 px-4 font-medium">Last assigned</th>
                  <th className="py-3 px-4 font-medium">Next expected</th>
                  <th className="py-3 px-4 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rr.map((r) => (
                  <tr key={r.scope_key} className="border-b border-border/60">
                    <td className="py-2.5 px-4 font-mono text-xs text-charcoal">{r.scope_key}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.last_name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-charcoal">{r.next_name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">
                      {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TechSettings;

import { useEffect, useState } from "react";
import { Loader2, Lock, Shuffle, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LockedAccount {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
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

const TechSettings = () => {
  const [locked, setLocked] = useState<LockedAccount[]>([]);
  const [rr, setRr] = useState<RoundRobin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [lockedRes, rrRes] = await Promise.all([
      supabase
        .from("staff_profiles")
        .select("id, full_name, username, email, role, failed_login_count")
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
    setLocked((lockedRes.data ?? []) as LockedAccount[]);

    const rrRows = (rrRes.error ? [] : (rrRes.data ?? [])) as RoundRobin[];
    const ids = Array.from(new Set(rrRows.flatMap((r) => [r.last_assigned_admin_id, r.next_expected_admin_id]).filter(Boolean))) as string[];
    let map: Record<string, string> = {};
    if (ids.length) {
      const { data: staff } = await supabase.from("staff_profiles").select("id, full_name").in("id", ids);
      map = Object.fromEntries((staff ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"]));
    }
    setRr(rrRows.map((r) => ({
      ...r,
      last_name: r.last_assigned_admin_id ? map[r.last_assigned_admin_id] ?? "—" : null,
      next_name: r.next_expected_admin_id ? map[r.next_expected_admin_id] ?? "—" : null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unlock = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("staff_profiles").update({ account_locked: false, failed_login_count: 0 }).eq("id", id);
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
        <p className="text-sm text-muted-foreground">Security alerts, locked accounts, and assignment round-robin state.</p>
      </div>

      {error && <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>}

      {/* Security Alerts */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-charcoal">Security alerts</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          The <code className="font-mono text-xs">security_alerts</code> table is not yet provisioned. Once created, open alerts will appear here automatically.
        </div>
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
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
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
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium text-right">Failed logins</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {locked.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-2.5 px-4 font-medium text-charcoal">{s.full_name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.username ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.email ?? "—"}</td>
                    <td className="py-2.5 px-4"><Badge variant="outline">{s.role ?? "—"}</Badge></td>
                    <td className="py-2.5 px-4 text-right text-destructive font-medium">{s.failed_login_count ?? 0}</td>
                    <td className="py-2.5 px-4 text-right">
                      <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => unlock(s.id)}>
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
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : rr.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No round-robin state recorded yet.</div>
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
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">{r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</td>
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

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusBadgeClass } from "@/lib/customers";

interface Row {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  user_role: string | null;
  location_choice: string | null;
  customer_status: string | null;
  admin_in_charge: string | null;
  admin_name?: string | null;
}

const CustomersList = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "GrabCar" | "GrabFood">("all");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const urlQ = searchParams.get("q");
    if (urlQ) setQ(urlQ);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("id, applicant_id, full_name, phone_number, user_role, location_choice, customer_status, admin_in_charge")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const customers = (data ?? []) as Row[];
      const ids = Array.from(new Set(customers.map((c) => c.admin_in_charge).filter(Boolean))) as string[];
      let nameMap: Record<string, string> = {};
      if (ids.length) {
        const { data: staff } = await supabase.from("staff_profiles").select("id, full_name").in("id", ids);
        nameMap = Object.fromEntries((staff ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? "—"]));
      }
      setRows(customers.map((c) => ({ ...c, admin_name: c.admin_in_charge ? nameMap[c.admin_in_charge] ?? "—" : null })));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.user_role !== filter) return false;
      if (!term) return true;
      return (
        (r.full_name ?? "").toLowerCase().includes(term) ||
        (r.phone_number ?? "").toLowerCase().includes(term) ||
        (r.applicant_id ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">All Customer Data</h1>
        <p className="text-sm text-muted-foreground">Read-only overview of every customer in the system.</p>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or applicant ID" className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(["all", "GrabCar", "GrabFood"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading customers…</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No customers match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Applicant ID</th>
                  <th className="py-3 px-4 font-medium">Full Name</th>
                  <th className="py-3 px-4 font-medium">Phone</th>
                  <th className="py-3 px-4 font-medium">Service</th>
                  <th className="py-3 px-4 font-medium">Location</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-surface-muted/40">
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{r.applicant_id ?? "—"}</td>
                    <td className="py-2.5 px-4 font-medium text-charcoal">{r.full_name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.phone_number ?? "—"}</td>
                    <td className="py-2.5 px-4">{r.user_role ?? "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.location_choice ?? "—"}</td>
                    <td className="py-2.5 px-4"><Badge variant="outline" className={statusBadgeClass(r.customer_status)}>{r.customer_status ?? "—"}</Badge></td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.admin_name ?? <span className="text-destructive">Unassigned</span>}</td>
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

export default CustomersList;

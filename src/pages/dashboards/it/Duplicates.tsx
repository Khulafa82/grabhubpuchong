import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Customer {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  ic_number: string | null;
  phone_number: string | null;
  customer_status: string | null;
  created_at: string | null;
}
interface Group { key: string; field: "ic_number" | "phone_number"; rows: Customer[]; }

const Duplicates = () => {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("id, applicant_id, full_name, ic_number, phone_number, customer_status, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) setError(error.message);
      else setData((data ?? []) as Customer[]);
      setLoading(false);
    })();
  }, []);

  const groups = useMemo<Group[]>(() => {
    const byIc = new Map<string, Customer[]>();
    const byPhone = new Map<string, Customer[]>();
    for (const c of data) {
      const ic = (c.ic_number ?? "").trim();
      const ph = (c.phone_number ?? "").replace(/\s+/g, "");
      if (ic) byIc.set(ic, [...(byIc.get(ic) ?? []), c]);
      if (ph) byPhone.set(ph, [...(byPhone.get(ph) ?? []), c]);
    }
    const result: Group[] = [];
    for (const [k, rows] of byIc) if (rows.length > 1) result.push({ key: `ic:${k}`, field: "ic_number", rows });
    for (const [k, rows] of byPhone) if (rows.length > 1) result.push({ key: `phone:${k}`, field: "phone_number", rows });
    return result;
  }, [data]);

  const visible = groups.filter((g) => !reviewed.has(g.key));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Customer Data & Duplicates</h1>
        <p className="text-sm text-muted-foreground">Detected duplicates by IC number and phone number.</p>
      </div>

      {loading ? (
        <Card className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Scanning customers…</Card>
      ) : error ? (
        <Card className="p-8 text-sm text-destructive">Failed to load: {error}</Card>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-charcoal">No duplicates detected</h3>
          <p className="text-sm text-muted-foreground mt-2">All scanned customers have unique IC numbers and phone numbers.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((g) => (
            <Card key={g.key} className="p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    Duplicate {g.field === "ic_number" ? "IC" : "phone"}
                  </Badge>
                  <span className="font-mono text-sm text-charcoal">{g.key.split(":")[1]}</span>
                  <span className="text-xs text-muted-foreground">· {g.rows.length} records</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setReviewed((s) => new Set(s).add(g.key))}>
                  Mark reviewed
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">Applicant</th>
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">IC</th>
                      <th className="py-2 pr-4 font-medium">Phone</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{r.applicant_id ?? "—"}</td>
                        <td className="py-2 pr-4 font-medium text-charcoal">{r.full_name ?? "—"}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{r.ic_number ?? "—"}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{r.phone_number ?? "—"}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{r.customer_status ?? "—"}</td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Duplicates;

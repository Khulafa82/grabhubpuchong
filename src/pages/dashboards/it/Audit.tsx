import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Users,
  UserCog,
  Server,
  CalendarClock,
  Search,
  Download,
  RotateCcw,
  Filter,
  Eye,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatCard } from "@/components/dashboard/StatCard";
import { downloadCsv, toCsv, todayStamp } from "@/lib/exportCsv";

type Severity = "low" | "medium" | "high" | "critical";
type SortKey =
  | "newest"
  | "oldest"
  | "severity_desc"
  | "module_asc"
  | "action_asc"
  | "role_asc";

interface AuditRow {
  id: string;
  created_at: string | null;
  module: string | null;
  record_id: string | null;
  action: string | null;
  event_category: string | null;
  severity: Severity | string | null;
  description: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  affected_fields: string[] | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  source_ip: string | null;
  user_agent: string | null;
}

const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const severityClass = (s?: string | null) => {
  switch ((s ?? "").toLowerCase()) {
    case "critical":
      return "bg-destructive text-destructive-foreground border-transparent";
    case "high":
      return "bg-orange-500 text-white border-transparent";
    case "medium":
      return "bg-amber-400 text-charcoal border-transparent";
    case "low":
    default:
      return "bg-muted text-muted-foreground border-transparent";
  }
};

const SeverityBadge = ({ severity }: { severity?: string | null }) => (
  <Badge className={`${severityClass(severity)} uppercase tracking-wider text-[10px]`}>
    {(severity ?? "low").toString()}
  </Badge>
);

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { hour12: false }) : "—";

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const computeChangedFields = (row: AuditRow): string[] => {
  if (row.affected_fields && row.affected_fields.length) return row.affected_fields;
  if (isObj(row.old_value) && isObj(row.new_value)) {
    const keys = new Set([...Object.keys(row.old_value), ...Object.keys(row.new_value)]);
    const out: string[] = [];
    keys.forEach((k) => {
      if (JSON.stringify(row.old_value?.[k]) !== JSON.stringify(row.new_value?.[k])) out.push(k);
    });
    return out;
  }
  return [];
};

const truncate = (s: string, n = 80) => (s.length > n ? s.slice(0, n) + "…" : s);

const valueToDisplay = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

const Audit = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  // Applied filters (only update on Apply)
  const [applied, setApplied] = useState({
    dateFrom: "", dateTo: "", moduleFilter: "all", actionFilter: "all",
    categoryFilter: "all", severityFilter: "all", roleFilter: "all", search: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from("audit_trail_detailed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    const { data, error } = await query;
    if (error) {
      // Fallback to activity_logs
      const fb = await supabase
        .from("activity_logs")
        .select("id, module, action, description, performed_by, performed_by_role, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (fb.error) {
        setError("Unable to load audit trail. Please try again.");
        setLoading(false);
        return;
      }
      setRows((fb.data ?? []).map((l) => ({
        ...l,
        record_id: null, event_category: null, severity: "low",
        performed_by_name: null, affected_fields: null,
        old_value: null, new_value: null, source_ip: null, user_agent: null,
      })) as AuditRow[]);
    } else {
      setRows((data ?? []) as AuditRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const uniq = (key: keyof AuditRow): string[] => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = r[key];
      if (typeof v === "string" && v) set.add(v);
    });
    return Array.from(set).sort();
  };

  const moduleOpts = useMemo(() => uniq("module"), [rows]);
  const actionOpts = useMemo(() => uniq("action"), [rows]);
  const categoryOpts = useMemo(() => uniq("event_category"), [rows]);
  const roleOpts = useMemo(() => uniq("performed_by_role"), [rows]);

  const filtered = useMemo(() => {
    const q = applied.search.trim().toLowerCase();
    const fromTs = applied.dateFrom ? new Date(applied.dateFrom).getTime() : null;
    const toTs = applied.dateTo ? new Date(applied.dateTo).getTime() + 86400000 : null;
    let out = rows.filter((r) => {
      if (applied.moduleFilter !== "all" && r.module !== applied.moduleFilter) return false;
      if (applied.actionFilter !== "all" && r.action !== applied.actionFilter) return false;
      if (applied.categoryFilter !== "all" && r.event_category !== applied.categoryFilter) return false;
      if (applied.severityFilter !== "all" && (r.severity ?? "").toString().toLowerCase() !== applied.severityFilter) return false;
      if (applied.roleFilter !== "all" && r.performed_by_role !== applied.roleFilter) return false;
      if (fromTs && r.created_at && new Date(r.created_at).getTime() < fromTs) return false;
      if (toTs && r.created_at && new Date(r.created_at).getTime() > toTs) return false;
      if (q) {
        const hay = [
          r.description, r.module, r.action, r.event_category,
          r.performed_by_name, r.performed_by_role, r.record_id,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (new Date(a.created_at ?? 0).getTime()) - (new Date(b.created_at ?? 0).getTime());
        case "severity_desc":
          return (SEVERITY_RANK[(b.severity ?? "").toString().toLowerCase()] ?? 0)
            - (SEVERITY_RANK[(a.severity ?? "").toString().toLowerCase()] ?? 0);
        case "module_asc":
          return (a.module ?? "").localeCompare(b.module ?? "");
        case "action_asc":
          return (a.action ?? "").localeCompare(b.action ?? "");
        case "role_asc":
          return (a.performed_by_role ?? "").localeCompare(b.performed_by_role ?? "");
        case "newest":
        default:
          return (new Date(b.created_at ?? 0).getTime()) - (new Date(a.created_at ?? 0).getTime());
      }
    });
    return out;
  }, [rows, applied, sort]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    let total = filtered.length, highCrit = 0, customer = 0, staff = 0, security = 0, todays = 0;
    filtered.forEach((r) => {
      const sev = (r.severity ?? "").toString().toLowerCase();
      if (sev === "high" || sev === "critical") highCrit++;
      const m = (r.module ?? "").toLowerCase();
      if (m.includes("customer")) customer++;
      if (m.includes("staff") || m.includes("user") || m.includes("auth")) staff++;
      const cat = (r.event_category ?? "").toLowerCase();
      if (m.includes("security") || m.includes("system") || cat.includes("security")) security++;
      if (r.created_at && new Date(r.created_at).getTime() >= todayTs) todays++;
    });
    return { total, highCrit, customer, staff, security, todays };
  }, [filtered]);

  const applyFilters = () => {
    setApplied({
      dateFrom, dateTo, moduleFilter, actionFilter,
      categoryFilter, severityFilter, roleFilter, search,
    });
  };

  const resetFilters = () => {
    setDateFrom(""); setDateTo("");
    setModuleFilter("all"); setActionFilter("all"); setCategoryFilter("all");
    setSeverityFilter("all"); setRoleFilter("all"); setSearch("");
    setApplied({
      dateFrom: "", dateTo: "", moduleFilter: "all", actionFilter: "all",
      categoryFilter: "all", severityFilter: "all", roleFilter: "all", search: "",
    });
  };

  const exportCsv = () => {
    if (!filtered.length) {
      setError("No audit logs to export.");
      return;
    }
    const out = filtered.map((r) => ({
      created_at: r.created_at ?? "",
      severity: r.severity ?? "",
      module: r.module ?? "",
      action: r.action ?? "",
      event_category: r.event_category ?? "",
      performed_by_name: r.performed_by_name ?? "System",
      performed_by_role: r.performed_by_role ?? "",
      record_id: r.record_id ?? "",
      affected_fields: (r.affected_fields ?? []).join("|"),
      description: r.description ?? "",
    }));
    downloadCsv(`audit-trail-${todayStamp()}.csv`, toCsv(out));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            <h1 className="text-2xl font-bold text-charcoal">Audit Trail & Security Logs</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            Audit logs provide accountability and traceability for customer, staff, and system changes.
            Use this dashboard for evidence collection, ISMS review, and incident investigation.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {["Evidence", "Traceability", "Accountability", "Change History"].map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] uppercase tracking-wider">{t}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Logs" value={stats.total} icon={FileText} />
        <StatCard label="High / Critical" value={stats.highCrit} icon={AlertTriangle} accent="charcoal" />
        <StatCard label="Customer Changes" value={stats.customer} icon={Users} />
        <StatCard label="Staff Changes" value={stats.staff} icon={UserCog} />
        <StatCard label="Security / System" value={stats.security} icon={Server} accent="charcoal" />
        <StatCard label="Today's Events" value={stats.todays} icon={CalendarClock} />
      </div>

      {/* Filter panel */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
          <Filter className="w-4 h-4" /> Filter & Search
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Date From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Date To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Module</Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {moduleOpts.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionOpts.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Event Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOpts.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Severity</Label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Performed By Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roleOpts.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
                placeholder="description, module, action, user…"
                className="pl-8"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={applyFilters} size="sm"><Filter className="w-4 h-4" /> Apply Filters</Button>
          <Button onClick={resetFilters} size="sm" variant="outline"><RotateCcw className="w-4 h-4" /> Reset</Button>
          <Button onClick={exportCsv} size="sm" variant="secondary"><Download className="w-4 h-4" /> Export CSV</Button>
          <div className="ml-auto flex items-center gap-2">
            <Label className="text-xs">Sort</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="severity_desc">Severity high → low</SelectItem>
                <SelectItem value="module_asc">Module A–Z</SelectItem>
                <SelectItem value="action_asc">Action A–Z</SelectItem>
                <SelectItem value="role_asc">Performed role</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading audit trail…
          </div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            No audit logs found for selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Affected Fields</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const sev = (r.severity ?? "low").toString().toLowerCase();
                  const highlight = sev === "high" || sev === "critical";
                  const fields = computeChangedFields(r);
                  return (
                    <TableRow key={r.id} className={highlight ? "bg-destructive/5" : ""}>
                      <TableCell className="whitespace-nowrap text-xs font-mono">{fmtTime(r.created_at)}</TableCell>
                      <TableCell><SeverityBadge severity={r.severity} /></TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">{r.module ?? "system"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{r.action ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.event_category ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.performed_by_name ?? <span className="text-muted-foreground italic">System</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.performed_by_role ?? "—"}</TableCell>
                      <TableCell>
                        {fields.length ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {fields.slice(0, 4).map((f) => (
                              <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                            ))}
                            {fields.length > 4 && <Badge variant="outline" className="text-[10px]">+{fields.length - 4}</Badge>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No field details</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[280px] truncate">{r.description ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                          <Eye className="w-4 h-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <DetailsDrawer row={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

const DetailsDrawer = ({ row, onClose }: { row: AuditRow | null; onClose: () => void }) => {
  const open = !!row;
  const fields = row ? computeChangedFields(row) : [];
  const hasOldNew = row && (isObj(row.old_value) || isObj(row.new_value));
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand" /> Audit Event Details
              </SheetTitle>
              <SheetDescription>Read-only evidence record for compliance and investigation.</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Meta label="Timestamp" value={fmtTime(row.created_at)} mono />
                <Meta label="Severity" valueNode={<SeverityBadge severity={row.severity} />} />
                <Meta label="Module" value={row.module ?? "—"} />
                <Meta label="Action" value={row.action ?? "—"} />
                <Meta label="Event Category" value={row.event_category ?? "—"} />
                <Meta label="Record ID" value={row.record_id ?? "—"} mono />
                <Meta label="Performed By" value={row.performed_by_name ?? "System"} />
                <Meta label="Role" value={row.performed_by_role ?? "—"} />
                <Meta label="Source IP" value={row.source_ip ?? "—"} mono />
                <Meta label="User Agent" value={row.user_agent ?? "—"} mono small />
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</div>
                <p className="text-sm text-charcoal">{row.description ?? "—"}</p>
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Affected Fields</div>
                {fields.length ? (
                  <div className="flex flex-wrap gap-1">
                    {fields.map((f) => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>)}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No field details</span>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Changed Fields Summary</div>
                {fields.length === 0 && !hasOldNew ? (
                  <div className="text-xs text-muted-foreground italic">Older log format — field-level summary not available.</div>
                ) : fields.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">No changed fields detected.</div>
                ) : (
                  <div className="border rounded-md divide-y">
                    {fields.map((f) => {
                      const oldV = isObj(row.old_value) ? row.old_value[f] : undefined;
                      const newV = isObj(row.new_value) ? row.new_value[f] : undefined;
                      return <ChangedField key={f} field={f} oldV={oldV} newV={newV} />;
                    })}
                  </div>
                )}
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Raw JSON Evidence
                    <span className="text-xs text-muted-foreground">click to toggle</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <JsonBlock title="old_value" value={row.old_value} />
                  <JsonBlock title="new_value" value={row.new_value} />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Meta = ({
  label, value, valueNode, mono, small,
}: { label: string; value?: string; valueNode?: React.ReactNode; mono?: boolean; small?: boolean }) => (
  <div>
    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
    {valueNode ?? (
      <div className={`${mono ? "font-mono" : ""} ${small ? "text-[11px] break-all" : "text-sm"} text-charcoal`}>
        {value}
      </div>
    )}
  </div>
);

const ChangedField = ({ field, oldV, newV }: { field: string; oldV: unknown; newV: unknown }) => {
  const [expanded, setExpanded] = useState(false);
  const oldS = valueToDisplay(oldV);
  const newS = valueToDisplay(newV);
  const long = oldS.length > 80 || newS.length > 80;
  return (
    <div className="p-2 text-xs">
      <div className="font-semibold text-charcoal mb-1">{field}</div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-start">
        <code className="bg-destructive/10 text-destructive px-2 py-1 rounded break-all">
          {expanded || !long ? oldS : truncate(oldS)}
        </code>
        <span className="text-muted-foreground self-center">→</span>
        <code className="bg-emerald-500/10 text-emerald-700 px-2 py-1 rounded break-all">
          {expanded || !long ? newS : truncate(newS)}
        </code>
      </div>
      {long && (
        <button onClick={() => setExpanded((e) => !e)} className="text-[10px] text-brand mt-1 underline">
          {expanded ? "Collapse" : "Show full"}
        </button>
      )}
    </div>
  );
};

const JsonBlock = ({ title, value }: { title: string; value: unknown }) => (
  <div>
    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</div>
    <pre className="bg-muted/50 border rounded-md p-2 text-[11px] overflow-x-auto max-h-64">
      {value === null || value === undefined ? "null" : JSON.stringify(value, null, 2)}
    </pre>
  </div>
);

export default Audit;

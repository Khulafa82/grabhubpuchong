import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, RefreshCw, RotateCcw, Search, ArrowUp, ArrowDown, Eye, Settings2, AlertTriangle, CheckCircle2, Users, UserCheck, UserX, PlayCircle, SkipForward,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  SERVICE_SCOPE_OPTIONS, LOCATION_SCOPE_OPTIONS, ACCOUNT_SCOPE_OPTIONS, CHANNEL_SCOPE_OPTIONS, scopeLabel,
} from "@/lib/scope";

interface OverviewRow {
  id: string;
  full_name: string | null;
  display_order: number | null;
  status: string | null;
  availability_status: string | null;
  assigned_service_scope: string | null;
  assigned_location_scope: string | null;
  assigned_application_scope: string | null;
  assigned_channel_scope: string | null;
  eligibility_status: string | null;
  active_customers: number | null;
  completed_customers: number | null;
  scope_key?: string | null;
  last_assigned_admin_id?: string | null;
  updated_at?: string | null;
}

interface MatchingAdmin {
  admin_id: string;
  admin_name: string | null;
  display_order: number | null;
  is_eligible: boolean;
  exclusion_reason: string | null;
}

interface NextAdmin {
  admin_id: string | null;
  admin_name: string | null;
  display_order: number | null;
}

const PREVIEW_SERVICE_OPTIONS = [
  { value: "grabcar", label: "GrabCar" },
  { value: "grabfood", label: "GrabFood" },
] as const;
const PREVIEW_LOCATION_OPTIONS = [
  { value: "klang_valley", label: "Klang Valley" },
  { value: "outside_klang_valley", label: "Outside Klang Valley" },
  { value: "sabah_sarawak", label: "Sabah & Sarawak" },
] as const;
const PREVIEW_APP_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reactivation", label: "Reactivation" },
] as const;
const PREVIEW_CHANNEL_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "online", label: "Online" },
] as const;

const eligibilityClass = (s?: string | null) => {
  switch ((s ?? "").toLowerCase()) {
    case "eligible":
      return "bg-brand/10 text-brand border-brand/20";
    case "inactive":
      return "bg-muted text-muted-foreground border-border";
    case "not_available":
    case "unavailable":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "missing_scope":
    case "scope_mismatch":
      return "bg-orange-500/10 text-orange-700 border-orange-500/20";
    default:
      return "bg-destructive/10 text-destructive border-destructive/20";
  }
};

const exclusionLabel = (s?: string | null) => (s ? s.replace(/_/g, " ") : "—");

const RoundRobinControl = () => {
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterEligibility, setFilterEligibility] = useState<string>("all");
  const [filterService, setFilterService] = useState<string>("all");

  // scope dialog
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeRow, setScopeRow] = useState<OverviewRow | null>(null);
  const [scopeService, setScopeService] = useState("both");
  const [scopeLocation, setScopeLocation] = useState("all");
  const [scopeApp, setScopeApp] = useState("both");
  const [scopeChannel, setScopeChannel] = useState("both");
  const [savingScope, setSavingScope] = useState(false);

  // preview
  const [previewService, setPreviewService] = useState<string>("grabcar");
  const [previewLocation, setPreviewLocation] = useState<string>("klang_valley");
  const [previewApp, setPreviewApp] = useState<string>("new");
  const [previewChannel, setPreviewChannel] = useState<string>("walk_in");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [matching, setMatching] = useState<MatchingAdmin[] | null>(null);
  const [nextAdmin, setNextAdmin] = useState<NextAdmin | null>(null);

  // reset
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("boss_round_robin_overview")
      .select("*")
      .order("display_order", { ascending: true, nullsFirst: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as OverviewRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const params = {
        p_service: previewService,
        p_location: previewLocation,
        p_application: previewApp,
        p_channel: previewChannel,
      };
      // eslint-disable-next-line no-console
      console.log("[RoundRobin] preview params", params);
      const [m, n] = await Promise.all([
        supabase.rpc("preview_matching_admins", params),
        supabase.rpc("preview_next_admin", params),
      ]);
      if (m.error) throw m.error;
      if (n.error) throw n.error;
      // eslint-disable-next-line no-console
      console.log("[RoundRobin] preview_matching_admins ->", m.data);
      // eslint-disable-next-line no-console
      console.log("[RoundRobin] preview_next_admin ->", n.data);

      const rawMatching = Array.isArray(m.data) ? m.data : m.data ? [m.data] : [];
      const normalizedMatching: MatchingAdmin[] = rawMatching.map((r: Record<string, unknown>) => {
        const eligibleRaw =
          r.is_eligible ?? r.isEligible ?? r.eligible ?? r.is_match ?? null;
        const isEligible =
          typeof eligibleRaw === "boolean"
            ? eligibleRaw
            : typeof eligibleRaw === "string"
            ? eligibleRaw.toLowerCase() === "true" || eligibleRaw.toLowerCase() === "eligible"
            : false;
        return {
          admin_id: String(r.admin_id ?? r.id ?? r.adminId ?? ""),
          admin_name: (r.admin_name ?? r.full_name ?? r.name ?? r.adminName ?? null) as string | null,
          display_order: (r.display_order ?? r.displayOrder ?? null) as number | null,
          is_eligible: isEligible,
          exclusion_reason: (r.exclusion_reason ?? r.reason ?? r.exclusionReason ?? null) as string | null,
        };
      });
      setMatching(normalizedMatching);

      const nd = n.data;
      const rawNext = Array.isArray(nd) ? nd[0] : nd;
      const nextRow: NextAdmin | null = rawNext
        ? {
            admin_id: (rawNext.admin_id ?? rawNext.id ?? rawNext.adminId ?? null) as string | null,
            admin_name: (rawNext.admin_name ?? rawNext.full_name ?? rawNext.name ?? rawNext.adminName ?? null) as
              | string
              | null,
            display_order: (rawNext.display_order ?? rawNext.displayOrder ?? null) as number | null,
          }
        : null;
      setNextAdmin(nextRow);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error("[RoundRobin] preview failed", e);
      toast.error(`Preview failed: ${msg}`);
    } finally {
      setPreviewLoading(false);
    }
  }, [previewService, previewLocation, previewApp, previewChannel]);

  useEffect(() => { void runPreview(); /* initial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastAssignedId = rows.find((r) => r.last_assigned_admin_id)?.last_assigned_admin_id ?? null;
  const lastAssignedAdmin = lastAssignedId ? rows.find((r) => r.id === lastAssignedId) : null;

  const totals = useMemo(() => {
    const total = rows.length;
    const eligible = rows.filter((r) => (r.eligibility_status ?? "").toLowerCase() === "eligible").length;
    return { total, eligible, excluded: total - eligible };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredRows = rows.filter((r) => {
      if (q && !(r.full_name ?? "").toLowerCase().includes(q)) return false;
      if (filterEligibility !== "all" && (r.eligibility_status ?? "").toLowerCase() !== filterEligibility) return false;
      if (filterService !== "all" && (r.assigned_service_scope ?? "") !== filterService) return false;
      return true;
    });
    const sorted = [...filteredRows].sort(
      (a, b) => (a.display_order ?? 999999) - (b.display_order ?? 999999),
    );
    return sorted.map((r, index) => ({ ...r, ui_order: index + 1 }));
  }, [rows, search, filterEligibility, filterService]);

  const moveOrder = async (row: OverviewRow, direction: -1 | 1) => {
    const current = row.display_order ?? 0;
    const target = current + direction;
    if (target < 1) return;
    setSavingOrder(row.id);
    const { error } = await supabase.rpc("boss_update_admin_display_order", {
      p_admin_id: row.id,
      p_new_order: target,
    });
    setSavingOrder(null);
    if (error) {
      toast.error(`Failed to update order: ${error.message}`);
      return;
    }
    toast.success(`Order updated for ${row.full_name ?? "admin"}`);
    await Promise.all([load(), runPreview()]);
  };

  const setOrderInline = async (row: OverviewRow, value: number) => {
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Order must be 1 or greater.");
      return;
    }
    if (value === row.display_order) return;
    setSavingOrder(row.id);
    const { error } = await supabase.rpc("boss_update_admin_display_order", {
      p_admin_id: row.id,
      p_new_order: value,
    });
    setSavingOrder(null);
    if (error) {
      toast.error(`Failed to update order: ${error.message}`);
      return;
    }
    toast.success("Display order saved.");
    await Promise.all([load(), runPreview()]);
  };

  const openScope = (row: OverviewRow) => {
    setScopeRow(row);
    setScopeService(row.assigned_service_scope ?? "both");
    setScopeLocation(row.assigned_location_scope ?? "all");
    setScopeApp(row.assigned_application_scope ?? "both");
    setScopeChannel(row.assigned_channel_scope ?? "both");
    setScopeOpen(true);
  };

  const saveScope = async () => {
    if (!scopeRow) return;
    setSavingScope(true);
    const { error } = await supabase.rpc("boss_update_admin_scope", {
      p_admin_id: scopeRow.id,
      p_service: scopeService,
      p_location: scopeLocation,
      p_application: scopeApp,
      p_channel: scopeChannel,
    });
    setSavingScope(false);
    if (error) {
      toast.error(`Failed to update scope: ${error.message}`);
      return;
    }
    toast.success("Assignment scope updated.");
    setScopeOpen(false);
    await Promise.all([load(), runPreview()]);
  };

  const doReset = async () => {
    setResetting(true);
    const { error } = await supabase.rpc("boss_reset_round_robin_state");
    setResetting(false);
    if (error) {
      toast.error(`Reset failed: ${error.message}`);
      return;
    }
    toast.success("Round robin state reset.");
    setResetOpen(false);
    await Promise.all([load(), runPreview()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Round Robin Assignment Control</h1>
          <p className="text-sm text-muted-foreground">Monitor, configure and preview how new customers get assigned to admins.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { void load(); void runPreview(); }} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setResetOpen(true)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Round Robin
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Admins in Pool" value={totals.total} icon={Users} />
        <SummaryCard label="Eligible Admins" value={totals.eligible} icon={UserCheck} accent="brand" />
        <SummaryCard label="Excluded Admins" value={totals.excluded} icon={UserX} accent="muted" />
        <SummaryCard label="Last Assigned" value={lastAssignedAdmin?.full_name ?? "—"} icon={SkipForward} small />
        <SummaryCard label="Next Expected" value={nextAdmin?.admin_name ?? "—"} icon={PlayCircle} small accent="brand" />
      </div>

      {/* Preview tool */}
      <Card className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-charcoal flex items-center gap-2"><Eye className="w-4 h-4 text-brand" /> Matching preview</h3>
            <p className="text-xs text-muted-foreground">See which admins would be eligible for an incoming customer with this profile.</p>
          </div>
          <Button size="sm" onClick={runPreview} disabled={previewLoading}>
            {previewLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
            Run preview
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <PreviewSelect label="Service" value={previewService} onChange={setPreviewService} options={PREVIEW_SERVICE_OPTIONS} />
          <PreviewSelect label="Location" value={previewLocation} onChange={setPreviewLocation} options={PREVIEW_LOCATION_OPTIONS} />
          <PreviewSelect label="Application" value={previewApp} onChange={setPreviewApp} options={PREVIEW_APP_OPTIONS} />
          <PreviewSelect label="Channel" value={previewChannel} onChange={setPreviewChannel} options={PREVIEW_CHANNEL_OPTIONS} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Next expected admin</div>
            {previewLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resolving…</div>
            ) : nextAdmin?.admin_id ? (
              <>
                <div className="text-lg font-semibold text-charcoal">{nextAdmin.admin_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  Display order #{
                    (() => {
                      const idx = sortedEligible.findIndex((m) => m.admin_id === nextAdmin.admin_id);
                      return idx >= 0 ? idx + 1 : "—";
                    })()
                  }
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No eligible admin for this profile.</div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-brand" /> Eligible admins</div>
            {previewLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</div>
            ) : sortedEligible.length === 0 ? (
              <div className="text-sm text-muted-foreground">No eligible admins.</div>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {sortedEligible.map((m, idx) => (
                  <li key={m.admin_id} className="flex items-center justify-between">
                    <span className="text-charcoal">{m.admin_name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><UserX className="w-3.5 h-3.5 text-destructive" /> Excluded admins</div>
            {previewLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</div>
            ) : (matching ?? []).filter((m) => !m.is_eligible).length === 0 ? (
              <div className="text-sm text-muted-foreground">No exclusions.</div>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {(matching ?? []).filter((m) => !m.is_eligible).map((m) => (
                  <li key={m.admin_id} className="flex items-center justify-between gap-2">
                    <span className="text-charcoal truncate">{m.admin_name ?? "—"}</span>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] uppercase tracking-wider">{exclusionLabel(m.exclusion_reason)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search admin</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" className="pl-9 h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Eligibility</Label>
            <Select value={filterEligibility} onValueChange={setFilterEligibility}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="eligible">Eligible</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="not_available">Not available</SelectItem>
                <SelectItem value="missing_scope">Missing scope</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Service scope</Label>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {SERVICE_SCOPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading round robin pool…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No admins match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Order</th>
                  <th className="py-3 px-4 font-medium">Admin</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Availability</th>
                  <th className="py-3 px-4 font-medium">Service</th>
                  <th className="py-3 px-4 font-medium">Location</th>
                  <th className="py-3 px-4 font-medium">Application</th>
                  <th className="py-3 px-4 font-medium">Channel</th>
                  <th className="py-3 px-4 font-medium">Eligibility</th>
                  <th className="py-3 px-4 font-medium text-right">Active</th>
                  <th className="py-3 px-4 font-medium text-right">Done</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isLast = lastAssignedId === r.id;
                  const isNext = nextAdmin?.admin_id === r.id;
                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-surface-muted/40">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveOrder(r, -1)} disabled={savingOrder === r.id || r.ui_order <= 1} aria-label="Move up">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            defaultValue={r.ui_order}
                            key={`${r.id}-${r.ui_order}`}
                            className="h-7 w-14 text-center px-1"
                            onBlur={(e) => setOrderInline(r, Number(e.target.value))}
                            disabled={savingOrder === r.id}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveOrder(r, 1)} disabled={savingOrder === r.id} aria-label="Move down">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-charcoal">{r.full_name ?? "—"}</div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {isLast && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">last assigned</span>}
                          {isNext && <span className="text-[10px] uppercase tracking-wider text-brand font-semibold">next up</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className={r.status === "active" ? "bg-brand/10 text-brand border-brand/20" : "bg-muted text-muted-foreground border-border"}>{r.status ?? "—"}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.availability_status ?? "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{scopeLabel("service", r.assigned_service_scope)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{scopeLabel("location", r.assigned_location_scope)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{scopeLabel("account", r.assigned_application_scope)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{scopeLabel("channel", r.assigned_channel_scope)}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className={eligibilityClass(r.eligibility_status)}>{(r.eligibility_status ?? "—").replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-charcoal">{r.active_customers ?? 0}</td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground">{r.completed_customers ?? 0}</td>
                      <td className="py-2.5 px-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => openScope(r)}>
                          <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Scope
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Scope dialog */}
      <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment Scope</DialogTitle>
            <DialogDescription>
              {scopeRow?.full_name ? `Configure which customers ${scopeRow.full_name} handles.` : "Configure assignment scope."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScopeSelect label="Service" value={scopeService} onChange={setScopeService} options={SERVICE_SCOPE_OPTIONS} />
            <ScopeSelect label="Location" value={scopeLocation} onChange={setScopeLocation} options={LOCATION_SCOPE_OPTIONS} />
            <ScopeSelect label="Application" value={scopeApp} onChange={setScopeApp} options={ACCOUNT_SCOPE_OPTIONS} />
            <ScopeSelect label="Channel" value={scopeChannel} onChange={setScopeChannel} options={CHANNEL_SCOPE_OPTIONS} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScopeOpen(false)} disabled={savingScope}>Cancel</Button>
            <Button onClick={saveScope} disabled={savingScope}>
              {savingScope && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />} Save scope
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirm */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset round robin state?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the current round robin state. The next matching customer will start again from the beginning of the eligible admin pool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void doReset(); }} disabled={resetting}>
              {resetting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />} Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const SummaryCard = ({
  label, value, icon: Icon, accent, small,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "brand" | "muted";
  small?: boolean;
}) => {
  const accentClass = accent === "brand" ? "bg-brand/10 text-brand" : accent === "muted" ? "bg-muted text-muted-foreground" : "bg-charcoal/10 text-charcoal";
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`font-bold text-charcoal truncate ${small ? "text-base" : "text-xl"}`}>{value}</div>
      </div>
    </Card>
  );
};

const PreviewSelect = ({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

const ScopeSelect = ({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

export default RoundRobinControl;
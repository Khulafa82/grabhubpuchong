import { Routes, Route } from "react-router-dom";
import {
  LayoutDashboard, Users, BarChart3, CalendarCheck, UsersRound, FileBarChart, Settings,
  TrendingUp, Clock, AlertTriangle, Loader2, Car, Utensils, MapPin,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useBossOverview } from "@/hooks/useBossOverview";
import { statusBadgeClass } from "@/lib/customers";
import BossReports from "./boss/Reports";
import BossCustomers from "./boss/CustomersList";
import BossAssignments from "./boss/Assignments";
import BossLeave from "./boss/LeaveApproval";
import BossPerformance from "./boss/Performance";
import BossSettings from "./boss/Settings";
import { PsvCalendarPage } from "@/components/psv/PsvCalendarPage";

const items = [
  { label: "Dashboard Overview", to: "/boss", icon: LayoutDashboard },
  { label: "All Customer Data", to: "/boss/customers", icon: Users },
  { label: "Admin Performance", to: "/boss/performance", icon: BarChart3 },
  { label: "Leave Approval", to: "/boss/leave", icon: CalendarCheck },
  { label: "Customer Assignment", to: "/boss/assignments", icon: UsersRound },
  { label: "PSV Calendar", to: "/boss/psv-calendar", icon: CalendarCheck },
  { label: "Reports & Analytics", to: "/boss/reports", icon: FileBarChart },
  { label: "Biodata & Settings", to: "/boss/settings", icon: Settings },
];

const PENDING_STATUSES = ["new", "contacted", "pending_documents", "waiting_customer_response", "psv_required", "under_review"];
const today = () => new Date().toISOString().slice(0, 10);

const Overview = () => {
  const { counts, loading: statsLoading, error: statsError } = useDashboardStats([
    { key: "totalCustomers", table: "customers" },
    { key: "newApps", table: "customers", filters: [{ column: "account_status", value: "new" }] },
    { key: "reactivations", table: "customers", filters: [{ column: "account_status", value: "reactivation" }] },
    { key: "completed", table: "customers", filters: [{ column: "customer_status", value: "completed" }] },
    { key: "pending", table: "customers", filters: [{ column: "customer_status", op: "in", value: PENDING_STATUSES }] },
    { key: "toContact", table: "customers", filters: [
      { column: "next_follow_up_date", op: "not", not: "is", value: null },
      { column: "next_follow_up_date", op: "lte", value: today() },
    ] },
    { key: "activeAdmins", table: "staff_profiles", filters: [{ column: "role", value: "admin" }, { column: "status", value: "active" }] },
    { key: "adminsOnLeave", table: "staff_profiles", filters: [
      { column: "role", value: "admin" },
      { column: "availability_status", op: "in", value: ["on_leave", "medical_leave"] },
    ] },
  ]);

  const { recent, urgent, workload, pendingLeaves, breakdown, loading: dataLoading, error: dataError } = useBossOverview();

  const loading = statsLoading || dataLoading;
  const error = statsError || dataError;

  const v = (k: string): string => {
    if (statsLoading) return "…";
    if (statsError) return "—";
    const n = counts[k];
    return typeof n === "number" ? n.toLocaleString() : "0";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Management overview</h1>
          <p className="text-sm text-muted-foreground">High-level KPIs across the operation.</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
          <Button className="gradient-brand">Export Report</Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Failed to load some dashboard data: {error}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={v("totalCustomers")} icon={Users} />
        <StatCard label="New Applications" value={v("newApps")} icon={TrendingUp} accent="charcoal" />
        <StatCard label="Reactivations" value={v("reactivations")} icon={Clock} />
        <StatCard label="Completed Cases" value={v("completed")} icon={BarChart3} accent="muted" />
        <StatCard label="Pending Cases" value={v("pending")} icon={AlertTriangle} />
        <StatCard label="To Contact" value={v("toContact")} icon={Clock} accent="charcoal" />
        <StatCard label="Active Admins" value={v("activeAdmins")} icon={UsersRound} />
        <StatCard label="Admins on Leave" value={v("adminsOnLeave")} icon={CalendarCheck} accent="muted" />
      </div>

      {/* Service & Location breakdowns */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">Customers by service</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-surface-muted p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center"><Car className="w-5 h-5" /></div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">GrabCar</div>
                <div className="text-xl font-bold text-charcoal">{dataLoading ? "…" : breakdown.grabCar.toLocaleString()}</div>
              </div>
            </div>
            <div className="rounded-xl bg-surface-muted p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-charcoal/10 text-charcoal flex items-center justify-center"><Utensils className="w-5 h-5" /></div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">GrabFood</div>
                <div className="text-xl font-bold text-charcoal">{dataLoading ? "…" : breakdown.grabFood.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">Customers by location</h3>
          <div className="space-y-3">
            {[
              { label: "Klang Valley", value: breakdown.klangValley },
              { label: "Outside Klang Valley", value: breakdown.outsideKlangValley },
              { label: "Sabah & Sarawak", value: breakdown.sabahSarawak },
            ].map((row) => {
              const total = breakdown.klangValley + breakdown.outsideKlangValley + breakdown.sabahSarawak || 1;
              const pct = Math.round((row.value / total) * 100);
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-charcoal"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{row.label}</span>
                    <span className="font-medium">{dataLoading ? "…" : row.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent + Urgent */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">Recent customer activity</h3>
          {dataLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : recent.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recent activity yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-charcoal truncate">{c.full_name ?? "Unnamed"} <span className="text-muted-foreground font-normal">· {c.applicant_id ?? "—"}</span></div>
                    <div className="text-xs text-muted-foreground">{c.user_role ?? "—"} · {c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}</div>
                  </div>
                  <Badge variant="outline" className={statusBadgeClass(c.customer_status)}>{c.customer_status ?? "—"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">High priority / urgent cases</h3>
          {dataLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : urgent.length === 0 ? (
            <div className="text-sm text-muted-foreground">No urgent cases right now.</div>
          ) : (
            <ul className="divide-y divide-border">
              {urgent.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-charcoal truncate">{c.full_name ?? "Unnamed"} <span className="text-muted-foreground font-normal">· {c.applicant_id ?? "—"}</span></div>
                    <div className="text-xs text-muted-foreground">{c.phone_number ?? "—"} · follow-up {c.next_follow_up_date ?? "—"}</div>
                  </div>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{c.priority_status ?? "—"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Workload + Pending leaves */}
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Admin workload overview</h3>
        {dataLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : workload.length === 0 ? (
          <div className="text-sm text-muted-foreground">No admin staff found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Admin</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Availability</th>
                  <th className="py-2 pr-4 font-medium text-right">Customers</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((a) => (
                  <tr key={a.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-4 font-medium text-charcoal">{a.full_name ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{a.email ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant="outline" className={a.status === "active" ? "bg-brand/10 text-brand border-brand/20" : "bg-muted text-muted-foreground border-border"}>{a.status ?? "—"}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{a.availability_status ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-charcoal">{a.customer_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Leave requests pending approval</h3>
        {dataLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : pendingLeaves.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending leave requests.</div>
        ) : (
          <ul className="divide-y divide-border">
            {pendingLeaves.map((l) => (
              <li key={l.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-charcoal">{l.staff_name ?? "Staff"} <span className="text-muted-foreground font-normal">· {l.leave_type ?? "leave"}</span></div>
                  <div className="text-xs text-muted-foreground">{l.start_date ?? "—"} → {l.end_date ?? "—"} {l.reason ? `· ${l.reason}` : ""}</div>
                </div>
                <Badge variant="outline" className="bg-charcoal/10 text-charcoal border-charcoal/20">submitted</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

const Boss = () => (
  <Routes>
    <Route element={<DashboardLayout role="boss" roleLabel="Boss" items={items} />}>
      <Route index element={<Overview />} />
      <Route path="customers" element={<BossCustomers />} />
      <Route path="performance" element={<BossPerformance />} />
      <Route path="leave" element={<BossLeave />} />
      <Route path="assignments" element={<BossAssignments />} />
      <Route path="psv-calendar" element={<PsvCalendarPage role="boss" />} />
      <Route path="reports" element={<BossReports />} />
      <Route path="settings" element={<BossSettings />} />
    </Route>
  </Routes>
);
export default Boss;

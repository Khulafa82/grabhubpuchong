import { Routes, Route } from "react-router-dom";
import {
  LayoutDashboard, Users, ShieldCheck, Eye, Shuffle, BarChart3, Server,
  Calendar, ScrollText, Lock, Sliders, Settings, AlertTriangle, Loader2, CalendarCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";
import { Card } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import BiodataSettings from "@/components/dashboard/BiodataSettings";
import LeaveManagement from "./super/LeaveManagement";
import { PsvCalendarPage } from "@/components/psv/PsvCalendarPage";

const items = [
  { label: "Dashboard Overview", to: "/super-admin", icon: LayoutDashboard },
  { label: "User Management", to: "/super-admin/users", icon: Users },
  { label: "Role & Access", to: "/super-admin/roles", icon: ShieldCheck },
  { label: "Customer Oversight", to: "/super-admin/customers", icon: Eye },
  { label: "Assignment Center", to: "/super-admin/assignments", icon: Shuffle },
  { label: "Boss Analytics", to: "/super-admin/analytics", icon: BarChart3 },
  { label: "IT Operations", to: "/super-admin/it", icon: Server },
  { label: "PSV Calendar", to: "/super-admin/psv", icon: Calendar },
  { label: "Global Logs", to: "/super-admin/logs", icon: ScrollText },
  { label: "Leave Management", to: "/super-admin/leave", icon: CalendarCheck },
  { label: "Security Control", to: "/super-admin/security", icon: Lock },
  { label: "System Settings", to: "/super-admin/system", icon: Sliders },
  { label: "Biodata & Settings", to: "/super-admin/settings", icon: Settings },
];

const Overview = () => {
  const { counts, loading, error } = useDashboardStats([
    { key: "totalCustomers", table: "customers" },
    { key: "totalStaff", table: "staff_profiles" },
    { key: "activeAdmins", table: "staff_profiles", filters: [{ column: "role", value: "admin" }, { column: "status", value: "active" }] },
    { key: "pendingLeave", table: "leave_applications", filters: [{ column: "leave_status", value: "submitted" }] },
    { key: "lockedAccounts", table: "staff_profiles", filters: [{ column: "account_locked", value: true }] },
    { key: "systemAlerts", table: "security_alerts", filters: [{ column: "alert_status", value: "open" }] },
    { key: "assignmentWarnings", table: "customers", filters: [{ column: "assignment_status", value: "unassigned" }] },
    { key: "securityAlerts", table: "security_alerts", filters: [{ column: "alert_status", value: "open" }] },
  ]);

  const v = (k: string): string => {
    if (loading) return "…";
    if (error) return "—";
    const n = counts[k];
    return typeof n === "number" ? n.toLocaleString() : "0";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Super Admin overview</h1>
          <p className="text-sm text-muted-foreground">Full system control and oversight.</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-brand mt-2" />}
      </div>
      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Failed to load some dashboard stats: {error}
        </Card>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={v("totalCustomers")} icon={Users} />
        <StatCard label="Total Staff" value={v("totalStaff")} icon={ShieldCheck} accent="charcoal" />
        <StatCard label="Active Admins" value={v("activeAdmins")} icon={Users} />
        <StatCard label="Pending Leave" value={v("pendingLeave")} icon={Calendar} accent="muted" />
        <StatCard label="Locked Accounts" value={v("lockedAccounts")} icon={Lock} />
        <StatCard label="System Alerts" value={v("systemAlerts")} icon={AlertTriangle} accent="charcoal" />
        <StatCard label="Assignment Warnings" value={v("assignmentWarnings")} icon={Shuffle} />
        <StatCard label="Security Alerts" value={v("securityAlerts")} icon={ShieldCheck} accent="muted" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">Recent system activity</h3>
          <div className="text-sm text-muted-foreground">Activity stream will populate from audit logs.</div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">User management overview</h3>
          <div className="text-sm text-muted-foreground">Roles, sessions, and permissions snapshot.</div>
        </Card>
      </div>
    </div>
  );
};

const SuperAdmin = () => (
  <Routes>
    <Route element={<DashboardLayout role="super" roleLabel="Super Admin" items={items} />}>
      <Route index element={<Overview />} />
      <Route path="users" element={<PagePlaceholder title="User Management" />} />
      <Route path="roles" element={<PagePlaceholder title="Role & Access Control" />} />
      <Route path="customers" element={<PagePlaceholder title="Customer Oversight" />} />
      <Route path="assignments" element={<PagePlaceholder title="Assignment Control Center" />} />
      <Route path="analytics" element={<PagePlaceholder title="Boss Analytics View" />} />
      <Route path="it" element={<PagePlaceholder title="IT Operations View" />} />
      <Route path="psv" element={<PagePlaceholder title="PSV Calendar Management" />} />
      <Route path="logs" element={<PagePlaceholder title="Global Logs & Audit Trail" />} />
      <Route path="leave" element={<LeaveManagement />} />
      <Route path="security" element={<PagePlaceholder title="Security & Session Control" />} />
      <Route path="system" element={<PagePlaceholder title="System Settings" />} />
      <Route path="settings" element={<BiodataSettings roleLabel="Super Admin" />} />
    </Route>
  </Routes>
);
export default SuperAdmin;

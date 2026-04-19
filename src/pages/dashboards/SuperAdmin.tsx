import { Routes, Route } from "react-router-dom";
import {
  LayoutDashboard, Users, ShieldCheck, Eye, Shuffle, BarChart3, Server,
  Calendar, ScrollText, Lock, Sliders, Settings, AlertTriangle,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";
import { Card } from "@/components/ui/card";

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
  { label: "Security Control", to: "/super-admin/security", icon: Lock },
  { label: "System Settings", to: "/super-admin/system", icon: Sliders },
  { label: "Biodata & Settings", to: "/super-admin/settings", icon: Settings },
];

const Overview = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-charcoal">Super Admin overview</h1>
      <p className="text-sm text-muted-foreground">Full system control and oversight.</p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Customers" value="—" icon={Users} />
      <StatCard label="Total Staff" value="—" icon={ShieldCheck} accent="charcoal" />
      <StatCard label="Active Admins" value="—" icon={Users} />
      <StatCard label="Pending Leave" value="—" icon={Calendar} accent="muted" />
      <StatCard label="Locked Accounts" value="—" icon={Lock} />
      <StatCard label="System Alerts" value="—" icon={AlertTriangle} accent="charcoal" />
      <StatCard label="Assignment Warnings" value="—" icon={Shuffle} />
      <StatCard label="Security Alerts" value="—" icon={ShieldCheck} accent="muted" />
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
      <Route path="security" element={<PagePlaceholder title="Security & Session Control" />} />
      <Route path="system" element={<PagePlaceholder title="System Settings" />} />
      <Route path="settings" element={<PagePlaceholder title="Biodata & Settings" />} />
    </Route>
  </Routes>
);
export default SuperAdmin;

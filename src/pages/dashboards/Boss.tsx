import { Routes, Route } from "react-router-dom";
import {
  LayoutDashboard, Users, BarChart3, CalendarCheck, UsersRound, FileBarChart, Settings,
  TrendingUp, Clock, AlertTriangle,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const items = [
  { label: "Dashboard Overview", to: "/boss", icon: LayoutDashboard },
  { label: "All Customer Data", to: "/boss/customers", icon: Users },
  { label: "Admin Performance", to: "/boss/performance", icon: BarChart3 },
  { label: "Leave Approval", to: "/boss/leave", icon: CalendarCheck },
  { label: "Customer Assignment", to: "/boss/assignments", icon: UsersRound },
  { label: "Reports & Analytics", to: "/boss/reports", icon: FileBarChart },
  { label: "Biodata & Settings", to: "/boss/settings", icon: Settings },
];

const Overview = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Management overview</h1>
        <p className="text-sm text-muted-foreground">High-level KPIs across the operation.</p>
      </div>
      <Button className="gradient-brand">Export Report</Button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Customers" value="—" icon={Users} />
      <StatCard label="New Applications" value="—" icon={TrendingUp} accent="charcoal" />
      <StatCard label="Reactivations" value="—" icon={Clock} />
      <StatCard label="Completed Cases" value="—" icon={BarChart3} accent="muted" />
      <StatCard label="Pending Cases" value="—" icon={AlertTriangle} />
      <StatCard label="Active Admins" value="—" icon={UsersRound} accent="charcoal" />
      <StatCard label="Admins on Leave" value="—" icon={CalendarCheck} />
      <StatCard label="Follow-ups Due" value="—" icon={Clock} accent="muted" />
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal">Performance trend</h3>
        <div className="mt-4 h-56 rounded-xl bg-surface-muted flex items-center justify-center text-sm text-muted-foreground">
          Chart placeholder — connect data source
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal">Application breakdown</h3>
        <div className="mt-4 h-56 rounded-xl bg-surface-muted flex items-center justify-center text-sm text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
    </div>
    <Card className="p-6">
      <h3 className="font-semibold text-charcoal mb-4">Admin performance</h3>
      <div className="text-sm text-muted-foreground">Table will list admins, assigned cases, completion rate and SLA.</div>
    </Card>
  </div>
);

const Boss = () => (
  <Routes>
    <Route element={<DashboardLayout role="boss" roleLabel="Boss" items={items} />}>
      <Route index element={<Overview />} />
      <Route path="customers" element={<PagePlaceholder title="All Customer Data" />} />
      <Route path="performance" element={<PagePlaceholder title="Admin Performance Monitoring" />} />
      <Route path="leave" element={<PagePlaceholder title="Leave Approval Management" />} />
      <Route path="assignments" element={<PagePlaceholder title="Customer Assignment Oversight" />} />
      <Route path="reports" element={<PagePlaceholder title="Reports & Analytics" />} />
      <Route path="settings" element={<PagePlaceholder title="Biodata & Settings" />} />
    </Route>
  </Routes>
);
export default Boss;

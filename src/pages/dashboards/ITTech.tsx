import { Routes, Route } from "react-router-dom";
import {
  LayoutDashboard, UserCog, Activity, Shuffle, ClipboardCheck, Copy, ScrollText,
  ShieldAlert, Settings, AlertTriangle, Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";
import { Card } from "@/components/ui/card";

const items = [
  { label: "Dashboard Overview", to: "/it-tech", icon: LayoutDashboard },
  { label: "Staff Account Mgmt", to: "/it-tech/accounts", icon: UserCog },
  { label: "Admin State", to: "/it-tech/state", icon: Activity },
  { label: "Reassignment", to: "/it-tech/reassignment", icon: Shuffle },
  { label: "Leave Handover", to: "/it-tech/handover", icon: ClipboardCheck },
  { label: "Duplicates", to: "/it-tech/duplicates", icon: Copy },
  { label: "Audit Trail", to: "/it-tech/audit", icon: ScrollText },
  { label: "Tech Settings", to: "/it-tech/tech-settings", icon: ShieldAlert },
  { label: "Biodata & Settings", to: "/it-tech/settings", icon: Settings },
];

const Overview = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-charcoal">Technical operations</h1>
      <p className="text-sm text-muted-foreground">Account, assignment and integrity controls.</p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Active Admins" value="—" icon={Users} />
      <StatCard label="Pending Handovers" value="—" icon={ClipboardCheck} accent="charcoal" />
      <StatCard label="Unassigned Customers" value="—" icon={Shuffle} />
      <StatCard label="Duplicate Alerts" value="—" icon={AlertTriangle} accent="muted" />
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Security alerts</h3>
        <div className="text-sm text-muted-foreground">No alerts. Connect logs source.</div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Rotation integrity</h3>
        <div className="text-sm text-muted-foreground">Healthy. Awaiting backend metrics.</div>
      </Card>
    </div>
    <Card className="p-6">
      <h3 className="font-semibold text-charcoal mb-4">Technical alert center</h3>
      <div className="text-sm text-muted-foreground">All quiet.</div>
    </Card>
  </div>
);

const ITTech = () => (
  <Routes>
    <Route element={<DashboardLayout role="it" roleLabel="IT Technician" items={items} />}>
      <Route index element={<Overview />} />
      <Route path="accounts" element={<PagePlaceholder title="Staff Account Management" />} />
      <Route path="state" element={<PagePlaceholder title="Admin State & Availability" />} />
      <Route path="reassignment" element={<PagePlaceholder title="Customer Assignment & Reassignment" />} />
      <Route path="handover" element={<PagePlaceholder title="Leave Handover Execution" />} />
      <Route path="duplicates" element={<PagePlaceholder title="Customer Data Correction & Duplicate Handling" />} />
      <Route path="audit" element={<PagePlaceholder title="System Logs & Audit Trail" />} />
      <Route path="tech-settings" element={<PagePlaceholder title="Technical Settings & Security Controls" />} />
      <Route path="settings" element={<PagePlaceholder title="Biodata & Settings" />} />
    </Route>
  </Routes>
);
export default ITTech;

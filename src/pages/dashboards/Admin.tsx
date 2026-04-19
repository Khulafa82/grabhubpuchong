import { Routes, Route } from "react-router-dom";
import {
  LayoutDashboard, Users, UserCheck, Phone, CalendarOff, Calendar, Settings,
  Clock, MessageCircle, AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const items = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "All Customer Data", to: "/admin/all-customers", icon: Users },
  { label: "My Customer Data", to: "/admin/my-customers", icon: UserCheck },
  { label: "Contact List", to: "/admin/contacts", icon: Phone },
  { label: "Leave Application", to: "/admin/leave", icon: CalendarOff },
  { label: "PSV Calendar", to: "/admin/psv-calendar", icon: Calendar },
  { label: "Biodata & Settings", to: "/admin/settings", icon: Settings },
];

const Overview = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-charcoal">Welcome back</h1>
      <p className="text-sm text-muted-foreground">Here's what needs your attention today.</p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="My Customers" value="—" icon={Users} hint="Awaiting backend" />
      <StatCard label="Today Follow-ups" value="—" icon={Clock} accent="charcoal" />
      <StatCard label="Walk-ins" value="—" icon={UserCheck} />
      <StatCard label="Pending Updates" value="—" icon={AlertCircle} accent="muted" />
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-charcoal">Today's follow-ups</h3>
          <Badge variant="outline">Live</Badge>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <div className="font-medium text-sm text-charcoal">Customer placeholder #{i}</div>
                <div className="text-xs text-muted-foreground">Scheduled · awaiting data</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost"><Phone className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost"><MessageCircle className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Recent customer updates</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted">
              <div className="w-8 h-8 rounded-full gradient-brand shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-charcoal">Update placeholder #{i}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Connect Supabase to populate</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
    <Card className="p-6">
      <h3 className="font-semibold text-charcoal mb-4">Walk-in priority customers</h3>
      <div className="text-sm text-muted-foreground">Empty — customers will appear here once data is connected.</div>
    </Card>
  </div>
);

const Admin = () => (
  <Routes>
    <Route element={<DashboardLayout role="admin" roleLabel="Admin" items={items} />}>
      <Route index element={<Overview />} />
      <Route path="all-customers" element={<PagePlaceholder title="All Customer Data" description="Searchable, filterable customer table." />} />
      <Route path="my-customers" element={<PagePlaceholder title="My Customer Data" description="Customers assigned to you with quick actions." />} />
      <Route path="contacts" element={<PagePlaceholder title="Contact List" description="Quick contact directory with WhatsApp & call." />} />
      <Route path="leave" element={<PagePlaceholder title="Leave Application" description="Apply for leave and view history." />} />
      <Route path="psv-calendar" element={<PagePlaceholder title="PSV Calendar" description="Upcoming PSV course & test schedule." />} />
      <Route path="settings" element={<PagePlaceholder title="Biodata & Settings" description="Update your profile and preferences." />} />
    </Route>
  </Routes>
);
export default Admin;

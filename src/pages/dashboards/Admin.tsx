import { Routes, Route, NavLink as RouterNavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, UserCheck, Phone, CalendarOff, Calendar, Settings,
  Clock, MessageCircle, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCustomers } from "@/hooks/useCustomers";
import { CustomerTable } from "@/components/admin/CustomerTable";
import { AllCustomersTable } from "@/components/admin/AllCustomersTable";
import { CustomerActionsDialog } from "@/components/admin/CustomerActionsDialog";
import { Customer, isOverdue, isToday, telLink, waLink, statusBadgeClass } from "@/lib/customers";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import BiodataSettings from "@/components/dashboard/BiodataSettings";

const items = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "All Customer Data", to: "/admin/all-customers", icon: Users },
  { label: "My Customer Data", to: "/admin/my-customers", icon: UserCheck },
  { label: "Contact List", to: "/admin/contacts", icon: Phone },
  { label: "Leave Application", to: "/admin/leave", icon: CalendarOff },
  { label: "PSV Calendar", to: "/admin/psv-calendar", icon: Calendar },
  { label: "Biodata & Settings", to: "/admin/settings", icon: Settings },
];

const useMyId = () => {
  const { user } = useAuth();
  return user?.id ?? null;
};

const Overview = () => {
  const myId = useMyId();
  const { data, loading, error, refetch } = useCustomers({ adminId: myId, scope: "mine" });
  const [active, setActive] = useState<Customer | null>(null);

  const followups = useMemo(
    () => data.filter((c) => isToday(c.next_follow_up_date) || isOverdue(c.next_follow_up_date)),
    [data],
  );
  const todayCount = data.filter((c) => isToday(c.next_follow_up_date)).length;
  const overdueCount = data.filter((c) => isOverdue(c.next_follow_up_date)).length;
  const walkIns = data.filter((c) => c.priority_status === "walk_in" || c.priority_status === "urgent");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Here's what needs your attention today.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Customers" value={loading ? "…" : data.length} icon={Users} />
        <StatCard label="Today Follow-ups" value={loading ? "…" : todayCount} icon={Clock} accent="charcoal" />
        <StatCard label="Walk-ins / Urgent" value={loading ? "…" : walkIns.length} icon={UserCheck} />
        <StatCard label="Overdue" value={loading ? "…" : overdueCount} icon={AlertCircle} accent="muted" />
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-charcoal">Today's & overdue follow-ups</h3>
            <Badge variant="outline">{followups.length}</Badge>
          </div>
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
          ) : followups.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">Nothing due. You're all caught up.</div>
          ) : (
            <div className="space-y-3">
              {followups.slice(0, 6).map((c) => {
                const overdue = isOverdue(c.next_follow_up_date);
                return (
                  <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border ${overdue ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-charcoal truncate">{c.full_name ?? "—"}</div>
                      <div className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {overdue ? "Overdue · " : "Today · "}{c.applicant_id ?? c.phone_number}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button asChild size="icon" variant="ghost"><a href={telLink(c.phone_number)}><Phone className="w-4 h-4" /></a></Button>
                      <Button asChild size="icon" variant="ghost"><a href={waLink(c.phone_number)} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4" /></a></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">Recent customer updates</h3>
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
          ) : data.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No customers assigned yet.</div>
          ) : (
            <div className="space-y-3">
              {data.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted">
                  <div className="w-8 h-8 rounded-full gradient-brand shrink-0 flex items-center justify-center text-brand-foreground text-xs font-semibold">
                    {c.full_name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="text-sm flex-1 min-w-0">
                    <div className="font-medium text-charcoal truncate">{c.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <Badge variant="outline" className={statusBadgeClass(c.customer_status)}>{c.customer_status ?? "new"}</Badge>
                      <span className="ml-2">{c.user_role ?? ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-charcoal">Walk-in / priority customers</h3>
          <Badge variant="outline">{walkIns.length}</Badge>
        </div>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
        ) : walkIns.length === 0 ? (
          <div className="text-sm text-muted-foreground">No walk-in or urgent customers right now.</div>
        ) : (
          <CustomerTable rows={walkIns} loading={false} error={null} canEdit={(c) => c.admin_in_charge === myId} onEdit={setActive} />
        )}
      </Card>

      <CustomerActionsDialog
        key={active?.id ?? "none"}
        customer={active}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        onSaved={refetch}
      />
    </div>
  );
};

const MyCustomersPage = () => {
  const myId = useMyId();
  const { data, loading, error, refetch } = useCustomers({ adminId: myId, scope: "mine" });
  const [active, setActive] = useState<Customer | null>(null);

  const markContacted = async (c: Customer) => {
    const { error: err } = await supabase
      .from("customers")
      .update({ customer_status: "contacted" })
      .eq("id", c.id);
    if (err) toast.error(err.message);
    else {
      toast.success("Marked as contacted");
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">My customers</h1>
          <p className="text-sm text-muted-foreground">Customers assigned to you. {data.length} total.</p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={loading}>Refresh</Button>
      </div>
      <CustomerTable
        rows={data}
        loading={loading}
        error={error}
        canEdit={() => true}
        onEdit={setActive}
        empty="No customers are currently assigned to you."
      />
      {data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.slice(0, 5).map((c) => (
            <Button key={c.id} size="sm" variant="outline" onClick={() => markContacted(c)}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Mark {c.full_name?.split(" ")[0]} contacted
            </Button>
          ))}
        </div>
      )}
      <CustomerActionsDialog
        key={active?.id ?? "none"}
        customer={active}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        onSaved={refetch}
      />
    </div>
  );
};

const AllCustomersPage = () => {
  const myId = useMyId();
  const { data, loading, error, refetch } = useCustomers({ scope: "all" });
  const [active, setActive] = useState<Customer | null>(null);
  const mineCount = useMemo(() => data.filter((c) => c.admin_in_charge === myId).length, [data, myId]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">All customer data</h1>
          <p className="text-sm text-muted-foreground">
            CRM workspace · {data.length} records · {mineCount} assigned to you · others are read-only.
          </p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={loading}>Refresh</Button>
      </div>
      <AllCustomersTable
        rows={data}
        loading={loading}
        error={error}
        myId={myId}
        onEdit={setActive}
        refetch={refetch}
      />
      <CustomerActionsDialog
        key={active?.id ?? "none"}
        customer={active}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        onSaved={refetch}
      />
    </div>
  );
};

const ContactsPage = () => {
  const myId = useMyId();
  const { data, loading, error, refetch } = useCustomers({ adminId: myId, scope: "mine" });

  const markContacted = async (c: Customer) => {
    const { error: err } = await supabase
      .from("customers")
      .update({ customer_status: "contacted" })
      .eq("id", c.id);
    if (err) toast.error(err.message);
    else {
      toast.success("Marked as contacted");
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Contact list</h1>
        <p className="text-sm text-muted-foreground">Quick contact directory for your assigned customers.</p>
      </div>
      {error && <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>}
      {loading ? (
        <Card className="p-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></Card>
      ) : data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No assigned customers.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((c) => (
            <Card key={c.id} className="p-4 space-y-3">
              <div>
                <div className="font-semibold text-charcoal">{c.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{c.phone_number ?? "—"}</div>
              </div>
              <Badge variant="outline" className={statusBadgeClass(c.customer_status)}>
                {c.customer_status ?? "new"}
              </Badge>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><a href={telLink(c.phone_number)}><Phone className="w-3 h-3 mr-1" /> Call</a></Button>
                <Button asChild size="sm" variant="outline"><a href={waLink(c.phone_number)} target="_blank" rel="noreferrer"><MessageCircle className="w-3 h-3 mr-1" /> WhatsApp</a></Button>
                <Button size="sm" variant="ghost" onClick={() => markContacted(c)}><CheckCircle2 className="w-3 h-3 mr-1" /> Contacted</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Admin = () => (
  <Routes>
    <Route element={<DashboardLayout role="admin" roleLabel="Admin" items={items} />}>
      <Route index element={<Overview />} />
      <Route path="all-customers" element={<AllCustomersPage />} />
      <Route path="my-customers" element={<MyCustomersPage />} />
      <Route path="contacts" element={<ContactsPage />} />
      <Route path="leave" element={<PagePlaceholder title="Leave Application" description="Apply for leave and view history." />} />
      <Route path="psv-calendar" element={<PagePlaceholder title="PSV Calendar" description="Upcoming PSV course & test schedule." />} />
      <Route path="settings" element={<BiodataSettings roleLabel="Admin" />} />
    </Route>
  </Routes>
);
export default Admin;

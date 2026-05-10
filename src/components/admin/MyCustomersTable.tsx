import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Search, X, Pencil,
} from "lucide-react";
import {
  Customer, statusBadgeClass, priorityBadgeClass, isOverdue, isToday,
  CUSTOMER_STATUS_OPTIONS, PRIORITY_OPTIONS,
} from "@/lib/customers";
import { CustomerDetailDrawer } from "./CustomerDetailDrawer";
import { QuickDateTabs, QuickDateRange, inQuickRange } from "./QuickDateTabs";

interface Props {
  rows: Customer[];
  loading: boolean;
  error: string | null;
  onEdit: (c: Customer) => void;
  refetch: () => void;
}

const PAGE_SIZE = 25;

const isUpcoming = (date?: string | null) => {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  return d > today && d <= in7;
};

export const MyCustomersTable = ({ rows, loading, error, refetch }: Props) => {
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [ic, setIc] = useState("");
  const [service, setService] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [followState, setFollowState] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [quickRange, setQuickRange] = useState<QuickDateRange>("all");
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<Customer | null>(null);

  const services = useMemo(
    () => Array.from(new Set(rows.map((r) => r.user_role).filter(Boolean))) as string[],
    [rows],
  );
  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.account_status).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!inQuickRange(r.registration_date ?? r.created_at, quickRange)) return false;
      if (search && !(r.full_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (phone && !(r.phone_number ?? "").includes(phone)) return false;
      if (ic && !(r.ic_number ?? "").toLowerCase().includes(ic.toLowerCase())) return false;
      if (service !== "all" && r.user_role !== service) return false;
      if (category !== "all" && r.account_status !== category) return false;
      if (status !== "all" && r.customer_status !== status) return false;
      if (priority !== "all" && r.priority_status !== priority) return false;
      if (followState === "today" && !isToday(r.next_follow_up_date)) return false;
      if (followState === "overdue" && !isOverdue(r.next_follow_up_date)) return false;
      if (followState === "upcoming" && !isUpcoming(r.next_follow_up_date)) return false;
      if (followState === "none" && r.next_follow_up_date) return false;
      if (from || to) {
        const created = r.registration_date ?? r.created_at;
        if (!created) return false;
        const d = new Date(created).getTime();
        if (from && d < new Date(from).getTime()) return false;
        if (to && d > new Date(to).getTime() + 86400000) return false;
      }
      return true;
    });
  }, [rows, search, phone, ic, service, category, status, priority, followState, from, to, quickRange]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const walkInRows = useMemo(() => pageRows.filter((c) => !!c.walk_in_flag), [pageRows]);
  const onlineRows = useMemo(() => pageRows.filter((c) => !c.walk_in_flag), [pageRows]);

  const reset = () => {
    setSearch(""); setPhone(""); setIc("");
    setService("all"); setCategory("all"); setStatus("all"); setPriority("all");
    setFollowState("all"); setFrom(""); setTo(""); setPage(1);
  };

  return (
    <div className="space-y-4">
      <QuickDateTabs rows={rows} value={quickRange} onChange={(v) => { setQuickRange(v); setPage(1); }} />
      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Search name</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="e.g. Ahmad" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone</Label>
            <Input value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} placeholder="01x..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">IC number</Label>
            <Input value={ic} onChange={(e) => { setIc(e.target.value); setPage(1); }} placeholder="MyKad" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Service type</Label>
            <Select value={service} onValueChange={(v) => { setService(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Application category</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CUSTOMER_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PRIORITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Follow-up</Label>
            <Select value={followState} onValueChange={(v) => { setFollowState(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming (7d)</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="none">No date set</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Registered from</Label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Registered to</Label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length} assigned customers
          </span>
          <Button size="sm" variant="ghost" onClick={reset}>
            <X className="w-3 h-3 mr-1" /> Reset filters
          </Button>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="p-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-brand" />
        </Card>
      ) : error ? (
        <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No customers assigned to you yet.</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No customers match the current filters.</Card>
      ) : (
        <div className="space-y-6">
          {[
            { key: "walkin", title: "Walk-in", subtitle: "Customers who came in person", rows: walkInRows },
            { key: "online", title: "Register Online", subtitle: "Customers registered through the online form", rows: onlineRows },
          ].filter((g) => g.rows.length > 0).map((group) => (
          <Card key={group.key} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-surface-muted/40">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">{group.title}</h3>
                <p className="text-xs text-muted-foreground">{group.subtitle}</p>
              </div>
              <Badge variant="outline">{group.rows.length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Applicant ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right sticky right-0 bg-card shadow-[-4px_0_8px_-4px_hsl(var(--foreground)/0.06)]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.map((c) => {
                  const overdue = isOverdue(c.next_follow_up_date);
                  const dueToday = isToday(c.next_follow_up_date);
                  const isWalkIn = !!c.walk_in_flag;
                  return (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer hover:bg-surface-muted/50 ${overdue ? "bg-destructive/5" : dueToday ? "bg-amber-500/5" : ""}`}
                      onClick={() => setDetails(c)}
                    >
                      <TableCell className="font-mono text-xs">{c.applicant_id ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="font-medium text-charcoal truncate">{c.full_name ?? "—"}</div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {isWalkIn ? (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-700 border-amber-500/20">Walk-in</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-muted text-muted-foreground border-border">Registered online</Badge>
                          )}
                          {!isWalkIn && c.priority_status === "urgent" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20">urgent</Badge>
                          )}
                          {overdue && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20">overdue</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{c.phone_number ?? "—"}</TableCell>
                      <TableCell className="capitalize text-xs">{c.user_role ?? "—"}</TableCell>
                      <TableCell className="capitalize text-xs max-w-[140px] truncate" title={c.location_choice ?? c.state ?? ""}>
                        {c.location_choice ?? c.state ?? "—"}
                      </TableCell>
                      <TableCell className="capitalize text-xs">{c.account_status ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(c.customer_status)}>
                          {(c.customer_status ?? "new").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isWalkIn ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400">
                            Walk-in customer
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={priorityBadgeClass(c.priority_status)}>
                            {(c.priority_status ?? "normal").replace(/_/g, " ")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={overdue ? "text-destructive font-medium text-xs whitespace-nowrap" : dueToday ? "text-amber-700 dark:text-amber-400 font-medium text-xs whitespace-nowrap" : "text-xs whitespace-nowrap"}>
                        {c.next_follow_up_date ? new Date(c.next_follow_up_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {(c.registration_date ?? c.created_at)
                          ? new Date((c.registration_date ?? c.created_at) as string).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell
                        className="text-right sticky right-0 bg-card shadow-[-4px_0_8px_-4px_hsl(var(--foreground)/0.06)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            className="bg-brand text-brand-foreground hover:bg-brand/90"
                            onClick={() => setDetails(c)}
                            title="Open and manage this customer"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
          </Card>
          ))}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs bg-card rounded-md border">
              <span className="text-muted-foreground">Page {safePage} of {pageCount}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Button size="sm" variant="outline" disabled={safePage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <CustomerDetailDrawer
        customer={details}
        open={!!details}
        onOpenChange={(o) => !o && setDetails(null)}
        editable
        onSaved={refetch}
      />
    </div>
  );
};
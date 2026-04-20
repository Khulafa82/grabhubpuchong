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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone, MessageCircle, Pencil, Loader2, Eye, Copy, CheckCircle2,
  Search, X,
} from "lucide-react";
import {
  Customer, statusBadgeClass, priorityBadgeClass, isOverdue, isToday,
  telLink, waLink, CUSTOMER_STATUS_OPTIONS, PRIORITY_OPTIONS,
} from "@/lib/customers";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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

export const MyCustomersTable = ({ rows, loading, error, onEdit, refetch }: Props) => {
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
  }, [rows, search, phone, ic, service, category, status, priority, followState, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const reset = () => {
    setSearch(""); setPhone(""); setIc("");
    setService("all"); setCategory("all"); setStatus("all"); setPriority("all");
    setFollowState("all"); setFrom(""); setTo(""); setPage(1);
  };

  const copyPhone = (p?: string | null) => {
    if (!p) return;
    navigator.clipboard?.writeText(p);
    toast.success("Phone copied");
  };

  const markContacted = async (c: Customer) => {
    const { error: err } = await supabase
      .from("customers")
      .update({ customer_status: "contacted" })
      .eq("id", c.id);
    if (err) toast.error(err.message);
    else { toast.success("Marked as contacted"); refetch(); }
  };

  return (
    <div className="space-y-4">
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>IC</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((c) => {
                  const overdue = isOverdue(c.next_follow_up_date);
                  const dueToday = isToday(c.next_follow_up_date);
                  return (
                    <TableRow key={c.id} className={overdue ? "bg-destructive/5" : dueToday ? "bg-amber-500/5" : ""}>
                      <TableCell className="font-mono text-xs">{c.applicant_id ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-medium text-charcoal">{c.full_name ?? "—"}</div>
                        <div className="flex gap-1 mt-0.5">
                          {c.priority_status === "walk_in" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-700 border-amber-500/20">walk-in</Badge>
                          )}
                          {c.priority_status === "urgent" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20">urgent</Badge>
                          )}
                          {overdue && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20">overdue</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{c.phone_number ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.ic_number ?? "—"}</TableCell>
                      <TableCell className="capitalize text-xs">{c.user_role ?? "—"}</TableCell>
                      <TableCell className="capitalize text-xs">{c.location_choice ?? c.state ?? "—"}</TableCell>
                      <TableCell className="capitalize text-xs">{c.account_status ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(c.customer_status)}>
                          {(c.customer_status ?? "new").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityBadgeClass(c.priority_status)}>
                          {(c.priority_status ?? "normal").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className={overdue ? "text-destructive font-medium text-xs" : dueToday ? "text-amber-700 dark:text-amber-400 font-medium text-xs" : "text-xs"}>
                        {c.next_follow_up_date ? new Date(c.next_follow_up_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="text-xs text-muted-foreground truncate" title={c.remarks ?? ""}>
                          {c.remarks ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {(c.registration_date ?? c.created_at)
                          ? new Date((c.registration_date ?? c.created_at) as string).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="View details" onClick={() => setDetails(c)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button asChild size="icon" variant="ghost" title="Call">
                            <a href={telLink(c.phone_number)}><Phone className="w-4 h-4" /></a>
                          </Button>
                          <Button asChild size="icon" variant="ghost" title="WhatsApp">
                            <a href={waLink(c.phone_number)} target="_blank" rel="noreferrer">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" title="Copy phone" onClick={() => copyPhone(c.phone_number)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Mark as contacted" onClick={() => markContacted(c)}>
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Update status / remark / follow-up" onClick={() => onEdit(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs">
              <span className="text-muted-foreground">Page {safePage} of {pageCount}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Button size="sm" variant="outline" disabled={safePage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Details dialog */}
      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{details?.full_name ?? "Customer details"}</DialogTitle>
          </DialogHeader>
          {details && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Applicant ID" value={details.applicant_id} mono />
              <Field label="IC number" value={details.ic_number} mono />
              <Field label="Phone" value={details.phone_number} />
              <Field label="Service" value={details.user_role} />
              <Field label="Application category" value={details.account_status} />
              <Field label="Location" value={details.location_choice ?? details.state} />
              <Field label="Status" value={details.customer_status} />
              <Field label="Priority" value={details.priority_status} />
              <Field label="Follow-up" value={details.next_follow_up_date ? new Date(details.next_follow_up_date).toLocaleDateString() : "—"} />
              <Field label="Registered" value={(details.registration_date ?? details.created_at) ? new Date((details.registration_date ?? details.created_at) as string).toLocaleDateString() : "—"} />
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Remarks</div>
                <div className="text-sm whitespace-pre-wrap">{details.remarks ?? "—"}</div>
              </div>
              <div className="col-span-2 flex gap-2 pt-2">
                <Button size="sm" onClick={() => { onEdit(details); setDetails(null); }}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={telLink(details.phone_number)}><Phone className="w-3 h-3 mr-1" /> Call</a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={waLink(details.phone_number)} target="_blank" rel="noreferrer"><MessageCircle className="w-3 h-3 mr-1" /> WhatsApp</a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-sm ${mono ? "font-mono" : ""} text-charcoal`}>{value ?? "—"}</div>
  </div>
);

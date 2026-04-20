import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Phone, MessageCircle, Copy, CheckCircle2, Search, X, Loader2,
  CalendarClock, StickyNote, Eye,
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
  refetch: () => void;
  onEdit: (c: Customer) => void;
}

const isUpcoming = (date?: string | null) => {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  return d > today && d <= in7;
};

type TabKey = "today" | "overdue" | "upcoming" | "none" | "all";

export const ContactListView = ({ rows, loading, error, refetch, onEdit }: Props) => {
  const [tab, setTab] = useState<TabKey>("today");
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [applicant, setApplicant] = useState("");
  const [service, setService] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const [remarkOpen, setRemarkOpen] = useState(false);
  const [remarkRow, setRemarkRow] = useState<Customer | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const [followOpen, setFollowOpen] = useState(false);
  const [followRow, setFollowRow] = useState<Customer | null>(null);
  const [followDate, setFollowDate] = useState("");
  const [savingFollow, setSavingFollow] = useState(false);

  const services = useMemo(
    () => Array.from(new Set(rows.map((r) => r.user_role).filter(Boolean))) as string[],
    [rows],
  );

  const counts = useMemo(() => {
    const today = rows.filter((r) => isToday(r.next_follow_up_date)).length;
    const overdue = rows.filter((r) => isOverdue(r.next_follow_up_date)).length;
    const upcoming = rows.filter((r) => isUpcoming(r.next_follow_up_date)).length;
    const none = rows.filter((r) => !r.next_follow_up_date).length;
    const contacted = rows.filter((r) => r.customer_status === "contacted").length;
    return { total: rows.length, today, overdue, upcoming, none, contacted };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === "today" && !isToday(r.next_follow_up_date)) return false;
      if (tab === "overdue" && !isOverdue(r.next_follow_up_date)) return false;
      if (tab === "upcoming" && !isUpcoming(r.next_follow_up_date)) return false;
      if (tab === "none" && r.next_follow_up_date) return false;
      if (search && !(r.full_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (phone && !(r.phone_number ?? "").includes(phone)) return false;
      if (applicant && !(r.applicant_id ?? "").toLowerCase().includes(applicant.toLowerCase())) return false;
      if (service !== "all" && r.user_role !== service) return false;
      if (status !== "all" && r.customer_status !== status) return false;
      if (priority !== "all" && r.priority_status !== priority) return false;
      return true;
    });
  }, [rows, tab, search, phone, applicant, service, status, priority]);

  const reset = () => {
    setSearch(""); setPhone(""); setApplicant("");
    setService("all"); setStatus("all"); setPriority("all");
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

  const openRemark = (c: Customer) => {
    setRemarkRow(c);
    setRemarkText(c.remarks ?? "");
    setRemarkOpen(true);
  };
  const saveRemark = async () => {
    if (!remarkRow) return;
    setSavingRemark(true);
    const { error: err } = await supabase
      .from("customers")
      .update({ remarks: remarkText || null })
      .eq("id", remarkRow.id);
    setSavingRemark(false);
    if (err) toast.error(err.message);
    else {
      toast.success("Remark saved");
      setRemarkOpen(false);
      refetch();
    }
  };

  const openFollow = (c: Customer) => {
    setFollowRow(c);
    setFollowDate(c.next_follow_up_date?.slice(0, 10) ?? "");
    setFollowOpen(true);
  };
  const saveFollow = async () => {
    if (!followRow) return;
    setSavingFollow(true);
    const { error: err } = await supabase
      .from("customers")
      .update({ next_follow_up_date: followDate || null })
      .eq("id", followRow.id);
    setSavingFollow(false);
    if (err) toast.error(err.message);
    else {
      toast.success("Follow-up updated");
      setFollowOpen(false);
      refetch();
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard label="Contactable" value={counts.total} tone="brand" />
        <SummaryCard label="Due today" value={counts.today} tone="amber" />
        <SummaryCard label="Overdue" value={counts.overdue} tone="destructive" />
        <SummaryCard label="No follow-up" value={counts.none} tone="muted" />
        <SummaryCard label="Contacted" value={counts.contacted} tone="brand" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="today">Today <Badge variant="outline" className="ml-2">{counts.today}</Badge></TabsTrigger>
          <TabsTrigger value="overdue">Overdue <Badge variant="outline" className="ml-2">{counts.overdue}</Badge></TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming <Badge variant="outline" className="ml-2">{counts.upcoming}</Badge></TabsTrigger>
          <TabsTrigger value="none">No date <Badge variant="outline" className="ml-2">{counts.none}</Badge></TabsTrigger>
          <TabsTrigger value="all">All <Badge variant="outline" className="ml-2">{counts.total}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Search name</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Ahmad" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01x..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Applicant ID</Label>
            <Input value={applicant} onChange={(e) => setApplicant(e.target.value)} placeholder="APP-..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Service type</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
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
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PRIORITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">{filtered.length} contactable customers</span>
          <Button size="sm" variant="ghost" onClick={reset}>
            <X className="w-3 h-3 mr-1" /> Reset filters
          </Button>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <Card className="p-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-brand" />
        </Card>
      ) : error ? (
        <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No assigned customers to contact yet.</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Nothing in this view. Try another tab or reset filters.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const overdue = isOverdue(c.next_follow_up_date);
            const dueToday = isToday(c.next_follow_up_date);
            const noPhone = !c.phone_number;
            const ringClass = overdue
              ? "border-destructive/40 bg-destructive/5"
              : dueToday
              ? "border-amber-500/40 bg-amber-500/5"
              : "";
            return (
              <Card key={c.id} className={`p-4 space-y-3 ${ringClass}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-charcoal truncate">{c.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{c.applicant_id ?? "—"}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className={statusBadgeClass(c.customer_status)}>
                      {(c.customer_status ?? "new").replace(/_/g, " ")}
                    </Badge>
                    {(c.priority_status === "urgent" || c.priority_status === "walk_in" || c.priority_status === "vip") && (
                      <Badge variant="outline" className={priorityBadgeClass(c.priority_status)}>
                        {c.priority_status.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-charcoal">{c.phone_number ?? "—"}</span>
                  </div>
                  {c.user_role && (
                    <div className="text-muted-foreground capitalize">Service: {c.user_role}</div>
                  )}
                  <div className={overdue ? "text-destructive font-medium" : dueToday ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}>
                    Follow-up: {c.next_follow_up_date ? new Date(c.next_follow_up_date).toLocaleDateString() : "not set"}
                    {overdue && " · overdue"}
                    {dueToday && " · today"}
                  </div>
                  <div className="text-muted-foreground line-clamp-2" title={c.remarks ?? ""}>
                    {c.remarks ? `“${c.remarks}”` : "No remarks"}
                  </div>
                </div>

                {/* Primary actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild size="sm" className="gradient-brand" disabled={noPhone}>
                    <a href={telLink(c.phone_number)}>
                      <Phone className="w-3 h-3 mr-1" /> Call
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" disabled={noPhone}>
                    <a href={waLink(c.phone_number)} target="_blank" rel="noreferrer">
                      <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                    </a>
                  </Button>
                </div>

                {/* Secondary actions */}
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyPhone(c.phone_number)} disabled={noPhone} title="Copy phone">
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => markContacted(c)} title="Mark as contacted">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Contacted
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openFollow(c)} title="Schedule follow-up">
                    <CalendarClock className="w-3 h-3 mr-1" /> Follow-up
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openRemark(c)} title="Add remark">
                    <StickyNote className="w-3 h-3 mr-1" /> Remark
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(c)} title="View / edit details">
                    <Eye className="w-3 h-3 mr-1" /> Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Remark dialog */}
      <Dialog open={remarkOpen} onOpenChange={setRemarkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add remark · {remarkRow?.full_name ?? "Customer"}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={5}
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Notes from this contact..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarkOpen(false)}>Cancel</Button>
            <Button onClick={saveRemark} disabled={savingRemark}>
              {savingRemark && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save remark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up dialog */}
      <Dialog open={followOpen} onOpenChange={setFollowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule follow-up · {followRow?.full_name ?? "Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Next follow-up date</Label>
            <Input type="date" value={followDate} onChange={(e) => setFollowDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowOpen(false)}>Cancel</Button>
            <Button onClick={saveFollow} disabled={savingFollow}>
              {savingFollow && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryCard = ({
  label, value, tone,
}: { label: string; value: number; tone: "brand" | "amber" | "destructive" | "muted" }) => {
  const toneClass =
    tone === "brand"
      ? "text-brand"
      : tone === "amber"
      ? "text-amber-700 dark:text-amber-400"
      : tone === "destructive"
      ? "text-destructive"
      : "text-muted-foreground";
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
    </Card>
  );
};

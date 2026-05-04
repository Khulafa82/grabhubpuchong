import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Users, UserCog, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface CustomerHit {
  id: string;
  applicant_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  ic_number: string | null;
  customer_status: string | null;
}

interface StaffHit {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
}

interface Props {
  role: string;
}

const customerRouteFor = (role: string) => {
  switch (role) {
    case "boss":
      return "/boss/customers";
    case "admin":
      return "/admin/customers";
    case "it_tech":
      return "/it/reassignment";
    case "super_admin":
      return "/super-admin";
    default:
      return "/";
  }
};

const staffRouteFor = (role: string) => {
  switch (role) {
    case "boss":
      return "/boss/accounts";
    case "it_tech":
      return "/it/staff-accounts";
    case "super_admin":
      return "/super-admin";
    default:
      return null;
  }
};

export const GlobalSearch = ({ role }: Props) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerHit[]>([]);
  const [staff, setStaff] = useState<StaffHit[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const canSearchStaff = role === "boss" || role === "it_tech" || role === "super_admin";
  const canSearchCustomers = role === "boss" || role === "admin" || role === "it_tech" || role === "super_admin";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setCustomers([]);
      setStaff([]);
      setError(null);
      setLoading(false);
      return;
    }
    const ctrl = { cancelled: false };
    setLoading(true);
    setError(null);
    const t = window.setTimeout(async () => {
      try {
        const escaped = term.replace(/[%,]/g, " ");
        const like = `%${escaped}%`;
        const customerPromise = canSearchCustomers
          ? Promise.resolve(
              supabase
                .from("customers")
                .select("id, applicant_id, full_name, phone_number, ic_number, customer_status")
                .or(
                  `full_name.ilike.${like},applicant_id.ilike.${like},phone_number.ilike.${like},ic_number.ilike.${like}`,
                )
                .limit(8),
            )
          : Promise.resolve({ data: [], error: null } as { data: unknown; error: { message: string } | null });
        const staffPromise = canSearchStaff
          ? Promise.resolve(
              supabase
                .from("staff_profiles")
                .select("id, full_name, username, email, role")
                .or(`full_name.ilike.${like},username.ilike.${like},email.ilike.${like}`)
                .limit(8),
            )
          : Promise.resolve({ data: [], error: null } as { data: unknown; error: { message: string } | null });
        const [cRes, sRes] = (await Promise.all([customerPromise, staffPromise])) as Array<{
          data: unknown;
          error: { message: string } | null;
        }>;
        if (ctrl.cancelled) return;
        if (cRes.error) throw cRes.error;
        if (sRes.error) throw sRes.error;
        setCustomers((cRes.data ?? []) as CustomerHit[]);
        setStaff((sRes.data ?? []) as StaffHit[]);
        setLoading(false);
      } catch (e) {
        if (ctrl.cancelled) return;
        setError(e instanceof Error ? e.message : "Search failed");
        setLoading(false);
      }
    }, 350);
    return () => {
      ctrl.cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, canSearchCustomers, canSearchStaff]);

  const goCustomer = (c: CustomerHit) => {
    setOpen(false);
    setQ("");
    navigate(`${customerRouteFor(role)}?q=${encodeURIComponent(c.applicant_id ?? c.full_name ?? "")}`);
  };
  const goStaff = (s: StaffHit) => {
    const route = staffRouteFor(role);
    if (!route) return;
    setOpen(false);
    setQ("");
    navigate(`${route}?q=${encodeURIComponent(s.full_name ?? s.email ?? "")}`);
  };

  const hasResults = customers.length > 0 || staff.length > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (customers[0]) return goCustomer(customers[0]);
      if (staff[0]) return goStaff(staff[0]);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-md hidden md:block">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => q && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search customers, staff, IDs, phone..."
          className="border-0 focus-visible:ring-0 px-0"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg max-h-[420px] overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">Search failed: {error}</div>
          ) : !hasResults ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No results found.</div>
          ) : (
            <div className="py-2">
              {customers.length > 0 && (
                <div className="mb-1">
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Customers
                  </div>
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => goCustomer(c)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-muted flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-charcoal truncate">
                          {c.full_name ?? "Unnamed"}{" "}
                          <span className="text-muted-foreground font-normal">· {c.applicant_id ?? "—"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.phone_number ?? "—"} {c.ic_number ? `· ${c.ic_number}` : ""}
                        </div>
                      </div>
                      {c.customer_status && (
                        <Badge variant="outline" className="text-[10px]">
                          {c.customer_status}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {staff.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserCog className="w-3 h-3" /> Staff
                  </div>
                  {staff.map((s) => {
                    const route = staffRouteFor(role);
                    return (
                      <button
                        key={s.id}
                        onClick={() => goStaff(s)}
                        disabled={!route}
                        className="w-full text-left px-3 py-2 hover:bg-surface-muted flex items-center justify-between gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-charcoal truncate">
                            {s.full_name ?? s.username ?? "Staff"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{s.email ?? "—"}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {s.role ?? "—"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
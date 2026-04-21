import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Bell, Search, Menu, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const initialsOf = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "U";

export type SidebarItem = { label: string; to: string; icon: ComponentType<{ className?: string }> };

interface Props {
  role: string;
  roleLabel: string;
  items: SidebarItem[];
}

export const DashboardLayout = ({ role, roleLabel, items }: Props) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("dashboard:sidebar:collapsed");
    if (stored !== null) return stored === "1";
    return window.innerWidth < 1280;
  });
  const [signingOut, setSigningOut] = useState(false);
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name?.trim() || "Staff User";
  const photo = profile?.profile_photo_url || undefined;
  const avatarBg = profile?.avatar_color || undefined;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dashboard:sidebar:collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/staff-login", { replace: true });
    } catch (e) {
      toast.error("Sign out failed. Please try again.");
      setSigningOut(false);
    }
  };
  return (
    <TooltipProvider delayDuration={150}>
    <div className="min-h-screen flex bg-surface w-full">
      {/* Sidebar */}
      <aside
        data-collapsed={collapsed ? "true" : "false"}
        className={`group/sidebar ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 h-screen w-64 lg:data-[collapsed=true]:w-16 bg-charcoal text-charcoal-foreground flex flex-col overflow-hidden transition-[width,transform] duration-200 ease-out`}
      >
        {/* Header / Logo */}
        <div className="h-16 shrink-0 flex items-center border-b border-charcoal-foreground/10 px-5 lg:group-data-[collapsed=true]/sidebar:px-0 lg:group-data-[collapsed=true]/sidebar:justify-center">
          {/* Full logo — hidden when collapsed on desktop */}
          <div className="lg:group-data-[collapsed=true]/sidebar:hidden">
            <Logo light />
          </div>
          {/* Compact mark — only when collapsed on desktop */}
          <span className="hidden lg:group-data-[collapsed=true]/sidebar:inline-flex w-9 h-9 rounded-lg gradient-brand items-center justify-center text-brand-foreground font-bold text-sm">
            G
          </span>
        </div>

        {/* Role label — full version */}
        <div className="px-5 py-4 border-b border-charcoal-foreground/10 lg:group-data-[collapsed=true]/sidebar:hidden">
          <div className="text-[10px] uppercase tracking-wider text-charcoal-foreground/40">Role</div>
          <div className="text-sm font-semibold mt-0.5 truncate">{roleLabel}</div>
        </div>
        {/* Role marker — collapsed (desktop only) */}
        <div className="hidden lg:group-data-[collapsed=true]/sidebar:flex justify-center py-3 border-b border-charcoal-foreground/10">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden="true" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
          {items.map((it) => (
            <Tooltip key={it.to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={it.to}
                  end
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors lg:group-data-[collapsed=true]/sidebar:justify-center lg:group-data-[collapsed=true]/sidebar:px-0 lg:group-data-[collapsed=true]/sidebar:h-10 ${
                      isActive
                        ? "bg-brand text-brand-foreground font-medium"
                        : "text-charcoal-foreground/70 hover:bg-charcoal-foreground/5 hover:text-charcoal-foreground"
                    }`
                  }
                >
                  <it.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate lg:group-data-[collapsed=true]/sidebar:hidden">{it.label}</span>
                </NavLink>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" className="hidden lg:block">{it.label}</TooltipContent>}
            </Tooltip>
          ))}
        </nav>

        {/* Footer / Sign out */}
        <div className="p-3 border-t border-charcoal-foreground/10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                disabled={signingOut}
                onClick={handleSignOut}
                className="w-full justify-start lg:group-data-[collapsed=true]/sidebar:justify-center lg:group-data-[collapsed=true]/sidebar:px-0 text-charcoal-foreground/70 hover:text-charcoal-foreground hover:bg-charcoal-foreground/5"
              >
                {signingOut ? (
                  <Loader2 className="w-4 h-4 mr-2 lg:group-data-[collapsed=true]/sidebar:mr-0 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2 lg:group-data-[collapsed=true]/sidebar:mr-0" />
                )}
                <span className="lg:group-data-[collapsed=true]/sidebar:hidden">
                  {signingOut ? "Signing out..." : "Sign out"}
                </span>
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" className="hidden lg:block">Sign out</TooltipContent>}
          </Tooltip>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-background border-b border-border flex items-center px-4 lg:px-6 gap-4">
          <button onClick={() => setOpen(true)} className="lg:hidden"><Menu /></button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-charcoal hover:bg-surface-muted transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="border-0 focus-visible:ring-0 px-0" />
          </div>
          <div className="flex-1 md:hidden" />
          <Button variant="ghost" size="icon"><Bell className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <Avatar className="w-8 h-8">
              {photo ? <AvatarImage src={photo} alt={displayName} /> : null}
              <AvatarFallback
                className="text-xs font-semibold text-brand-foreground"
                style={avatarBg ? { backgroundColor: avatarBg } : { background: "hsl(var(--brand))" }}
              >
                {initialsOf(displayName) || role.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-xs text-muted-foreground">{roleLabel}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden"><Outlet /></main>
      </div>
    </div>
    </TooltipProvider>
  );
};

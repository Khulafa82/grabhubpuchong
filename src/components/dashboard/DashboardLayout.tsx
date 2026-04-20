import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Bell, Search, Menu, Loader2 } from "lucide-react";
import { useState, type ComponentType } from "react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [signingOut, setSigningOut] = useState(false);
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name?.trim() || "Staff User";
  const photo = profile?.profile_photo_url || undefined;
  const avatarBg = profile?.avatar_color || undefined;

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
    <div className="min-h-screen flex bg-surface w-full">
      {/* Sidebar */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-charcoal text-charcoal-foreground flex flex-col transition-transform`}
      >
        <div className="h-16 flex items-center px-5 border-b border-charcoal-foreground/10">
          <Logo light />
        </div>
        <div className="px-5 py-4 border-b border-charcoal-foreground/10">
          <div className="text-[10px] uppercase tracking-wider text-charcoal-foreground/40">Role</div>
          <div className="text-sm font-semibold mt-0.5">{roleLabel}</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-brand text-brand-foreground font-medium"
                    : "text-charcoal-foreground/70 hover:bg-charcoal-foreground/5 hover:text-charcoal-foreground"
                }`
              }
            >
              <it.icon className="w-4 h-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-charcoal-foreground/10">
          <Button
            variant="ghost"
            disabled={signingOut}
            onClick={handleSignOut}
            className="w-full justify-start text-charcoal-foreground/70 hover:text-charcoal-foreground hover:bg-charcoal-foreground/5"
          >
            {signingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-background border-b border-border flex items-center px-4 lg:px-6 gap-4">
          <button onClick={() => setOpen(true)} className="lg:hidden"><Menu /></button>
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
  );
};

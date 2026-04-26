import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, LayoutDashboard, UserCog, LogOut, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useAuth } from "@/context/AuthContext";
import { ROLE_TO_PATH } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { canEditHomepage } from "@/lib/homepageContent";
import { useHomepageEdit } from "@/context/HomepageEditContext";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Services" },
  { to: "/guide", label: "Guide" },
  { to: "/articles", label: "Articles" },
  { to: "/contact", label: "Contact" },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  boss: "Boss",
  it_tech: "IT Technician",
  super_admin: "Super Admin",
};

const initialsOf = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "U";

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { profile, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { open: openEditor } = useHomepageEdit();

  // If logged in but profile missing/inactive, sign out
  useEffect(() => {
    if (loading) return;
    if (session && profile && profile.status && profile.status !== "active") {
      signOut().catch(() => {});
    }
  }, [loading, session, profile, signOut]);

  const isLoggedIn = !!session && !!profile && profile.status === "active";
  const showEditHomepage =
    !loading &&
    isLoggedIn &&
    location.pathname === "/" &&
    canEditHomepage(profile?.role);
  const dashboardPath = profile ? ROLE_TO_PATH[profile.role] : "/staff-login";
  const roleLabel = profile ? ROLE_LABEL[profile.role] ?? profile.role : "";
  const displayName = profile?.full_name?.trim() || "Staff User";
  const photo = profile?.profile_photo_url || undefined;
  const avatarBg = profile?.avatar_color || undefined;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out");
    } catch {
      toast.error("Sign out failed");
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  const ProfileMenu = ({ inMobile = false }: { inMobile?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1 hover:bg-surface-muted transition-colors ${
            inMobile ? "w-full justify-start" : ""
          }`}
          aria-label="Account menu"
        >
          <Avatar className="w-8 h-8">
            {photo ? <AvatarImage src={photo} alt={displayName} /> : null}
            <AvatarFallback
              className="text-xs font-semibold text-brand-foreground"
              style={avatarBg ? { backgroundColor: avatarBg } : { background: "hsl(var(--brand))" }}
            >
              {initialsOf(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight text-left">
            <div className="text-sm font-semibold text-charcoal max-w-[140px] truncate">{displayName}</div>
            <div className="text-[11px] text-charcoal/55">{roleLabel}</div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => { setOpen(false); navigate(dashboardPath); }}>
          <LayoutDashboard className="w-4 h-4 mr-2" /> Go to Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setOpen(false); navigate(`${dashboardPath}/biodata`); }}>
          <UserCog className="w-4 h-4 mr-2" /> Biodata & Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={signingOut} className="text-destructive focus:text-destructive">
          {signingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Logo />
        <nav className="hidden lg:flex items-center gap-7">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-brand ${
                  isActive ? "text-brand" : "text-charcoal/70"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {showEditHomepage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openEditor}
                  className="gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Homepage
                </Button>
              )}
              <ProfileMenu />
              <Button asChild size="sm" className="gradient-brand shadow-brand">
                <Link to="/register">Register Now</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/staff-login">Staff Login</Link>
              </Button>
              <Button asChild size="sm" className="gradient-brand shadow-brand">
                <Link to="/register">Register Now</Link>
              </Button>
            </>
          )}
        </div>
        <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="container py-4 flex flex-col gap-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `text-sm font-medium py-2 ${isActive ? "text-brand" : "text-charcoal/80"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {isLoggedIn ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <ProfileMenu inMobile />
                {showEditHomepage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setOpen(false); openEditor(); }}
                    className="gap-1.5 justify-start"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Homepage
                  </Button>
                )}
                <Button asChild size="sm" className="gradient-brand">
                  <Link to="/register" onClick={() => setOpen(false)}>Register Now</Link>
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to="/staff-login" onClick={() => setOpen(false)}>Staff Login</Link>
                </Button>
                <Button asChild size="sm" className="flex-1 gradient-brand">
                  <Link to="/register" onClick={() => setOpen(false)}>Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Services" },
  { to: "/guide", label: "Guide" },
  { to: "/articles", label: "Articles" },
  { to: "/contact", label: "Contact" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
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
          <Button asChild variant="ghost" size="sm">
            <Link to="/staff-login">Staff Login</Link>
          </Button>
          <Button asChild size="sm" className="gradient-brand shadow-brand">
            <Link to="/register">Register Now</Link>
          </Button>
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
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to="/staff-login" onClick={() => setOpen(false)}>Staff Login</Link>
              </Button>
              <Button asChild size="sm" className="flex-1 gradient-brand">
                <Link to="/register" onClick={() => setOpen(false)}>Register</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

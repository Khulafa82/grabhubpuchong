import { Link } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/site/Logo";

const StaffLogin = () => {
  const [show, setShow] = useState(false);
  // Placeholders for later Supabase integration
  const loading = false;
  const error: string | null = null;

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo /></div>
        <Card className="p-8 shadow-2xl">
          <div className="flex items-center gap-2 text-brand text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Staff Portal
          </div>
          <h1 className="text-2xl font-bold text-charcoal mt-2">Sign in to continue</h1>
          <p className="text-sm text-charcoal/60 mt-1">Authorized staff only.</p>

          {error && (
            <div className="mt-5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <div className="mt-6 grid gap-4">
            <div>
              <Label>Email or username</Label>
              <Input className="mt-1.5" placeholder="you@grabhubpuchong.my" />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative mt-1.5">
                <Input type={show ? "text" : "password"} placeholder="••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox /> <span>Remember me</span></label>
              <button className="text-brand hover:underline">Forgot password?</button>
            </div>
            <Button disabled={loading} className="gradient-brand w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
          </div>

          <p className="text-xs text-charcoal/50 mt-5 text-center">
            Access restricted. Unauthorized attempts are logged.
          </p>

          {/* Hidden placeholders for future state UIs */}
          <div className="hidden">
            <div>Loading state placeholder</div>
            <div>Invalid credentials placeholder</div>
            <div>Access denied placeholder</div>
            <div>Inactive account placeholder</div>
          </div>
        </Card>

        {/* Dev quick-access (for prototype navigation only — remove once auth is wired) */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { to: "/admin", l: "Admin" },
            { to: "/boss", l: "Boss" },
            { to: "/it-tech", l: "IT Tech" },
            { to: "/super-admin", l: "Super" },
          ].map((r) => (
            <Button key={r.to} asChild size="sm" variant="outline" className="text-xs">
              <Link to={r.to}>{r.l}</Link>
            </Button>
          ))}
        </div>
        <p className="text-center text-xs text-charcoal/50 mt-3">
          <Link to="/" className="hover:text-brand">← Back to homepage</Link>
        </p>
      </div>
    </div>
  );
};
export default StaffLogin;

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/site/Logo";
import { supabase, ROLE_TO_PATH, StaffRole } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const StaffLogin = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Auto-redirect if already signed in with valid profile
  useEffect(() => {
    if (!authLoading && user && profile && profile.status === "active" && profile.account_locked !== true) {
      if (profile.first_login_completed === false) {
        navigate("/first-time-password-change", { replace: true });
        return;
      }
      const path = ROLE_TO_PATH[profile.role as StaffRole];
      if (path) navigate(path, { replace: true });
    }
  }, [authLoading, user, profile, navigate]);

  // Show locked notice when redirected here due to lock
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("locked") === "1") {
      setError("Access denied. Your account has been locked. Please contact IT Technician.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!captchaToken) {
      setError("Please complete the reCAPTCHA verification.");
      return;
    }

    setLoading(true);

    // Step 1: verify reCAPTCHA via edge function
    const { data: capData, error: capErr } = await supabase.functions.invoke(
      "verify-recaptcha",
      { body: { token: captchaToken } },
    );

    if (capErr || !capData || (capData as { success?: boolean }).success !== true) {
      setError("Captcha verification failed. Please try again.");
      resetCaptcha();
      setLoading(false);
      return;
    }

    // Step 2: proceed with normal Supabase auth
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !signInData.user) {
      setError(signInError?.message || "Invalid credentials. Please try again.");
      resetCaptcha();
      setLoading(false);
      return;
    }

    // Step 3: load staff profile
    const { data: prof, error: profErr } = await supabase
      .from("staff_profiles")
      .select("*")
      .eq("id", signInData.user.id)
      .maybeSingle();

    if (profErr || !prof) {
      await supabase.auth.signOut();
      setError("Access denied. No staff profile found for this account.");
      resetCaptcha();
      setLoading(false);
      return;
    }

    if (prof.status !== "active") {
      await supabase.auth.signOut();
      setError("Your account is inactive. Please contact your administrator.");
      resetCaptcha();
      setLoading(false);
      return;
    }

    if (prof.account_locked === true) {
      await supabase.auth.signOut();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* noop */
      }
      setError("Access denied. Your account has been locked. Please contact IT Technician.");
      resetCaptcha();
      setLoading(false);
      return;
    }

    const path = ROLE_TO_PATH[prof.role as StaffRole];
    if (!path) {
      await supabase.auth.signOut();
      setError("Your account role is not recognized.");
      resetCaptcha();
      setLoading(false);
      return;
    }

    if (prof.first_login_completed === false) {
      navigate("/first-time-password-change", { replace: true });
      return;
    }

    navigate(path, { replace: true });
  };

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

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                className="mt-1.5"
                placeholder="you@grabhubpuchong.my"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={show ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox /> <span>Remember me</span></label>
              <button
                type="button"
                onClick={() => navigate("/forgot-password-request")}
                className="text-brand hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div ref={captchaRef} className="flex justify-center" />
            <Button type="submit" disabled={loading || !captchaToken} className="gradient-brand w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-charcoal/50 mt-5 text-center">
            Access restricted. Unauthorized attempts are logged.
          </p>
        </Card>

        <p className="text-center text-xs text-charcoal/50 mt-5">
          <Link to="/" className="hover:text-brand">← Back to homepage</Link>
        </p>
      </div>
    </div>
  );
};
export default StaffLogin;

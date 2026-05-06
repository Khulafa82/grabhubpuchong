import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/site/Logo";
import { supabase, ROLE_TO_PATH, StaffRole } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const RECAPTCHA_SITE_KEY = "6Ldn5p4sAAAAAA5Mrjnt_mDjLfcsadxqwxFBIsGd";

declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => number;
      reset: (id?: number) => void;
      getResponse: (id?: number) => string;
    };
    onRecaptchaLoad?: () => void;
  }
}

const StaffLogin = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  // Load reCAPTCHA script and render widget
  useEffect(() => {
    const renderWidget = () => {
      if (!window.grecaptcha || !captchaRef.current || widgetIdRef.current !== null) return;
      try {
        widgetIdRef.current = window.grecaptcha.render(captchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token: string) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(null),
          "error-callback": () => setCaptchaToken(null),
        });
      } catch {
        // already rendered
      }
    };

    if (window.grecaptcha) {
      renderWidget();
    } else {
      window.onRecaptchaLoad = renderWidget;
      const existing = document.querySelector('script[data-recaptcha]');
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
        s.async = true;
        s.defer = true;
        s.setAttribute("data-recaptcha", "true");
        document.head.appendChild(s);
      }
    }
  }, []);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    try {
      window.grecaptcha?.reset(widgetIdRef.current ?? undefined);
    } catch {
      /* noop */
    }
  };

  // Auto-redirect if already signed in with valid profile
  useEffect(() => {
    if (!authLoading && user && profile && profile.status === "active") {
      if (profile.first_login_completed === false) {
        navigate("/first-time-password-change", { replace: true });
        return;
      }
      const path = ROLE_TO_PATH[profile.role as StaffRole];
      if (path) navigate(path, { replace: true });
    }
  }, [authLoading, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!captchaToken) {
      setError("Please complete the reCAPTCHA verification.");
      return;
    }

    setLoading(true);

    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "staff-login-with-recaptcha",
      { body: { email: email.trim(), password, recaptchaToken: captchaToken } },
    );

    if (fnError || !fnData || (fnData as { error?: string }).error) {
      const msg =
        (fnData as { error?: string })?.error ||
        fnError?.message ||
        "Invalid credentials. Please try again.";
      setError(msg);
      resetCaptcha();
      setLoading(false);
      return;
    }

    const { session, profile: prof } = fnData as {
      session: { access_token: string; refresh_token: string };
      profile: { role: StaffRole; first_login_completed?: boolean | null };
    };

    const { error: setErr } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (setErr) {
      setError(setErr.message);
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

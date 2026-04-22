import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";
import { supabase, ROLE_TO_PATH, StaffRole } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const validateStrong = (pw: string): string | null => {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Include at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Include at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Include at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Include at least one special character.";
  return null;
};

const FirstTimePasswordChange = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Route protection
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/staff-login", { replace: true });
      return;
    }
    if (profile && profile.first_login_completed === true) {
      const path = ROLE_TO_PATH[profile.role as StaffRole];
      navigate(path || "/staff-login", { replace: true });
    }
  }, [authLoading, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.email) {
      setError("Session error. Please sign in again.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("New password and confirmation do not match.");
      return;
    }
    const strongErr = validateStrong(newPw);
    if (strongErr) {
      setError(strongErr);
      return;
    }
    if (newPw === oldPw) {
      setError("New password must be different from the original password.");
      return;
    }

    setSubmitting(true);

    // 1. Re-authenticate with original password
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPw,
    });
    if (reauthErr) {
      setError("Original password is incorrect.");
      setSubmitting(false);
      return;
    }

    // 2. Update password
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
    if (updErr) {
      setError(updErr.message || "Failed to update password.");
      setSubmitting(false);
      return;
    }

    // 3. Mark first login complete via edge function
    const { error: fnErr } = await supabase.functions.invoke("complete-first-login");
    if (fnErr) {
      setError("Password updated but failed to finalize first login. Please contact support.");
      setSubmitting(false);
      return;
    }

    const updated = await refreshProfile();
    setSuccess(true);

    setTimeout(() => {
      const role = (updated?.role || profile?.role) as StaffRole | undefined;
      const path = role ? ROLE_TO_PATH[role] : "/staff-login";
      navigate(path, { replace: true });
    }, 1500);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo /></div>
        <Card className="p-8 shadow-2xl">
          <div className="flex items-center gap-2 text-brand text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> First-time Login
          </div>
          <h1 className="text-2xl font-bold text-charcoal mt-2">Set your new password</h1>
          <p className="text-sm text-charcoal/60 mt-1">
            For security, you must change your temporary password before continuing.
          </p>

          {error && (
            <div className="mt-5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          {success && (
            <div className="mt-5 p-3 rounded-lg bg-emerald-500/10 text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Password changed successfully. Redirecting…
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <Label>Original Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showOld ? "text" : "password"}
                  required
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  autoComplete="current-password"
                  disabled={submitting || success}
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>New Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                  disabled={submitting || success}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-charcoal/50 mt-1.5">
                At least 8 characters, with uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  disabled={submitting || success}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={submitting || success} className="gradient-brand w-full">
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating password…</>
              ) : (
                "Change password & continue"
              )}
            </Button>
          </form>

          <p className="text-xs text-charcoal/50 mt-5 text-center">
            You cannot skip this step. Contact your administrator if you need help.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default FirstTimePasswordChange;
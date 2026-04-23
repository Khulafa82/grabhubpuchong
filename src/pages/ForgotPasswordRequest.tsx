import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/lib/supabase";

const ForgotPasswordRequest = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your staff email.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "request-password-reset",
        { body: { email: trimmed } },
      );

      console.log("[ForgotPassword] edge function response:", { data, fnErr });

      if (fnErr) {
        setError(`Could not submit your request: ${fnErr.message}`);
        setLoading(false);
        return;
      }

      if (data?.error === "NOT_FOUND") {
        setError("No staff account found with this email.");
        setLoading(false);
        return;
      }

      if (data?.error === "ALREADY_PENDING") {
        setError("A password reset request is already pending.");
        setLoading(false);
        return;
      }

      if (data?.error) {
        setError(data.message || "Could not submit your request.");
        setLoading(false);
        return;
      }

      if (data?.success === true) {
        setSuccess(
          "Your reset request has been submitted. Please wait for management to issue a temporary password.",
        );
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      console.error("[ForgotPassword] unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <Card className="p-8 shadow-2xl">
          <div className="flex items-center gap-2 text-brand text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Staff Portal
          </div>
          <h1 className="text-2xl font-bold text-charcoal mt-2">Forgot Password</h1>
          <p className="text-sm text-charcoal/60 mt-1">
            Submit your staff email and our team will review your reset request.
          </p>

          {error && (
            <div className="mt-5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="mt-6 p-4 rounded-lg bg-brand/5 border border-brand/20 text-charcoal text-sm flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <p>{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div>
                <Label>Email address</Label>
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

              <p className="text-xs text-charcoal/60">
                Your request will be reviewed by management. You will receive a temporary password
                from the team.
              </p>

              <Button type="submit" disabled={loading} className="gradient-brand w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/staff-login")}
              className="text-sm text-brand hover:underline"
            >
              ← Back to Staff Login
            </button>
          </div>
        </Card>

        <p className="text-center text-xs text-charcoal/50 mt-5">
          <Link to="/" className="hover:text-brand">
            Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordRequest;
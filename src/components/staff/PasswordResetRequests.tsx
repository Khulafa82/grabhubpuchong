import { useEffect, useState } from "react";
import { Loader2, RefreshCw, KeyRound, Copy, Check, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ResetRequest {
  id: string;
  staff_id: string | null;
  email: string | null;
  request_status: string | null;
  requested_by_staff: boolean | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  staff?: { full_name: string | null; email: string | null } | null;
  reviewer?: { full_name: string | null } | null;
}

interface Props {
  canReset: boolean;
}

const statusBadge = (s: string | null) => {
  const v = (s ?? "").toLowerCase();
  if (v === "pending") return "bg-amber-100 text-amber-800 border-amber-200";
  if (v === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (v === "rejected") return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-muted text-muted-foreground border-border";
};

export const PasswordResetRequests = ({ canReset }: Props) => {
  const [rows, setRows] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<ResetRequest | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("staff_password_reset_requests")
      .select(
        "id, staff_id, email, request_status, requested_by_staff, reviewed_by, reviewed_at, created_at, staff:staff_profiles!staff_password_reset_requests_staff_id_fkey(full_name, email), reviewer:staff_profiles!staff_password_reset_requests_reviewed_by_fkey(full_name)",
      )
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as unknown as ResetRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openReset = (r: ResetRequest) => {
    setTarget(r);
    setTempPassword("");
    setIssuedPassword(null);
    setCopied(false);
  };

  const closeDialog = () => {
    setTarget(null);
    setTempPassword("");
    setIssuedPassword(null);
    setCopied(false);
  };

  const submitReset = async () => {
    if (!target) return;
    if (tempPassword && tempPassword.length < 8) {
      toast.error("Password must be at least 8 characters, or leave blank to auto-generate.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("boss-reset-staff-password", {
        body: {
          request_id: target.id,
          temporary_password: tempPassword || undefined,
        },
      });
      if (error) {
        toast.error(error.message || "Failed to reset password");
      } else if (data?.error) {
        toast.error(data.error);
      } else if (data?.temporary_password) {
        setIssuedPassword(data.temporary_password);
        toast.success("Password reset completed.");
        load();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (!issuedPassword) return;
    await navigator.clipboard.writeText(issuedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const pendingCount = rows.filter((r) => r.request_status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Password Reset Requests</h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pending {pendingCount === 1 ? "request" : "requests"}.
            {!canReset && " View only — only Boss can reset passwords."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
          </div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">Failed to load: {error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            No password reset requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-muted">
                  <th className="py-3 px-4 font-medium">Request Date</th>
                  <th className="py-3 px-4 font-medium">Staff Name</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Reviewed By</th>
                  <th className="py-3 px-4 font-medium">Reviewed At</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-charcoal">
                      {r.staff?.full_name ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      {r.email ?? r.staff?.email ?? "—"}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className={statusBadge(r.request_status)}>
                        {r.request_status ?? "—"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">
                      {r.reviewer?.full_name ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">
                      {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {r.request_status === "pending" && canReset ? (
                        <Button size="sm" variant="outline" onClick={() => openReset(r)}>
                          <KeyRound className="w-3 h-3 mr-1" /> Reset Password
                        </Button>
                      ) : r.request_status === "pending" && !canReset ? (
                        <Badge
                          variant="outline"
                          className="bg-muted text-muted-foreground border-border gap-1 text-[10px]"
                        >
                          <ShieldAlert className="w-3 h-3" /> Read-only
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!target} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Staff Password</DialogTitle>
            <DialogDescription>
              Issue a temporary password for this staff user. They will be required to change it on
              next login.
            </DialogDescription>
          </DialogHeader>

          {target && (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff name</span>
                  <span className="font-medium text-charcoal">
                    {target.staff?.full_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-charcoal">
                    {target.email ?? target.staff?.email ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={statusBadge(target.request_status)}>
                    {target.request_status}
                  </Badge>
                </div>
              </div>

              {!issuedPassword ? (
                <div className="space-y-2">
                  <Label>Temporary Password (optional)</Label>
                  <Input
                    type="text"
                    placeholder="Leave blank to auto-generate"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters. Leave blank and the system will generate a secure password.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-emerald-900">
                    Password reset completed. Give this temporary password to the staff user.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-background border border-border font-mono text-sm break-all">
                      {issuedPassword}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyPassword}>
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 mr-1" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-emerald-800">
                    The staff user will be required to change this password on next login.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!issuedPassword ? (
              <>
                <Button variant="outline" onClick={closeDialog} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={submitReset} disabled={submitting} className="gradient-brand">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting…
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={closeDialog} className="gradient-brand">
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  validateStaffSession,
  clearStaffSessionToken,
  getStaffSessionToken,
} from "@/lib/staffSession";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_GRACE_MS = 60 * 1000; // 60 seconds to respond
const VALIDATE_INTERVAL_MS = 30 * 1000; // re-check every 30s

export const StaffSessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(WARNING_GRACE_MS / 1000));

  const inactivityTimer = useRef<number | null>(null);
  const graceTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);

  const endSession = useCallback(
    async (message: string) => {
      clearStaffSessionToken();
      try {
        await signOut();
      } catch {
        /* noop */
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* noop */
      }
      toast.error(message);
      navigate("/staff-login", { replace: true });
    },
    [navigate, signOut],
  );

  const clearAllTimers = () => {
    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
    if (graceTimer.current) window.clearTimeout(graceTimer.current);
    if (countdownTimer.current) window.clearInterval(countdownTimer.current);
    inactivityTimer.current = null;
    graceTimer.current = null;
    countdownTimer.current = null;
  };

  const startInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
    inactivityTimer.current = window.setTimeout(() => {
      setShowWarning(true);
      setCountdown(Math.floor(WARNING_GRACE_MS / 1000));
      if (countdownTimer.current) window.clearInterval(countdownTimer.current);
      countdownTimer.current = window.setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
      if (graceTimer.current) window.clearTimeout(graceTimer.current);
      graceTimer.current = window.setTimeout(() => {
        setShowWarning(false);
        clearAllTimers();
        void endSession("You were signed out due to inactivity.");
      }, WARNING_GRACE_MS);
    }, INACTIVITY_MS);
  }, [endSession]);

  const resetActivity = useCallback(() => {
    if (showWarning) return; // ignore until user responds to modal
    startInactivityTimer();
  }, [showWarning, startInactivityTimer]);

  // Session validation (initial + interval + on focus)
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!getStaffSessionToken()) {
        await endSession(
          "Your session has expired or was ended because another login was detected.",
        );
        return;
      }
      const ok = await validateStaffSession();
      if (cancelled) return;
      if (!ok) {
        await endSession(
          "Your session has expired or was ended because another login was detected.",
        );
      }
    };

    void check();
    const interval = window.setInterval(check, VALIDATE_INTERVAL_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [endSession]);

  // Inactivity tracking
  useEffect(() => {
    startInactivityTimer();
    const events: (keyof WindowEventMap)[] = ["mousemove", "click", "keydown", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetActivity, { passive: true }));
    return () => {
      clearAllTimers();
      events.forEach((e) => window.removeEventListener(e, resetActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stayActive = () => {
    setShowWarning(false);
    if (graceTimer.current) window.clearTimeout(graceTimer.current);
    if (countdownTimer.current) window.clearInterval(countdownTimer.current);
    graceTimer.current = null;
    countdownTimer.current = null;
    startInactivityTimer();
  };

  const signOutNow = () => {
    clearAllTimers();
    setShowWarning(false);
    void endSession("You have been signed out.");
  };

  return (
    <>
      {children}
      <Dialog open={showWarning} onOpenChange={(open) => (!open ? stayActive() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you still there?</DialogTitle>
            <DialogDescription>
              You have been inactive for 15 minutes. You will be signed out automatically in{" "}
              {countdown} second{countdown === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={signOutNow}>
              Sign out
            </Button>
            <Button onClick={stayActive}>Stay signed in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_TO_PATH, StaffRole } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { StaffSessionGuard } from "@/components/auth/StaffSessionGuard";

interface Props {
  role: StaffRole;
  children: React.ReactNode;
}

export const ProtectedRoute = ({ role, children }: Props) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/staff-login" state={{ from: location }} replace />;
  }

  if (!profile || profile.status !== "active") {
    return <Navigate to="/staff-login" replace />;
  }

  if (profile.account_locked === true) {
    return <Navigate to="/staff-login?locked=1" replace />;
  }

  if (profile.role !== role) {
    return <Navigate to={ROLE_TO_PATH[profile.role]} replace />;
  }

  if (profile.first_login_completed === false) {
    return <Navigate to="/first-time-password-change" replace />;
  }

  return <StaffSessionGuard>{children}</StaffSessionGuard>;
};

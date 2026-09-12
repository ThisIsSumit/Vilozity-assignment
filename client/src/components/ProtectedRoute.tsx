import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Role } from "../types";

// Route protection here is a UX convenience ONLY — hiding a nav link or
// redirecting away from /users does not (and must not) substitute for the
// server-side checks in requireAuth/requireRole/ownership assertions. A
// developer who bypasses this and calls an admin API directly still gets
// a 403 from the backend (see server tests, security case 5).
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

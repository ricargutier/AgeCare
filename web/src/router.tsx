import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { EldersList } from "./pages/EldersList";
import { ElderDetail } from "./pages/ElderDetail";
import { MyView } from "./pages/MyView";
import { AdminPanel } from "./pages/AdminPanel";
import { useAuthStore } from "./auth/store";
import type { Role } from "../../shared/contracts/types";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "elder") return <Navigate to="/me" replace />;
  if (user.role === "system_admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/elders" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        path: "elders",
        element: (
          <RequireRole
            roles={[
              "family_admin",
              "family_viewer",
              "caregiver",
              "healthcare_provider",
              "system_admin",
            ]}
          >
            <EldersList />
          </RequireRole>
        ),
      },
      {
        path: "elders/:id",
        element: (
          <RequireRole
            roles={[
              "family_admin",
              "family_viewer",
              "caregiver",
              "healthcare_provider",
              "system_admin",
            ]}
          >
            <ElderDetail />
          </RequireRole>
        ),
      },
      {
        path: "me",
        element: (
          <RequireRole roles={["elder"]}>
            <MyView />
          </RequireRole>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireRole roles={["system_admin"]}>
            <AdminPanel />
          </RequireRole>
        ),
      },
    ],
  },
]);

import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "./auth/store";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Alerts from "./pages/Alerts";
import AlertDetail from "./pages/AlertDetail";
import Vitals from "./pages/Vitals";
import Contacts from "./pages/Contacts";
import MedConfirm from "./pages/MedConfirm";
import VideoCall from "./pages/VideoCall";
import Settings from "./pages/Settings";

function AuthGuard() {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function GuestGuard() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/alerts" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [{ path: "/login", element: <Login /> }],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/alerts", element: <Alerts /> },
          { path: "/alerts/:id", element: <AlertDetail /> },
          { path: "/vitals", element: <Vitals /> },
          { path: "/contacts", element: <Contacts /> },
          { path: "/meds", element: <MedConfirm /> },
          { path: "/call", element: <VideoCall /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
    ],
  },
  { path: "/", element: <Navigate to="/alerts" replace /> },
  { path: "*", element: <Navigate to="/alerts" replace /> },
]);

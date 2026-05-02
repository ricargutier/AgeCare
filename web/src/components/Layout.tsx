import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { LiveAlertToast } from "./LiveAlertToast";
import type { Role } from "../../../shared/contracts/types";

const roleLabels: Record<Role, string> = {
  elder: "Elder",
  family_admin: "Family Admin",
  family_viewer: "Family Viewer",
  caregiver: "Caregiver",
  healthcare_provider: "Healthcare Provider",
  system_admin: "System Admin",
};

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header
        style={{
          height: "var(--nav-height)",
          background: "var(--card-bg)",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            marginRight: 32,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 42 42" fill="none" aria-hidden="true">
            <rect width="42" height="42" rx="12" fill="#2D6A4F" />
            <path
              d="M21 8C21 8 10 16 10 23C10 28.5 15 33 21 33C27 33 32 28.5 32 23C32 16 21 8 21 8Z"
              fill="#95D5B2"
            />
            <path
              d="M21 14C21 14 15 19 15 23C15 26 17.5 28 21 28C24.5 28 27 26 27 23C27 19 21 14 21 14Z"
              fill="#FFFFFF"
            />
          </svg>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--primary)",
              letterSpacing: "-0.5px",
            }}
          >
            AgeCare
          </span>
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation" style={{ display: "flex", gap: 4, flex: 1 }}>
          {user?.role !== "elder" && (
            <NavLink to="/elders">Elders</NavLink>
          )}
          {user?.role === "elder" && (
            <NavLink to="/me">My Dashboard</NavLink>
          )}
          {user?.role === "system_admin" && (
            <NavLink to="/admin">Admin</NavLink>
          )}
        </nav>

        {/* User menu */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {user.displayName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  background: "var(--accent)",
                  color: "var(--primary-dark)",
                  padding: "1px 8px",
                  borderRadius: 999,
                  fontWeight: 700,
                  display: "inline-block",
                }}
              >
                {roleLabels[user.role]}
              </div>
            </div>
            <Link
              to="/settings"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--primary)",
                textDecoration: "none",
                padding: "6px 10px",
                borderRadius: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(45,106,79,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: "6px 14px", fontSize: 13 }}
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <LiveAlertToast />
    </>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-primary)",
        textDecoration: "none",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(45,106,79,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
      }}
    >
      {children}
    </Link>
  );
}

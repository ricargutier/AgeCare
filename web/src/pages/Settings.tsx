import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import type { Role } from "../../../shared/contracts/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_VERSION = "0.1.0";
const SOUND_KEY = "agecare:soundCritical";

const roleLabels: Record<Role, string> = {
  elder: "Elder",
  family_admin: "Family Admin",
  family_viewer: "Family Viewer",
  caregiver: "Caregiver",
  healthcare_provider: "Healthcare Provider",
  system_admin: "System Admin",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [soundCritical, setSoundCritical] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Write to localStorage whenever soundCritical changes (after initial read)
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, String(soundCritical));
    } catch {
      // localStorage unavailable (private browsing restrictions, etc.)
    }
  }, [soundCritical]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="page-wrapper" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      {/* Profile card */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 16 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-secondary)",
            marginBottom: 16,
          }}
        >
          Account
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ProfileRow label="Display Name" value={user.displayName} />
          <ProfileRow label="Email" value={user.email} />
          <ProfileRow
            label="Role"
            value={
              <span
                style={{
                  background: "var(--accent)",
                  color: "var(--primary-dark)",
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {roleLabels[user.role]}
              </span>
            }
          />
        </div>
      </div>

      {/* Notification preferences */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 16 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-secondary)",
            marginBottom: 16,
          }}
        >
          Notification Preferences
        </h2>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            fontSize: 14,
            color: "var(--text-primary)",
          }}
        >
          <input
            type="checkbox"
            checked={soundCritical}
            onChange={(e) => setSoundCritical(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "pointer" }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>Sound on critical alerts</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Play an audio cue when a critical alert arrives
            </div>
          </div>
        </label>
      </div>

      {/* App info */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-secondary)",
            marginBottom: 16,
          }}
        >
          About
        </h2>
        <ProfileRow label="App Version" value={`v${APP_VERSION}`} />
      </div>

      {/* Logout */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid #F3F4F6",
        fontSize: 14,
      }}
    >
      <span
        style={{
          width: 130,
          flexShrink: 0,
          color: "var(--text-secondary)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

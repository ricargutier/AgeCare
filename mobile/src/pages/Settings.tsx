import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { wsClient } from "../api/ws";

const APP_VERSION = "0.1.0";

export default function Settings() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    "Notification" in window ? Notification.permission === "granted" : false
  );
  const [pushSupported] = useState(
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  );

  async function handleToggleNotifications() {
    if (!pushSupported) return;
    if (!notificationsEnabled) {
      const perm = await Notification.requestPermission();
      setNotificationsEnabled(perm === "granted");
    } else {
      // We can't programmatically revoke — guide user to browser settings
      setNotificationsEnabled(false);
    }
  }

  function handleSignOut() {
    wsClient.disconnect();
    clearAuth();
    navigate("/login");
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 20,
        }}
      >
        Settings
      </h2>

      {/* Profile */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "16px",
          boxShadow: "var(--shadow-sm)",
          border: "1px solid #e5e7eb",
          marginBottom: 16,
        }}
      >
        <h3 style={sectionLabel}>Profile</h3>
        <InfoRow label="Name" value={user?.displayName ?? "—"} />
        <InfoRow label="Email" value={user?.email ?? "—"} />
        <InfoRow label="Role" value={user?.role?.replace(/_/g, " ") ?? "—"} />
      </div>

      {/* Notifications */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "16px",
          boxShadow: "var(--shadow-sm)",
          border: "1px solid #e5e7eb",
          marginBottom: 16,
        }}
      >
        <h3 style={sectionLabel}>Notifications</h3>
        {!pushSupported && (
          <div
            style={{
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: "#664d03",
              marginBottom: 12,
            }}
          >
            Push notifications aren't supported on this device or browser. Live alerts will appear inside the app only.
          </div>
        )}
        {pushSupported && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              minHeight: 44,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                Push Notifications
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {notificationsEnabled ? "Enabled" : "Disabled"}
              </div>
            </div>
            <button
              onClick={() => void handleToggleNotifications()}
              role="switch"
              aria-checked={notificationsEnabled}
              style={{
                width: 52,
                height: 30,
                borderRadius: 30,
                background: notificationsEnabled ? "var(--primary)" : "#d1d5db",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                minWidth: 52,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: notificationsEnabled ? 24 : 3,
                  width: 24,
                  height: 24,
                  background: "#fff",
                  borderRadius: "50%",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>
        )}
      </div>

      {/* App info */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "16px",
          boxShadow: "var(--shadow-sm)",
          border: "1px solid #e5e7eb",
          marginBottom: 24,
        }}
      >
        <h3 style={sectionLabel}>About</h3>
        <InfoRow label="App" value="AgeCare Family PWA" />
        <InfoRow label="Version" value={APP_VERSION} />
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        style={{
          width: "100%",
          padding: "16px",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--error)",
          border: "2px solid var(--error)",
          borderRadius: 12,
          background: "#fff",
          cursor: "pointer",
          minHeight: 52,
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

const sectionLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 12,
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>
        {value}
      </span>
    </div>
  );
}

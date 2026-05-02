import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../auth/store";
import { apiClient, ApiClientError } from "../api/client";
import type { Alert, DemoScenarioName } from "../../../shared/contracts/types";

const SCENARIOS: { name: DemoScenarioName; label: string; severity: string }[] = [
  { name: "fall", label: "Fall", severity: "critical" },
  { name: "sos", label: "SOS", severity: "critical" },
  { name: "vitals_anomaly", label: "Vitals anomaly", severity: "warn" },
  { name: "medication_missed", label: "Medication missed", severity: "info" },
  { name: "inactivity", label: "Inactivity", severity: "warn" },
  { name: "device_offline", label: "Device offline", severity: "warn" },
];

const severityColor = (s: string) =>
  s === "critical" ? "var(--error)" : s === "warn" ? "#F59E0B" : "var(--text-secondary)";

export function DemoControls() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<DemoScenarioName | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (user?.role !== "family_admin" && user?.role !== "system_admin") return null;

  const trigger = async (name: DemoScenarioName) => {
    setBusy(name);
    try {
      const res = await apiClient.post<{ alert: Alert }>(`/demo/scenarios/${name}`, {});
      setToast(`Triggered: ${name} → ${res.alert.severity}`);
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["elders"] });
    } catch (err) {
      const msg = (err as Error).message;
      if (err instanceof ApiClientError && /HTTP 404/.test(msg)) {
        setToast("Demo controls require backend round-2 deploy");
      } else {
        setToast(`Failed: ${msg}`);
      }
    } finally {
      setBusy(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <section
      aria-label="Demo controls"
      style={{
        background: "var(--card-bg)",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 10 }}>
        <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, margin: 0 }}>
          Demo controls
        </h3>
        <span
          style={{
            fontSize: 11,
            background: "rgba(245,158,11,0.15)",
            color: "#92400E",
            padding: "2px 8px",
            borderRadius: 999,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Demo only
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px" }}>
        Click any scenario to fire a synthetic alert for Eleanor. Visible in the alerts list and via WebSocket toast.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.name}
            onClick={() => trigger(s.name)}
            disabled={busy !== null}
            className="btn"
            style={{
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--card-bg)",
              border: `1px solid ${severityColor(s.severity)}`,
              color: severityColor(s.severity),
              borderRadius: 8,
              cursor: busy === null ? "pointer" : "not-allowed",
              opacity: busy !== null && busy !== s.name ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {busy === s.name ? "…" : s.label}
          </button>
        ))}
      </div>
      {toast && (
        <div
          role="status"
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "var(--accent)",
            color: "var(--primary-dark)",
            fontSize: 13,
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}
    </section>
  );
}

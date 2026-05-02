import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from "../api/queries";
import type { Alert } from '../../../shared/contracts/types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  critical: { border: "var(--severity-critical)", bg: "var(--severity-critical-bg)", badge: "var(--severity-critical)", badgeText: "#fff" },
  warn: { border: "var(--severity-warn)", bg: "var(--severity-warn-bg)", badge: "var(--severity-warn)", badgeText: "#fff" },
  info: { border: "var(--severity-info)", bg: "var(--severity-info-bg)", badge: "var(--severity-info)", badgeText: "#fff" },
};

function AlertCard({
  alert,
  onAck,
  onResolve,
  canAct,
}: {
  alert: Alert;
  onAck: (id: string) => void;
  onResolve: (id: string) => void;
  canAct: boolean;
}) {
  const navigate = useNavigate();
  const s = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
  const isCritical = alert.severity === "critical";

  return (
    <div
      className={isCritical ? "pulse-critical" : ""}
      style={{
        background: s.bg,
        border: `2px solid ${s.border}`,
        borderRadius: 14,
        padding: "16px",
        marginBottom: 12,
        cursor: "pointer",
      }}
      onClick={() => navigate(`/alerts/${alert.id}`)}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span
            style={{
              display: "inline-block",
              background: s.badge,
              color: s.badgeText,
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 20,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginRight: 6,
            }}
          >
            {alert.severity}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {alert.type.replace(/_/g, " ")}
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {timeAgo(alert.createdAt)}
        </span>
      </div>

      {/* Payload summary */}
      {Object.keys(alert.payload).length > 0 && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
          {Object.entries(alert.payload)
            .slice(0, 2)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(" · ")}
        </p>
      )}

      {/* Status + actions */}
      {alert.status !== "resolved" && canAct && (
        <div
          style={{ display: "flex", gap: 8, marginTop: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          {alert.status === "open" && (
            <button
              onClick={() => onAck(alert.id)}
              style={{
                flex: 1,
                padding: "10px",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--primary)",
                border: "2px solid var(--primary)",
                borderRadius: 10,
                background: "#fff",
                minHeight: 44,
              }}
            >
              Acknowledge
            </button>
          )}
          <button
            onClick={() => onResolve(alert.id)}
            style={{
              flex: 1,
              padding: "10px",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              background: "var(--primary)",
              border: "none",
              borderRadius: 10,
              minHeight: 44,
            }}
          >
            Resolve
          </button>
        </div>
      )}

      {alert.status === "resolved" && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
          Resolved {alert.resolvedAt ? timeAgo(alert.resolvedAt) : ""}
        </span>
      )}
      {alert.status === "acknowledged" && !canAct && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
          Acknowledged
        </span>
      )}
    </div>
  );
}

export default function Alerts() {
  const role = useAuthStore((s) => s.user?.role);
  const elderId = useAuthStore((s) => s.elderId ?? "");
  const { data: alerts, isLoading, isError, refetch } = useAlerts(elderId);
  const ack = useAcknowledgeAlert();
  const resolve = useResolveAlert();

  const canAct = role !== "family_viewer" && role !== "healthcare_provider";

  if (!elderId) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
        <p>No elder assigned. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
          Live Alerts
        </h2>
        <button
          onClick={() => void refetch()}
          style={{
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--primary)",
            border: "2px solid var(--primary)",
            borderRadius: 10,
            background: "#fff",
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div className="spinner spinner-dark" />
        </div>
      )}

      {isError && (
        <div style={{ background: "#fff5f5", border: "1px solid var(--error)", borderRadius: 12, padding: 16, color: "var(--error)", marginBottom: 16 }}>
          Failed to load alerts.{" "}
          <button onClick={() => void refetch()} style={{ color: "var(--error)", fontWeight: 700, textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && alerts && alerts.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
          <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12, opacity: 0.4 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No active alerts. All clear!</p>
        </div>
      )}

      {alerts?.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          canAct={canAct}
          onAck={(id) => void ack.mutate(id)}
          onResolve={(id) => void resolve.mutate(id)}
        />
      ))}
    </div>
  );
}

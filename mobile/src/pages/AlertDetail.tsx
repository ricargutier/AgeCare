import { useParams } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from "../api/queries";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "var(--severity-critical)",
  warn: "var(--severity-warn)",
  info: "var(--severity-info)",
};

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const elderId = useAuthStore((s) => s.elderId ?? "");
  const role = useAuthStore((s) => s.user?.role);
  const { data: alerts, isLoading } = useAlerts(elderId);
  const ack = useAcknowledgeAlert();
  const resolve = useResolveAlert();

  const canAct = role !== "family_viewer" && role !== "healthcare_provider";
  const alert = alerts?.find((a) => a.id === id);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
        Alert not found.
      </div>
    );
  }

  const severityColor = SEVERITY_COLOR[alert.severity] ?? SEVERITY_COLOR.info;

  return (
    <div style={{ padding: "16px" }}>
      {/* Severity badge */}
      <div
        style={{
          background: severityColor,
          color: "#fff",
          padding: "6px 14px",
          borderRadius: 20,
          display: "inline-block",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        {alert.severity}
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 4,
          textTransform: "capitalize",
        }}
      >
        {alert.type.replace(/_/g, " ")}
      </h2>

      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>
        {timeAgo(alert.createdAt)} · Status: <strong>{alert.status}</strong>
      </p>

      {/* Elder context */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "16px",
          marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Alert Context
        </h3>
        <p style={{ fontSize: 14, marginBottom: 4 }}>
          <strong>Elder ID:</strong> {alert.elderId}
        </p>
        <p style={{ fontSize: 14 }}>
          <strong>Created:</strong> {new Date(alert.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Payload */}
      {Object.keys(alert.payload).length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "16px",
            marginBottom: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
            Details
          </h3>
          {Object.entries(alert.payload).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                {k.replace(/_/g, " ")}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "16px",
          marginBottom: 24,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Timeline
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <TimelineItem
            label="Created"
            time={alert.createdAt}
            color="var(--severity-info)"
          />
          {alert.acknowledgedAt && (
            <TimelineItem
              label="Acknowledged"
              time={alert.acknowledgedAt}
              color="var(--severity-warn)"
            />
          )}
          {alert.resolvedAt && (
            <TimelineItem
              label="Resolved"
              time={alert.resolvedAt}
              color="var(--primary)"
            />
          )}
        </div>
      </div>

      {/* Actions */}
      {alert.status !== "resolved" && canAct && (
        <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
          {alert.status === "open" && (
            <button
              onClick={() => void ack.mutate(alert.id)}
              disabled={ack.isPending}
              style={{
                padding: "16px",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--primary)",
                border: "2px solid var(--primary)",
                borderRadius: 12,
                background: "#fff",
                minHeight: 52,
              }}
            >
              {ack.isPending ? "Acknowledging..." : "Acknowledge Alert"}
            </button>
          )}
          <button
            onClick={() => void resolve.mutate(alert.id)}
            disabled={resolve.isPending}
            style={{
              padding: "16px",
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              background: "var(--primary)",
              border: "none",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(45,106,79,0.3)",
              minHeight: 52,
            }}
          >
            {resolve.isPending ? "Resolving..." : "Mark as Resolved"}
          </button>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ label, time, color }: { label: string; time: string; color: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, marginTop: 4, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {new Date(time).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

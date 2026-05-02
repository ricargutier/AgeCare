import { Link, useParams } from "react-router-dom";
import { useAlert, useAcknowledgeAlert, useResolveAlert } from "../api/queries";
import { useAuthStore } from "../auth/store";
import { SeverityChip } from "../components/SeverityChip";
import type { AlertStatus } from "../../../shared/contracts/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function shortUserId(uid: string): string {
  return `${uid.slice(0, 8)}…`;
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const statusStyles: Record<AlertStatus, { bg: string; color: string }> = {
  open: { bg: "#fee2e2", color: "#b91c1c" },
  acknowledged: { bg: "#fef3c7", color: "#92400e" },
  resolved: { bg: "#d1fae5", color: "#065f46" },
};

function StatusChip({ status }: { status: AlertStatus }) {
  const { bg, color } = statusStyles[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {status}
    </span>
  );
}

// ─── Timeline row ─────────────────────────────────────────────────────────────

function TimelineRow({
  label,
  ts,
  by,
}: {
  label: string;
  ts: string;
  by?: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid #F3F4F6",
        fontSize: 14,
        alignItems: "flex-start",
      }}
    >
      {/* Dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "var(--primary)",
          marginTop: 4,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        {by && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            By:{" "}
            <code
              style={{
                fontFamily: "monospace",
                background: "#F3F4F6",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              {shortUserId(by)}
            </code>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "right", flexShrink: 0 }}>
        <div>{timeAgo(ts)}</div>
        <div style={{ marginTop: 2 }}>{new Date(ts).toLocaleString()}</div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const alertId = id ?? "";

  const user = useAuthStore((s) => s.user);
  const { data: alert, isLoading, isError } = useAlert(alertId);

  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  const canAcknowledge = user?.role !== "family_viewer";

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="spinner spinner-dark" />
          Loading alert…
        </div>
      </div>
    );
  }

  if (isError || !alert) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <h3>Alert not found</h3>
          <p>Could not load this alert.</p>
        </div>
      </div>
    );
  }

  const alertTypeLabel = alert.type.replace(/_/g, " ");
  const payloadJson = JSON.stringify(alert.payload, null, 2);
  const hasPayload = Object.keys(alert.payload).length > 0;

  return (
    <div className="page-wrapper">
      {/* Header card */}
      <div
        className="card"
        style={{ padding: "24px 28px", marginBottom: 24 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                textTransform: "capitalize",
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              {alertTypeLabel}
            </h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <SeverityChip severity={alert.severity} />
              <StatusChip status={alert.status} />
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "var(--text-secondary)" }}>
            <div style={{ fontWeight: 600 }}>{timeAgo(alert.createdAt)}</div>
            <div>{new Date(alert.createdAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Elder link */}
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Elder:{" "}
          <Link
            to={`/elders/${alert.elderId}`}
            style={{
              color: "var(--primary)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {alert.elderId.slice(0, 8)}…
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Payload */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Payload</h2>
          {hasPayload ? (
            <pre
              style={{
                margin: 0,
                padding: "12px 14px",
                background: "#F9FAFB",
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "monospace",
              }}
            >
              {payloadJson}
            </pre>
          ) : (
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>No payload data.</p>
          )}
        </div>

        {/* Audit timeline */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Audit Timeline</h2>
          <div>
            <TimelineRow label="Created" ts={alert.createdAt} />
            {alert.acknowledgedAt && (
              <TimelineRow
                label="Acknowledged"
                ts={alert.acknowledgedAt}
                by={alert.acknowledgedBy}
              />
            )}
            {alert.resolvedAt && (
              <TimelineRow
                label="Resolved"
                ts={alert.resolvedAt}
                by={alert.resolvedBy}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {canAcknowledge && alert.status !== "resolved" && (
        <div
          className="card"
          style={{
            padding: "16px 20px",
            marginTop: 16,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, color: "var(--text-secondary)", flex: 1 }}>
            Actions
          </span>
          {alert.status === "open" && (
            <button
              className="btn btn-secondary"
              disabled={acknowledgeAlert.isPending}
              onClick={() => acknowledgeAlert.mutate(alertId)}
            >
              {acknowledgeAlert.isPending ? "Acknowledging…" : "Acknowledge"}
            </button>
          )}
          {(alert.status === "open" || alert.status === "acknowledged") && (
            <button
              className="btn btn-primary"
              disabled={resolveAlert.isPending}
              onClick={() => resolveAlert.mutate(alertId)}
            >
              {resolveAlert.isPending ? "Resolving…" : "Resolve"}
            </button>
          )}
        </div>
      )}

      {/* Error feedback */}
      {(acknowledgeAlert.isError || resolveAlert.isError) && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 16px",
            background: "#fee2e2",
            borderRadius: 8,
            color: "#b91c1c",
            fontSize: 14,
          }}
        >
          {acknowledgeAlert.error?.message ?? resolveAlert.error?.message ?? "Action failed."}
        </div>
      )}
    </div>
  );
}

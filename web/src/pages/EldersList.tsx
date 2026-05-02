import { Link } from "react-router-dom";
import { useElders, useElderAlerts, useElder } from "../api/queries";
import { AlertBadge } from "../components/AlertBadge";
import { OnlineDot } from "../components/OnlineDot";
import type { Elder } from "../../../shared/contracts/types";

function calcAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function ElderRow({ elder }: { elder: Elder }) {
  const alertsQuery = useElderAlerts(elder.id, "open");
  const elderQuery = useElder(elder.id);
  const devices = elderQuery.data?.devices ?? [];
  const isOnline = devices.some((d) => d.online);
  const openCount = alertsQuery.data?.length ?? 0;
  const lastVitals = null; // vitals endpoint needs a range; show placeholder

  return (
    <Link
      to={`/elders/${elder.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px 20px",
        background: "var(--card-bg)",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 0.15s, transform 0.15s",
        gap: 16,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow)";
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
        (e.currentTarget as HTMLAnchorElement).style.transform = "none";
      }}
    >
      {/* Avatar placeholder */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontWeight: 700,
          fontSize: 18,
          color: "var(--primary-dark)",
          position: "relative",
        }}
        aria-hidden="true"
      >
        {elder.id.charAt(0).toUpperCase()}
        <span style={{ position: "absolute", bottom: -2, right: -2 }}>
          <OnlineDot online={isOnline} size={12} />
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          Elder #{elder.id.slice(0, 8)}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Age {calcAge(elder.dob)} &middot;{" "}
          {elder.conditions.length > 0
            ? elder.conditions.slice(0, 2).join(", ")
            : "No conditions listed"}
        </div>
      </div>

      {/* Last vitals placeholder */}
      <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-secondary)", minWidth: 80 }}>
        {lastVitals ?? "—"}
      </div>

      {/* Alert badge */}
      <div style={{ flexShrink: 0 }}>
        <AlertBadge count={openCount} />
      </div>

      {/* Chevron */}
      <svg
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        style={{ flexShrink: 0, color: "var(--text-secondary)" }}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export function EldersList() {
  const { data: elders, isLoading, isError, error } = useElders();

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="spinner spinner-dark" />
          Loading elders…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <h3>Failed to load elders</h3>
          <p>{error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    );
  }

  if (!elders || elders.length === 0) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <h3>No elders assigned</h3>
          <p>You have no elders in your care circle yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Elders</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          {elders.length} elder{elders.length !== 1 ? "s" : ""} in your care circle
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {elders.map((elder) => (
          <ElderRow key={elder.id} elder={elder} />
        ))}
      </div>
    </div>
  );
}

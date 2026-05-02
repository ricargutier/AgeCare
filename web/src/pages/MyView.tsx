import { useState } from "react";
import { useMe, useElders, useElderVitals, useElderMedications, useConfirmMedication } from "../api/queries";

export function MyView() {
  const meQuery = useMe();
  const eldersQuery = useElders();
  const [sosLoading, setSosLoading] = useState(false);
  const [sosMessage, setSosMessage] = useState("");

  // The elder record linked to this user
  const myElder = eldersQuery.data?.[0];
  const elderId = myElder?.id ?? "";

  const vitalsQuery = useElderVitals(elderId, "24h", {
    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  });
  const medsQuery = useElderMedications(elderId);
  const confirmMed = useConfirmMedication();

  const latestVital = vitalsQuery.data?.[vitalsQuery.data.length - 1];

  async function handleSOS() {
    setSosLoading(true);
    setSosMessage("");
    // Stubbed SOS — in production would POST to backend
    await new Promise((r) => setTimeout(r, 800));
    setSosLoading(false);
    setSosMessage("SOS sent — this is a demo. Emergency contacts have been notified.");
  }

  if (meQuery.isLoading || eldersQuery.isLoading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="spinner spinner-dark" />
          Loading your dashboard…
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>
          Hello, {meQuery.data?.displayName ?? "there"}
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>Here's your health summary for today.</p>
      </div>

      {/* SOS button */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "var(--shadow)",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Emergency</h2>
        <button
          onClick={handleSOS}
          disabled={sosLoading}
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: sosLoading ? "#9ca3af" : "var(--error)",
            color: "#fff",
            border: "none",
            fontSize: 22,
            fontWeight: 700,
            cursor: sosLoading ? "not-allowed" : "pointer",
            boxShadow: "0 0 0 8px rgba(220,53,69,0.2)",
            fontFamily: "inherit",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          aria-label="Send SOS alert"
        >
          {sosLoading ? "Sending…" : "SOS"}
        </button>
        {sosMessage && (
          <p
            role="status"
            style={{
              marginTop: 16,
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: 14,
              maxWidth: 320,
              margin: "16px auto 0",
            }}
          >
            {sosMessage}
          </p>
        )}
      </div>

      {/* Vitals snapshot */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "var(--shadow)",
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>My Vitals</h2>
        {vitalsQuery.isLoading ? (
          <div className="loading-state" style={{ padding: 20 }}>
            <div className="spinner spinner-dark" />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            <VitalCard
              label="Heart Rate"
              value={latestVital?.heartRate != null ? `${latestVital.heartRate}` : "—"}
              unit="bpm"
            />
            <VitalCard
              label="SpO2"
              value={latestVital?.spo2 != null ? `${latestVital.spo2}` : "—"}
              unit="%"
            />
            <VitalCard
              label="Steps Today"
              value={latestVital?.steps != null ? latestVital.steps.toLocaleString() : "—"}
              unit=""
            />
            <VitalCard
              label="Battery"
              value={latestVital?.batteryPct != null ? `${latestVital.batteryPct}` : "—"}
              unit="%"
            />
          </div>
        )}
      </div>

      {/* Today's medications */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "var(--shadow)",
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Today's Medications</h2>
        {medsQuery.isLoading ? (
          <div className="loading-state" style={{ padding: 20 }}>
            <div className="spinner spinner-dark" />
          </div>
        ) : !medsQuery.data || medsQuery.data.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>No medications scheduled.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {medsQuery.data.map((schedule) => {
              const todayEvents =
                schedule.events?.filter((e) => {
                  const due = new Date(e.dueAt);
                  const today = new Date();
                  return (
                    due.getDate() === today.getDate() &&
                    due.getMonth() === today.getMonth() &&
                    due.getFullYear() === today.getFullYear()
                  );
                }) ?? [];

              return (
                <div
                  key={schedule.id}
                  style={{
                    padding: 16,
                    background: "#F9FAFB",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{schedule.drugName}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {schedule.dose} &mdash; {schedule.timesOfDay.join(", ")}
                    </div>
                  </div>
                  {todayEvents.map((ev) => (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            ev.status === "taken"
                              ? "#d1fae5"
                              : ev.status === "missed"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            ev.status === "taken"
                              ? "#065f46"
                              : ev.status === "missed"
                              ? "#b91c1c"
                              : "#78350f",
                        }}
                      >
                        {ev.status}
                      </span>
                      {ev.status === "pending" && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: "4px 12px", fontSize: 12 }}
                          disabled={confirmMed.isPending}
                          onClick={() => confirmMed.mutate({ eventId: ev.id, elderId })}
                        >
                          Confirm Taken
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VitalCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div
      style={{
        background: "#F0FDF4",
        borderRadius: 12,
        padding: "16px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)" }}>
        {value}
        {unit && (
          <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 4 }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

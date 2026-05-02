import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  useElder,
  useElderAlerts,
  useElderVitals,
  useElderMedications,
  useElderDevices,
  useAcknowledgeAlert,
  useResolveAlert,
  useConfirmMedication,
} from "../api/queries";
import { useAuthStore } from "../auth/store";
import { wsClient } from "../api/ws";
import { AlertBadge } from "../components/AlertBadge";
import { SeverityChip } from "../components/SeverityChip";
import { OnlineDot } from "../components/OnlineDot";
import type { VitalsSample, AlertStatus } from "../../../shared/contracts/types";

type Tab = "overview" | "alerts" | "vitals" | "medications" | "devices";
type VitalsRange = "1h" | "24h" | "7d";

function calcAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function rangeParams(range: VitalsRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  if (range === "1h") from.setHours(from.getHours() - 1);
  else if (range === "24h") from.setHours(from.getHours() - 24);
  else from.setDate(from.getDate() - 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function ElderDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as Tab | null) ?? "overview";
  const user = useAuthStore((s) => s.user);

  const [vitalsRange, setVitalsRange] = useState<VitalsRange>("24h");
  const [alertStatusFilter, setAlertStatusFilter] = useState<AlertStatus | undefined>(undefined);
  // In-memory vitals buffer for live ticks
  const liveVitalsBuffer = useRef<VitalsSample[]>([]);
  const [liveVitalsTick, setLiveVitalsTick] = useState(0);

  const elderId = id ?? "";
  const { data: elder, isLoading: elderLoading, isError: elderError } = useElder(elderId);

  const rp = rangeParams(vitalsRange);
  const vitalsQuery = useElderVitals(elderId, vitalsRange, rp);
  const alertsQuery = useElderAlerts(elderId, alertStatusFilter);
  const medsQuery = useElderMedications(elderId);
  const devicesQuery = useElderDevices(elderId);

  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const confirmMed = useConfirmMedication();

  // Live vitals subscription
  useEffect(() => {
    const off = wsClient.on("vitals.tick", (sample) => {
      if (sample.elderId !== elderId) return;
      liveVitalsBuffer.current = [...liveVitalsBuffer.current.slice(-200), sample];
      setLiveVitalsTick((n) => n + 1);
    });
    return off;
  }, [elderId]);

  function setTab(tab: Tab) {
    setSearchParams({ tab });
  }

  if (elderLoading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="spinner spinner-dark" />
          Loading elder profile…
        </div>
      </div>
    );
  }

  if (elderError || !elder) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <h3>Elder not found</h3>
          <p>Could not load this elder profile.</p>
        </div>
      </div>
    );
  }

  const openAlertCount = alertsQuery.data?.filter((a) => a.status === "open").length ?? 0;
  const allVitals = [
    ...(vitalsQuery.data ?? []),
    ...liveVitalsBuffer.current,
  ].sort((a, b) => a.ts.localeCompare(b.ts));
  // Force re-render on live tick
  void liveVitalsTick;

  const latestVital = allVitals[allVitals.length - 1];

  const canAcknowledge = user?.role !== "family_viewer";
  const canConfirmMed =
    user?.role === "caregiver" || user?.role === "elder" || user?.role === "family_admin";

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 24,
          boxShadow: "var(--shadow)",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 700,
            color: "var(--primary-dark)",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {elder.id.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>
            Elder #{elder.id.slice(0, 8)}
          </h1>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>Age {calcAge(elder.dob)}</span>
            {elder.conditions.length > 0 && (
              <span>{elder.conditions.join(", ")}</span>
            )}
          </div>
        </div>
        {/* KPI tiles */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <KpiTile label="Open Alerts" value={<AlertBadge count={openAlertCount} />} />
          <KpiTile
            label="Last HR"
            value={latestVital?.heartRate != null ? `${latestVital.heartRate} bpm` : "—"}
          />
          <KpiTile
            label="Today's Steps"
            value={latestVital?.steps != null ? latestVital.steps.toLocaleString() : "—"}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        {(["overview", "alerts", "vitals", "medications", "devices"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={activeTab === t}
            className={`tab ${activeTab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "overview" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Conditions</h3>
              {elder.conditions.length > 0 ? (
                <ul style={{ paddingLeft: 18, color: "var(--text-secondary)", fontSize: 14 }}>
                  {elder.conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No conditions listed.</p>
              )}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Emergency Contacts</h3>
              {elder.emergencyContacts.length > 0 ? (
                elder.emergencyContacts.map((c) => (
                  <div key={c.priority} style={{ marginBottom: 8, fontSize: 14 }}>
                    <strong>{c.name}</strong> ({c.relationship}) &mdash;{" "}
                    <a href={`tel:${c.phone}`}>{c.phone}</a>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  No emergency contacts.
                </p>
              )}
            </div>
          </div>

          {/* Recent alerts preview */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Recent Activity</h3>
            {alertsQuery.isLoading ? (
              <div className="loading-state" style={{ padding: 20 }}>
                <div className="spinner spinner-dark" />
              </div>
            ) : alertsQuery.data && alertsQuery.data.length > 0 ? (
              alertsQuery.data.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid #F3F4F6",
                    fontSize: 14,
                  }}
                >
                  <SeverityChip severity={a.severity} />
                  <span style={{ flex: 1, textTransform: "capitalize" }}>
                    {a.type.replace(/_/g, " ")}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No recent activity.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div>
          {/* Filter bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {([undefined, "open", "acknowledged", "resolved"] as Array<AlertStatus | undefined>).map(
              (s) => (
                <button
                  key={s ?? "all"}
                  onClick={() => setAlertStatusFilter(s)}
                  className={`tab ${alertStatusFilter === s ? "active" : ""}`}
                  style={{ border: "none", cursor: "pointer" }}
                >
                  {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
                </button>
              )
            )}
          </div>

          {alertsQuery.isLoading ? (
            <div className="loading-state">
              <div className="spinner spinner-dark" />
            </div>
          ) : alertsQuery.isError ? (
            <div className="error-state">Failed to load alerts.</div>
          ) : !alertsQuery.data || alertsQuery.data.length === 0 ? (
            <div className="empty-state">
              <h3>No alerts</h3>
              <p>No alerts matching this filter.</p>
            </div>
          ) : (
            <div
              role="table"
              aria-label="Alerts"
              style={{
                background: "var(--card-bg)",
                borderRadius: 12,
                overflow: "auto",
                boxShadow: "var(--shadow)",
              }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Payload</th>
                    {canAcknowledge && <th scope="col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {alertsQuery.data.map((a) => (
                    <tr key={a.id} tabIndex={0}>
                      <td style={{ textTransform: "capitalize", fontWeight: 600 }}>
                        {a.type.replace(/_/g, " ")}
                      </td>
                      <td>
                        <SeverityChip severity={a.severity} />
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{a.status}</td>
                      <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {Object.keys(a.payload).length > 0
                          ? JSON.stringify(a.payload)
                          : "—"}
                      </td>
                      {canAcknowledge && (
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            {a.status === "open" && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: "4px 12px", fontSize: 12 }}
                                disabled={acknowledgeAlert.isPending}
                                onClick={() => acknowledgeAlert.mutate(a.id)}
                              >
                                Acknowledge
                              </button>
                            )}
                            {a.status !== "resolved" && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: "4px 12px", fontSize: 12 }}
                                disabled={resolveAlert.isPending}
                                onClick={() => resolveAlert.mutate(a.id)}
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "vitals" && (
        <div>
          {/* Range toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {(["1h", "24h", "7d"] as VitalsRange[]).map((r) => (
              <button
                key={r}
                className={`tab ${vitalsRange === r ? "active" : ""}`}
                style={{ border: "none", cursor: "pointer" }}
                onClick={() => setVitalsRange(r)}
                aria-pressed={vitalsRange === r}
              >
                {r}
              </button>
            ))}
          </div>

          {vitalsQuery.isLoading ? (
            <div className="loading-state">
              <div className="spinner spinner-dark" />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, marginBottom: 16 }}>Heart Rate (bpm)</h3>
                {allVitals.filter((v) => v.heartRate != null).length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    No heart rate data for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={allVitals.filter((v) => v.heartRate != null)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis
                        dataKey="ts"
                        tickFormatter={(v: string) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(v: string) => new Date(v).toLocaleString()}
                        formatter={(v: number) => [`${v} bpm`, "Heart Rate"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="heartRate"
                        stroke="#2D6A4F"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, marginBottom: 16 }}>SpO2 (%)</h3>
                {allVitals.filter((v) => v.spo2 != null).length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    No SpO2 data for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={allVitals.filter((v) => v.spo2 != null)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis
                        dataKey="ts"
                        tickFormatter={(v: string) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis domain={[85, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(v: string) => new Date(v).toLocaleString()}
                        formatter={(v: number) => [`${v}%`, "SpO2"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="spo2"
                        stroke="#40916C"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "medications" && (
        <div>
          {medsQuery.isLoading ? (
            <div className="loading-state">
              <div className="spinner spinner-dark" />
            </div>
          ) : medsQuery.isError ? (
            <div className="error-state">Failed to load medications.</div>
          ) : !medsQuery.data || medsQuery.data.length === 0 ? (
            <div className="empty-state">
              <h3>No medications</h3>
              <p>No medication schedules assigned.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {medsQuery.data.map((schedule) => (
                <div key={schedule.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16 }}>{schedule.drugName}</h3>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {schedule.dose} &mdash; {schedule.timesOfDay.join(", ")}
                      </p>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {schedule.startsOn}
                      {schedule.endsOn ? ` → ${schedule.endsOn}` : " (ongoing)"}
                    </div>
                  </div>
                  {schedule.events && schedule.events.length > 0 ? (
                    <div>
                      {schedule.events.slice(0, 5).map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 0",
                            borderTop: "1px solid #F3F4F6",
                            fontSize: 13,
                          }}
                        >
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
                          <span style={{ flex: 1, color: "var(--text-secondary)" }}>
                            Due: {new Date(ev.dueAt).toLocaleString()}
                          </span>
                          {ev.status === "pending" && canConfirmMed && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: "4px 12px", fontSize: 12 }}
                              disabled={confirmMed.isPending}
                              onClick={() =>
                                confirmMed.mutate({ eventId: ev.id, elderId })
                              }
                            >
                              Confirm Taken
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>No events yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "devices" && (
        <div>
          {devicesQuery.isLoading ? (
            <div className="loading-state">
              <div className="spinner spinner-dark" />
            </div>
          ) : devicesQuery.isError ? (
            <div className="error-state">Failed to load devices.</div>
          ) : !devicesQuery.data || devicesQuery.data.length === 0 ? (
            <div className="empty-state">
              <h3>No devices</h3>
              <p>No devices registered for this elder.</p>
            </div>
          ) : (
            <div
              className="card"
              style={{ padding: 0, overflow: "auto" }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Type</th>
                    <th scope="col">Serial</th>
                    <th scope="col">Last Seen</th>
                    <th scope="col">Battery</th>
                  </tr>
                </thead>
                <tbody>
                  {devicesQuery.data.map((device) => (
                    <tr key={device.id}>
                      <td>
                        <OnlineDot online={device.online} />
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        {device.type.replace(/_/g, " ")}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                        {device.serial}
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {device.lastSeenAt
                          ? new Date(device.lastSeenAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td>
                        {device.batteryPct != null ? (
                          <span style={{ fontWeight: 600, color: device.batteryPct < 20 ? "var(--error)" : "var(--primary)" }}>
                            {device.batteryPct}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#F9FAFB",
        borderRadius: 10,
        padding: "10px 16px",
        minWidth: 100,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

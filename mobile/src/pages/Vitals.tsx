import type { ReactNode } from "react";
import { useAuthStore } from "../auth/store";
import { useVitals } from "../api/queries";
import type { VitalsSample } from '../../../shared/contracts/types';

// Tiny inline SVG sparkline — no chart library
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div style={{ height: 40, opacity: 0.3, textAlign: "center", fontSize: 12, paddingTop: 14, color: "var(--text-secondary)" }}>No data</div>;
  }

  const width = 200;
  const height = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 40 }} preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VitalCard({
  label,
  value,
  unit,
  color,
  sparkData,
  icon,
}: {
  label: string;
  value: string | number | null | undefined;
  unit: string;
  color: string;
  sparkData: number[];
  icon: ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "18px",
        boxShadow: "var(--shadow-sm)",
        border: `1px solid #e5e7eb`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: "var(--text-primary)" }}>
              {value ?? "—"}
            </span>
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{unit}</span>
          </div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            background: `${color}18`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          {icon}
        </div>
      </div>
      <Sparkline values={sparkData} color={color} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>24h ago</span>
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>now</span>
      </div>
    </div>
  );
}

function extract(samples: VitalsSample[], key: keyof VitalsSample): number[] {
  return samples
    .map((s) => s[key] as number | null | undefined)
    .filter((v): v is number => v !== null && v !== undefined);
}

export default function Vitals() {
  const elderId = useAuthStore((s) => s.elderId ?? "");
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: samples, isLoading, refetch } = useVitals(elderId, { from, to: now.toISOString() });

  const latest = samples?.[samples.length - 1];

  const hrData = extract(samples ?? [], "heartRate");
  const spo2Data = extract(samples ?? [], "spo2");
  const stepsData = extract(samples ?? [], "steps");
  const batteryData = extract(samples ?? [], "batteryPct");

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
          Current Vitals
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
          }}
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div className="spinner spinner-dark" />
        </div>
      )}

      {!isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <VitalCard
            label="Heart Rate"
            value={latest?.heartRate}
            unit="bpm"
            color="#ef4444"
            sparkData={hrData}
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
          />
          <VitalCard
            label="Blood Oxygen (SpO₂)"
            value={latest?.spo2}
            unit="%"
            color="#3b82f6"
            sparkData={spo2Data}
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <VitalCard
            label="Steps (today)"
            value={latest?.steps}
            unit="steps"
            color="var(--primary)"
            sparkData={stepsData}
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <VitalCard
            label="Wearable Battery"
            value={latest?.batteryPct}
            unit="%"
            color="#f59e0b"
            sparkData={batteryData}
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h1a2 2 0 012 2v4a2 2 0 01-2 2h-1M3 8h13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1zm4 4h2" />
              </svg>
            }
          />
        </div>
      )}

      {!isLoading && (!samples || samples.length === 0) && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)", fontSize: 14 }}>
          No vitals data in the last 24 hours.
        </div>
      )}
    </div>
  );
}

import { useAuthStore } from "../auth/store";
import { useMedications, useConfirmMedication } from "../api/queries";
import type { MedicationEvent } from '../../../shared/contracts/types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function MedConfirm() {
  const elderId = useAuthStore((s) => s.elderId ?? "");
  const role = useAuthStore((s) => s.user?.role);
  const { data: schedules, isLoading, refetch } = useMedications(elderId);
  const confirm = useConfirmMedication();

  const canConfirm = role === "elder" || role === "caregiver" || role === "family_admin";

  // Flatten to pending events
  const pendingEvents: Array<{
    event: MedicationEvent;
    drugName: string;
    dose: string;
  }> = [];

  schedules?.forEach((s) => {
    s.events?.forEach((ev) => {
      if (ev.status === "pending") {
        pendingEvents.push({ event: ev, drugName: s.drugName, dose: s.dose });
      }
    });
  });

  // Sort by dueAt ascending
  pendingEvents.sort((a, b) => a.event.dueAt.localeCompare(b.event.dueAt));

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Medications
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

      {!isLoading && pendingEvents.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
          <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12, opacity: 0.4 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No pending medications for today.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pendingEvents.map(({ event, drugName, dose }) => (
          <div
            key={event.id}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "16px",
              boxShadow: "var(--shadow-sm)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  {drugName}
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  {dose}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                  {formatTime(event.dueAt)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {formatDate(event.dueAt)}
                </div>
              </div>
            </div>

            {canConfirm && (
              <button
                onClick={() => void confirm.mutate(event.id)}
                disabled={confirm.isPending}
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  background: confirm.isPending ? "#9ca3af" : "var(--primary)",
                  border: "none",
                  borderRadius: 12,
                  cursor: confirm.isPending ? "not-allowed" : "pointer",
                  boxShadow: confirm.isPending ? "none" : "0 4px 12px rgba(45,106,79,0.3)",
                  minHeight: 52,
                }}
              >
                {confirm.isPending ? "Confirming..." : "Confirm taken"}
              </button>
            )}

            {!canConfirm && (
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
                You don't have permission to confirm medications.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

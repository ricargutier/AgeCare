import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Alert } from "../../../shared/contracts/types";
import { wsClient } from "../api/ws";
import { queryKeys } from "../api/queries";
import { SeverityChip } from "./SeverityChip";

interface ToastItem {
  id: string;
  alert: Alert;
}

export function LiveAlertToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const off = wsClient.on("alert.new", (alert) => {
      // Invalidate relevant queries so the UI updates
      qc.invalidateQueries({ queryKey: queryKeys.elderAlerts(alert.elderId) });
      qc.invalidateQueries({ queryKey: queryKeys.elder(alert.elderId) });

      const item: ToastItem = { id: alert.id, alert };
      setToasts((prev) => [...prev, item]);

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 8_000);
    });
    return off;
  }, [qc]);

  // Also invalidate on alert.update
  useEffect(() => {
    const off = wsClient.on("alert.update", (alert) => {
      qc.invalidateQueries({ queryKey: queryKeys.elderAlerts(alert.elderId) });
    });
    return off;
  }, [qc]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Alert notifications">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`toast toast-${item.alert.severity}`}
          role="alert"
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <SeverityChip severity={item.alert.severity} />
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>
                  {item.alert.type.replace(/_/g, " ")}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                {new Date(item.alert.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => navigate(`/elders/${item.alert.elderId}?tab=alerts`)}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                View
              </button>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== item.id))
                }
                aria-label="Dismiss notification"
                style={{
                  fontSize: 16,
                  lineHeight: 1,
                  padding: "4px 8px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

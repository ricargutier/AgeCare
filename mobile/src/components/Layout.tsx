import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import BottomNav from "./BottomNav";
import { useAuthStore } from "../auth/store";
import { wsHandlers } from "../api/wsHandlers";
import type { ClientPushFrame, Alert } from '../../../shared/contracts/types';

interface Toast {
  id: number;
  message: string;
  severity: string;
}

let toastId = 0;

const PAGE_TITLES: Record<string, string> = {
  "/alerts": "Alerts",
  "/vitals": "Vitals",
  "/contacts": "Care Circle",
  "/meds": "Medications",
  "/call": "Video Call",
  "/settings": "Settings",
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const elderName = useAuthStore((s) => s.user?.displayName ?? "Elder");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, severity: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, severity }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    const handler = (frame: ClientPushFrame) => {
      if (frame.type === "alert.new") {
        const a = frame.data as Alert;
        addToast(
          `${a.type.replace(/_/g, " ")} alert for ${elderName}`,
          a.severity
        );
      }
    };
    wsHandlers.push(handler);
    return () => {
      const idx = wsHandlers.indexOf(handler);
      if (idx !== -1) wsHandlers.splice(idx, 1);
    };
  }, [addToast, elderName]);

  const isNested = location.pathname.startsWith("/alerts/");
  const title = isNested
    ? "Alert Detail"
    : PAGE_TITLES[location.pathname] ?? "AgeCare";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--background)",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 16px",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {isNested && (
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
              borderRadius: 8,
            }}
            aria-label="Go back"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {!isNested && (
          <Link
            to="/alerts"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <svg viewBox="0 0 42 42" fill="none" width="32" height="32">
              <rect width="42" height="42" rx="12" fill="#2D6A4F" />
              <path d="M21 8C21 8 10 16 10 23C10 28.5 15 33 21 33C27 33 32 28.5 32 23C32 16 21 8 21 8Z" fill="#95D5B2" />
              <path d="M21 14C21 14 15 19 15 23C15 26 17.5 28 21 28C24.5 28 27 26 27 23C27 19 21 14 21 14Z" fill="#FFFFFF" />
            </svg>
          </Link>
        )}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 17,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </div>
          {!isNested && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {elderName}
            </div>
          )}
        </div>
      </header>

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast${t.severity === "critical" ? " critical" : ""}`}
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            {t.severity === "critical" ? "CRITICAL: " : ""}{t.message}
          </div>
        ))}
      </div>

      {/* Page content */}
      <main
        style={{
          flex: 1,
          paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom))",
          overflowY: "auto",
        }}
      >
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

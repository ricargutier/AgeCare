import { useState } from "react";

export default function VideoCall() {
  const [toastVisible, setToastVisible] = useState(false);

  function handleStartCall() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        minHeight: "60vh",
        textAlign: "center",
      }}
    >
      {toastVisible && (
        <div
          style={{
            position: "fixed",
            top: 80,
            left: 16,
            right: 16,
            background: "var(--primary-dark)",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: "var(--shadow)",
          }}
        >
          Video calling coming soon — stay tuned!
        </div>
      )}

      <div
        style={{
          width: 96,
          height: 96,
          background: "var(--accent)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <svg width="48" height="48" fill="none" stroke="var(--primary-dark)" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>

      <h2
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 12,
        }}
      >
        Video Call
      </h2>
      <p
        style={{
          fontSize: 16,
          color: "var(--text-secondary)",
          marginBottom: 36,
          maxWidth: 280,
          lineHeight: 1.6,
        }}
      >
        Video calling is coming soon. You'll be able to connect face-to-face with your elder directly from the app.
      </p>

      <button
        onClick={handleStartCall}
        style={{
          padding: "16px 40px",
          fontSize: 16,
          fontWeight: 700,
          color: "#fff",
          background: "var(--primary)",
          border: "none",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(45,106,79,0.3)",
          minHeight: 52,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        Start Call (coming soon)
      </button>
    </div>
  );
}

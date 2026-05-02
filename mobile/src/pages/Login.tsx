import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../auth/store";
import { subscribeToPush } from "../push/subscribe";
import { wsClient } from "../api/ws";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pushBanner, setPushBanner] = useState<string | null>(null);

  function validate(): boolean {
    let ok = true;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) {
      setEmailError("Please enter a valid email address");
      ok = false;
    } else {
      setEmailError("");
    }
    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      ok = false;
    } else {
      setPasswordError("");
    }
    return ok;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");
    try {
      const { token, user } = await api.login({ email, password });
      setAuth(token, user);
      wsClient.connect(token);

      // Request push subscription; show banner if unavailable
      const pushStatus = await subscribeToPush(token);
      if (pushStatus === "unsupported") {
        setPushBanner(
          "Push notifications aren't supported on this device. Live alerts will appear inside the app."
        );
        // Still navigate after a moment
        setTimeout(() => navigate("/alerts"), 2000);
        return;
      }
      navigate("/alerts");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        background: "linear-gradient(160deg, #F8F9FA 0%, #E8F5E9 55%, #D8F3DC 100%)",
        position: "relative",
      }}
    >
      {/* Push not supported banner */}
      {pushBanner && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: 16,
            right: 16,
            background: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 14,
            color: "#664d03",
            zIndex: 999,
          }}
        >
          {pushBanner}
        </div>
      )}

      {/* Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "var(--shadow)",
          width: "100%",
          maxWidth: 400,
          padding: "40px 28px",
          animation: "cardEnter 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <svg viewBox="0 0 42 42" fill="none" width="42" height="42">
              <rect width="42" height="42" rx="12" fill="#2D6A4F" />
              <path
                d="M21 8C21 8 10 16 10 23C10 28.5 15 33 21 33C27 33 32 28.5 32 23C32 16 21 8 21 8Z"
                fill="#95D5B2"
              />
              <path
                d="M21 14C21 14 15 19 15 23C15 26 17.5 28 21 28C24.5 28 27 26 27 23C27 19 21 14 21 14Z"
                fill="#FFFFFF"
              />
            </svg>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: "var(--primary)",
                letterSpacing: -0.5,
              }}
            >
              AgeCare
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
            Caring with Compassion
          </p>
        </div>

        {/* Welcome */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
            Sign in to monitor your loved one
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid var(--error)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 14,
              color: "var(--error)",
              marginBottom: 16,
            }}
          >
            {serverError}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <svg
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: emailError ? "var(--error)" : "var(--text-secondary)",
                }}
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="Enter your email"
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "14px 14px 14px 46px",
                  fontSize: 16,
                  border: `2px solid ${emailError ? "var(--error)" : "var(--input-border)"}`,
                  borderRadius: 12,
                  outline: "none",
                  background: "#fff",
                  color: "var(--text-primary)",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
                onBlur={(e) => { e.target.style.borderColor = emailError ? "var(--error)" : "var(--input-border)"; }}
              />
            </div>
            {emailError && (
              <p style={{ color: "var(--error)", fontSize: 13, marginTop: 5 }}>{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <svg
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: passwordError ? "var(--error)" : "var(--text-secondary)",
                }}
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "14px 48px 14px 46px",
                  fontSize: 16,
                  border: `2px solid ${passwordError ? "var(--error)" : "var(--input-border)"}`,
                  borderRadius: 12,
                  outline: "none",
                  background: "#fff",
                  color: "var(--text-primary)",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
                onBlur={(e) => { e.target.style.borderColor = passwordError ? "var(--error)" : "var(--input-border)"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label="Toggle password visibility"
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-secondary)",
                  minWidth: 44,
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && (
              <p style={{ color: "var(--error)", fontSize: 13, marginTop: 5 }}>{passwordError}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Nunito', sans-serif",
              background: loading ? "#9ca3af" : "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 12px rgba(45,106,79,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 52,
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            &copy; 2026 AgeCare. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

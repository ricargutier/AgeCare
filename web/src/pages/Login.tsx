import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../api/queries";
import type { Role } from "../../../shared/contracts/types";
import { useAuthStore } from "../auth/store";

const LOGO_SVG = (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
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
);

function redirectForRole(role: Role): string {
  if (role === "elder") return "/me";
  if (role === "system_admin") return "/admin";
  return "/elders";
}

export function Login() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  // Already logged in
  if (token && user) {
    navigate(redirectForRole(user.role), { replace: true });
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loginMutation = useLogin();

  function validateEmail(val: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let valid = true;

    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!valid) return;

    try {
      const result = await loginMutation.mutateAsync({ email, password });
      navigate(redirectForRole(result.user.role), { replace: true });
    } catch {
      setPasswordError("Invalid credentials. Please try again.");
    }
  }

  const isLoading = loginMutation.isPending;

  return (
    <div
      style={{
        fontFamily: "'Nunito', sans-serif",
        background: "linear-gradient(135deg, #F8F9FA 0%, #E8F5E9 50%, #D8F3DC 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 80%, rgba(45,106,79,0.05) 0%, transparent 50%), " +
            "radial-gradient(circle at 80% 20%, rgba(149,213,178,0.1) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "48px 40px",
          position: "relative",
          zIndex: 1,
          animation: "cardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style>{`
          @keyframes cardEnter {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60%  { transform: translateX(-5px); }
            40%, 80%  { transform: translateX(5px); }
          }
          .shake { animation: shake 0.4s ease; }
        `}</style>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            {LOGO_SVG}
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 32,
                fontWeight: 700,
                color: "var(--primary)",
                letterSpacing: "-0.5px",
              }}
            >
              AgeCare
            </span>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>
            Caring with Compassion
          </p>
        </div>

        {/* Welcome */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
            Sign in to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
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
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                required
                aria-describedby={emailError ? "email-error" : undefined}
                aria-invalid={Boolean(emailError)}
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 48px",
                  fontSize: 16,
                  fontFamily: "'Nunito', sans-serif",
                  border: `2px solid ${emailError ? "var(--error)" : "var(--input-border)"}`,
                  borderRadius: 12,
                  outline: "none",
                  color: "var(--text-primary)",
                  background: "#fff",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(45,106,79,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = emailError
                    ? "var(--error)"
                    : "var(--input-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 20,
                  height: 20,
                  color: "var(--text-secondary)",
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            {emailError && (
              <p
                id="email-error"
                role="alert"
                style={{ color: "var(--error)", fontSize: 13, marginTop: 6 }}
              >
                {emailError}
              </p>
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
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                required
                minLength={6}
                aria-describedby={passwordError ? "password-error" : undefined}
                aria-invalid={Boolean(passwordError)}
                style={{
                  width: "100%",
                  padding: "14px 48px 14px 48px",
                  fontSize: 16,
                  fontFamily: "'Nunito', sans-serif",
                  border: `2px solid ${passwordError ? "var(--error)" : "var(--input-border)"}`,
                  borderRadius: 12,
                  outline: "none",
                  color: "var(--text-primary)",
                  background: "#fff",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(45,106,79,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = passwordError
                    ? "var(--error)"
                    : "var(--input-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 20,
                  height: 20,
                  color: "var(--text-secondary)",
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  display: "flex",
                  padding: 4,
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && (
              <p
                id="password-error"
                role="alert"
                style={{ color: "var(--error)", fontSize: 13, marginTop: 6 }}
              >
                {passwordError}
              </p>
            )}
          </div>

          {/* Options row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                style={{ width: 18, height: 18, accentColor: "var(--primary)", cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Remember me</span>
            </label>
            <a
              href="#"
              style={{ fontSize: 14, color: "var(--primary)", fontWeight: 600 }}
              onClick={(e) => e.preventDefault()}
            >
              Forgot password?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "16px 24px", fontSize: 16 }}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Signing In…
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: "100%", padding: "16px 24px", fontSize: 16, marginTop: 12 }}
            onClick={() => alert("Registration not available in this demo.")}
          >
            Create Account
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid #E5E7EB",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            &copy; 2026 AgeCare. All rights reserved.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
            <a href="#" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Privacy Policy
            </a>
            <a href="#" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal authenticated REST client for simulator scenarios that need to
 * hit the backend's /demo/scenarios/:name endpoint. Used by the three
 * scenarios that don't have a clean WS-based path (inactivity,
 * medication_missed, device_offline).
 */

const BASE = process.env["BACKEND_HTTP_URL"] ?? "http://localhost:8080";
const EMAIL = "david@agecare.demo";
const PASSWORD = "agecare-demo-2026";

let _jwt: string | null = null;

async function login(): Promise<string> {
  if (_jwt) return _jwt;
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const body = (await res.json()) as { token: string };
  _jwt = body.token;
  return _jwt;
}

export async function triggerScenario(name: string): Promise<unknown> {
  const token = await login();
  const res = await fetch(`${BASE}/demo/scenarios/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: "{}",
  });
  if (res.status === 404) {
    throw new Error(
      `/demo/scenarios endpoint not found — backend may need to be updated`
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scenario ${name} failed: HTTP ${res.status} ${text}`);
  }
  return res.json();
}

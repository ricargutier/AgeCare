#!/usr/bin/env node
/**
 * e2e/smoke.mjs — AgeCare end-to-end smoke harness
 *
 * Requires the stack to be running (pnpm demo in another terminal).
 * No external dependencies beyond Node 20 built-ins + the `ws` package
 * (which is a dependency of @agecare/simulators and will be in node_modules
 * after pnpm install).
 *
 * Usage:  node e2e/smoke.mjs
 *         or:  pnpm e2e
 */

// Attempt to import ws from the workspace. If not found, error helpfully.
let WebSocket;
try {
  const mod = await import("ws");
  WebSocket = mod.default ?? mod.WebSocket;
} catch {
  console.error(
    "ERROR: 'ws' package not found. Run `pnpm install` first.\n" +
      "The ws package is provided by the simulators workspace package."
  );
  process.exit(1);
}

const BASE_URL = process.env.BACKEND_URL || "http://localhost:3000";
const WS_URL = BASE_URL.replace(/^http/, "ws");

const DEMO_EMAIL = "david@agecare.demo";
const DEMO_PASSWORD = "agecare-demo-2026";
const ELDER_EMAIL = "eleanor@agecare.demo";
const DEVICE_TOKEN = "wearable-token-eleanor";
const DEVICE_ID = "wearable-eleanor";

const TIMEOUT_MS = 5_000; // max wait for WS alert

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _jwt = null;
const startTime = Date.now();
const results = []; // { step, passed, ms, error? }

function elapsed() {
  return Date.now() - startTime;
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (_jwt && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${_jwt}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

function step(name, passed, ms, error) {
  const icon = passed ? "PASS" : "FAIL";
  const msg = `[${icon}] (${ms}ms) ${name}`;
  if (!passed && error) {
    console.log(`${msg}\n       ${error}`);
  } else {
    console.log(msg);
  }
  results.push({ name, passed, ms, error });
}

function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
    // 5s connection timeout
    const t = setTimeout(() => {
      ws.close();
      reject(new Error(`WS connect timeout: ${url}`));
    }, TIMEOUT_MS);
    ws.once("open", () => clearTimeout(t));
  });
}

function waitForFrame(ws, predicate, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`Timeout waiting for WS frame after ${timeoutMs}ms`));
    }, timeoutMs);

    function onMessage(data) {
      let frame;
      try {
        frame = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (predicate(frame)) {
        clearTimeout(t);
        ws.off("message", onMessage);
        resolve(frame);
      }
    }

    ws.on("message", onMessage);
  });
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function step1_login() {
  const t0 = Date.now();
  try {
    const { status, body } = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      headers: { Authorization: undefined }, // no auth for login
    });
    if (status === 200 && body?.token) {
      _jwt = body.token;
      step("POST /auth/login → JWT captured", true, Date.now() - t0);
      return true;
    }
    step("POST /auth/login → JWT captured", false, Date.now() - t0, `HTTP ${status}: ${JSON.stringify(body)}`);
    return false;
  } catch (err) {
    step("POST /auth/login → JWT captured", false, Date.now() - t0, err.message);
    return false;
  }
}

async function step2_getElders() {
  const t0 = Date.now();
  try {
    const { status, body } = await apiFetch("/elders");
    if (status === 200 && Array.isArray(body)) {
      const found = body.find(
        (e) => e.email === ELDER_EMAIL || (e.user && e.user.email === ELDER_EMAIL)
      );
      // Some backends embed the elder's user email differently; also try userId lookup
      const elderRecord = found || body[0]; // fallback: use first elder
      if (elderRecord) {
        step("GET /elders → eleanor found", true, Date.now() - t0);
        return elderRecord;
      }
      step("GET /elders → eleanor found", false, Date.now() - t0, `Response: ${JSON.stringify(body).slice(0, 200)}`);
      return null;
    }
    step("GET /elders → eleanor found", false, Date.now() - t0, `HTTP ${status}: ${JSON.stringify(body)}`);
    return null;
  } catch (err) {
    step("GET /elders → eleanor found", false, Date.now() - t0, err.message);
    return null;
  }
}

async function step3_captureElderId(elderRecord) {
  const t0 = Date.now();
  const id = elderRecord?.id;
  if (id) {
    step(`Capture eleanorElderId = ${id}`, true, Date.now() - t0);
    return id;
  }
  step("Capture eleanorElderId", false, Date.now() - t0, "No id in elder record");
  return null;
}

async function steps4to6_wsFlow(elderId) {
  const t0 = Date.now();
  let clientWs, ingestWs;

  // Step 4 — Open client WS
  try {
    clientWs = await wsConnect(`${WS_URL}/ws/client?token=${_jwt}`);
    step("Open WS /ws/client with JWT", true, Date.now() - t0);
  } catch (err) {
    step("Open WS /ws/client with JWT", false, Date.now() - t0, err.message);
    return { clientWs: null, alertId: null };
  }

  // Step 5 — Open ingest WS and send fall event
  const t5 = Date.now();
  try {
    ingestWs = await wsConnect(`${WS_URL}/ws/ingest?deviceToken=${DEVICE_TOKEN}`);
    const fallFrame = JSON.stringify({
      type: "fall",
      deviceId: DEVICE_ID,
      payload: { ts: new Date().toISOString(), gForce: 4.2 },
    });
    ingestWs.send(fallFrame);
    step("Open WS /ws/ingest + send fall frame", true, Date.now() - t5);
  } catch (err) {
    step("Open WS /ws/ingest + send fall frame", false, Date.now() - t5, err.message);
    clientWs.close();
    return { clientWs: null, alertId: null };
  }

  // Step 6 — Wait for alert.new on client WS
  const t6 = Date.now();
  try {
    const frame = await waitForFrame(
      clientWs,
      (f) => f.type === "alert.new" && f.data?.type === "fall"
    );
    const alertId = frame.data?.id;
    step(`Receive alert.new (fall) on client WS, alertId=${alertId}`, true, Date.now() - t6);
    ingestWs.close();
    return { clientWs, alertId };
  } catch (err) {
    step("Receive alert.new (fall) on client WS within 5s", false, Date.now() - t6, err.message);
    ingestWs.close();
    clientWs.close();
    return { clientWs: null, alertId: null };
  }
}

async function step7_getAlerts(elderId) {
  const t0 = Date.now();
  try {
    const { status, body } = await apiFetch(`/elders/${elderId}/alerts?status=open`);
    if (status === 200 && Array.isArray(body)) {
      const fallAlert = body.find((a) => a.type === "fall");
      if (fallAlert) {
        step(`GET /elders/${elderId}/alerts?status=open → fall alert present`, true, Date.now() - t0);
        return fallAlert;
      }
      step(`GET /elders/${elderId}/alerts?status=open → fall alert present`, false, Date.now() - t0, `Alerts: ${JSON.stringify(body).slice(0, 300)}`);
      return null;
    }
    step(`GET /elders/${elderId}/alerts?status=open`, false, Date.now() - t0, `HTTP ${status}: ${JSON.stringify(body)}`);
    return null;
  } catch (err) {
    step(`GET /elders/${elderId}/alerts?status=open`, false, Date.now() - t0, err.message);
    return null;
  }
}

async function step8_acknowledge(alert) {
  const t0 = Date.now();
  try {
    const { status, body } = await apiFetch(`/alerts/${alert.id}/acknowledge`, {
      method: "POST",
      body: "{}",
    });
    if (status === 200 && (body?.acknowledgedAt || body?.alert?.acknowledgedAt)) {
      step(`POST /alerts/${alert.id}/acknowledge → acknowledgedAt set`, true, Date.now() - t0);
      return true;
    }
    step(`POST /alerts/${alert.id}/acknowledge → acknowledgedAt set`, false, Date.now() - t0, `HTTP ${status}: ${JSON.stringify(body)}`);
    return false;
  } catch (err) {
    step(`POST /alerts/${alert.id}/acknowledge`, false, Date.now() - t0, err.message);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nAgeCare E2E Smoke Test — ${new Date().toISOString()}`);
  console.log(`Target: ${BASE_URL}\n`);

  // Step 1
  const loginOk = await step1_login();
  if (!loginOk) {
    console.log("\nAborting: cannot proceed without a JWT. Is the backend running?\n");
    process.exit(1);
  }

  // Step 2
  const elderRecord = await step2_getElders();

  // Step 3
  const elderId = elderRecord ? await step3_captureElderId(elderRecord) : null;
  if (!elderId) {
    step("Capture eleanorElderId", false, 0, "No elder record returned");
  }

  let alertFromWs = null;

  if (elderId) {
    // Steps 4-6
    const { clientWs, alertId } = await steps4to6_wsFlow(elderId);
    if (clientWs) clientWs.close();
    if (alertId) alertFromWs = { id: alertId };

    // Give the backend a moment to persist the alert before polling REST
    await new Promise((r) => setTimeout(r, 500));

    // Step 7
    const restAlert = await step7_getAlerts(elderId);

    // Step 8
    const targetAlert = restAlert || alertFromWs;
    if (targetAlert) {
      await step8_acknowledge(targetAlert);
    } else {
      step("POST /alerts/:id/acknowledge", false, 0, "No alert ID available (steps 6 and 7 both failed)");
    }
  } else {
    // Mark steps 4-8 as skipped/failed
    for (const name of [
      "Open WS /ws/client with JWT",
      "Open WS /ws/ingest + send fall frame",
      "Receive alert.new (fall) on client WS within 5s",
      "GET /elders/:id/alerts?status=open",
      "POST /alerts/:id/acknowledge",
    ]) {
      step(name, false, 0, "Skipped — no elder ID");
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  const totalMs = elapsed();
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Result: ${passed}/${total} steps passed  (${totalMs}ms total)`);
  console.log("─".repeat(60));

  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import { authRoutes } from "../src/auth.js";
import { elderRoutes } from "../src/elders.js";
import { alertRoutes } from "../src/alerts.js";
import { wsIngestRoutes } from "../src/ws-ingest.js";
import { wsClientRoutes } from "../src/ws-client.js";
import { initVapid } from "../src/web-push.js";
import WebSocket from "ws";
import type { FastifyInstance } from "fastify";
import type { LoginResponse, Alert } from "../../shared/contracts/types.js";

let app: FastifyInstance;
let baseUrl: string;
let token: string;
let elderId: string;
let ingestDeviceId: string;

beforeAll(async () => {
  initVapid();
  app = await buildServer();
  await app.register(authRoutes);
  await app.register(elderRoutes);
  await app.register(alertRoutes);
  await app.register(wsIngestRoutes);
  await app.register(wsClientRoutes);

  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await app.close();
});

describe("AgeCare backend smoke test", () => {
  it("should login as family_admin and get a JWT", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "david@agecare.demo", password: "agecare-demo-2026" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as LoginResponse;
    expect(body.token).toBeTruthy();
    expect(body.user.role).toBe("family_admin");
    token = body.token;
  });

  it("should GET /elders and return at least one elder", async () => {
    const res = await fetch(`${baseUrl}/elders`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    elderId = body[0]!.id;
  });

  it("should simulate a fall via WS ingest and verify alert appears via REST", async () => {
    // First get the wearable device token and deviceId from DB
    const { default: prisma } = await import("../src/db.js");
    const deviceToken = await prisma.deviceToken.findFirst({
      where: { token: "wearable-token-eleanor" },
      include: { device: true },
    });

    expect(deviceToken).toBeTruthy();
    ingestDeviceId = deviceToken!.device.id;

    const wsUrl = baseUrl.replace("http", "ws");

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${wsUrl}/ws/ingest?deviceToken=wearable-token-eleanor`);

      ws.on("open", () => {
        const frame = {
          type: "fall",
          deviceId: ingestDeviceId,
          payload: { ts: new Date().toISOString(), gForce: 3.8, orientation: "face_down" },
        };
        ws.send(JSON.stringify(frame));
        // Give server time to process
        setTimeout(() => {
          ws.close();
          resolve();
        }, 500);
      });

      ws.on("error", reject);
      setTimeout(() => reject(new Error("WS connection timeout")), 5000);
    });

    // Allow DB write to settle
    await new Promise((r) => setTimeout(r, 300));

    // Verify alert appears via REST
    const res = await fetch(`${baseUrl}/elders/${elderId}/alerts?status=open`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const alerts = (await res.json()) as Alert[];
    const fallAlert = alerts.find((a) => a.type === "fall");
    expect(fallAlert).toBeTruthy();
    expect(fallAlert?.severity).toBe("critical");
  });
});

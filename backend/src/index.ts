import { buildServer, PORT } from "./server.js";
import { authRoutes } from "./auth.js";
import { elderRoutes } from "./elders.js";
import { alertRoutes } from "./alerts.js";
import { medicationRoutes } from "./medications.js";
import { pushRoutes } from "./push.js";
import { auditRoutes } from "./audit.js";
import { demoRoutes } from "./demo.js";
import { wsIngestRoutes } from "./ws-ingest.js";
import { wsClientRoutes } from "./ws-client.js";
import { startBackgroundWorkers } from "./alert-engine.js";
import { initVapid } from "./web-push.js";

async function main() {
  // Initialize VAPID keys (generates if not present)
  initVapid();

  const app = await buildServer();

  // ─── REST routes ────────────────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(elderRoutes);
  await app.register(alertRoutes);
  await app.register(medicationRoutes);
  await app.register(pushRoutes);
  await app.register(auditRoutes);
  await app.register(demoRoutes);

  // ─── WebSocket routes ───────────────────────────────────────────────────────
  await app.register(wsIngestRoutes);
  await app.register(wsClientRoutes);

  // ─── Start background workers ───────────────────────────────────────────────
  startBackgroundWorkers();

  // ─── Start listening ────────────────────────────────────────────────────────
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`AgeCare backend listening on http://0.0.0.0:${PORT}`);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

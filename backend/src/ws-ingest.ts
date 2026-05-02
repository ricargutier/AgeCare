import { FastifyInstance } from "fastify";
import prisma from "./db.js";
import type { IngestFrame } from "../../shared/contracts/types.js";
import { processIngestFrame } from "./alert-engine.js";

export async function wsIngestRoutes(app: FastifyInstance) {
  app.get("/ws/ingest", { websocket: true }, async (connection, req) => {
    const url = new URL(req.url!, `http://localhost`);
    const deviceToken = url.searchParams.get("deviceToken");

    if (!deviceToken) {
      connection.close(1008, "Missing deviceToken");
      return;
    }

    // Authenticate device token
    const tokenRecord = await prisma.deviceToken.findUnique({
      where: { token: deviceToken },
      include: { device: true },
    });

    if (!tokenRecord) {
      connection.close(1008, "Invalid deviceToken");
      return;
    }

    const device = tokenRecord.device;

    // Update lastSeenAt on connect
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    app.log.info(`[ws-ingest] Device ${device.id} (${device.serial}) connected`);

    connection.on("message", async (raw: Buffer) => {
      let frame: IngestFrame;
      try {
        frame = JSON.parse(raw.toString()) as IngestFrame;
      } catch {
        app.log.warn("[ws-ingest] Failed to parse frame");
        return;
      }

      // Validate that deviceId in frame matches authenticated device
      if (frame.deviceId !== device.id) {
        app.log.warn(`[ws-ingest] deviceId mismatch: frame=${frame.deviceId} auth=${device.id}`);
        return;
      }

      try {
        await processIngestFrame(frame, device.id, device.elderId);
      } catch (err) {
        app.log.error({ err }, "[ws-ingest] processIngestFrame error");
      }
    });

    connection.on("close", () => {
      app.log.info(`[ws-ingest] Device ${device.id} disconnected`);
    });
  });
}

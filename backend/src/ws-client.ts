import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import prisma from "./db.js";
import type { Alert, VitalsSample, ClientPushFrame, Role, Device } from "../../shared/contracts/types.js";

// Per-user subscription registry: userId → Set of websocket connections + accessible elder ids
interface ClientSession {
  ws: WebSocket;
  userId: string;
  role: Role;
  accessibleElderIds: string[] | null; // null = all (system_admin)
}

const sessions: Set<ClientSession> = new Set();

async function getAccessibleElderIds(userId: string, role: Role): Promise<string[] | null> {
  if (role === "system_admin") return null;
  if (role === "elder") {
    const elder = await prisma.elder.findUnique({ where: { userId } });
    return elder ? [elder.id] : [];
  }
  const links = await prisma.careCircleMember.findMany({
    where: { userId },
    select: { elderId: true },
  });
  return links.map((l) => l.elderId);
}

function pushFrame(session: ClientSession, frame: ClientPushFrame) {
  if (session.ws.readyState === WebSocket.OPEN) {
    session.ws.send(JSON.stringify(frame));
  }
}

function canSeeElder(session: ClientSession, elderId: string): boolean {
  if (session.accessibleElderIds === null) return true;
  return session.accessibleElderIds.includes(elderId);
}

export function broadcastAlertNew(alert: Alert) {
  for (const session of sessions) {
    if (canSeeElder(session, alert.elderId)) {
      pushFrame(session, { type: "alert.new", data: alert });
    }
  }
}

export function broadcastAlertUpdate(alert: Alert) {
  for (const session of sessions) {
    if (canSeeElder(session, alert.elderId)) {
      pushFrame(session, { type: "alert.update", data: alert });
    }
  }
}

export function broadcastVitalsTick(vitals: VitalsSample) {
  for (const session of sessions) {
    if (canSeeElder(session, vitals.elderId)) {
      pushFrame(session, { type: "vitals.tick", data: vitals });
    }
  }
}

export function broadcastDeviceStatus(device: Pick<Device, "id" | "online" | "lastSeenAt">) {
  for (const session of sessions) {
    // broadcast to all connected clients (device status is not elder-scoped in API type)
    pushFrame(session, { type: "device.status", data: device });
  }
}

export async function wsClientRoutes(app: FastifyInstance) {
  app.get("/ws/client", { websocket: true }, async (connection, req) => {
    const url = new URL(req.url!, `http://localhost`);
    const token = url.searchParams.get("token");

    if (!token) {
      connection.close(1008, "Missing token");
      return;
    }

    let jwtPayload: { id: string; role: Role };
    try {
      jwtPayload = app.jwt.verify<{ id: string; role: Role }>(token);
    } catch {
      connection.close(1008, "Invalid token");
      return;
    }

    const accessibleElderIds = await getAccessibleElderIds(jwtPayload.id, jwtPayload.role);

    const session: ClientSession = {
      ws: connection,
      userId: jwtPayload.id,
      role: jwtPayload.role,
      accessibleElderIds,
    };

    sessions.add(session);

    connection.send(JSON.stringify({ type: "connected", userId: jwtPayload.id }));

    connection.on("close", () => {
      sessions.delete(session);
    });

    connection.on("error", () => {
      sessions.delete(session);
    });
  });
}

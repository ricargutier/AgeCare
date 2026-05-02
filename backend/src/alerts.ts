import { FastifyInstance } from "fastify";
import prisma from "./db.js";
import { serializeAlert } from "./serializers.js";
import { requireAuth } from "./auth.js";
import { broadcastAlertUpdate } from "./ws-client.js";
import { sendPushToElderSubscribers } from "./web-push.js";
import type { Role } from "../../shared/contracts/types.js";

async function canAccessAlert(userId: string, role: Role, alertId: string) {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) return { alert: null, allowed: false };

  if (role === "system_admin") return { alert, allowed: true };

  if (role === "elder") {
    const elder = await prisma.elder.findUnique({ where: { userId } });
    return { alert, allowed: elder?.id === alert.elderId };
  }

  const link = await prisma.careCircleMember.findFirst({
    where: { userId, elderId: alert.elderId },
  });
  return { alert, allowed: !!link };
}

export async function alertRoutes(app: FastifyInstance) {
  // POST /alerts/:id/acknowledge
  app.post<{ Params: { id: string } }>(
    "/alerts/:id/acknowledge",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };

      // family_viewer cannot acknowledge
      if (jwt.role === "family_viewer") {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Viewers cannot acknowledge alerts" } });
      }

      const { alert, allowed } = await canAccessAlert(jwt.id, jwt.role, req.params.id);
      if (!alert) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Alert not found" } });
      }
      if (!allowed) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
      }

      if (alert.status !== "open") {
        return reply.status(409).send({ error: { code: "CONFLICT", message: `Alert is already ${alert.status}` } });
      }

      const updated = await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: "acknowledged",
          acknowledgedAt: new Date(),
          acknowledgedBy: jwt.id,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorUserId: jwt.id,
          action: "alert.acknowledge",
          targetType: "alert",
          targetId: alert.id,
          payload: {},
        },
      });

      const serialized = serializeAlert(updated);
      broadcastAlertUpdate(serialized);
      await sendPushToElderSubscribers(alert.elderId, { type: "alert.update", data: serialized });

      return reply.send({ alert: serialized });
    }
  );

  // POST /alerts/:id/resolve
  // Body: {} or { note?: string }
  app.post<{ Params: { id: string }; Body: { note?: string } | undefined }>(
    "/alerts/:id/resolve",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };

      // family_viewer cannot resolve
      if (jwt.role === "family_viewer") {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Viewers cannot resolve alerts" } });
      }

      // elder can only resolve their own alert (enforced via canAccessAlert)
      // family_admin, caregiver, system_admin also allowed (family_viewer blocked above)

      const { alert, allowed } = await canAccessAlert(jwt.id, jwt.role, req.params.id);
      if (!alert) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Alert not found" } });
      }
      if (!allowed) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
      }

      if (alert.status === "resolved") {
        return reply.status(409).send({ error: { code: "CONFLICT", message: "Alert is already resolved" } });
      }

      const updated = await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          resolvedBy: jwt.id,
        },
      });

      // Audit log — include optional note in payload
      const note = req.body?.note ?? undefined;
      await prisma.auditLog.create({
        data: {
          actorUserId: jwt.id,
          action: "alert.resolve",
          targetType: "alert",
          targetId: alert.id,
          payload: note !== undefined ? { note } : {},
        },
      });

      const serialized = serializeAlert(updated);
      broadcastAlertUpdate(serialized);
      await sendPushToElderSubscribers(alert.elderId, { type: "alert.update", data: serialized });

      return reply.send({ alert: serialized });
    }
  );
}

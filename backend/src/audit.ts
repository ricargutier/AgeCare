import { FastifyInstance } from "fastify";
import prisma from "./db.js";
import { serializeAuditLog } from "./serializers.js";
import { requireRole } from "./auth.js";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

interface AuditQuerystring {
  since?: string;
  actor?: string;
  action?: string;
  targetType?: string;
  limit?: string;
}

export async function auditRoutes(app: FastifyInstance) {
  // GET /audit?since=&actor=&action=&targetType=&limit=
  // actor=system matches actorUserId IS NULL (system-generated entries)
  app.get<{ Querystring: AuditQuerystring }>(
    "/audit",
    { preHandler: requireRole(["system_admin"]) },
    async (req, reply) => {
      const { since, actor, action, targetType, limit: limitStr } = req.query;

      // Validate ?since=
      let sinceDate: Date | undefined;
      if (since !== undefined) {
        sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          return reply.status(400).send({
            error: { code: "VALIDATION", message: "Invalid ?since= value; expected ISO-8601 timestamp" },
          });
        }
      }

      // Validate ?limit=
      let limit = DEFAULT_LIMIT;
      if (limitStr !== undefined) {
        const parsed = parseInt(limitStr, 10);
        if (isNaN(parsed) || parsed < 1) {
          return reply.status(400).send({
            error: { code: "VALIDATION", message: "Invalid ?limit= value; must be a positive integer" },
          });
        }
        limit = Math.min(parsed, MAX_LIMIT);
      }

      // Build actorUserId filter: "system" → IS NULL; any other value → exact match
      // Prisma interprets `null` as IS NULL, `undefined` skips the filter.
      const actorUserId: string | null | undefined =
        actor === undefined ? undefined : actor === "system" ? null : actor;

      const logs = await prisma.auditLog.findMany({
        where: {
          actorUserId,
          action: action ?? undefined,
          targetType: targetType ?? undefined,
          ts: sinceDate ? { gte: sinceDate } : undefined,
        },
        orderBy: { ts: "desc" },
        take: limit,
      });

      return reply.send(logs.map(serializeAuditLog));
    }
  );
}

import { FastifyInstance } from "fastify";
import prisma from "./db.js";
import { serializeAuditLog } from "./serializers.js";
import { requireRole } from "./auth.js";

export async function auditRoutes(app: FastifyInstance) {
  // GET /audit?since=
  app.get<{ Querystring: { since?: string } }>(
    "/audit",
    { preHandler: requireRole(["system_admin"]) },
    async (req, reply) => {
      const { since } = req.query;

      const logs = await prisma.auditLog.findMany({
        where: {
          ts: since ? { gte: new Date(since) } : undefined,
        },
        orderBy: { ts: "desc" },
        take: 500,
      });

      return reply.send(logs.map(serializeAuditLog));
    }
  );
}

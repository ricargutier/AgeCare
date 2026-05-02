import { FastifyInstance } from "fastify";
import prisma from "./db.js";
import {
  serializeElder,
  serializeVitalsSample,
  serializeAlert,
  serializeMedicationSchedule,
  serializeDevice,
} from "./serializers.js";
import { requireAuth } from "./auth.js";
import type { Role } from "../../shared/contracts/types.js";

// Get Elder.id values accessible to the requesting user
async function getAccessibleElderIds(userId: string, role: Role): Promise<string[] | null> {
  // null means "all elders" (system_admin)
  if (role === "system_admin") return null;

  if (role === "elder") {
    const elder = await prisma.elder.findUnique({ where: { userId } });
    return elder ? [elder.id] : [];
  }

  // family_admin, family_viewer, caregiver, healthcare_provider — CareCircle scoped
  const links = await prisma.careCircleMember.findMany({
    where: { userId },
    select: { elderId: true },
  });
  return links.map((l) => l.elderId);
}

export async function elderRoutes(app: FastifyInstance) {
  // GET /elders
  app.get("/elders", { preHandler: requireAuth() }, async (req, reply) => {
    const jwt = req.user as { id: string; role: Role };
    const accessibleIds = await getAccessibleElderIds(jwt.id, jwt.role);

    const elders = await prisma.elder.findMany({
      where: accessibleIds ? { id: { in: accessibleIds } } : undefined,
    });

    return reply.send(elders.map((e) => serializeElder(e)));
  });

  // GET /elders/:id
  app.get<{ Params: { id: string } }>(
    "/elders/:id",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };
      const { id } = req.params;

      const accessibleIds = await getAccessibleElderIds(jwt.id, jwt.role);
      if (accessibleIds && !accessibleIds.includes(id)) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
      }

      const elder = await prisma.elder.findUnique({
        where: { id },
        include: {
          careCircle: { include: { user: true } },
          devices: true,
        },
      });

      if (!elder) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Elder not found" } });
      }

      return reply.send(serializeElder(elder, {
        careCircle: elder.careCircle,
        devices: elder.devices,
      }));
    }
  );

  // GET /elders/:id/vitals?from=&to=&metric=
  app.get<{ Params: { id: string }; Querystring: { from?: string; to?: string; metric?: string } }>(
    "/elders/:id/vitals",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };
      const { id } = req.params;
      const { from, to } = req.query;

      const accessibleIds = await getAccessibleElderIds(jwt.id, jwt.role);
      if (accessibleIds && !accessibleIds.includes(id)) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
      }

      const samples = await prisma.vitalsSample.findMany({
        where: {
          elderId: id,
          ts: {
            gte: from ? new Date(from) : undefined,
            lte: to ? new Date(to) : undefined,
          },
        },
        orderBy: { ts: "asc" },
        take: 1000,
      });

      return reply.send(samples.map(serializeVitalsSample));
    }
  );

  // GET /elders/:id/alerts?status=&since=
  app.get<{ Params: { id: string }; Querystring: { status?: string; since?: string } }>(
    "/elders/:id/alerts",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };
      const { id } = req.params;
      const { status, since } = req.query;

      const accessibleIds = await getAccessibleElderIds(jwt.id, jwt.role);
      if (accessibleIds && !accessibleIds.includes(id)) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
      }

      const alerts = await prisma.alert.findMany({
        where: {
          elderId: id,
          status: status ?? undefined,
          createdAt: since ? { gte: new Date(since) } : undefined,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      return reply.send(alerts.map(serializeAlert));
    }
  );

  // GET /elders/:id/medications
  app.get<{ Params: { id: string } }>(
    "/elders/:id/medications",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };
      const { id } = req.params;

      const accessibleIds = await getAccessibleElderIds(jwt.id, jwt.role);
      if (accessibleIds && !accessibleIds.includes(id)) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
      }

      const schedules = await prisma.medicationSchedule.findMany({
        where: { elderId: id },
        include: { events: { orderBy: { dueAt: "asc" }, take: 30 } },
      });

      return reply.send(schedules.map((s) => serializeMedicationSchedule(s, s.events)));
    }
  );

  // GET /elders/:id/devices
  app.get<{ Params: { id: string } }>(
    "/elders/:id/devices",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };
      const { id } = req.params;

      const accessibleIds = await getAccessibleElderIds(jwt.id, jwt.role);
      if (accessibleIds && !accessibleIds.includes(id)) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
      }

      const devices = await prisma.device.findMany({ where: { elderId: id } });
      return reply.send(devices.map(serializeDevice));
    }
  );
}

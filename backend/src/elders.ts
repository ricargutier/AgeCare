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
import type { Role, VitalsDailySummary } from "../../shared/contracts/types.js";

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

  // GET /elders/:id/vitals/history?days=N
  // Returns daily aggregated vitals (UTC day boundaries) for the last N days.
  // Default days=7, max days=30.
  app.get<{ Params: { id: string }; Querystring: { days?: string } }>(
    "/elders/:id/vitals/history",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };
      const { id } = req.params;
      const { days: daysStr } = req.query;

      const accessibleIds = await getAccessibleElderIds(jwt.id, jwt.role);
      if (accessibleIds && !accessibleIds.includes(id)) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
      }

      // Validate ?days=
      let days = 7;
      if (daysStr !== undefined) {
        const parsed = parseInt(daysStr, 10);
        if (isNaN(parsed) || parsed < 1) {
          return reply.status(400).send({
            error: { code: "VALIDATION", message: "Invalid ?days= value; must be a positive integer" },
          });
        }
        days = Math.min(parsed, 30);
      }

      // Compute the start of the window: N complete UTC days back from the start of today
      const now = new Date();
      const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      const windowStart = new Date(startOfToday.getTime() - days * 24 * 60 * 60 * 1000);

      // Raw SQL aggregation — Prisma groupBy doesn't support date_trunc
      type RawRow = {
        day: Date;
        avg_hr: number | null;
        min_hr: number | null;
        max_hr: number | null;
        avg_spo2: number | null;
        total_steps: number | null;
        sample_count: bigint;
      };

      const rows = await prisma.$queryRaw<RawRow[]>`
        SELECT
          date_trunc('day', "ts") AS day,
          AVG("heartRate")        AS avg_hr,
          MIN("heartRate")        AS min_hr,
          MAX("heartRate")        AS max_hr,
          AVG("spo2")             AS avg_spo2,
          MAX("steps")            AS total_steps,
          COUNT(*)                AS sample_count
        FROM "VitalsSample"
        WHERE "elderId" = ${id} AND "ts" >= ${windowStart}
        GROUP BY day
        ORDER BY day
      `;

      const summaries: VitalsDailySummary[] = rows.map((r) => ({
        date: r.day.toISOString().split("T")[0]!,
        avgHeartRate: r.avg_hr !== null ? Number(r.avg_hr) : null,
        minHeartRate: r.min_hr !== null ? Number(r.min_hr) : null,
        maxHeartRate: r.max_hr !== null ? Number(r.max_hr) : null,
        avgSpo2: r.avg_spo2 !== null ? Number(r.avg_spo2) : null,
        totalSteps: r.total_steps !== null ? Number(r.total_steps) : null,
        sampleCount: Number(r.sample_count),
      }));

      return reply.send(summaries);
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

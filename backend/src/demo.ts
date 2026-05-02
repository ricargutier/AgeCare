/**
 * POST /demo/scenarios/:name
 *
 * Demo-only endpoint that triggers a simulator scenario directly from the backend,
 * so the web UI can fire demos without spawning a subprocess.
 *
 * Allowed roles: family_admin, system_admin
 * Supported scenario names: fall | sos | vitals_anomaly | medication_missed |
 *                            inactivity | device_offline
 */

import { FastifyInstance } from "fastify";
import prisma from "./db.js";
import { requireRole } from "./auth.js";
import { createAlertDirect } from "./alert-engine.js";
import type { DemoScenarioName, Role } from "../../shared/contracts/types.js";

const DEMO_SCENARIOS: DemoScenarioName[] = [
  "fall",
  "sos",
  "vitals_anomaly",
  "medication_missed",
  "inactivity",
  "device_offline",
];

function isDemoScenario(name: string): name is DemoScenarioName {
  return (DEMO_SCENARIOS as string[]).includes(name);
}

export async function demoRoutes(app: FastifyInstance) {
  app.post<{ Params: { name: string } }>(
    "/demo/scenarios/:name",
    { preHandler: requireRole(["family_admin", "system_admin"]) },
    async (req, reply) => {
      const { name } = req.params;
      const jwt = req.user as { id: string; role: Role };

      if (!isDemoScenario(name)) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION",
            message: `Unknown scenario "${name}". Valid values: ${DEMO_SCENARIOS.join(", ")}`,
          },
        });
      }

      // Look up Eleanor — the demo elder
      const eleanorUser = await prisma.user.findUnique({
        where: { email: "eleanor@agecare.demo" },
      });
      if (!eleanorUser) {
        return reply.status(500).send({
          error: { code: "INTERNAL", message: "Demo elder not found — run pnpm db:seed first" },
        });
      }

      const elder = await prisma.elder.findUnique({
        where: { userId: eleanorUser.id },
      });
      if (!elder) {
        return reply.status(500).send({
          error: { code: "INTERNAL", message: "Elder record not found — run pnpm db:seed first" },
        });
      }

      const elderId = elder.id;

      let alert: Awaited<ReturnType<typeof createAlertDirect>>;

      switch (name) {
        case "fall": {
          alert = await createAlertDirect({
            elderId,
            type: "fall",
            severity: "critical",
            payload: { gForce: 4.2, orientation: "face-down", ts: new Date().toISOString(), demo: true },
            actorUserId: jwt.id,
          });
          break;
        }

        case "sos": {
          alert = await createAlertDirect({
            elderId,
            type: "sos",
            severity: "critical",
            payload: { ts: new Date().toISOString(), demo: true },
            actorUserId: jwt.id,
          });
          break;
        }

        case "vitals_anomaly": {
          alert = await createAlertDirect({
            elderId,
            type: "vitals_anomaly",
            severity: "warn",
            payload: { heartRate: 165, sustainedSec: 90, demo: true },
            actorUserId: jwt.id,
          });
          break;
        }

        case "medication_missed": {
          // Find the next pending medication event for Eleanor
          const nextEvent = await prisma.medicationEvent.findFirst({
            where: {
              schedule: { elderId },
              status: "pending",
            },
            include: { schedule: true },
            orderBy: { dueAt: "asc" },
          });

          const medPayload: Record<string, unknown> = { demo: true };
          if (nextEvent) {
            medPayload["eventId"] = nextEvent.id;
            medPayload["scheduleId"] = nextEvent.scheduleId;
            medPayload["drugName"] = nextEvent.schedule.drugName;
            medPayload["dose"] = nextEvent.schedule.dose;
            medPayload["dueAt"] = nextEvent.dueAt.toISOString();
          }

          alert = await createAlertDirect({
            elderId,
            type: "medication_missed",
            severity: "info",
            payload: medPayload,
            actorUserId: jwt.id,
          });
          break;
        }

        case "inactivity": {
          alert = await createAlertDirect({
            elderId,
            type: "inactivity",
            severity: "warn",
            payload: { hoursSinceLastMotion: 2.5, demo: true },
            actorUserId: jwt.id,
          });
          break;
        }

        case "device_offline": {
          alert = await createAlertDirect({
            elderId,
            type: "device_offline",
            severity: "warn",
            payload: { deviceType: "wearable", minutesSinceLastHeartbeat: 12, demo: true },
            actorUserId: jwt.id,
          });
          break;
        }
      }

      return reply.status(201).send({ alert });
    }
  );
}

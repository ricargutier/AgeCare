import { FastifyInstance } from "fastify";
import prisma from "./db.js";
import { serializeMedicationEvent } from "./serializers.js";
import { requireAuth } from "./auth.js";
import type { Role, ConfirmMedicationRequest } from "../../shared/contracts/types.js";

export async function medicationRoutes(app: FastifyInstance) {
  // POST /medications/events/:id/confirm
  app.post<{ Params: { id: string }; Body: ConfirmMedicationRequest }>(
    "/medications/events/:id/confirm",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };

      // Only caregiver and elder allowed
      if (jwt.role !== "caregiver" && jwt.role !== "elder") {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Only caregivers and elders can confirm medications" },
        });
      }

      const event = await prisma.medicationEvent.findUnique({
        where: { id: req.params.id },
        include: { schedule: true },
      });

      if (!event) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Medication event not found" } });
      }

      // Role-based scoping: elder can only confirm their own
      if (jwt.role === "elder") {
        const elder = await prisma.elder.findUnique({ where: { userId: jwt.id } });
        if (!elder || elder.id !== event.schedule.elderId) {
          return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not authorized" } });
        }
      }

      // Caregiver — must be in CareCircle for this elder
      if (jwt.role === "caregiver") {
        const link = await prisma.careCircleMember.findFirst({
          where: { userId: jwt.id, elderId: event.schedule.elderId },
        });
        if (!link) {
          return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Not assigned to this elder" } });
        }
      }

      if (event.status === "taken") {
        return reply.status(409).send({ error: { code: "CONFLICT", message: "Event already confirmed" } });
      }

      const takenAt = req.body?.takenAt ? new Date(req.body.takenAt) : new Date();
      const source = jwt.role === "elder" ? "elder_button" : "caregiver";

      const updated = await prisma.medicationEvent.update({
        where: { id: event.id },
        data: {
          status: "taken",
          takenAt,
          confirmedBy: jwt.id,
          source,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorUserId: jwt.id,
          action: "medication.confirm",
          targetType: "medicationEvent",
          targetId: event.id,
          payload: { scheduleId: event.scheduleId, takenAt: takenAt.toISOString() },
        },
      });

      return reply.send(serializeMedicationEvent(updated));
    }
  );
}

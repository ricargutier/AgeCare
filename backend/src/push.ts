import { FastifyInstance } from "fastify";
import prisma from "./db.js";
import { requireAuth } from "./auth.js";
import { getVapidPublicKey } from "./web-push.js";
import type { PushSubscribeRequest, Role } from "../../shared/contracts/types.js";

export async function pushRoutes(app: FastifyInstance) {
  // GET /push/vapid-public-key
  app.get("/push/vapid-public-key", async (_req, reply) => {
    return reply.send({ publicKey: getVapidPublicKey() });
  });

  // POST /push/subscribe
  app.post<{ Body: PushSubscribeRequest }>(
    "/push/subscribe",
    { preHandler: requireAuth() },
    async (req, reply) => {
      const jwt = req.user as { id: string; role: Role };
      const { endpoint, expirationTime, keys } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return reply.status(400).send({
          error: { code: "VALIDATION", message: "endpoint and keys are required" },
        });
      }

      await prisma.pushSubscription.upsert({
        where: { userId_endpoint: { userId: jwt.id, endpoint } },
        update: {
          expirationTime: expirationTime ? BigInt(Math.floor(expirationTime)) : null,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        create: {
          userId: jwt.id,
          endpoint,
          expirationTime: expirationTime ? BigInt(Math.floor(expirationTime)) : null,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });

      return reply.status(201).send({ ok: true });
    }
  );
}

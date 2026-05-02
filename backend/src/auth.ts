import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import prisma from "./db.js";
import { serializeUser } from "./serializers.js";
import type { LoginRequest, LoginResponse, Role } from "../../shared/contracts/types.js";

// ─── RBAC helper ─────────────────────────────────────────────────────────────

export function requireRole(roles: Role[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Invalid or missing token" } });
    }
    const user = req.user as { id: string; role: Role };
    if (!roles.includes(user.role)) {
      return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
    }
  };
}

export function requireAuth() {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Invalid or missing token" } });
    }
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post<{ Body: LoginRequest }>("/auth/login", async (req, reply) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return reply.status(400).send({
        error: { code: "VALIDATION", message: "email and password are required" },
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
      });
    }

    const token = await reply.jwtSign({ id: user.id, role: user.role, email: user.email });

    const response: LoginResponse = {
      token,
      user: serializeUser(user),
    };

    return reply.send(response);
  });

  // GET /auth/me
  app.get("/auth/me", { preHandler: requireAuth() }, async (req, reply) => {
    const jwtUser = req.user as { id: string };
    const user = await prisma.user.findUnique({ where: { id: jwtUser.id } });
    if (!user) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "User not found" } });
    }
    return reply.send(serializeUser(user));
  });
}

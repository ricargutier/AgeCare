import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
const JWT_SECRET = process.env["JWT_SECRET"] ?? "dev-secret-do-not-use-in-prod";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "test" ? "silent" : "info",
    },
  });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  });

  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: "24h" },
  });

  await app.register(websocket);

  return app;
}

export { PORT };

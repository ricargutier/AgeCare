#!/usr/bin/env node
/**
 * wait-for-postgres.mjs
 * Polls localhost:5432 (or DATABASE_URL host/port) every 1s for up to 60s.
 * Exits 0 when the port is reachable, 1 with an error message otherwise.
 * No external dependencies — pure Node 20.
 */

import net from "net";

const MAX_WAIT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

function parseTarget() {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || "localhost",
        port: parseInt(parsed.port || "5432", 10),
      };
    } catch {
      // fall through to defaults
    }
  }
  return { host: "localhost", port: 5432 };
}

function tryConnect(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  const { host, port } = parseTarget();
  const deadline = Date.now() + MAX_WAIT_MS;
  let attempt = 0;

  console.log(`Waiting for Postgres at ${host}:${port} (up to ${MAX_WAIT_MS / 1000}s)...`);

  while (Date.now() < deadline) {
    attempt++;
    const ok = await tryConnect(host, port);
    if (ok) {
      console.log(`  Postgres is ready after ${attempt} attempt(s).`);
      process.exit(0);
    }
    process.stdout.write(`  Attempt ${attempt}: not ready yet, retrying in 1s...\r`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error(
    `\nERROR: Postgres at ${host}:${port} did not become reachable within ${MAX_WAIT_MS / 1000}s.\n` +
      "Troubleshooting tips:\n" +
      "  1. Make sure Docker is running:  docker info\n" +
      "  2. Start the database:           pnpm db:up\n" +
      "  3. Check container logs:         docker-compose logs postgres\n" +
      "  4. Verify port mapping:          docker-compose ps\n"
  );
  process.exit(1);
}

main();

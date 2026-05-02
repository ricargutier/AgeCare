#!/usr/bin/env node
/**
 * check-stack.mjs
 * Verifies prerequisites before running demo:setup.
 * Checks: Node 20+, pnpm installed, Docker running, ports 3000/5173/5174/5432 free.
 * Prints a checklist with red/green markers. No external deps.
 */

import { execSync } from "child_process";
import net from "net";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const pass = (label, detail = "") =>
  console.log(`  ${GREEN}[PASS]${RESET} ${label}${detail ? `  — ${detail}` : ""}`);

const fail = (label, detail = "") =>
  console.log(`  ${RED}[FAIL]${RESET} ${label}${detail ? `  — ${detail}` : ""}`);

function runSilent(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function checkNode() {
  const ver = process.version; // e.g. "v20.11.0"
  const major = parseInt(ver.slice(1), 10);
  if (major >= 20) {
    pass("Node 20+", ver);
    return true;
  }
  fail("Node 20+", `found ${ver} — install Node 20 via nvm: nvm install 20`);
  return false;
}

function checkPnpm() {
  const out = runSilent("pnpm --version");
  if (out) {
    const major = parseInt(out.split(".")[0], 10);
    if (major >= 8) {
      pass("pnpm 8+", `v${out}`);
      return true;
    }
    fail("pnpm 8+", `found v${out} — run: npm install -g pnpm@latest`);
    return false;
  }
  fail("pnpm installed", "not found — run: npm install -g pnpm");
  return false;
}

function checkDocker() {
  const out = runSilent("docker info --format '{{.ServerVersion}}'");
  if (out && !out.includes("ERROR") && !out.includes("Cannot")) {
    pass("Docker running", `server ${out}`);
    return true;
  }
  fail("Docker running", "Docker daemon not reachable — start Docker Desktop or dockerd");
  return false;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        fail(`Port ${port} free`, `port ${port} is already in use`);
        resolve(false);
      } else {
        // Other errors (EACCES on Linux for <1024) — treat as occupied
        fail(`Port ${port} free`, err.message);
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close(() => {
        pass(`Port ${port} free`);
        resolve(true);
      });
    });
    server.listen(port, "127.0.0.1");
  });
}

async function main() {
  console.log(`\n${BOLD}AgeCare — prerequisite check${RESET}\n`);

  const results = [];
  results.push(checkNode());
  results.push(checkPnpm());
  results.push(checkDocker());

  const REQUIRED_PORTS = [3000, 5173, 5174, 5432];
  for (const port of REQUIRED_PORTS) {
    results.push(await checkPort(port));
  }

  const allPassed = results.every(Boolean);
  console.log("");
  if (allPassed) {
    console.log(`${GREEN}${BOLD}All checks passed. Ready to run: pnpm demo:setup${RESET}\n`);
    process.exit(0);
  } else {
    const failed = results.filter((r) => !r).length;
    console.log(
      `${RED}${BOLD}${failed} check(s) failed. Fix the issues above before running demo:setup.${RESET}\n`
    );
    process.exit(1);
  }
}

main();

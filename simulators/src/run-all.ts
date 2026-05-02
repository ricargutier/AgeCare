/**
 * Run all 6 demo scenarios in sequence with a 5-second pause between each.
 * About 30 seconds total.
 *
 * Run: pnpm sim:all (from simulators/)
 */

import { spawn } from "node:child_process";

const SCENARIOS = [
  "fall",
  "sos",
  "vitals-anomaly",
  "medication-missed",
  "inactivity",
  "device-offline",
] as const;

const PAUSE_MS = 5_000;

function runScenario(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = `src/scenarios/${name}.ts`;
    const proc = spawn("tsx", [script], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

async function main(): Promise<void> {
  console.log(`[sim:all] Running ${SCENARIOS.length} scenarios in sequence`);
  console.log(`[sim:all] ${PAUSE_MS / 1000}s pause between each`);

  for (const [i, name] of SCENARIOS.entries()) {
    console.log(`\n──── [${i + 1}/${SCENARIOS.length}] ${name} ────`);
    try {
      await runScenario(name);
    } catch (err) {
      console.error(`[sim:all] ${name} failed:`, (err as Error).message);
    }
    if (i < SCENARIOS.length - 1) {
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  }

  console.log("\n[sim:all] All 6 scenarios fired. Check the dashboard.");
}

main().catch((err) => {
  console.error("[sim:all] Fatal:", err.message);
  process.exit(1);
});

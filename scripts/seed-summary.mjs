#!/usr/bin/env node
/**
 * seed-summary.mjs
 * Connects to Postgres after seeding and prints a table of seeded users,
 * the elder record, and devices to confirm the world is set up correctly.
 * Requires the `pg` devDependency (listed in root package.json).
 */

import pg from "pg";

const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL || "postgresql://agecare:agecare@localhost:5432/agecare";

function pad(str, len) {
  const s = String(str ?? "");
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function printTable(title, columns, rows) {
  const widths = columns.map((col, i) =>
    Math.max(col.length, ...rows.map((r) => String(r[i] ?? "").length))
  );
  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const header =
    "|" + columns.map((col, i) => " " + pad(col, widths[i]) + " ").join("|") + "|";

  console.log(`\n${title}`);
  console.log(sep);
  console.log(header);
  console.log(sep);
  for (const row of rows) {
    const line =
      "|" + row.map((cell, i) => " " + pad(cell, widths[i]) + " ").join("|") + "|";
    console.log(line);
  }
  console.log(sep);
}

async function main() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`Connected to: ${connectionString.replace(/:\/\/[^@]+@/, "://<credentials>@")}`);
  } catch (err) {
    console.error(
      `ERROR: Cannot connect to Postgres.\n  ${err.message}\n\n` +
        "Make sure you have run:\n  pnpm demo:setup\n"
    );
    process.exit(1);
  }

  try {
    // Users
    const usersRes = await client.query(
      `SELECT email, role, "displayName" FROM "User" ORDER BY role, email`
    );
    printTable("SEEDED USERS", ["email", "role", "displayName"], usersRes.rows.map((r) => [r.email, r.role, r.displayName]));

    // Elders
    const eldersRes = await client.query(
      `SELECT u.email, e.dob, e.conditions FROM "Elder" e JOIN "User" u ON u.id = e."userId"`
    );
    printTable(
      "SEEDED ELDERS",
      ["email", "dob", "conditions"],
      eldersRes.rows.map((r) => [r.email, r.dob, JSON.stringify(r.conditions)])
    );

    // Devices
    const devicesRes = await client.query(
      `SELECT u.email AS elder_email, d.type, d.serial, d."lastSeenAt"
       FROM "Device" d
       JOIN "Elder" e ON e.id = d."elderId"
       JOIN "User" u ON u.id = e."userId"
       ORDER BY u.email, d.type`
    );
    printTable(
      "SEEDED DEVICES",
      ["elder_email", "type", "serial", "lastSeenAt"],
      devicesRes.rows.map((r) => [r.elder_email, r.type, r.serial, r.lastSeenAt ?? "never"])
    );

    // Medication schedules
    const medsRes = await client.query(
      `SELECT u.email AS elder_email, m."drugName", m.dose, m."timesOfDay"
       FROM "MedicationSchedule" m
       JOIN "Elder" e ON e.id = m."elderId"
       JOIN "User" u ON u.id = e."userId"
       ORDER BY u.email`
    );
    if (medsRes.rows.length > 0) {
      printTable(
        "SEEDED MEDICATIONS",
        ["elder_email", "drugName", "dose", "timesOfDay"],
        medsRes.rows.map((r) => [r.elder_email, r.drugName, r.dose, JSON.stringify(r.timesOfDay)])
      );
    }

    console.log("\nSeed summary complete. The world is ready.\n");
  } catch (err) {
    console.error(`Query error: ${err.message}`);
    console.error("The schema may not be migrated yet. Run: pnpm db:migrate && pnpm db:seed");
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

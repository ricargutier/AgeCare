#!/usr/bin/env node
/**
 * seed-history.mjs
 * Backfills 7 days of realistic historical data for the AgeCare demo dashboard.
 *
 * What it does:
 *  - 672 vitals samples for Eleanor's wearable (one every 15 min, 7 days)
 *  - Updates past MedicationEvents: ~85% marked taken, rest missed
 *  - Inserts 3 historical alerts (vitals_anomaly, medication_missed, inactivity)
 *    with acknowledged/resolved timestamps, plus matching AuditLog rows
 *
 * Prerequisites: pnpm db:seed must have run first.
 * Idempotent: safe to run multiple times.
 *
 * No new dependencies — uses the `pg` devDependency in root package.json.
 */

import pg from "pg";

const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL || "postgresql://agecare:agecare@localhost:5432/agecare";

// ─── Gaussian noise helper ────────────────────────────────────────────────────
function gaussianNoise(stddev) {
  // Box-Muller transform
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stddev;
}

// ─── Heart rate model ─────────────────────────────────────────────────────────
// Returns a realistic heart rate for a given hour of the day (local hour, 0-23).
function heartRateForHour(hourOfDay) {
  if (hourOfDay >= 0 && hourOfDay < 6) {
    // Sleep dip: 50-60 bpm
    return 52 + Math.random() * 8;
  } else if (hourOfDay >= 6 && hourOfDay < 10) {
    // Morning ramp-up: 65-75 bpm
    return 65 + ((hourOfDay - 6) / 4) * 10 + Math.random() * 5;
  } else if (hourOfDay >= 10 && hourOfDay < 13) {
    // Mid-morning: 70-80 bpm
    return 70 + Math.random() * 10;
  } else if (hourOfDay >= 13 && hourOfDay < 16) {
    // Afternoon peak around 14:00: 95-105 bpm
    const peakOffset = Math.abs(hourOfDay - 14);
    return 100 - peakOffset * 5 + Math.random() * 10;
  } else if (hourOfDay >= 16 && hourOfDay < 20) {
    // Late afternoon: 75-85 bpm
    return 75 + Math.random() * 10;
  } else if (hourOfDay >= 20 && hourOfDay < 22) {
    // Evening wind-down: 68-78 bpm
    return 68 + Math.random() * 10;
  } else {
    // Late night: 60-70 bpm
    return 60 + Math.random() * 10;
  }
}

// ─── SpO2 model ────────────────────────────────────────────────────────────────
function spo2ForHour(hourOfDay) {
  // Baseline 97-99, occasional dip to 95-96 at night
  const base = hourOfDay < 6 ? 96 : 98;
  const noise = Math.random() < 0.05 ? -2 : Math.random() < 0.3 ? -1 : 0;
  return Math.max(95, Math.min(99, base + noise));
}

// ─── Steps model ─────────────────────────────────────────────────────────────
// Returns incremental steps for a 15-min window given hour of day
function stepsIncrement(hourOfDay) {
  if (hourOfDay >= 0 && hourOfDay < 6) {
    return Math.floor(Math.random() * 3); // 0-2 steps (sleep)
  } else if (hourOfDay >= 6 && hourOfDay < 8) {
    return Math.floor(20 + Math.random() * 30); // morning routine
  } else if (hourOfDay >= 8 && hourOfDay < 10) {
    return Math.floor(10 + Math.random() * 40); // breakfast/activity
  } else if (hourOfDay >= 10 && hourOfDay < 12) {
    return Math.floor(15 + Math.random() * 35); // mid-morning
  } else if (hourOfDay >= 12 && hourOfDay < 14) {
    return Math.floor(10 + Math.random() * 30); // lunch
  } else if (hourOfDay >= 14 && hourOfDay < 16) {
    return Math.floor(15 + Math.random() * 35); // afternoon activity
  } else if (hourOfDay >= 16 && hourOfDay < 18) {
    return Math.floor(10 + Math.random() * 40); // late afternoon
  } else if (hourOfDay >= 18 && hourOfDay < 20) {
    return Math.floor(5 + Math.random() * 20); // evening
  } else if (hourOfDay >= 20 && hourOfDay < 22) {
    return Math.floor(Math.random() * 10); // winding down
  } else {
    return Math.floor(Math.random() * 3); // night
  }
}

// ─── Battery model ────────────────────────────────────────────────────────────
// Drains ~1% per hour during day, charges overnight
function batteryPct(hourOfDay) {
  if (hourOfDay >= 0 && hourOfDay < 6) {
    // Charging overnight: 20% at midnight up to 95% by 06:00
    return Math.round(20 + (hourOfDay / 6) * 75);
  } else {
    // Starts at 95% at 6am, drains ~1%/hr, hits ~77% by 23:00
    // We model midnight (hour=0 equivalent) value as ~20%
    // Actually let's do: at hour 6 = 95%, drains to ~77% by 22:00, then ~20% at midnight
    const hoursElapsed = hourOfDay - 6;
    if (hoursElapsed <= 0) return 95;
    // 95% at hour 6 down to 20% by hour 24 (midnight), linear drain
    const drainPerHour = (95 - 20) / 18; // 18 hours of drain (6am to midnight)
    return Math.max(20, Math.round(95 - hoursElapsed * drainPerHour));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(
      `Connected to: ${connectionString.replace(/:\/\/[^@]+@/, "://<credentials>@")}`
    );
  } catch (err) {
    console.error(
      `ERROR: Cannot connect to Postgres.\n  ${err.message}\n\n` +
        "Make sure Postgres is running:  pnpm db:up\n"
    );
    process.exit(1);
  }

  try {
    // ── 1. Look up Eleanor's elder record ────────────────────────────────────
    const elderRes = await client.query(
      `SELECT e.id AS "elderId"
       FROM "Elder" e
       JOIN "User" u ON u.id = e."userId"
       WHERE u.email = $1`,
      ["eleanor@agecare.demo"]
    );

    if (elderRes.rows.length === 0) {
      console.error(
        'ERROR: Eleanor\'s elder record not found.\nRun `pnpm db:seed` first.'
      );
      process.exit(1);
    }

    const elderId = elderRes.rows[0].elderId;
    console.log(`Found elder: ${elderId}`);

    // ── 2. Look up the wearable device ───────────────────────────────────────
    const deviceRes = await client.query(
      `SELECT id FROM "Device" WHERE "elderId" = $1 AND type = 'wearable' LIMIT 1`,
      [elderId]
    );

    if (deviceRes.rows.length === 0) {
      console.error(
        "ERROR: No wearable device found for Eleanor.\nRun `pnpm db:seed` first."
      );
      process.exit(1);
    }

    const deviceId = deviceRes.rows[0].id;
    console.log(`Found wearable device: ${deviceId}`);

    // ── 3. Look up admin userId for audit logs ────────────────────────────────
    const adminRes = await client.query(
      `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
      ["admin@agecare.demo"]
    );
    const adminUserId = adminRes.rows.length > 0 ? adminRes.rows[0].id : null;

    // ── 4. Generate vitals samples (672 samples: 7 days × 96 per day) ─────────
    const SAMPLES_PER_DAY = 96; // 24h × 4 per hour
    const TOTAL_DAYS = 7;
    const TOTAL_SAMPLES = SAMPLES_PER_DAY * TOTAL_DAYS; // 672
    const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

    const now = new Date();
    // Start of window: 7 days ago, aligned to nearest 15-min boundary
    const windowStart = new Date(
      now.getTime() - TOTAL_DAYS * 24 * 60 * 60 * 1000
    );
    // Round down to nearest 15-min
    windowStart.setMinutes(
      Math.floor(windowStart.getMinutes() / 15) * 15,
      0,
      0
    );
    const windowEnd = new Date(windowStart.getTime() + TOTAL_SAMPLES * INTERVAL_MS);

    // Idempotency: delete existing samples in this window
    await client.query(
      `DELETE FROM "VitalsSample"
       WHERE "elderId" = $1 AND "deviceId" = $2 AND ts >= $3 AND ts < $4`,
      [elderId, deviceId, windowStart, windowEnd]
    );
    console.log("Cleared existing vitals in window, inserting fresh samples...");

    // Build samples array (oldest first, ts increments forward)
    const samples = [];
    // Track daily cumulative steps per day-of-window (key = dayIndex)
    const dailySteps = {};

    for (let i = 0; i < TOTAL_SAMPLES; i++) {
      const ts = new Date(windowStart.getTime() + i * INTERVAL_MS);
      const hourOfDay = ts.getHours(); // local hour

      // Day index for step accumulation (UTC date string)
      const dayKey = ts.toISOString().split("T")[0];
      if (dailySteps[dayKey] === undefined) {
        dailySteps[dayKey] = 0;
      }

      const hrBase = heartRateForHour(hourOfDay);
      const hr = Math.max(45, Math.min(130, hrBase + gaussianNoise(3)));

      const spo2 = spo2ForHour(hourOfDay);
      const stepInc = stepsIncrement(hourOfDay);
      dailySteps[dayKey] += stepInc;
      const cumulativeSteps = dailySteps[dayKey];

      const battery = batteryPct(hourOfDay);

      samples.push([ts, Math.round(hr * 10) / 10, spo2, cumulativeSteps, battery]);
    }

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    let inserted = 0;
    for (let start = 0; start < samples.length; start += BATCH_SIZE) {
      const batch = samples.slice(start, start + BATCH_SIZE);
      // Build parameterized VALUES clause
      const valueClauses = [];
      const params = [];
      let paramIdx = 1;

      for (const [ts, hr, spo2, steps, battery] of batch) {
        valueClauses.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
        );
        params.push(
          crypto.randomUUID(), // id
          elderId,
          deviceId,
          ts,
          hr,
          spo2,
          steps,
          battery
        );
      }

      await client.query(
        `INSERT INTO "VitalsSample" (id, "elderId", "deviceId", ts, "heartRate", spo2, steps, "batteryPct")
         VALUES ${valueClauses.join(", ")}`,
        params
      );
      inserted += batch.length;
    }

    console.log(`Inserted ${inserted} vitals samples.`);

    // ── 5. Update past medication events ────────────────────────────────────
    // Find all pending events with dueAt < now
    const pendingEventsRes = await client.query(
      `SELECT me.id, me."dueAt"
       FROM "MedicationEvent" me
       JOIN "MedicationSchedule" ms ON ms.id = me."scheduleId"
       WHERE ms."elderId" = $1
         AND me."dueAt" < NOW()
         AND me.status = 'pending'`,
      [elderId]
    );

    let medTaken = 0;
    let medMissed = 0;

    for (const event of pendingEventsRes.rows) {
      if (Math.random() < 0.85) {
        // Mark as taken: takenAt = dueAt + random(0..30) minutes
        const delayMs = Math.floor(Math.random() * 30 * 60 * 1000);
        const takenAt = new Date(new Date(event.dueAt).getTime() + delayMs);
        await client.query(
          `UPDATE "MedicationEvent"
           SET status = 'taken', "takenAt" = $1, source = 'caregiver'
           WHERE id = $2`,
          [takenAt, event.id]
        );
        medTaken++;
      } else {
        await client.query(
          `UPDATE "MedicationEvent" SET status = 'missed' WHERE id = $1`,
          [event.id]
        );
        medMissed++;
      }
    }

    console.log(
      `Updated medication events: ${medTaken} taken, ${medMissed} missed.`
    );

    // ── 6. Insert historical alerts ──────────────────────────────────────────
    const FOUR_DAYS_AGO = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    const TWO_DAYS_AGO = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const ONE_DAY_AGO = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const alertDefs = [
      {
        type: "vitals_anomaly",
        severity: "warn",
        createdAt: FOUR_DAYS_AGO,
        acknowledgedAt: new Date(FOUR_DAYS_AGO.getTime() + 5 * 60 * 1000),
        resolvedAt: new Date(FOUR_DAYS_AGO.getTime() + 30 * 60 * 1000),
        payload: { heartRate: 165, sustainedMs: 90000 },
      },
      {
        type: "medication_missed",
        severity: "info",
        createdAt: TWO_DAYS_AGO,
        acknowledgedAt: new Date(TWO_DAYS_AGO.getTime() + 10 * 60 * 1000),
        resolvedAt: new Date(TWO_DAYS_AGO.getTime() + 60 * 60 * 1000),
        payload: { drugName: "Lisinopril", scheduledAt: TWO_DAYS_AGO.toISOString() },
      },
      {
        type: "inactivity",
        severity: "warn",
        createdAt: ONE_DAY_AGO,
        acknowledgedAt: new Date(ONE_DAY_AGO.getTime() + 15 * 60 * 1000),
        resolvedAt: new Date(ONE_DAY_AGO.getTime() + 45 * 60 * 1000),
        payload: { inactiveSinceMs: 6 * 60 * 60 * 1000, lastMotionAt: ONE_DAY_AGO.toISOString() },
      },
    ];

    let alertsInserted = 0;

    for (const alertDef of alertDefs) {
      // Idempotency: skip if alert with same (elderId, type, createdAt) exists
      const existingRes = await client.query(
        `SELECT id FROM "Alert"
         WHERE "elderId" = $1 AND type = $2 AND "createdAt" = $3
         LIMIT 1`,
        [elderId, alertDef.type, alertDef.createdAt]
      );

      if (existingRes.rows.length > 0) {
        console.log(`  Skipping existing alert: ${alertDef.type} (already seeded)`);
        continue;
      }

      const alertId = crypto.randomUUID();

      await client.query(
        `INSERT INTO "Alert"
           (id, "elderId", type, severity, status, "createdAt",
            "acknowledgedAt", "acknowledgedBy", "resolvedAt", payload)
         VALUES ($1, $2, $3, $4, 'resolved', $5, $6, $7, $8, $9)`,
        [
          alertId,
          elderId,
          alertDef.type,
          alertDef.severity,
          alertDef.createdAt,
          alertDef.acknowledgedAt,
          adminUserId,
          alertDef.resolvedAt,
          JSON.stringify(alertDef.payload),
        ]
      );

      // AuditLog: alert.create (system, actorUserId=NULL)
      await client.query(
        `INSERT INTO "AuditLog" (id, "actorUserId", action, "targetType", "targetId", ts, payload)
         VALUES ($1, NULL, 'alert.create', 'Alert', $2, $3, $4)`,
        [
          crypto.randomUUID(),
          alertId,
          alertDef.createdAt,
          JSON.stringify({ type: alertDef.type, severity: alertDef.severity }),
        ]
      );

      // AuditLog: alert.acknowledge (admin user)
      await client.query(
        `INSERT INTO "AuditLog" (id, "actorUserId", action, "targetType", "targetId", ts, payload)
         VALUES ($1, $2, 'alert.acknowledge', 'Alert', $3, $4, $5)`,
        [
          crypto.randomUUID(),
          adminUserId,
          alertId,
          alertDef.acknowledgedAt,
          JSON.stringify({ type: alertDef.type }),
        ]
      );

      alertsInserted++;
    }

    console.log(`Inserted ${alertsInserted} historical alerts (with audit log rows).`);

    // ── 7. Summary ───────────────────────────────────────────────────────────
    const totalMedUpdated = medTaken + medMissed;
    console.log(
      `\nSeeded ${TOTAL_SAMPLES} vitals samples, ${totalMedUpdated} medication events updated, ${alertsInserted} historical alerts.` +
        "\nRun `pnpm dev:web` and open the elder detail Vitals tab."
    );
  } catch (err) {
    console.error(`\nERROR during seeding: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

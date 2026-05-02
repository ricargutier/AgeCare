# seed-history.mjs

Backfills 7 days of realistic historical demo data for Eleanor's elder profile so the web portal's Vitals chart and audit log have meaningful content when the dashboard is first opened.

Run this after `pnpm db:seed` and before starting the dev servers (`pnpm dev:web`); the script is idempotent and safe to re-run — it deletes and re-inserts vitals samples for the covered window, and skips alerts that already exist.

It inserts 672 vitals samples (one per 15 minutes) for Eleanor's wearable device with a realistic daily heart-rate curve, SpO2, cumulative step counts, and a battery drain/charge cycle; marks ~85% of past pending medication events as `taken` (the rest as `missed`); and creates 3 resolved historical alerts (vitals_anomaly, medication_missed, inactivity) each with two matching AuditLog rows.

To undo all seeded history, connect to Postgres and run: `DELETE FROM "VitalsSample" WHERE "elderId" = '<eleanor-elder-id>';`, `UPDATE "MedicationEvent" SET status='pending', "takenAt"=NULL, source=NULL WHERE status IN ('taken','missed');`, and delete the three historical alerts and their audit log rows by createdAt timestamps.

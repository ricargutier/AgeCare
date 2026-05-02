/**
 * Medication-missed scenario — exits without sending a medication_taken event.
 *
 * The backend seeds a MedicationSchedule for Eleanor with a dose due at a
 * known time. When that dueAt time passes its grace window (typically 30min)
 * without a medication_taken frame or a caregiver confirmation, the backend's
 * periodic check marks the MedicationEvent as "missed" and creates an
 * Alert(type=medication_missed, severity=info).
 *
 * This simulator simply does nothing — it relies entirely on the backend's
 * grace-window rule.
 *
 * Run: pnpm sim:medication-missed  (from simulators/)
 */

export {};

async function main(): Promise<void> {
  console.log(
    "[sim:medication-missed] Not sending medication_taken." +
      " Backend will mark schedules as missed past their grace window."
  );
  console.log(
    "[sim:medication-missed] Expect Alert(type=medication_missed, severity=info)" +
      " after the medication's grace window elapses (default: 30min past dueAt)."
  );
  console.log(
    "[sim:medication-missed] NOTE: In a real demo, seed the medication dueAt to" +
      " 30+ minutes ago so the alert fires immediately on the next backend check."
  );

  await new Promise((r) => setTimeout(r, 200));
}

main().catch((err) => {
  console.error("[sim:medication-missed] Fatal:", err);
  process.exit(1);
});

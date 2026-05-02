/**
 * Inactivity scenario — stops sending motion events and exits immediately.
 *
 * The backend's inactivity detection rule fires when no motion events are
 * received from a motion_sensor device for a configured window (typically 2h
 * during 06:00–22:00 daytime hours). The backend's interval check runs every
 * 5 minutes. This simulator simply stops sending motion events so the backend
 * rule can fire on its own schedule.
 *
 * Run: pnpm sim:inactivity  (from simulators/)
 */

export {};

async function main(): Promise<void> {
  console.log(
    "[sim:inactivity] Stopping motion heartbeats — backend should detect inactivity in ~2h." +
      " Backend's interval check runs every 5min."
  );
  console.log(
    "[sim:inactivity] Expect Alert(type=inactivity, severity=warn) after the backend's" +
      " inactivity window (2h without motion during daytime) elapses."
  );
  console.log(
    "[sim:inactivity] NOTE: In a real demo, either shorten the backend's inactivity window" +
      " or pre-populate lastMotionAt to a time 2h ago in the DB to trigger immediately."
  );

  // Brief sleep to give the console output time to flush before exit
  await new Promise((r) => setTimeout(r, 200));
}

main().catch((err) => {
  console.error("[sim:inactivity] Fatal:", err);
  process.exit(1);
});

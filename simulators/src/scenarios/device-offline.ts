/**
 * Device-offline scenario — exits without sending heartbeats.
 *
 * The backend marks a device offline and creates an Alert(type=device_offline,
 * severity=warn) when no heartbeat has been received for >10 minutes (the
 * backend's heartbeat-absence check runs periodically).
 *
 * This simulator simply stops sending heartbeats and exits. If the heartbeat
 * simulator (pnpm dev) is running, stop it first.
 *
 * Run: pnpm sim:device-offline  (from simulators/)
 */

export {};

async function main(): Promise<void> {
  console.log(
    "[sim:device-offline] Not sending heartbeats." +
      " Backend's 10min absence check will fire device_offline alert."
  );
  console.log(
    "[sim:device-offline] Expect Alert(type=device_offline, severity=warn)" +
      " approximately 10 minutes after the last heartbeat was received by the backend."
  );
  console.log(
    "[sim:device-offline] TIP: Stop 'pnpm dev' first if it is running, so no other" +
      " process is sending heartbeats for wearable-eleanor."
  );

  await new Promise((r) => setTimeout(r, 200));
}

main().catch((err) => {
  console.error("[sim:device-offline] Fatal:", err);
  process.exit(1);
});

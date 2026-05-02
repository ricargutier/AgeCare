# AgeCare Simulators

Node 20 + TypeScript ESM scripts that publish fake device events to the backend
WebSocket ingest endpoint. **This is the primary driver for demo scenarios.**

## Quick start

```bash
cd simulators
pnpm install
pnpm dev           # continuous heartbeat — shows "devices online" without alerts
```

Then in separate terminals:

```bash
pnpm sim:fall
pnpm sim:sos
pnpm sim:vitals-anomaly
pnpm sim:inactivity
pnpm sim:medication-missed
pnpm sim:device-offline
```

Set `BACKEND_URL` to override the default `ws://localhost:3000`:

```bash
BACKEND_URL=ws://192.168.1.5:3000 pnpm dev
```

---

## Scenarios

### `pnpm dev` — continuous heartbeat

Sends a `heartbeat` frame from every seeded device every **30 seconds**.
Sends realistic `vitals` from the wearable every **60 seconds**
(HR ~70±5 bpm, SpO2 99±1 %, cumulative steps).
Sends occasional `motion` events from the living-room sensor between 06:00–22:00.

**Expected result:** all devices show "online" in the dashboard; vitals chart
updates steadily. No alerts fire (values are normal).

---

### `pnpm sim:fall`

Sends **one** `fall` frame from the wearable with `gForce: 4.2`.

| Field | Value |
|---|---|
| Frame type | `fall` |
| gForce | 4.2 |
| orientation | `face_down` |

**Expected backend response:** `Alert(type=fall, severity=critical)` created
immediately and pushed via `/ws/client` to all connected dashboards.

**Latency expectation:** < 1 second from frame send to alert appearance in
both web portal and mobile app.

---

### `pnpm sim:sos`

Sends **one** `sos` frame from the wearable.

**Expected backend response:** `Alert(type=sos, severity=critical)` created
immediately.

**Latency expectation:** < 1 second.

---

### `pnpm sim:vitals-anomaly`

Sends `vitals` frames with **HR 165 bpm** every 5 seconds for 90 seconds
(18 frames total).

**Expected backend response:** After 2–3 consecutive anomalous readings
(≥15s), `Alert(type=vitals_anomaly, severity=warn)` is created and pushed to
dashboards.

**Latency expectation:** Alert visible within ~15 seconds of first frame.

---

### `pnpm sim:inactivity`

Prints a message and exits. Does **not** send motion events.

The backend's inactivity rule fires when no `motion` frames are received from
`motion-living-eleanor` for 2 hours during daytime (06:00–22:00). The backend
interval check runs every 5 minutes.

**Expected backend response:** `Alert(type=inactivity, severity=warn)` after
the 2-hour window passes.

**Demo tip:** To trigger immediately in a demo, manually update
`Device.lastSeenAt` for `motion-living-eleanor` to `now() - interval '2 hours'`
in Postgres, then wait for the next 5-minute check.

---

### `pnpm sim:medication-missed`

Prints a message and exits. Does **not** send a `medication_taken` frame.

The backend seeds a `MedicationSchedule` for Eleanor. When the `dueAt` time
passes its grace window (30 minutes) without confirmation, the backend marks
the event "missed" and creates an alert.

**Expected backend response:** `Alert(type=medication_missed, severity=info)`.

**Demo tip:** Seed the medication `dueAt` to 30+ minutes ago so the alert
fires on the next backend check cycle.

---

### `pnpm sim:device-offline`

Prints a message and exits. Does **not** send heartbeats.

The backend's heartbeat-absence check fires when `Device.lastSeenAt` is more
than 10 minutes old.

**Expected backend response:** `Alert(type=device_offline, severity=warn)`
approximately 10 minutes after the last heartbeat.

**Demo tip:** Stop `pnpm dev` first so no other process keeps the device alive.
To trigger immediately, set `Device.lastSeenAt` to `now() - interval '15 minutes'`
in Postgres and wait for the next check.

---

## Device tokens

Tokens are defined in `src/lib/devices.ts`. The backend **must** seed these
exact values:

| Device ID | Token |
|---|---|
| `wearable-eleanor` | `wearable-token-eleanor` |
| `hub-eleanor` | `hub-token-eleanor` |
| `motion-living-eleanor` | `motion-living-token-eleanor` |
| `door-front-eleanor` | `door-front-token-eleanor` |

See the `CONTRACT-CHANGE-REQUEST` comment at the top of `src/lib/devices.ts`.

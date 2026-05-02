# AgeCare Hub Firmware

Documentation-grade Go 1.22 BLE-to-WebSocket bridge for the AgeCare home hub device.

**Target:** Linux ARM (e.g. Raspberry Pi 4)
**Runtime:** Go 1.22 single binary, stdlib only

This firmware is **never deployed to real hardware and never BLE-paired**.
It exists to demonstrate the hub architecture described in
[TECHNICAL_ARCHITECTURE.md §2.2](../../docs/TECHNICAL_ARCHITECTURE.md).

## What this implements

| File | Description |
|---|---|
| `main.go` | Main binary: connects to backend `/ws/ingest`, runs BLE stub loop, sends one heartbeat/minute, drains ring buffer on reconnect; handles SIGINT with 5 s drain timeout |
| `buffer.go` | 1000-entry in-memory ring buffer (`RingBuffer`) for offline resilience; drops oldest when full; concurrent-safe |
| `ble.go` | BLE stubs: `ScanForWearable()` and `Subscribe(deviceID)` log `// TODO: real BlueZ integration` |

## What this intentionally does NOT do

- No real BLE pairing or device discovery (no BlueZ / D-Bus calls)
- No Zigbee, Z-Wave, or Thread protocol support
- No persistent on-disk buffering (ring buffer is in-memory only)
- No TLS / WSS (prototype uses plain `ws://`)
- No OTA update mechanism

## How to build and run

Requires Go 1.22+:

```bash
cd firmware/hub
make          # builds bin/hub
make run      # builds and runs
make clean    # removes bin/
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `ws://localhost:3000` | WebSocket URL of the AgeCare backend |
| `HUB_TOKEN` | `hub-token-eleanor` | Device token authenticated by the backend |

```bash
BACKEND_URL=ws://192.168.1.10:3000 make run
```

### Graceful shutdown

Send SIGINT (Ctrl+C) or SIGTERM. The hub drains remaining buffered frames
with a 5-second timeout before exiting.

## Architecture reference

See [TECHNICAL_ARCHITECTURE.md §2.2](../../docs/TECHNICAL_ARCHITECTURE.md)
for the hub hardware selection, BLE scanning, and cloud connectivity design.

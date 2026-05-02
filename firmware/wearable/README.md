# AgeCare Wearable Firmware

Documentation-grade bare-C firmware for the AgeCare wrist-worn device.

**Target:** ARM Cortex-M33 (e.g. Nordic nRF5340)
**Toolchain:** `arm-none-eabi-gcc`

This firmware is **never flashed, never deployed, and never BLE-paired**. It
exists solely to demonstrate the embedded architecture described in
[TECHNICAL_ARCHITECTURE.md §2.1](../../docs/TECHNICAL_ARCHITECTURE.md).

## What this implements

| File | Description |
|---|---|
| `src/main.c` | Main loop + ISR skeleton: polls IMU at 100 Hz, samples HR every 1 s, BLE broadcast every 5 s, reads SOS button |
| `src/fall_detection.c/.h` | State-machine fall detector: g-force spike (>3.5 g) + 1.5 s post-impact stillness |
| `src/sos.c/.h` | Capacitive button with 3-second debounced long-press detection |
| `src/ble.c/.h` | BLE GATT stubs (`ble_init`, `ble_send_event`, `ble_send_vitals`); bodies are `// TODO` only |
| `src/types.h` | C structs mirroring the wearable's IngestFrame variants (`FallEvent`, `SosEvent`, `VitalsSample`) |

## What this intentionally does NOT do

- No real BLE GATT implementation (Nordic SoftDevice, Zephyr BT, etc.)
- No HAL / hardware register access (IMU, HR sensor, battery ADC, GPIO)
- No RTOS (single-threaded main loop + ISR — by design)
- No linker script / startup code (not linkable to a real flash image)
- No BLE pairing or device provisioning
- Never produces a flashable binary for real hardware

## How to compile (host check only)

Requires `arm-none-eabi-gcc` in PATH (e.g. from
[Arm GNU Toolchain](https://developer.arm.com/tools-and-software/open-source-software/developer-tools/gnu-toolchain)):

```bash
cd firmware/wearable
make
```

If the toolchain is not installed, `make` prints:

```
Skipping firmware build: arm-none-eabi-gcc not installed.
This is expected on dev machines without the embedded toolchain.
```

and exits with code 0 (so CI does not fail).

```bash
make clean   # remove build/
make flash   # prints "Not implemented in prototype"
```

## Architecture reference

See [TECHNICAL_ARCHITECTURE.md §2.1](../../docs/TECHNICAL_ARCHITECTURE.md)
for the wearable hardware selection rationale, BLE GATT service design, and
data flow to the hub.

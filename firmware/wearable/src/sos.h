/**
 * sos.h — Capacitive SOS button driver with 3-second long-press detection.
 *
 * The button state is read in the main loop via sos_tick(). A press is
 * considered intentional only after the button has been held for
 * SOS_HOLD_TICKS consecutive ticks (debounced).
 */

#pragma once

#include <stdint.h>
#include "types.h"

/** Number of consecutive ticks (~10 ms each) required to confirm a long press.
 *  3 seconds / 10 ms = 300 ticks. */
#define SOS_HOLD_TICKS 300U

/**
 * Global flag set when a confirmed SOS long-press is detected.
 * Read and clear from main() after queuing the BLE event.
 */
extern volatile uint8_t sos_triggered;

/** Last SOS event (valid only when sos_triggered != 0). */
extern SosEvent last_sos_event;

/**
 * Call this function from the main loop at ~100 Hz (or at the same rate the
 * button GPIO is sampled).
 *
 * @param button_pressed  1 if the capacitive button is currently touched, 0 otherwise.
 * @param timestamp_ms    Current time in milliseconds since boot.
 */
void sos_tick(uint8_t button_pressed, uint32_t timestamp_ms);

/** Reset after the SOS event has been consumed. */
void sos_reset(void);

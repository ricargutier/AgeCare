/**
 * fall_detection.h — Simple fall detection state machine.
 *
 * Algorithm:
 *   1. IMU ISR calls fall_detection_tick() at 100 Hz.
 *   2. If resultant acceleration > FALL_GFORCE_THRESHOLD (3.5 g), enter
 *      IMPACT state and start a 1.5 s post-impact window.
 *   3. If acceleration remains < LOW_MOTION_THRESHOLD throughout the window,
 *      transition to FALLEN and set the global fall_detected flag.
 *   4. main() reads fall_detected, clears it, and queues a FallEvent for BLE.
 */

#pragma once

#include <stdint.h>
#include "types.h"

/** Threshold in g-units to detect an impact. */
#define FALL_GFORCE_THRESHOLD  3.5f

/** Maximum g-force considered "low motion" during post-impact window. */
#define FALL_LOW_MOTION_THRESHOLD 0.5f

/** Duration of post-impact window in 100 Hz ticks (1.5 s × 100 = 150). */
#define FALL_POST_IMPACT_TICKS 150U

typedef enum {
    FALL_STATE_IDLE,   /**< Normal operation */
    FALL_STATE_IMPACT, /**< Impact detected; monitoring post-impact motion */
    FALL_STATE_FALLEN, /**< Fall confirmed; waiting for main() to read flag */
} FallState;

/**
 * Global flag set by fall_detection_tick() when a fall is confirmed.
 * Read and clear from main() after each 5 s BLE broadcast cycle.
 */
extern volatile uint8_t fall_detected;

/** Last confirmed fall event (valid only when fall_detected != 0). */
extern FallEvent last_fall_event;

/**
 * Call this function from the IMU ISR at 100 Hz.
 *
 * @param ax_g  Acceleration X in g-units.
 * @param ay_g  Acceleration Y in g-units.
 * @param az_g  Acceleration Z in g-units.
 * @param timestamp_ms  Current time in milliseconds since boot.
 */
void fall_detection_tick(float ax_g, float ay_g, float az_g,
                         uint32_t timestamp_ms);

/** Reset the state machine (e.g., after reading the fall event). */
void fall_detection_reset(void);

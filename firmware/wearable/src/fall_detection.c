/**
 * fall_detection.c — Simple g-force + post-impact stillness fall detector.
 *
 * State machine:
 *   IDLE   → IMPACT when resultant g-force exceeds FALL_GFORCE_THRESHOLD
 *   IMPACT → IDLE   if motion recovers (g-force > LOW_MOTION_THRESHOLD)
 *            within FALL_POST_IMPACT_TICKS
 *   IMPACT → FALLEN if the device stays still for the full post-impact window
 *   FALLEN → IDLE   when fall_detection_reset() is called by main()
 */

#include "fall_detection.h"
#include <math.h>

volatile uint8_t fall_detected = 0;
FallEvent last_fall_event = {0};

static FallState  state              = FALL_STATE_IDLE;
static uint32_t   post_impact_ticks  = 0;
static float      peak_g             = 0.0f;
static uint32_t   impact_timestamp   = 0;

void fall_detection_tick(float ax_g, float ay_g, float az_g,
                         uint32_t timestamp_ms)
{
    float resultant = sqrtf(ax_g * ax_g + ay_g * ay_g + az_g * az_g);

    switch (state) {
    case FALL_STATE_IDLE:
        if (resultant > FALL_GFORCE_THRESHOLD) {
            state             = FALL_STATE_IMPACT;
            post_impact_ticks = 0;
            peak_g            = resultant;
            impact_timestamp  = timestamp_ms;
        }
        break;

    case FALL_STATE_IMPACT:
        if (resultant > peak_g) {
            peak_g = resultant;
        }

        if (resultant > FALL_LOW_MOTION_THRESHOLD) {
            /* Subject is moving — not a fall; reset */
            state = FALL_STATE_IDLE;
            break;
        }

        post_impact_ticks++;
        if (post_impact_ticks >= FALL_POST_IMPACT_TICKS) {
            /* Confirmed: high-g impact followed by stillness for 1.5 s */
            state = FALL_STATE_FALLEN;

            last_fall_event.timestamp_ms = impact_timestamp;
            last_fall_event.g_force      = peak_g;
            /* Orientation detection not implemented; set to unknown */
            last_fall_event.orientation  = 0;

            fall_detected = 1;
        }
        break;

    case FALL_STATE_FALLEN:
        /* Wait for main() to call fall_detection_reset() */
        (void)timestamp_ms;
        break;
    }
}

void fall_detection_reset(void)
{
    fall_detected = 0;
    state         = FALL_STATE_IDLE;
    post_impact_ticks = 0;
    peak_g        = 0.0f;
}

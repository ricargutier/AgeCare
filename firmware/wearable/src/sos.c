/**
 * sos.c — Capacitive SOS button with 3-second long-press detection.
 *
 * Debounce: the raw button reading must be stable (consistently 1 or 0) for
 * DEBOUNCE_TICKS consecutive ticks before being accepted as a state change.
 * Long-press: once a stable press is confirmed, we count further ticks up to
 * SOS_HOLD_TICKS; if the button is held for the full duration, sos_triggered
 * is set.
 */

#include "sos.h"

#define DEBOUNCE_TICKS 5U   /**< ~50 ms debounce at 100 Hz polling */

volatile uint8_t sos_triggered = 0;
SosEvent last_sos_event = {0};

static uint8_t  last_stable    = 0;
static uint8_t  candidate      = 0;
static uint32_t debounce_count = 0;
static uint32_t hold_count     = 0;

void sos_tick(uint8_t button_pressed, uint32_t timestamp_ms)
{
    if (sos_triggered) {
        /* Wait for reset; ignore new input */
        return;
    }

    /* ── Debounce ── */
    if (button_pressed == candidate) {
        debounce_count++;
        if (debounce_count >= DEBOUNCE_TICKS) {
            /* Stable reading accepted */
            if (candidate != last_stable) {
                last_stable    = candidate;
                debounce_count = 0;
                if (last_stable == 0) {
                    /* Released before SOS_HOLD_TICKS — not a long press */
                    hold_count = 0;
                }
            }
        }
    } else {
        candidate      = button_pressed;
        debounce_count = 0;
    }

    /* ── Long-press counting ── */
    if (last_stable == 1) {
        hold_count++;
        if (hold_count >= SOS_HOLD_TICKS) {
            /* Confirmed long press */
            last_sos_event.timestamp_ms = timestamp_ms;
            sos_triggered               = 1;
        }
    }
}

void sos_reset(void)
{
    sos_triggered  = 0;
    hold_count     = 0;
    last_stable    = 0;
    debounce_count = 0;
}

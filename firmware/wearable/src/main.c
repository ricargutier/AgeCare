/**
 * main.c — AgeCare wearable firmware entry point.
 *
 * Target: ARM Cortex-M33 (e.g. Nordic nRF5340)
 * Toolchain: arm-none-eabi-gcc
 *
 * Architecture:
 *   - IMU interrupt fires at 100 Hz → ISR calls fall_detection_tick()
 *   - Main loop at ~100 Hz: reads SOS button, accumulates heart-rate samples
 *   - Every 5 seconds: broadcasts pending events + latest vitals over BLE
 *
 * NOTE: This firmware is documentation-grade only. It is not flashed to
 * hardware and does not use a real HAL, RTOS, or BLE stack.
 * See firmware/wearable/README.md for build instructions.
 */

#include <stdint.h>
#include <string.h>

#include "fall_detection.h"
#include "sos.h"
#include "ble.h"
#include "types.h"

/* ─── Platform stubs ──────────────────────────────────────────────────────── */

/**
 * Returns the current time in milliseconds since boot.
 * Real implementation reads a hardware timer peripheral (e.g. SysTick + RTC).
 */
static uint32_t hal_now_ms(void)
{
    /* TODO: return SysTick-derived millisecond counter */
    return 0;
}

/**
 * Read the latest IMU sample (raw acceleration in g-units).
 * Real implementation reads from the IMU over SPI/I2C.
 */
static void hal_imu_read(float *ax_g, float *ay_g, float *az_g)
{
    /* TODO: read from IMU (e.g. LSM6DSO via SPI) */
    *ax_g = 0.0f;
    *ay_g = 0.0f;
    *az_g = 1.0f;  /* Gravity at rest */
}

/**
 * Read the current state of the capacitive SOS button.
 * Returns 1 if pressed, 0 otherwise.
 */
static uint8_t hal_button_read(void)
{
    /* TODO: read GPIO pin connected to capacitive sensor */
    return 0;
}

/**
 * Sample heart rate and SpO2 from the optical sensor.
 * Real implementation reads from MAX30102 or similar over I2C.
 */
static void hal_hr_read(uint16_t *hr_bpm, uint8_t *spo2_pct)
{
    /* TODO: read from optical HR sensor (e.g. MAX30102 via I2C) */
    *hr_bpm  = 70;
    *spo2_pct = 98;
}

/** Returns the battery level as a percentage (0–100). */
static uint8_t hal_battery_read(void)
{
    /* TODO: read ADC channel connected to battery divider */
    return 80;
}

/** Busy-wait for approximately 10 milliseconds. */
static void hal_delay_10ms(void)
{
    /* TODO: use a hardware timer or SysTick to sleep 10 ms */
    volatile uint32_t i;
    for (i = 0; i < 100000UL; i++) {
        __asm("nop");
    }
}

/* ─── Globals ─────────────────────────────────────────────────────────────── */

/* HR sampling: accumulate readings each second, broadcast every 5 s */
#define HR_SAMPLE_INTERVAL_TICKS   100U  /* 100 ticks × 10 ms = 1 s   */
#define BLE_BROADCAST_INTERVAL_TICKS 500U /* 500 ticks × 10 ms = 5 s  */

static uint16_t hr_accumulator    = 0;
static uint8_t  hr_sample_count   = 0;
static uint32_t steps_today       = 0;
static uint32_t tick_count        = 0;

/* ─── IMU ISR ──────────────────────────────────────────────────────────────
 * In real hardware this function would be registered as the EXTI (external
 * interrupt) handler for the IMU data-ready pin.
 */
void IMU_IRQHandler(void)  /* __attribute__((interrupt)) in real code */
{
    float ax, ay, az;
    hal_imu_read(&ax, &ay, &az);
    fall_detection_tick(ax, ay, az, hal_now_ms());
}

/* ─── Main loop ───────────────────────────────────────────────────────────── */

int main(void)
{
    ble_init();

    for (;;) {
        uint32_t now = hal_now_ms();

        /* ── SOS button check (every tick at ~100 Hz) ── */
        uint8_t btn = hal_button_read();
        sos_tick(btn, now);

        if (sos_triggered) {
            ble_send_event('S', &last_sos_event, sizeof(SosEvent));
            sos_reset();
        }

        /* ── Fall detection result ── */
        if (fall_detected) {
            ble_send_event('F', &last_fall_event, sizeof(FallEvent));
            fall_detection_reset();
        }

        /* ── Heart-rate sampling every 1 s ── */
        if ((tick_count % HR_SAMPLE_INTERVAL_TICKS) == 0) {
            uint16_t hr  = 0;
            uint8_t  spo2 = 0;
            hal_hr_read(&hr, &spo2);
            hr_accumulator  += hr;
            hr_sample_count += 1;
        }

        /* ── BLE broadcast every 5 s ── */
        if ((tick_count % BLE_BROADCAST_INTERVAL_TICKS) == 0 && tick_count > 0) {
            VitalsSample sample;
            memset(&sample, 0, sizeof(sample));
            sample.timestamp_ms  = now;
            sample.heart_rate_bpm =
                (hr_sample_count > 0)
                    ? (uint16_t)(hr_accumulator / hr_sample_count)
                    : 0;
            sample.spo2_pct    = 98;        /* TODO: average spo2 readings */
            sample.steps_today = steps_today;
            sample.battery_pct = hal_battery_read();

            ble_send_vitals(&sample);

            /* Reset accumulators */
            hr_accumulator  = 0;
            hr_sample_count = 0;
        }

        tick_count++;
        hal_delay_10ms();
    }

    /* Never reached */
    return 0;
}

/**
 * ble.h — BLE GATT stub for AgeCare wearable.
 *
 * Real implementation would use a Nordic Semiconductor SoftDevice or
 * Zephyr BT stack. These stubs demonstrate the function signatures only.
 *
 * Characteristics advertised (in real implementation):
 *   - AgeCare Vitals         (UUID: custom 128-bit)
 *   - AgeCare Fall Event     (UUID: custom 128-bit, notify)
 *   - AgeCare SOS Event      (UUID: custom 128-bit, notify)
 */

#pragma once

#include <stdint.h>
#include "types.h"

/** Initialise the BLE stack and start advertising. */
void ble_init(void);

/**
 * Send a fall or SOS event notification to the connected hub.
 *
 * @param event_type  'F' for fall, 'S' for SOS.
 * @param data        Pointer to FallEvent or SosEvent struct.
 * @param len         Size of the struct in bytes.
 * @return 0 on success, non-zero on error.
 */
int ble_send_event(char event_type, const void *data, uint16_t len);

/**
 * Send a periodic vitals notification to the connected hub.
 *
 * @param sample  Pointer to a VitalsSample struct.
 * @return 0 on success, non-zero on error.
 */
int ble_send_vitals(const VitalsSample *sample);

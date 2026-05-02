/**
 * ble.c — BLE GATT stub.
 *
 * Bodies intentionally left empty.  Real BLE GATT implementation would use
 * the Nordic SoftDevice S140 API (sd_ble_gatts_hvx) or an equivalent Zephyr
 * BT API call.
 *
 * See TECHNICAL_ARCHITECTURE.md §2.1 for the wearable→hub BLE data flow.
 */

#include "ble.h"

void ble_init(void)
{
    // TODO: real BLE GATT impl
    //   sd_softdevice_enable(...)
    //   sd_ble_gap_adv_start(...)
}

int ble_send_event(char event_type, const void *data, uint16_t len)
{
    // TODO: real BLE GATT impl
    //   sd_ble_gatts_hvx(conn_handle, &hvx_params)
    (void)event_type;
    (void)data;
    (void)len;
    return 0;
}

int ble_send_vitals(const VitalsSample *sample)
{
    // TODO: real BLE GATT impl
    //   sd_ble_gatts_hvx(conn_handle, &hvx_params)
    (void)sample;
    return 0;
}

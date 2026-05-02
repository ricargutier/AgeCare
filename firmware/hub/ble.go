package main

import "log"

// ScanForWearable starts BLE scanning and attempts to find the AgeCare
// wearable device by its advertised service UUID.
//
// TODO: real BlueZ integration via github.com/muka/go-bluetooth or
// direct D-Bus calls to the BlueZ stack (org.bluez.Adapter1.StartDiscovery).
func ScanForWearable() {
	log.Println("[ble] ScanForWearable: stub — TODO: real BlueZ integration")
	log.Println("[ble] In production: use org.bluez.Adapter1.StartDiscovery")
	log.Println("[ble]   and filter on AgeCare wearable service UUID.")
}

// Subscribe registers for GATT notifications from the wearable identified
// by deviceID. Incoming BLE frames would be decoded and forwarded to the
// hub's ingest WebSocket connection.
//
// TODO: real BlueZ integration — call org.bluez.GattCharacteristic1.StartNotify
// for each AgeCare characteristic (vitals, fall, SOS).
func Subscribe(deviceID string) {
	log.Printf("[ble] Subscribe(%q): stub — TODO: real BlueZ integration", deviceID)
	log.Println("[ble] In production: call org.bluez.GattCharacteristic1.StartNotify")
	log.Println("[ble]   and route incoming frames through the ring buffer.")
}

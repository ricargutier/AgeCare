/**
 * types.h — Minimal C structs mirroring the wearable's portion of IngestFrame.
 *
 * Corresponding TypeScript type: IngestFrame  (shared/contracts/types.ts)
 * Each struct maps to one discriminated-union variant of IngestFrame.
 */

#pragma once

#include <stdint.h>

/**
 * FallEvent — maps to IngestFrame { type: "fall" }
 *
 * TypeScript payload: { ts: string; gForce: number; orientation?: string }
 */
typedef struct {
    uint32_t timestamp_ms;   /**< Milliseconds since boot (backend converts to ISO-8601) */
    float    g_force;        /**< Peak resultant acceleration in g-units */
    uint8_t  orientation;    /**< 0=unknown, 1=face_up, 2=face_down, 3=on_side */
} FallEvent;

/**
 * SosEvent — maps to IngestFrame { type: "sos" }
 *
 * TypeScript payload: { ts: string }
 */
typedef struct {
    uint32_t timestamp_ms;   /**< Milliseconds since boot */
} SosEvent;

/**
 * VitalsSample — maps to IngestFrame { type: "vitals" }
 *
 * TypeScript payload: { ts: string; heartRate?: number; spo2?: number;
 *                       steps?: number; batteryPct?: number }
 */
typedef struct {
    uint32_t timestamp_ms;   /**< Milliseconds since boot */
    uint16_t heart_rate_bpm; /**< 0 = no reading */
    uint8_t  spo2_pct;       /**< 0 = no reading; range 0-100 */
    uint32_t steps_today;    /**< Cumulative step count since midnight */
    uint8_t  battery_pct;    /**< 0-100 */
} VitalsSample;

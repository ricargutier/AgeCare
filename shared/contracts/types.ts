// AgeCare canonical types — frozen contract.
// Imported by backend/, web/, mobile/, simulators/.
// Do NOT redefine these in any subdirectory. If you need a new field, ADD it here
// and leave a `// CONTRACT-CHANGE-REQUEST: <reason>` comment for the integration step.

// ─── Roles ─────────────────────────────────────────────────────────────────────

export type Role =
  | "elder"
  | "family_admin"
  | "family_viewer"
  | "caregiver"
  | "healthcare_provider"
  | "system_admin";

// ─── Core entities ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  phone?: string | null;
  createdAt: string; // ISO-8601
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  priority: number; // 1 = primary
}

export interface Elder {
  id: string;
  userId: string;
  dob: string; // ISO date YYYY-MM-DD
  conditions: string[];
  emergencyContacts: EmergencyContact[];
  // Optional embeds returned on GET /elders/:id
  careCircle?: CareCircleMember[];
  devices?: Device[];
}

export type CareRelationship =
  | "spouse"
  | "child"
  | "sibling"
  | "friend"
  | "professional_caregiver"
  | "provider"
  | "other";

export type CarePermissionLevel = "admin" | "viewer" | "caregiver" | "provider";

export interface CareCircleMember {
  id: string;
  elderId: string;
  userId: string;
  user?: Pick<User, "id" | "email" | "displayName" | "role">;
  relationship: CareRelationship;
  permissionLevel: CarePermissionLevel;
}

export type DeviceType =
  | "wearable"
  | "hub"
  | "motion_sensor"
  | "door_sensor"
  | "voice_assistant";

export interface Device {
  id: string;
  elderId: string;
  type: DeviceType;
  serial: string;
  lastSeenAt: string | null; // ISO-8601, null if never seen
  batteryPct?: number | null;
  online: boolean; // derived: lastSeenAt within heartbeat window
}

export interface VitalsSample {
  id: string;
  elderId: string;
  deviceId: string;
  ts: string; // ISO-8601
  heartRate?: number | null; // bpm
  spo2?: number | null; // %
  steps?: number | null; // cumulative for the day
  batteryPct?: number | null;
}

export type AlertType =
  | "fall"
  | "sos"
  | "inactivity"
  | "vitals_anomaly"
  | "medication_missed"
  | "device_offline";

export type AlertSeverity = "info" | "warn" | "critical";

export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  elderId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null; // userId
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  payload: Record<string, unknown>; // type-specific detail (e.g. fall: { gForce, location })
}

export interface MedicationSchedule {
  id: string;
  elderId: string;
  drugName: string;
  dose: string; // e.g. "10mg", "1 tablet"
  timesOfDay: string[]; // ["08:00", "20:00"] — local time HH:MM
  startsOn: string; // ISO date
  endsOn?: string | null;
  events?: MedicationEvent[]; // embedded on GET /elders/:id/medications
}

export type MedicationEventSource =
  | "elder_button"
  | "caregiver"
  | "auto_skip"
  | "wearable_confirm";

export interface MedicationEvent {
  id: string;
  scheduleId: string;
  dueAt: string; // ISO-8601
  takenAt?: string | null;
  confirmedBy?: string | null; // userId
  source?: MedicationEventSource | null;
  status: "pending" | "taken" | "missed" | "skipped";
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string; // e.g. "alert.acknowledge"
  targetType: string; // e.g. "alert"
  targetId: string;
  ts: string;
  payload: Record<string, unknown>;
}

// ─── REST API request/response shapes ──────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AcknowledgeAlertResponse {
  alert: Alert;
}

export interface ConfirmMedicationRequest {
  takenAt?: string; // defaults to server now
}

export interface PushSubscribeRequest {
  // RFC 8030 push subscription as produced by browser PushManager.subscribe()
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

// ─── WebSocket: device → server (`/ws/ingest`) ─────────────────────────────────
// Auth: connect with `?deviceToken=<seeded-token>` query param.

export type IngestFrame =
  | { type: "heartbeat"; deviceId: string; payload: { batteryPct?: number } }
  | {
      type: "vitals";
      deviceId: string;
      payload: {
        ts: string;
        heartRate?: number;
        spo2?: number;
        steps?: number;
        batteryPct?: number;
      };
    }
  | {
      type: "fall";
      deviceId: string;
      payload: { ts: string; gForce: number; orientation?: string };
    }
  | { type: "sos"; deviceId: string; payload: { ts: string } }
  | {
      type: "motion";
      deviceId: string;
      payload: { ts: string; room?: string; detected: boolean };
    }
  | {
      type: "door";
      deviceId: string;
      payload: { ts: string; door: string; state: "open" | "closed" };
    }
  | {
      type: "medication_taken";
      deviceId: string;
      payload: { ts: string; scheduleId: string };
    };

// ─── WebSocket: server → client (`/ws/client`) ─────────────────────────────────
// Auth: connect with `?token=<jwt>` query param.

export type ClientPushFrame =
  | { type: "alert.new"; data: Alert }
  | { type: "alert.update"; data: Alert }
  | { type: "vitals.tick"; data: VitalsSample }
  | { type: "device.status"; data: Pick<Device, "id" | "online" | "lastSeenAt"> };

// ─── HTTP error envelope ───────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string; // e.g. "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION"
    message: string;
    details?: unknown;
  };
}

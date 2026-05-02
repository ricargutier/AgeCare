// Helpers to map Prisma DB rows to API contract types from shared/contracts/types.ts
import type {
  User,
  Elder,
  CareCircleMember,
  Device,
  VitalsSample,
  Alert,
  MedicationSchedule,
  MedicationEvent,
  AuditLog,
  EmergencyContact,
  AlertType,
  AlertSeverity,
  AlertStatus,
  Role,
  DeviceType,
  CareRelationship,
  CarePermissionLevel,
  MedicationEventSource,
} from "../../shared/contracts/types.js";

type PrismaUser = {
  id: string;
  email: string;
  role: string;
  displayName: string;
  phone: string | null;
  createdAt: Date;
};

type PrismaElder = {
  id: string;
  userId: string;
  dob: Date;
  conditions: string[];
  emergencyContacts: unknown;
};

type PrismaCareCircleMember = {
  id: string;
  elderId: string;
  userId: string;
  relationship: string;
  permissionLevel: string;
  user?: Pick<PrismaUser, "id" | "email" | "displayName" | "role"> | null;
};

type PrismaDevice = {
  id: string;
  elderId: string;
  type: string;
  serial: string;
  lastSeenAt: Date | null;
  batteryPct: number | null;
};

type PrismaVitalsSample = {
  id: string;
  elderId: string;
  deviceId: string;
  ts: Date;
  heartRate: number | null;
  spo2: number | null;
  steps: number | null;
  batteryPct: number | null;
};

type PrismaAlert = {
  id: string;
  elderId: string;
  type: string;
  severity: string;
  status: string;
  createdAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  payload: unknown;
};

type PrismaSchedule = {
  id: string;
  elderId: string;
  drugName: string;
  dose: string;
  timesOfDay: string[];
  startsOn: Date;
  endsOn: Date | null;
};

type PrismaMedEvent = {
  id: string;
  scheduleId: string;
  dueAt: Date;
  takenAt: Date | null;
  confirmedBy: string | null;
  source: string | null;
  status: string;
};

type PrismaAuditLog = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  ts: Date;
  payload: unknown;
};

// Device is "online" if lastSeenAt is within 10 minutes
const HEARTBEAT_WINDOW_MS = 10 * 60 * 1000;

export function serializeUser(u: PrismaUser): User {
  return {
    id: u.id,
    email: u.email,
    role: u.role as Role,
    displayName: u.displayName,
    phone: u.phone,
    createdAt: u.createdAt.toISOString(),
  };
}

export function serializeElder(
  e: PrismaElder,
  opts?: {
    careCircle?: PrismaCareCircleMember[];
    devices?: PrismaDevice[];
  }
): Elder {
  return {
    id: e.id,
    userId: e.userId,
    dob: e.dob.toISOString().split("T")[0]!,
    conditions: e.conditions,
    emergencyContacts: e.emergencyContacts as EmergencyContact[],
    careCircle: opts?.careCircle?.map(serializeCareCircleMember),
    devices: opts?.devices?.map(serializeDevice),
  };
}

export function serializeCareCircleMember(m: PrismaCareCircleMember): CareCircleMember {
  return {
    id: m.id,
    elderId: m.elderId,
    userId: m.userId,
    relationship: m.relationship as CareRelationship,
    permissionLevel: m.permissionLevel as CarePermissionLevel,
    user: m.user
      ? {
          id: m.user.id,
          email: m.user.email,
          displayName: m.user.displayName,
          role: m.user.role as Role,
        }
      : undefined,
  };
}

export function serializeDevice(d: PrismaDevice): Device {
  const online =
    d.lastSeenAt !== null && Date.now() - d.lastSeenAt.getTime() < HEARTBEAT_WINDOW_MS;
  return {
    id: d.id,
    elderId: d.elderId,
    type: d.type as DeviceType,
    serial: d.serial,
    lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
    batteryPct: d.batteryPct,
    online,
  };
}

export function serializeVitalsSample(v: PrismaVitalsSample): VitalsSample {
  return {
    id: v.id,
    elderId: v.elderId,
    deviceId: v.deviceId,
    ts: v.ts.toISOString(),
    heartRate: v.heartRate,
    spo2: v.spo2,
    steps: v.steps,
    batteryPct: v.batteryPct,
  };
}

export function serializeAlert(a: PrismaAlert): Alert {
  return {
    id: a.id,
    elderId: a.elderId,
    type: a.type as AlertType,
    severity: a.severity as AlertSeverity,
    status: a.status as AlertStatus,
    createdAt: a.createdAt.toISOString(),
    acknowledgedAt: a.acknowledgedAt ? a.acknowledgedAt.toISOString() : null,
    acknowledgedBy: a.acknowledgedBy,
    resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
    resolvedBy: a.resolvedBy,
    payload: a.payload as Record<string, unknown>,
  };
}

export function serializeMedicationSchedule(
  s: PrismaSchedule,
  events?: PrismaMedEvent[]
): MedicationSchedule {
  return {
    id: s.id,
    elderId: s.elderId,
    drugName: s.drugName,
    dose: s.dose,
    timesOfDay: s.timesOfDay,
    startsOn: s.startsOn.toISOString().split("T")[0]!,
    endsOn: s.endsOn ? s.endsOn.toISOString().split("T")[0] : null,
    events: events?.map(serializeMedicationEvent),
  };
}

export function serializeMedicationEvent(e: PrismaMedEvent): MedicationEvent {
  return {
    id: e.id,
    scheduleId: e.scheduleId,
    dueAt: e.dueAt.toISOString(),
    takenAt: e.takenAt ? e.takenAt.toISOString() : null,
    confirmedBy: e.confirmedBy,
    source: e.source as MedicationEventSource | null,
    status: e.status as "pending" | "taken" | "missed" | "skipped",
  };
}

export function serializeAuditLog(a: PrismaAuditLog): AuditLog {
  return {
    id: a.id,
    actorUserId: a.actorUserId,
    action: a.action,
    targetType: a.targetType,
    targetId: a.targetId,
    ts: a.ts.toISOString(),
    payload: a.payload as Record<string, unknown>,
  };
}

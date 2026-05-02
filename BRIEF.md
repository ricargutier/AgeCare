# AgeCare — Implementation BRIEF (read this, not the full docs/)

**Purpose of this file:** Every implementation agent reads this instead of the four large spec docs in `docs/`. The full specs describe a HIPAA-grade AWS IoT system; what we're actually building is a **local-first software prototype**.

## What we're building

A working local prototype of AgeCare with five running pieces:

1. **Backend** (`backend/`) — Node + Fastify + Prisma + Postgres. REST + WebSocket. Mock JWT auth, no Cognito.
2. **Web portal** (`web/`) — React 18 + Vite + TypeScript. Caregiver/provider/family-admin facing. Extends the visual language of the existing [index.html](index.html) login page.
3. **Mobile PWA** (`mobile/`) — React 18 + Vite + TypeScript, configured as an installable PWA with web-push. Family-caregiver facing.
4. **Firmware** (`firmware/wearable/`, `firmware/hub/`) — Documentation-grade C (wearable) and Go (hub). Compiles, never flashed, never deployed. Demonstrates the architecture.
5. **Simulators** (`simulators/`) — Node scripts that publish fake events (fall, vitals, motion, door, medication, SOS) to the backend's WebSocket endpoint. **This is what actually drives the demo**, not the firmware.

No AWS. No Cognito. No real MQTT broker. No FHIR server. No video calling — placeholder UI only. WCAG 2.1 AA on the web portal.

## Stack — frozen, do not redesign

| Layer | Pick |
|------|------|
| Backend runtime | Node 20+ (TypeScript, ESM) |
| Backend framework | Fastify 4 |
| ORM | Prisma 5 |
| DB | Postgres 16 (via docker-compose) |
| Auth | JSON-Web-Token (jose), bcrypt for password hashing, seeded users |
| Realtime | `@fastify/websocket` |
| Web frontend | Vite 5 + React 18 + TypeScript + React Router 6 + Tanstack Query + Zustand |
| Charts | Recharts |
| Mobile frontend | Same stack as web, plus `vite-plugin-pwa` and `web-push` |
| Wearable firmware | Bare C, ARM Cortex-M33 target, `arm-none-eabi-gcc`. No RTOS — main loop + ISR pattern. |
| Hub firmware | Go 1.22, targeting Linux ARM. Single binary. |
| Simulators | Node + TypeScript, publishes via `ws` client to backend WebSocket |
| Package manager | pnpm workspaces |
| Demo orchestration | A `Makefile` and/or root `pnpm demo` script |

## Roles & seed users

The system has 6 roles. Password for all seed users is `agecare-demo-2026`.

| Role | Seed email | Notes |
|------|-----------|-------|
| Elder | `eleanor@agecare.demo` | The monitored individual. Can view own vitals + use SOS. |
| FamilyAdmin | `david@agecare.demo` | Full access for one elder; manages care circle. |
| FamilyViewer | `sarah@agecare.demo` | Read-only view of one elder. |
| Caregiver | `maria@agecare.demo` | Professional caregiver; assigned to specific elders; logs visits, confirms meds. |
| HealthcareProvider | `dr.chen@agecare.demo` | Read-only clinical view; trends and reports for assigned elders. |
| SystemAdmin | `admin@agecare.demo` | Internal admin; user/device management. |

## Core entities

See [shared/contracts/types.ts](shared/contracts/types.ts) for the canonical TypeScript types. **Do not redefine these — import them.** If you need a new field, add it to types.ts AND coordinate with the backend Prisma schema in `backend/prisma/schema.prisma`.

Entities:

- `User` — id, email, passwordHash, role, displayName, phone
- `Elder` — id, userId, dob, conditions[], emergencyContacts[]
- `CareCircleMember` — links a non-elder user to an elder with a relationship + permission level
- `Device` — id, elderId, type (`wearable` | `hub` | `motion_sensor` | `door_sensor` | `voice_assistant`), serial, lastSeenAt
- `VitalsSample` — id, elderId, deviceId, ts, heartRate, spo2, steps (cumulative-day), batteryPct
- `Alert` — id, elderId, type (`fall` | `sos` | `inactivity` | `vitals_anomaly` | `medication_missed` | `device_offline`), severity (`info`|`warn`|`critical`), createdAt, acknowledgedAt, acknowledgedBy, resolvedAt, payload (jsonb)
- `MedicationSchedule` — id, elderId, drugName, dose, timesOfDay[], startsOn, endsOn?
- `MedicationEvent` — id, scheduleId, dueAt, takenAt?, confirmedBy?, source (`elder_button`|`caregiver`|`auto_skip`)
- `AuditLog` — id, actorUserId, action, targetType, targetId, ts, payload

## API surface — frozen contract

Backend exposes:

- `POST /auth/login` → `{ token, user }`
- `GET /auth/me` → `User`
- `GET /elders` (scoped by role) → `Elder[]`
- `GET /elders/:id` → `Elder` with embedded careCircle, devices
- `GET /elders/:id/vitals?from=&to=&metric=` → `VitalsSample[]`
- `GET /elders/:id/alerts?status=&since=` → `Alert[]`
- `POST /alerts/:id/acknowledge` → `Alert`
- `POST /alerts/:id/resolve` → `Alert`
- `GET /elders/:id/medications` → `(MedicationSchedule & { events: MedicationEvent[] })[]`
- `POST /medications/events/:id/confirm` → `MedicationEvent`
- `GET /elders/:id/devices` → `Device[]`
- `WS /ws/ingest` — device/simulator → server. Frames: `{ type: 'vitals'|'fall'|'sos'|'motion'|'door'|'medication_taken'|'heartbeat', deviceId, payload }`. Server auth via `?deviceToken=` query param (seeded per device).
- `WS /ws/client` — client subscriptions (live alert + vitals stream). JWT in `?token=` query param. Server pushes `{ type: 'alert.new'|'alert.update'|'vitals.tick', data }`.
- `POST /push/subscribe` — mobile PWA registers a web-push subscription
- `GET /audit?since=` (admin only)

All non-WS endpoints require `Authorization: Bearer <jwt>`. RBAC enforced server-side: a FamilyViewer cannot acknowledge alerts, a Caregiver only sees assigned elders, etc.

## Demo scenarios (the verification target)

`pnpm demo` should boot Postgres, backend, web, mobile, and a simulator runner. These six scripts must produce visible alerts in both clients within 5 seconds:

- `pnpm sim:fall` — wearable accelerometer fall pattern → `Alert(type=fall, severity=critical)`
- `pnpm sim:sos` — wearable SOS button long-press → `Alert(type=sos, severity=critical)`
- `pnpm sim:vitals-anomaly` — heart rate spike 160 bpm sustained 90s → `Alert(type=vitals_anomaly, severity=warn)`
- `pnpm sim:inactivity` — no motion sensor events for 6h during day → `Alert(type=inactivity, severity=warn)`
- `pnpm sim:medication-missed` — scheduled med dose passes its grace window unconfirmed → `Alert(type=medication_missed, severity=info)`
- `pnpm sim:device-offline` — wearable stops heartbeats for >10min → `Alert(type=device_offline, severity=warn)`

## Visual design

Reuse the color palette and typography defined in [SPEC.md](SPEC.md) §2 (already mirrored as CSS variables in [index.html](index.html)). Both web and mobile use these tokens. The mobile app should feel obviously "from the same product" as the web portal.

## What's out of scope

- Real device firmware deployment, BLE pairing, Zigbee, Z-Wave, MQTT broker
- Real video/voice calls (placeholder button only)
- HIPAA compliance, encryption at rest, audit trail certification
- Cloud deployment of any kind
- Email/SMS/Twilio integration — log to console instead
- Comprehensive test suites (a couple of smoke tests are fine)

## Boundaries between agents

Each implementation agent owns a directory and **does not edit other agents' directories**:

- Backend agent: `backend/`, `shared/contracts/types.ts` (read+extend), root `pnpm-workspace.yaml` (read only)
- Web agent: `web/`
- Mobile agent: `mobile/`
- Firmware/sim agent: `firmware/wearable/`, `firmware/hub/`, `simulators/`

Cross-cutting files (root `package.json`, `Makefile`, `README.md`, `docker-compose.yml`) are owned by the **integration step** (run after all 4 agents return). Don't fight over them.

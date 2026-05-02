# AgeCare Backend

Node 20 + Fastify 4 + Prisma 5 + Postgres 16 REST + WebSocket API.

## Prerequisites

- pnpm (workspace manager)
- Docker (for Postgres)
- Node 20+

## Running

### 1. Start Postgres

From the **repo root**:

```sh
docker-compose up -d
```

### 2. Install dependencies

From the **repo root**:

```sh
pnpm install
```

### 3. Migrate the database

From `backend/`:

```sh
pnpm db:migrate
```

Or from repo root:

```sh
pnpm --filter @agecare/backend db:migrate
```

### 4. Seed demo data

```sh
pnpm db:seed
# or from repo root:
pnpm --filter @agecare/backend db:seed
```

This creates all 6 seed users (password: `agecare-demo-2026`), one Elder (Eleanor), a full CareCircle,
3 devices with ingest tokens, and one MedicationSchedule with 3 pending events.

### 5. Start dev server

```sh
pnpm dev
# or from repo root:
pnpm --filter @agecare/backend dev
```

Server starts on `http://localhost:3000` (configurable via `PORT` env).

## Environment variables

Copy `.env.example` to `.env` and adjust:

```
DATABASE_URL=postgresql://agecare:agecare@localhost:5432/agecare
JWT_SECRET=dev-secret-do-not-use-in-prod
PORT=3000
```

VAPID keys for web-push are auto-generated on first boot and saved to `.vapid.json` (gitignored).

## Running tests

```sh
pnpm test
```

Requires a running Postgres with seeded data.

## Key endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/login | — | Get JWT |
| GET | /auth/me | JWT | Current user |
| GET | /elders | JWT | List accessible elders |
| GET | /elders/:id | JWT | Elder detail with careCircle + devices |
| GET | /elders/:id/vitals | JWT | Vitals samples |
| GET | /elders/:id/alerts | JWT | Alerts |
| POST | /alerts/:id/acknowledge | JWT | Acknowledge alert |
| POST | /alerts/:id/resolve | JWT | Resolve alert |
| GET | /elders/:id/medications | JWT | Medication schedules + events |
| POST | /medications/events/:id/confirm | JWT | Confirm medication taken |
| GET | /elders/:id/devices | JWT | Devices |
| POST | /push/subscribe | JWT | Subscribe for web-push |
| GET | /push/vapid-public-key | — | VAPID public key |
| GET | /audit?since= | JWT (admin) | Audit log |
| WS | /ws/ingest?deviceToken= | device token | Device/simulator data ingest |
| WS | /ws/client?token= | JWT | Live push to clients |

## Ingest tokens (seeded)

| Device | Device ID | Token |
|--------|-----------|-------|
| Wearable (Eleanor) | `wearable-eleanor` | `wearable-token-eleanor` |
| Hub | `hub-eleanor` | `hub-token-eleanor` |
| Motion sensor (living room) | `motion-living-eleanor` | `motion-living-token-eleanor` |
| Door sensor (front) | `door-front-eleanor` | `door-front-token-eleanor` |

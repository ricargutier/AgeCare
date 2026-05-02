# AgeCare

**Real-time elder-care monitoring — local-first software prototype**

A working demonstration of a multi-device elder-care platform. Simulators
publish events over WebSocket; the backend persists them and pushes live
alerts to a caregiver web portal and a mobile PWA. No cloud, no hardware
required.

---

## Status

**Software-only prototype.** This repo contains no AWS infrastructure, no
real MQTT broker, no BLE firmware deployment, and no HIPAA compliance
measures. The firmware in `firmware/` is documentation-grade code that
compiles but is never flashed. Everything that drives the demo runs locally
via Node.js and Docker Postgres.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Local machine                            │
│                                                                 │
│  ┌──────────────┐   WS /ws/ingest    ┌──────────────────────┐  │
│  │  Simulators  │ ─────────────────► │                      │  │
│  │  (Node.js)   │                    │   Backend (Fastify)   │  │
│  │              │   sim:fall         │   + Prisma + Postgres │  │
│  │  fall        │   sim:sos          │                       │  │
│  │  sos         │   sim:vitals-anom  │  ┌─────────────────┐ │  │
│  │  vitals      │   sim:inactivity   │  │  Alert Engine   │ │  │
│  │  motion      │   sim:med-missed   │  │  (in-process)   │ │  │
│  │  door        │   sim:dev-offline  │  └────────┬────────┘ │  │
│  │  medication  │                    │           │           │  │
│  └──────────────┘                    └───────────┼───────────┘  │
│                                                  │WS /ws/client  │
│                                         ┌────────┴────────┐     │
│                                         │                  │     │
│                              ┌──────────┴──┐    ┌─────────┴──┐  │
│                              │  Web Portal  │    │ Mobile PWA │  │
│                              │  (React/Vite)│    │(React/Vite)│  │
│                              │  :5173       │    │ :5174      │  │
│                              └─────────────┘    └────────────┘  │
│                                                                 │
│  ┌──────────────┐                                               │
│  │  Postgres 16 │  ◄── docker-compose                          │
│  │  :5432       │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repo layout

| Directory / File | Owner | Description |
|-----------------|-------|-------------|
| `backend/` | Backend agent | Fastify 4 + Prisma 5 + Postgres. REST + WebSocket. |
| `web/` | Web agent | React 18 + Vite + TypeScript caregiver portal. |
| `mobile/` | Mobile agent | React 18 + Vite PWA with web-push, family-caregiver facing. |
| `simulators/` | Firmware/Sim agent | Node scripts that publish fake device events. |
| `firmware/wearable/` | Firmware/Sim agent | Documentation-grade C (ARM Cortex-M33). |
| `firmware/hub/` | Firmware/Sim agent | Documentation-grade Go 1.22 hub binary. |
| `shared/contracts/` | Backend agent (read+extend) | Canonical TypeScript types shared by all packages. |
| `docs/` | Read-only | Full product PRD, personas, architecture (aspirational). |
| `scripts/` | Integration agent | Helper Node scripts (wait-for-postgres, check-stack, seed-summary). |
| `e2e/` | Integration agent | Smoke harness (`node e2e/smoke.mjs`). |
| `infra/` | (reserved) | docker-compose.yml lives here or at root. |
| `index.html` | Read-only | Static login page — design language reference. |
| `SPEC.md` | Read-only | Login page UI/UX spec + design tokens. |
| `BRIEF.md` | Read-only | Frozen implementation brief for all agents. |

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime for backend, web build, simulators, scripts |
| pnpm | 8+ | Workspace package manager |
| Docker | any recent | Runs Postgres 16 container |
| arm-none-eabi-gcc | any | Optional — only needed to compile wearable firmware |
| Go | 1.22+ | Optional — only needed to compile hub firmware |

Check all prerequisites at once:

```
node scripts/check-stack.mjs
```

---

## Quick start (verified working)

```bash
# 1. Prereqs: Node 20, pnpm 8+ (npm i -g pnpm), Docker Desktop running
pnpm install

# 2. Start Postgres
docker compose up -d postgres

# 3. Set backend port (3000 doesn't work on Windows — see Gotchas)
echo "PORT=8080" >> backend/.env

# 4. Migrate + seed
pnpm db:migrate
pnpm db:seed

# 5. Start everything
pnpm demo
# (backend at :8080, web at :5173, mobile at :5174, simulator heartbeat)

# 6. In another terminal — run the smoke test
BACKEND_URL=http://localhost:8080 pnpm e2e
# Expected: 8/8 steps passed in <1s
```

Then open **http://localhost:5173** and log in as `david@agecare.demo` / `agecare-demo-2026` (family_admin role).

### Demo controls in the UI

The Elders list page has a "Demo controls" panel (visible to family_admin and system_admin) with 6 buttons that fire each scenario via the backend's `/demo/scenarios/:name` endpoint. No need to switch terminals.

### Or run all 6 scenarios from the CLI

```bash
BACKEND_HTTP_URL=http://localhost:8080 pnpm sim:all
```

### Gotchas

- **Port 3000 doesn't work on Windows.** Hyper-V/WSL reserves the 2990-3189 TCP range. Use 8080 (or any port outside the reserved ranges, see `netsh int ipv4 show excludedportrange protocol=tcp`).
- **bcrypt → bcryptjs.** The `bcrypt` native binding fails to compile on Windows without the C++ build chain. We use `bcryptjs` (pure JS) instead. Slower but reliable.
- **pnpm 10 build-script approval.** Postinstalls for Prisma + bcryptjs need explicit approval via `pnpm.onlyBuiltDependencies` in root `package.json` (already configured). If you see "missing native binding," run `pnpm rebuild`.
- **First Postgres pull is slow** (~150 MB image).
- **The `demo` script defaults to port 3000** for the backend; the `.env` change above overrides it. If you'd rather edit the script: change `package.json`'s `dev:backend` script to set `PORT=8080`.

### What `pnpm demo` does

Uses `concurrently` to start in parallel:
- **[bk]** backend on `http://localhost:8080` (with `PORT=8080` in `backend/.env`)
- **[web]** web portal on `http://localhost:5173`
- **[mob]** mobile PWA on `http://localhost:5174`
- **[sim]** simulator heartbeat loop publishing to `ws://localhost:8080/ws/ingest`

---

## Demo scenarios

Each command sends a simulated device event to the backend, which creates
an alert and pushes it live to both web and mobile clients within 5 seconds.

| Command | What it simulates | Alert created | Visible in |
|---------|-------------------|---------------|------------|
| `pnpm sim:fall` | Wearable accelerometer fall pattern | `fall` / critical | Web + Mobile |
| `pnpm sim:sos` | Wearable SOS button long-press | `sos` / critical | Web + Mobile |
| `pnpm sim:vitals-anomaly` | Heart rate spike 160 bpm sustained 90s | `vitals_anomaly` / warn | Web + Mobile |
| `pnpm sim:inactivity` | No motion events for 6h during daytime | `inactivity` / warn | Web + Mobile |
| `pnpm sim:medication-missed` | Scheduled dose passes grace window unconfirmed | `medication_missed` / info | Web + Mobile |
| `pnpm sim:device-offline` | Wearable stops heartbeats for >10 min | `device_offline` / warn | Web + Mobile |

---

## Seeded users

All passwords: `agecare-demo-2026`

| Email | Role | Notes |
|-------|------|-------|
| `eleanor@agecare.demo` | Elder | The monitored individual. Can view own vitals + SOS. |
| `david@agecare.demo` | FamilyAdmin | Full access; manages care circle. |
| `sarah@agecare.demo` | FamilyViewer | Read-only view. |
| `maria@agecare.demo` | Caregiver | Logs visits, confirms medications. |
| `dr.chen@agecare.demo` | HealthcareProvider | Clinical read-only; trends and reports. |
| `admin@agecare.demo` | SystemAdmin | User/device management. |

After seeding, confirm the world is correct:

```
node scripts/seed-summary.mjs
```

---

## Design tokens

Visual design tokens (color palette, typography, spacing) are defined in
`SPEC.md §2` and mirrored as CSS custom properties in `index.html`. Both
`web/` and `mobile/` import these tokens so the apps feel visibly "from the
same product" as the login page.

Key colors:

| Token | Value | Use |
|-------|-------|-----|
| `--primary` | `#2D6A4F` | Primary actions, nav |
| `--primary-light` | `#40916C` | Hover states |
| `--primary-dark` | `#1B4332` | Text, headings |
| `--accent` | `#95D5B2` | Highlights, badges |
| `--background` | `#F8F9FA` | Page background |
| `--error` | `#DC3545` | Errors, critical alerts |

Fonts: DM Sans (headings) + Nunito (body) via Google Fonts.

---

## What this is NOT

- No real device firmware deployment, BLE pairing, Zigbee, Z-Wave, MQTT broker
- No real video/voice calls (placeholder button only)
- No HIPAA compliance, encryption at rest, or audit trail certification
- No cloud deployment of any kind
- No Email/SMS/Twilio — alert notifications log to console only
- No comprehensive test suite — only the single e2e smoke harness

---

## Per-component READMEs

- [`backend/README.md`](backend/README.md) — Fastify routes, Prisma schema, environment variables
- [`web/README.md`](web/README.md) — Vite config, component structure, role-based views
- [`mobile/README.md`](mobile/README.md) — PWA setup, push notification registration
- [`simulators/README.md`](simulators/README.md) — available sim scripts and event payloads
- [`firmware/wearable/README.md`](firmware/wearable/README.md) — C build instructions (arm-none-eabi-gcc)
- [`firmware/hub/README.md`](firmware/hub/README.md) — Go build instructions

---

## Development scripts reference

| Script | What it does |
|--------|-------------|
| `pnpm demo:setup` | First-time setup (install + DB + migrate + seed) |
| `pnpm demo` | Start full stack with concurrently |
| `pnpm e2e` | Run smoke test (stack must be running) |
| `pnpm db:up` | Start Postgres container |
| `pnpm db:wait` | Wait until Postgres port is open |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm dev:backend` | Backend only |
| `pnpm dev:web` | Web portal only |
| `pnpm dev:mobile` | Mobile PWA only |
| `pnpm dev:sim` | Simulator heartbeat loop only |
| `pnpm sim:fall` | Trigger fall scenario |
| `pnpm sim:sos` | Trigger SOS scenario |
| `pnpm sim:vitals-anomaly` | Trigger vitals anomaly scenario |
| `pnpm sim:inactivity` | Trigger inactivity scenario |
| `pnpm sim:medication-missed` | Trigger medication-missed scenario |
| `pnpm sim:device-offline` | Trigger device-offline scenario |
| `pnpm typecheck` | Run TypeScript typecheck across all packages |
| `node scripts/check-stack.mjs` | Verify prerequisites (Node, pnpm, Docker, ports) |
| `node scripts/seed-summary.mjs` | Print seeded data table from Postgres |

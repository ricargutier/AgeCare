# AgeCare E2E Smoke Test

A lightweight, dependency-minimal smoke harness that validates the full
request path: REST login, elder list, WebSocket ingest, WebSocket push,
REST alert query, and alert acknowledgement.

## Prerequisites

The full stack must be running. Complete first-time setup if you haven't:

```
pnpm demo:setup   # one-time: installs deps, starts DB, migrates, seeds
```

## Running the smoke test

**Terminal 1 — start the stack:**

```
pnpm demo
```

Wait until you see output from all four services (backend, web, mobile,
simulators). The backend is ready when you see something like:

```
[bk] Server listening on http://localhost:3000
```

**Terminal 2 — run the smoke test:**

```
pnpm e2e
```

Or directly:

```
node e2e/smoke.mjs
```

## What it tests (9 steps)

| # | Step | Validates |
|---|------|-----------|
| 1 | `POST /auth/login` as david@agecare.demo | Auth + JWT issuance |
| 2 | `GET /elders` | RBAC list, eleanor present |
| 3 | Capture `eleanorElderId` | Elder record shape |
| 4 | Open WS `/ws/client?token=<jwt>` | Client WS auth |
| 5 | Open WS `/ws/ingest?deviceToken=wearable-token-eleanor`, send `fall` frame | Ingest WS auth + message delivery |
| 6 | Wait up to 5s for `alert.new` (fall) on client WS | End-to-end realtime push |
| 7 | `GET /elders/:id/alerts?status=open` | Alert persisted in DB |
| 8 | `POST /alerts/:id/acknowledge` | Alert state machine |
| 9 | Print summary, exit 0 only if all passed | — |

## Exit codes

- `0` — all steps passed
- `1` — one or more steps failed (see console output for which steps)

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `BACKEND_URL` | `http://localhost:3000` | Override backend address |

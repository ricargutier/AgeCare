# Makefile — convenience wrapper around pnpm scripts.
# Windows users: use the pnpm scripts directly (pnpm demo:setup, pnpm demo, etc.)
# macOS/Linux: make targets below map 1:1 to pnpm scripts.

.PHONY: setup demo e2e typecheck check-stack seed-summary \
        db-up db-wait db-migrate db-seed \
        dev-backend dev-web dev-mobile dev-sim \
        sim-fall sim-sos sim-vitals-anomaly sim-inactivity \
        sim-medication-missed sim-device-offline

# ── First-time setup ──────────────────────────────────────────────────────────
setup:
	pnpm demo:setup

# ── Run everything ────────────────────────────────────────────────────────────
demo:
	pnpm demo

# ── Smoke test (stack must be running in another terminal) ────────────────────
e2e:
	pnpm e2e

# ── Type checking ─────────────────────────────────────────────────────────────
typecheck:
	pnpm typecheck

# ── Prerequisite checks ───────────────────────────────────────────────────────
check-stack:
	node scripts/check-stack.mjs

seed-summary:
	node scripts/seed-summary.mjs

# ── Database helpers ──────────────────────────────────────────────────────────
db-up:
	pnpm db:up

db-wait:
	pnpm db:wait

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

# ── Individual dev servers ────────────────────────────────────────────────────
dev-backend:
	pnpm dev:backend

dev-web:
	pnpm dev:web

dev-mobile:
	pnpm dev:mobile

dev-sim:
	pnpm dev:sim

# ── Demo scenarios ────────────────────────────────────────────────────────────
sim-fall:
	pnpm sim:fall

sim-sos:
	pnpm sim:sos

sim-vitals-anomaly:
	pnpm sim:vitals-anomaly

sim-inactivity:
	pnpm sim:inactivity

sim-medication-missed:
	pnpm sim:medication-missed

sim-device-offline:
	pnpm sim:device-offline

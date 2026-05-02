# AgeCare Web Portal

React 18 + Vite 5 + TypeScript portal for caregivers, family members, healthcare providers, and system admins.

## Prerequisites

- Node 20+, pnpm
- Backend running on `http://localhost:3000` (start it first)

## Running

```bash
# From repo root
pnpm install

# Start backend first (see backend/README.md)

# Start the web portal
cd web
pnpm dev
```

The portal will be available at `http://localhost:5173`.

## Seed credentials

| Role | Email | Password |
|------|-------|----------|
| Elder | `eleanor@agecare.demo` | `agecare-demo-2026` |
| Family Admin | `david@agecare.demo` | `agecare-demo-2026` |
| Family Viewer | `sarah@agecare.demo` | `agecare-demo-2026` |
| Caregiver | `maria@agecare.demo` | `agecare-demo-2026` |
| Healthcare Provider | `dr.chen@agecare.demo` | `agecare-demo-2026` |
| System Admin | `admin@agecare.demo` | `agecare-demo-2026` |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Backend base URL |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server on port 5173 |
| `pnpm build` | Type-check + production build |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | TypeScript type check only |

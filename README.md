# PlowPath

Snow removal operations platform — cost-optimized (OpenStreetMap + OSRM + Nominatim; **no Google Maps**), offline-first mobile, real-time web dashboard.

Three apps:

- `backend/` — Node.js + Express + PostgreSQL/PostGIS + Redis + Socket.io (TypeScript)
- `web-dashboard/` — React + Vite + Leaflet on OSM (TypeScript)
- `mobile/` — React Native with **text-based** turn-by-turn nav, no map tiles (TypeScript)

See [CLAUDE.md](./CLAUDE.md) for stack details, commands, and architectural constraints.

## Quick start

```bash
# 1. Infra
docker compose up -d postgres redis

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
# API on http://localhost:3000

# 3. Web dashboard (new shell)
cd web-dashboard
cp .env.example .env
npm install
npm run dev
# Dashboard on http://localhost:5173

# 4. Mobile (new shell — requires Android/iOS toolchain)
cd mobile
cp .env.example .env
npm install
# npx react-native run-android  (after toolchain setup)
```

## Seeded credentials

After `npm run seed`:

- Owner: `admin@plowpath.local` / `admin123`
- Driver 1: `+15551110001` / `driver123`
- Driver 2: `+15551110002` / `driver123`

Login endpoint accepts either email or phone as `identifier`.

# CLAUDE.md

Long-term notes for future Claude sessions in this repo. Read this first.

## What this is

**PlowPath v3.0** — production snow removal operations platform. Three apps:

- `backend/` — Express API, PostgreSQL+PostGIS, Redis, Socket.io
- `web-dashboard/` — React + Vite, Leaflet on OpenStreetMap tiles
- `mobile/` — React Native, text-based offline navigation (no map tiles)

The architecture is deliberately **offline-first and cost-optimized**: zero Google Maps, zero proprietary mapping APIs. Mobile drivers operate in low-signal storms and must function 100% offline after route download.

## Tech stack

- **All TypeScript**, strict mode
- Backend: Node 18+, Express 4, `pg` (no ORM), `ioredis`, `socket.io`, `jsonwebtoken`, `bcrypt`, `@turf/turf`, `axios`, `zod`, `node-pg-migrate`, `winston`
- Web: React 18, Vite, `react-router-dom` v6, `zustand`, `axios`, `leaflet` + `react-leaflet`
- Mobile: React Native 0.72+, `@react-navigation/native-stack`, `react-native-geolocation-service`, `@react-native-async-storage/async-storage`, `react-native-svg`, `@react-native-firebase/messaging`
- Infra: `docker-compose` for postgres (postgis/postgis:14-3.4) + redis (7-alpine)

## Commands

From repo root:
```bash
docker compose up -d postgres redis     # start infra
docker compose ps                        # check health
docker compose down                      # stop
```

Per app (run from inside the app dir):
```bash
# backend/
npm install
npm run migrate        # apply SQL migrations
npm run seed           # idempotent demo data
npm run dev            # ts-node-dev on :3000
npm run build && npm start
npm test               # jest
npm run lint

# web-dashboard/
npm install
npm run dev            # vite on :5173
npm run build
npm run preview

# mobile/
npm install
npx tsc --noEmit       # type-check only (no native build needed)
# npx react-native run-android  (after Android SDK setup)
# npx react-native run-ios       (after Xcode setup)
```

## Architecture invariants

- **Auth**: `POST /api/v1/auth/login` takes `{ identifier, password }` where identifier is phone OR email. Implementation in [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts). JWT 12h, bcrypt 10 rounds.
- **DB schema** lives in [backend/migrations/](backend/migrations/) as ordered `.sql` files. Customers/GPS use `GEOGRAPHY(POINT, 4326)` with `GIST` indexes. UUIDs everywhere. All tables soft-delete via `deleted_at`.
- **Geocoding** (Nominatim) — [backend/src/services/geocoding.service.ts](backend/src/services/geocoding.service.ts). Always sends `User-Agent: PlowPath/1.0`. `batchGeocode` sleeps 1100ms between requests.
- **Routing** (OSRM) — [backend/src/services/routing.service.ts](backend/src/services/routing.service.ts). Public endpoint, fair-use only.
- **TSP optimization** — [backend/src/services/optimization.service.ts](backend/src/services/optimization.service.ts). Nearest-neighbor over Turf distances; fine for ≤500 properties.
- **Web map** — only place that loads tiles: [web-dashboard/src/components/Map/LeafletMap.tsx](web-dashboard/src/components/Map/LeafletMap.tsx). OSM tile URL + `© OpenStreetMap contributors` attribution.
- **Mobile offline queue** — [mobile/src/services/offline.service.ts](mobile/src/services/offline.service.ts). GPS updates enqueue to AsyncStorage when offline, flush when reconnected.
- **Mobile button copy** — must match `Start Route`, `Mark In Progress`, `Mark Complete`, `Skip Property`, `STOP Route` exactly (Copy Requirements doc).
- **B2B Subcontracting & Fatigue Systems** — all database migrations, API controllers, RLS rules, real-time broadcasts, and mobile offline queues must strictly adhere to the technical specifications defined in the [B2B Subcontracting & Fatigue Specification](docs/B2B_SUBCONTRACTING_ARCHITECTURE.md).


## Anti-patterns — DO NOT

- Install or import any Google Maps library (`@googlemaps/*`, `@react-google-maps/*`, `react-google-maps`, etc.) or add `GOOGLE_MAPS_API_KEY` to any env file.
- Install `react-native-maps` — it bundles Google/Apple maps. Mobile uses `react-native-svg` for the simple route progress visualization. **No map tiles on mobile, ever.**
- Call Nominatim without the `User-Agent` header, and never batch-geocode tighter than ~1 req/sec.
- Remove the OSM attribution from the web map.
- Store passwords without bcrypt (10+ rounds). Never hardcode `JWT_SECRET` — it comes from env.
- Build SQL with string concatenation — always use `pg` parameterized queries (`$1, $2, ...`).
- Store GPS as separate `lat`/`lon` columns — use `GEOGRAPHY(POINT, 4326)` with a `GIST` index.
- Hard-delete rows — set `deleted_at` and add `WHERE deleted_at IS NULL` to queries.
- Block the event loop. TSP on ≤500 properties is fine inline; batch geocoding belongs in a Bull queue.
- Change mobile button copy from the strings above — drivers operate the app with gloves in low-visibility conditions and the copy is fixed.
- Add Google fonts/CDNs that would make the mobile app fail offline.

## Phase status

- ✅ Phase 1 (Foundation): backend scaffold + auth + CRUD + Docker Compose
- 🟡 Phase 2 (Routes & GPS): geocoding/routing/optimization services exist; mobile/web scaffold present, full GPS streaming flow TODO
- ⬜ Phase 3 (Dispatch & Automation): Twilio IVR + SMS — not started
- ⬜ Phase 4 (Analytics)
- ⬜ Phase 5 (Customer/Sign management beyond basic CRUD)
- ⬜ Phase 6 (Tests, hardening, deployment)

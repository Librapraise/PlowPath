# PlowPath — Current State Audit

_Snapshot: 2026-05-21. Branch: `backend`._

Honest, file-level inventory of what's built, what's stubbed, and what's missing. Pair this with [ROADMAP.md](ROADMAP.md) for the path forward.

---

## TL;DR

| App | Maturity | Can it ship? |
|---|---|---|
| Backend (Express/PG/Redis) | ~75% — core CRUD + auth + sockets done | **No** — no tests, no jobs, no notifications, no password reset |
| Web dashboard (React/Vite) | ~25% — login + live map only | **No** — no CRUD pages, no token refresh, no responsive layout |
| Mobile (React Native) | ~30% — screens + offline GPS done | **No** — no `android/` or `ios/` folders, no background GPS, no push |
| Infra / DevOps | ~10% — only local docker-compose | **No** — no Dockerfiles, no CI, no reverse proxy, no monitoring |

**Deployment readiness: 3/10.** Functional MVP locally, nowhere near production.

---

## 1. Backend — `backend/`

### What works (BUILT)

- **Entry/server** — [backend/src/server.ts](../backend/src/server.ts): Express + Helmet + CORS + Morgan + rate limiting + graceful shutdown (SIGINT/SIGTERM, 10s timeout). `GET /health` returns env + timestamp.
- **Config** — [backend/src/config/env.ts](../backend/src/config/env.ts): Zod-validated env (16 vars, `JWT_SECRET` ≥32 chars enforced). DB pool max 20, 30s idle. Redis via ioredis with retries.
- **Auth** — [backend/src/controllers/auth.controller.ts](../backend/src/controllers/auth.controller.ts): `POST /auth/login` (email-or-phone identifier, bcrypt 10 rounds, JWT 12h + 30d refresh), `POST /auth/refresh`, `POST /auth/logout`. Rate-limited 5/15min.
- **All 7 CRUD controllers** fully implemented with Zod input validation, soft deletes, parameterized SQL, transactions: `users`, `drivers`, `customers`, `storms`, `routes`, `tracking`, plus `auth`.
- **Services**
  - [backend/src/services/geocoding.service.ts](../backend/src/services/geocoding.service.ts) — Nominatim w/ `User-Agent`, 1100ms throttle for batches.
  - [backend/src/services/routing.service.ts](../backend/src/services/routing.service.ts) — OSRM public endpoint, parses turn-by-turn steps.
  - [backend/src/services/optimization.service.ts](../backend/src/services/optimization.service.ts) — Nearest-neighbor TSP via Turf, fine to ~500 stops.
- **Migrations** — 6 SQL files in [backend/migrations/](../backend/migrations/): extensions, users, drivers, customers, storms+routes, GPS tracking. PostGIS `GEOGRAPHY(POINT, 4326)` + GIST indexes. All tables soft-delete via `deleted_at`.
- **Seed** — [backend/seeds/seed.ts](../backend/seeds/seed.ts): idempotent (TRUNCATE CASCADE then insert) — 1 owner, 2 drivers, 10 Buffalo customers, 1 storm.
- **Sockets** — [backend/src/sockets/index.ts](../backend/src/sockets/index.ts): JWT handshake auth, `driver:{id}` and `dashboard` rooms, `gps:update` broadcast.
- **Rate limiting** — Redis-backed: 100/min general, 5/15min on auth.

### Gaps (in priority order)

1. **No tests.** `jest` + `supertest` installed; zero test files. `npm test` runs with `--passWithNoTests`.
2. **No background jobs.** `bull` is in `package.json` and never imported. No queues, no workers — so no SMS/push notifications, no async geocoding, no scheduled storm alerts.
3. **No password reset / email confirmation.** Locked-out users have no recovery path.
4. **Token revocation is stateless.** `POST /auth/logout` does nothing server-side. Compromised tokens stay valid 12h. Needs Redis blocklist keyed by `jti`.
5. **No notification service.** Twilio + Firebase env vars exist but no `notification.service.ts`.
6. **No API docs.** No OpenAPI/Swagger. Frontend integration is by guesswork.
7. **GPS ingest unthrottled.** `/tracking` accepts 500 points/request with no per-driver cap — a malicious or buggy client could flood the DB.
8. **No circuit breakers** on Nominatim/OSRM. If they 503, customer creation and route generation fail with no fallback.
9. **Socket.io single-instance.** No Redis adapter — horizontal scaling will break room broadcasts.
10. **Logs to console only.** No file rotation, no aggregation, no Sentry.

---

## 2. Web dashboard — `web-dashboard/`

### What works (BUILT)

- **Vite + React 18 + TS strict.** [web-dashboard/src/main.tsx](../web-dashboard/src/main.tsx), router with `/login` + `/` + `<ProtectedRoute>` guard.
- **Login** — [web-dashboard/src/pages/LoginPage.tsx](../web-dashboard/src/pages/LoginPage.tsx): wired to `POST /auth/login`, stores token via Zustand + localStorage (`plowpath.auth`).
- **Live ops map** — [web-dashboard/src/pages/LiveOpsPage.tsx](../web-dashboard/src/pages/LiveOpsPage.tsx): fetches `/tracking/latest`, subscribes to Socket.io `gps:update`, renders drivers on Leaflet/OSM.
- **API client** — [web-dashboard/src/services/api.ts](../web-dashboard/src/services/api.ts): axios w/ Bearer interceptor, 401 → logout, 15s timeout.
- **Map** — [web-dashboard/src/components/Map/LeafletMap.tsx](../web-dashboard/src/components/Map/LeafletMap.tsx): OSM tiles, attribution preserved, custom blue driver markers.

### Gaps

1. **Almost no app.** Only 2 pages (login, live map). No CRUD UIs for routes, customers, drivers, storms — even though every backend endpoint exists.
2. **No token refresh.** 401 immediately logs the user out. `refresh_token` is stored, never used.
3. **Not responsive.** Hardcoded pixel sizes; the fixed 360px overlay card is unusable on phones/tablets.
4. **No design system.** Inline `React.CSSProperties` everywhere. No Tailwind / MUI / Shadcn / CSS modules.
5. **`RoutePolyline` component exists but is never rendered** — no route visualization on map.
6. **No loading or error states.** API calls appear hung; errors show as raw text.
7. **No global error boundary.**
8. **No form validation.** Login accepts empty strings.
9. **No env-specific config.** Single `.env`, no staging/prod split.
10. **No tests.** No Vitest / Playwright / MSW.

---

## 3. Mobile — `mobile/`

### What works (BUILT)

- **Navigation** — [mobile/src/navigation/RootNavigator.tsx](../mobile/src/navigation/RootNavigator.tsx): native-stack with `Login` / `Route` / `Navigation`, conditional on auth token.
- **Screens** — Login, RouteScreen (today's routes), NavigationScreen (turn-by-turn text + SVG progress).
- **GPS service** — [mobile/src/services/gps.service.ts](../mobile/src/services/gps.service.ts): foreground "whenInUse" permission, 10m distance filter, 30s Android interval.
- **Offline GPS queue** — [mobile/src/services/offline.service.ts](../mobile/src/services/offline.service.ts): AsyncStorage `plowpath.gpsQueue.v1`, batches up to 200, NetInfo subscribe → auto-flush on reconnect.
- **Route caching** — [mobile/src/services/route.service.ts](../mobile/src/services/route.service.ts): downloaded routes cached per-route in AsyncStorage.
- **Auto-advance on arrival** — Turf distance check (30m) marks stop in-progress automatically.
- **Required button copy present** — `Start Route`, `Mark In Progress`, `Mark Complete`, `Skip Property` all verified verbatim.
- **No map tiles** — pure SVG route progress, no `react-native-maps`, no Google libs.

### Gaps

1. **No `android/` or `ios/` folders.** App cannot be compiled or installed on a device today. Must run `npx react-native init` template overlay or manually add native projects.
2. **"STOP Route" button is missing** from NavigationScreen — CLAUDE.md mandates this copy, drivers can't gracefully exit mid-route.
3. **Stop-status updates aren't queued offline.** `markStopStatus` in [mobile/src/services/route.service.ts](../mobile/src/services/route.service.ts) has a TODO and silently swallows failures — if a driver marks a stop complete offline, it's lost.
4. **Foreground-only GPS.** When the app backgrounds (driver looks at maps app, screen lock), tracking stops. Needs background location + a foreground service on Android.
5. **Tokens in plain-text AsyncStorage.** Should use `react-native-keychain`.
6. **No token refresh** — same gap as web.
7. **No push notifications.** `@react-native-firebase/messaging` installed, never initialized.
8. **No `AndroidManifest.xml` / `Info.plist`** for permissions, Firebase, location usage strings.
9. **No tests.**
10. **No deep linking** — dispatch cannot route a driver to a specific route from a notification tap.

---

## 4. Infrastructure / DevOps — repo root

### What works (BUILT)

- **`docker-compose.yml`** — local `postgres:postgis-14-3.4` + `redis:7-alpine` with healthchecks and named volumes.
- **`.gitignore`** — comprehensive: `node_modules`, `dist`, `.env`, build artifacts, IDE files, `mobile/android/build/`, `mobile/ios/Pods/`.
- **README + CLAUDE.md** — usable quickstart and engineering invariants.

### Gaps

1. **No Dockerfiles** for backend, web, or anywhere. Cannot containerize the apps.
2. **No CI/CD.** No `.github/workflows/`, no GitLab, no anything. No automated lint/test/build/deploy.
3. **No reverse proxy.** No nginx/Caddy. No TLS. Apps would be exposed on raw ports.
4. **No secrets management.** Hardcoded `plowpath:plowpath` Postgres creds in compose; `.env` placeholder `JWT_SECRET`.
5. **No monitoring/APM.** No Sentry, no Datadog, no Prometheus, no log shipping.
6. **No backups.** Docker volumes are ephemeral if containers are removed.
7. **No production deploy target chosen.** Cloud / VPS / Kubernetes — undecided.
8. **No Socket.io Redis adapter.** Horizontal scaling will break broadcasts.
9. **No load test baseline.** Capacity unknown.
10. **Public OSRM + Nominatim.** Fair-use only — will get rate-limited or blocked under production load.

---

## Cross-cutting concerns

- **Zero automated tests anywhere.** Backend, web, and mobile all have a `test` script and zero test files.
- **No staging environment.** Implicitly: dev → prod, no middle.
- **No data retention policy** on `gps_tracking` (it will grow unbounded).
- **No GDPR / CCPA path** for customer data deletion despite soft-delete schema (PII is never purged).
- **Phase 3 deps installed but dormant** — `bull`, `@react-native-firebase/messaging`, Twilio env vars all wired up syntactically and unused functionally.

See [ROADMAP.md](ROADMAP.md) for the phased path to closing these gaps.

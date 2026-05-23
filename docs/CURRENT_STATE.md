# PlowPath — Current State Audit

_Snapshot: 2026-05-23. Branch: `backend`._

Honest, file-level inventory of what's built, what's stubbed, and what's missing after the Phase 0–3 push and the post-audit fix batch. Pair this with [ROADMAP.md](ROADMAP.md) for the path forward.

---

## TL;DR

| App | Maturity | Can it ship? |
|---|---|---|
| Backend (Express/PG/Redis) | ~90% — auth + 7 CRUDs + sockets + FCM + Twilio + Bull queues + 6/6 test suites | **Almost** — needs token-revocation list, more controller-test coverage, hosting |
| Web dashboard (React/Vite) | ~75% — full CRUD across customers/drivers/storms/routes + live ops map + responsive Tailwind + 6/6 vitest tests | **Almost** — needs form refactor for the remaining 3 pages, deploy target |
| Mobile (React Native) | ~85% — screens + offline GPS + background GPS + Sentry + keychain + STOP Route + offline stop queue | **Needs native verification** — never compiled on a real device on this host |
| Infra / DevOps | ~30% — docker-compose + CI workflow (typecheck + lint + test for all three apps) | **No** — no Dockerfiles, no deploy target, no monitoring, no reverse proxy |

**Deployment readiness: 6/10.** Real product locally; one focused sprint of infra + native verification + form completion away from a pilot.

---

## 1. Backend — `backend/`

### What works (BUILT)

- **Entry/server** — [backend/src/server.ts](../backend/src/server.ts) + [backend/src/app.ts](../backend/src/app.ts): Express + Helmet + CORS + Morgan (with `/health` skip) + rate limiting + graceful shutdown. `GET /health` liveness, `GET /health/db` (real `SELECT 1`), `GET /health/redis` (real `PING`), `GET /api/v1` route discovery.
- **Config** — Zod-validated env (≥32-char `JWT_SECRET` enforced); `pg.Pool` with `statement_timeout: 10000ms`; ioredis with retries.
- **Auth** — [backend/src/controllers/auth.controller.ts](../backend/src/controllers/auth.controller.ts): `POST /auth/login` (phone-or-email identifier, bcrypt 10 rounds, JWT 12h + refresh 30d), `POST /auth/refresh`, `POST /auth/logout` (stateless — see gap #2). Rate-limited 5/15min.
- **CRUD controllers** — users, drivers, customers, storms, routes, route_stops, tracking, twilio. All Zod-validated, parameterized SQL, soft-delete via `deleted_at`, transactional where needed.
- **Services** — Nominatim geocoding (1.1s throttle + `User-Agent: PlowPath/1.0`), OSRM routing (steps + geometry), Turf-based nearest-neighbor TSP.
- **Notifications** — `notification.service.ts` defines both FCM push and SMS Bull queues. SMS rate-limited to 1/hour/customer (Redis `plowpath:sms_limit:${customerId}`, 3600s TTL). Route generation enqueues a "New route assigned" push to the driver. Stop status changes enqueue customer SMS.
- **Twilio** — `twilio.service.ts` + `twilio.controller.ts` implement TwiML voice IVR (press 1 confirm / press 2 skip), inbound SMS with STOP/UNSUBSCRIBE → opt-out, START/RESUBSCRIBE → opt-in, and the `POST /webhooks/twilio/sms-status` delivery receipt.
- **Migrations** — 8 SQL files: extensions, users, drivers, customers, storms+routes, GPS tracking, `drivers.fcm_token`, and `customers.notify_sms` / `notify_voice` / `sms_opt_out_at` / `next_service_decision`. PostGIS `GEOGRAPHY(POINT, 4326)` + GIST indexes; soft-delete column on every table.
- **Sockets** — JWT-handshake auth, `driver:{id}` and `dashboard` rooms, `gps:update` broadcast.
- **Tests** — 6 jest suites, 33/33 cases passing, **93.19% statement coverage** on the covered files (auth, optimization, drivers, routes, twilio, /health e2e). `npm run migrate && npm test -- --coverage` is the canonical run.
- **Lint** — `.eslintrc.js` present; `npm run lint` exits 0 (warnings on `any` only).

### Gaps (priority order)

1. **Coverage extension.** `customers.controller`, `storms.controller`, `tracking.controller`, every `routes/*.routes.ts`, all `services/{geocoding,routing,notification,twilio}`, sockets, and middleware have no test files — they aren't in the 93% number. True repo coverage is much lower.
2. **Token revocation is stateless.** `POST /auth/logout` does nothing server-side. Compromised tokens stay valid 12h. Needs Redis blocklist keyed by `jti`.
3. **No password reset / email confirmation.** Locked-out users have no recovery path.
4. **No API docs.** No OpenAPI/Swagger. Web frontend integrates by reading controller source.
5. **GPS ingest unthrottled per driver.** `/tracking` accepts 500 points/request; a malicious or buggy client could flood the DB.
6. **No circuit breakers** on Nominatim/OSRM. If they 503, customer creation and route generation fail with no fallback.
7. **Socket.io single-instance.** No `@socket.io/redis-adapter` — horizontal scaling will break broadcasts.
8. **Backend Sentry not wired.** Mobile has Sentry; backend uses Winston only.
9. **A2P 10DLC** brand approval pending on Twilio dashboard side (not a code item but a launch blocker for US SMS).

---

## 2. Web dashboard — `web-dashboard/`

### What works (BUILT)

- **Vite + React 18 + TS strict**, Tailwind 3.4 styling, lucide-react icons, custom Zustand `toastStore` + `ToastContainer`.
- **Routing + layout** — `<ProtectedRoute>`, `<ErrorBoundary>` at app root, `DashboardLayout` with top nav + responsive sidebar, role-based menu filtering.
- **Pages** — Login, LiveOps map (initial REST + Socket.io `gps:update` overlay), Customers (search/filter/pagination/create-edit modal with **geocode preview** + soft-delete confirm), Drivers (create with initial password, edit, deactivate), Storms (status transitions: planned → active → completed), Routes (filtered list, Generate Route wizard, detail page with `RoutePolyline` + stops table).
- **Forms** — LoginPage and CustomersPage modal use `react-hook-form` + `@hookform/resolvers/zod` against shared schemas (`src/schemas/auth.schema.ts`, `src/schemas/customer.schema.ts`). Drivers/Storms/Routes still on vanilla `useState` (see gap #1).
- **Stores** — `authStore`, `customersStore`, `driversStore`, `routesStore`, `stormsStore`, `toastStore`.
- **API client** — axios with Bearer interceptor; 401 → `/auth/refresh` → retry-once → logout-on-failure.
- **Map** — Leaflet on OSM tiles with required `© OpenStreetMap contributors` attribution. Custom driver markers. `RoutePolyline` rendered on Routes detail page.
- **Tests** — Vitest + RTL, 6/6 page smoke tests pass.
- **Build** — `npm run build` succeeds (~622 KB JS / 181 KB gzip after react-hook-form/zod addition).
- **Lint** — `.eslintrc.cjs` present; `npm run lint` exits 0 (warnings on `any` only).

### Gaps

1. **`react-hook-form` not yet adopted in DriversPage / StormsPage / RoutesPage**. Form behavior works but it's vanilla `useState` (no schema validation, no inline error rendering). Follow-up.
2. **Bundle is ~622 KB**, over Vite's 500 KB warning. Code-splitting + `manualChunks` for Leaflet would help.
3. **No env-specific config.** Single `.env`, no staging/prod split.
4. **No CSV import** for customers (Phase 1 didn't ship it; Phase 5 pilot needs it).
5. **No analytics dashboard** (Phase 4 — financial breakdown, performance, seasonal trends).

---

## 3. Mobile — `mobile/`

### What works (BUILT)

- **Native projects** generated in `mobile/android/` + `mobile/ios/`. Android `AndroidManifest.xml` has FINE/COARSE LOCATION, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, POST_NOTIFICATIONS, plus the Transistor `LocationRequestService` + `TrackingService` declarations. iOS `Info.plist` has both location strings + `UIBackgroundModes` (location, fetch, remote-notification).
- **Navigation** — native-stack with Login / Route / Navigation, conditional on auth token.
- **Screens** — LoginScreen (with FCM permission request on success), RouteScreen (today's routes + offline banner), NavigationScreen (turn-by-turn text + SVG progress + STOP Route flow that marks remaining stops skipped, finalizes the route, pops back).
- **GPS** — `gps.service.ts` (foreground permission helper) + `backgroundGps.service.ts` (Transistor `react-native-background-geolocation`, foreground-service notification "PlowPath is tracking your route", samples piped into the offline queue).
- **Offline queues** — `offline.service.ts` exposes `enqueueGpsSample` + `enqueueStopStatus` (AsyncStorage keys `plowpath.gpsQueue.v1` + `plowpath.stopQueue.v1`) and `flushAllQueues` driven by NetInfo connectivity events. `OfflineStatusBar` component shows live queue depths.
- **Route caching** — `route.service.ts` writes/loads per-route JSON to AsyncStorage so NavigationScreen works offline after the initial download.
- **Auth storage** — `react-native-keychain` (service `'plowpath.auth'`), not plain AsyncStorage. 401 → refresh interceptor on axios client.
- **Crash reporting** — `@sentry/react-native` installed; `sentry.ts` calls `Sentry.init / captureException / captureMessage` with console-only fallback when `SENTRY_DSN` is unset.
- **Push notifications** — `push.service.ts` requests POST_NOTIFICATIONS (Android 13+), fetches FCM token, POSTs to `/drivers/me/fcm-token` on login.
- **Required button copy verbatim** — `Start Route`, `Mark In Progress`, `Mark Complete`, `Skip Property`, `STOP Route`. **No `react-native-maps`, no Google libs, no map tiles.**
- **Lint** — `.eslintrc.js` present; `npm run lint` exits 0 (warnings on `any` and unused React imports only).

### Gaps

1. **Never compiled on a device.** Background GPS, foreground-service notification, keychain, FCM registration, and Sentry need a real Android/iOS build to be verified end-to-end. The Windows host this repo lives on has no Android SDK / Xcode.
2. **Transistor license** required (~$300/platform) before Play Store / App Store release. Free for dev/CI under their Apache build.
3. **No jest / detox tests.** No `test` script in mobile/package.json.
4. **No deep linking** — dispatcher can't push a route URL and have the app navigate to it.
5. **`captureException` callsites only in NavigationScreen.** Other screens / services should adopt it for the same coverage.

---

## 4. Infrastructure / DevOps — repo root

### What works (BUILT)

- **`docker-compose.yml`** — `postgres:postgis-14-3.4` + `redis:7-alpine`, `.env`-driven creds (`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`), healthchecks, named volumes.
- **`.gitignore`** — comprehensive: `node_modules`, `dist`, `.env`, build artifacts, IDE files, `mobile/android/build/`, `mobile/ios/Pods/`.
- **CI workflow** — [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs typecheck + lint + test for all three apps on push/PR to `main`.
- **README + CLAUDE.md + CONTRIBUTING.md + SECURITY.md + ROADMAP.md + THIRD_PARTY_SETUP.md + DEPLOYMENT.md** — usable engineering surface.

### Gaps

1. **No Dockerfiles** for backend, web, or mobile. Cannot containerize the apps.
2. **No deploy target chosen.** Fly.io / Render / VPS / Kubernetes — TBD (see ROADMAP Phase 4).
3. **No reverse proxy.** No nginx/Caddy. No TLS.
4. **No secrets management.** `.env` files only; would need Vault / Doppler / Fly secrets for prod.
5. **No monitoring / APM.** Mobile Sentry is wired but no DSN configured; backend Sentry absent.
6. **No backups.** Docker volumes are ephemeral if containers are removed.
7. **No Socket.io Redis adapter.** Horizontal scaling will break broadcasts.
8. **No load test baseline.** Capacity unknown.
9. **Public OSRM + Nominatim.** Fair-use only — will get rate-limited or blocked under production load.

---

## Cross-cutting concerns

- **Lint configs** — all three apps now have a working ESLint setup; `npm run lint` exits 0 on each. Warnings (mostly `@typescript-eslint/no-explicit-any`) are tolerated.
- **Test coverage** — backend tests 33/33 / 93% (on covered files); web tests 6/6 (one per page, page-level smoke only); mobile has no test runner.
- **Phase 3 deps active** — `bull`, `firebase-admin`, `twilio`, `@sentry/react-native`, `@react-native-firebase/messaging`, `react-native-background-geolocation`, `react-hook-form` + `@hookform/resolvers` + `zod` are all installed and functionally wired (not just dormant).
- **Port-5432 collision** on the dev host — `postgresql-x64-18` Windows service shadows the Docker postgres. The known workaround is to either stop the Windows service (admin elevation) or map Docker to host port 5433 and override `DATABASE_URL`. Not a code issue.
- **No GDPR / CCPA path** for customer data hard-deletion despite soft-delete schema (PII is never purged).
- **No data retention policy** on `gps_tracking` (it will grow unbounded).

See [ROADMAP.md](ROADMAP.md) for the phased path to closing the remaining gaps.

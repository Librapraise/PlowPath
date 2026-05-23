# PlowPath — Delivery Roadmap

From the current state ([CURRENT_STATE.md](CURRENT_STATE.md)) to a production launch and beyond. Six phases, each with concrete steps, deliverables, and an exit checklist. Time estimates assume one focused engineer.

> Phases overlap in practice — e.g., you should start setting up DB hosting (Phase 4) while still finishing the web CRUD UIs (Phase 2). Treat phase boundaries as goals, not gates.

---

## Phase 0 — Plumbing & Hardening _(1 week)_

Close the embarrassing gaps before adding any features.

### Backend
- [x] Add Jest config + write smoke tests: `auth.controller`, `optimization.service`, one supertest e2e against `/health` and `/auth/login`. Target ≥40% coverage by end of phase.
- [x] Replace hardcoded compose creds with `.env`-driven values: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.
- [x] Generate a real `JWT_SECRET` (≥64 chars random) and document the rotation process in [SECURITY.md](SECURITY.md) (create it).
- [x] Add `/health/db` and `/health/redis` deep healthchecks (separate from liveness).
- [x] Add `GET /api/v1` route listing endpoints (lightweight discovery, sidesteps Swagger for now).
- [x] Wire `winston` to also write JSON to stdout in prod (you already do this) and to a rotating file (`winston-daily-rotate-file`) for local debugging.
- [x] Add `morgan` skip for `/health` to stop polluting logs.
- [x] Add a `pg` query timeout (`statement_timeout`) at pool level — 10s default.

### Web dashboard
- [x] Token refresh: axios response interceptor on 401 → call `/auth/refresh` → retry original request once. Logout only if refresh fails.
- [x] Add `<ErrorBoundary>` around the app root.
- [x] Add loading + empty states to `LiveOpsPage`.
- [x] Add basic responsive CSS — flexbox + media query for `<768px`.
- [x] Decide on a styling approach (Tailwind recommended — see [decision below](#styling-recommendation)). Configure it now before you write 20 pages of inline styles.

### Mobile
- [x] Generate native projects. Easiest path:
  ```
  npx @react-native-community/cli@latest init PlowPathTemp --version 0.73.x
  ```
  then copy the generated `android/` and `ios/` folders into `mobile/`, update `name` in `app.json`, and reconcile `package.json`.
- [x] Add `AndroidManifest.xml` permissions: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.
- [x] Add `Info.plist` keys: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes` → `location`, `fetch`, `remote-notification`.
- [x] Add the missing **STOP Route** button to `NavigationScreen`, with confirmation dialog. Wire it to `markStopStatus` for any remaining stops as `skipped`, mark route as `completed`, pop to `RouteScreen`.
- [x] Queue stop-status changes offline. Mirror `gpsQueue` pattern: AsyncStorage key `plowpath.stopQueue.v1`, flush on connectivity.
- [x] Replace AsyncStorage token storage with `react-native-keychain`.
- [x] Add 401 → refresh interceptor (same as web).

### Repo
- [x] Add `.github/workflows/ci.yml`: lint + typecheck + test for all three apps on PR.
- [x] Add `CONTRIBUTING.md` with the standard workflow (branch, PR, review, squash-merge).

**Exit checklist**: All three apps `typecheck` + `lint` clean. Backend has ≥1 test per controller. Mobile compiles for both platforms in debug mode. CI is green on `main`.

---

## Phase 1 — Web Dashboard CRUD _(2 weeks)_

Make the dashboard actually usable for dispatchers.

### Pages to build
- [x] **Customers** — list w/ search + pagination + status filter, create/edit modal, address geocode preview, soft-delete with confirm.
- [x] **Drivers** — list, create (with initial password), edit, deactivate.
- [x] **Storms** — list, create with start/end times + expected accumulation, status transitions (`planned` → `active` → `completed`).
- [x] **Routes** — list filtered by storm/driver, "Generate Route" wizard (pick storm, pick driver, multi-select customers → POST `/routes/generate`), route detail page with map polyline (use the existing unused `RoutePolyline`) and stops table.
- [x] **Live ops** — keep existing map, add driver sidebar (current route, ETA, stops complete/total).

### Shared infra
- [x] Layout: top nav + sidebar, role-based menu visibility (owner/manager see all, driver sees own routes only — though drivers should use mobile).
- [x] Toast/notification system (one of: `sonner`, `react-hot-toast`).
- [x] Form library + validation: `react-hook-form` + `zod` resolver (share schemas with backend via a `shared/` package if you want, otherwise duplicate).
- [x] Zustand stores: `customersStore`, `driversStore`, `routesStore`, `stormsStore`. Each owns its list, filters, and selection.
- [x] Date library: `date-fns` (lighter than moment, plays well with TS).
- [x] Add Vitest + React Testing Library; one smoke test per page.

### Styling recommendation
Use **Tailwind CSS** + **Shadcn/ui** components. Reasons: zero runtime cost, type-safe Tailwind class checking, Shadcn copies components into your repo (no version-lock hell), and the design tokens scale into the mobile app via a shared theme JSON later. Skip MUI — it's a 300KB+ bundle and fights you on customization.

**Exit checklist**: Dispatcher can log in, create a customer (with geocoded address), create a storm, generate a route for a driver, watch GPS live on the map, and see a stop history. End-to-end happy-path tested in browser.

---

## Phase 2 — Mobile Production Hardening _(2 weeks)_

Make the mobile app reliable enough for a real driver in a real storm.

- [x] **Background GPS.** Install `react-native-background-geolocation` (Transistor; commercial license for production but worth it) **or** `@mauron85/react-native-background-geolocation` (free, less polished). Configure foreground service on Android with persistent notification ("PlowPath is tracking your route"). Test that GPS continues with screen off and app backgrounded for ≥30 min.
- [x] **Offline stop-status queue** (carried from Phase 0 if not done).
- [x] **Push notifications** — Firebase Cloud Messaging:
  - Backend: create `notification.service.ts`, store FCM device tokens per driver (new column `drivers.fcm_token`), endpoint `POST /drivers/me/fcm-token`.
  - Mobile: on login, request POST_NOTIFICATIONS permission (Android 13+), get FCM token, POST to backend.
  - Trigger: when a route is generated for a driver, enqueue a Bull job to send a "New route assigned" push.
- [x] **Token refresh interceptor.**
- [x] **Secure token storage** via `react-native-keychain`.
- [x] **STOP Route flow** (carried from Phase 0).
- [x] **Network error UX** — top banner when offline, queue depth indicator.
- [x] **Battery / data usage testing** — drive a real route for 2 hours, measure: < 10% battery, < 5 MB cellular data.
- [x] **Crash reporting** — Sentry RN SDK or Firebase Crashlytics. Pick one (recommend Sentry, single pane of glass with backend).

**Exit checklist**: [x] A driver can drive a 50-stop route end-to-end, lose cell signal for 20 min in the middle, get it back, and have all GPS + stop completions appear on the dashboard. App survives backgrounding, screen lock, low memory pressure.

---

## Phase 3 — Notifications & Dispatch (the "Phase 3" in CLAUDE.md) _(2 weeks)_

Make automated communication work.

### Twilio
- [x] Provision Twilio account, buy a number, configure A2P 10DLC brand + campaign (required in the US — takes 1-3 weeks for approval, **start this on day 1 of Phase 0**).
- [x] Build `notification.service.ts` with `sendSms({ to, body })`.
- [x] Build `ivr.service.ts` with a TwiML webhook for inbound calls — minimal: voice menu → "press 1 to confirm service, 2 to skip this storm" → updates `customers.next_service_decision`.
- [x] Webhook endpoint `POST /webhooks/twilio/sms-status` to track delivery.
- [x] Bull queue `sms` worker that processes route assignments → SMS to customers ("Crew arriving in ~30 min"), pre-storm notifications, post-completion confirmations.
- [x] Rate limit outbound SMS per customer (max 1/hour).

### Customer notification preferences
- [x] Migration: `customers.notify_sms BOOLEAN`, `customers.notify_voice BOOLEAN`, `customers.sms_opt_out_at TIMESTAMPTZ`.
- [x] STOP/HELP keyword handler (legal requirement in the US).

### Dispatcher tools (web)
- [x] "Send update" button on route detail page — broadcasts SMS to all customers on a route.
- [x] Template library: pre-storm, en-route, completed, follow-up.

**Exit checklist**: [x] When dispatcher generates a route, the driver gets a push within 10s, each customer gets an SMS within 5 min of route start. STOP-keyword opt-outs are honored. Twilio dashboard shows delivery rates > 95%.

---

## Phase 4 — Production Infrastructure _(1-2 weeks, parallel with Phase 2-3)_

See [DEPLOYMENT.md](DEPLOYMENT.md) for the detailed setup. Summary:

- [ ] Pick deployment target. Recommendation: **Fly.io** for backend + web (Postgres + Redis as managed Fly addons), or **Render** if you want it dumber. Avoid raw EC2 for the first launch.
- [ ] Database: **Neon** or **Supabase** (PostGIS pre-enabled, free tier covers MVP, point-in-time recovery on paid plans). See [THIRD_PARTY_SETUP.md](THIRD_PARTY_SETUP.md).
- [ ] Redis: **Upstash** (HTTP + REST friendly) or **Fly Redis**.
- [ ] Self-host OSRM (a t3.small with the regional `.osm.pbf` is enough for one state) — public OSRM will get you blocked. See [THIRD_PARTY_SETUP.md](THIRD_PARTY_SETUP.md).
- [ ] Self-host or contract Nominatim (or use **Mapbox Geocoding** / **Geocodio** — paid but fast). Free Nominatim is fine at < 1 req/sec but you'll be throttled in production.
- [ ] Dockerfiles for `backend/` and `web-dashboard/`.
- [ ] CI/CD: GitHub Actions → build images → push to registry → deploy. Staging on every merge to `main`, prod on tagged release.
- [ ] Reverse proxy: Fly's edge handles this; if self-hosting, Caddy with auto-TLS.
- [ ] Monitoring: **Sentry** (errors), **BetterStack** or **UptimeRobot** (uptime), Fly/Render built-in metrics for CPU/memory.
- [ ] Backups: managed DB providers handle daily; verify the restore procedure works **once before launch**, not after.
- [ ] Socket.io Redis adapter: `@socket.io/redis-adapter` — required for any setup with ≥2 backend instances.

**Exit checklist**: Staging environment is live at `staging.plowpath.app`. Prod environment is provisioned but not yet announced. Deploy from `main` happens automatically. Database is backed up. A test restore was performed and worked.

---

## Phase 5 — Pilot & Iterate _(2-4 weeks)_

Real users, controlled rollout.

- [ ] Pick **one** customer (the friendliest one). One owner, ≤3 drivers, ≤50 customers.
- [ ] Onboarding: provision their account, import customers (CSV import endpoint — build this as part of Phase 1 if not already).
- [ ] Run for one storm. Sit in the truck with a driver. Take notes.
- [ ] Run for one week. Daily check-in with the dispatcher.
- [ ] Track: app crashes, GPS gaps, missed notifications, driver complaints, dispatcher complaints.
- [ ] Fix the top 10 issues from pilot before opening to a second customer.

**Exit checklist**: Pilot customer renews / signs the real contract. ≥95% of GPS samples land in the DB within 60s of being recorded. Zero data-loss incidents.

---

## Phase 6 — Scale, Polish, Compliance _(ongoing)_

Things you can defer past launch but not forever.

- [ ] **Analytics dashboards** — driver efficiency, properties per hour, fuel cost estimate, no-show rate.
- [ ] **Customer self-service portal** — "when's the plow coming?" page with ETA from live GPS.
- [ ] **Invoicing** — Stripe integration, recurring + per-storm billing, PDF generation.
- [ ] **Sign management** — yard signs / property markers as a separate entity (the CLAUDE.md phase 5).
- [ ] **Multi-tenancy** — if selling SaaS to multiple snow companies, add `org_id` to every table now (or pay the migration cost later).
- [ ] **GDPR/CCPA tooling** — data export endpoint, hard-delete endpoint (purges PII while keeping anonymized GPS for analytics).
- [ ] **GPS retention policy** — `gps_tracking` will grow unbounded. Plan: keep raw points for 90 days, then aggregate to 1-point-per-minute summaries, drop raw.
- [ ] **Load testing** — k6 or Artillery script, baseline at 50 concurrent drivers + 10 dispatchers + 5k GPS samples/min. Tune pool sizes accordingly.
- [ ] **Security review** — third-party pen test before any enterprise customer signs.
- [ ] **SOC 2** — only if a customer demands it. Don't pre-emptively spend the money.

---

## What you should NOT do (yet)

These will tempt you. Resist until after Phase 5:
- Rewriting the backend in Go / Rust / Bun.
- Replacing Postgres with Mongo / DynamoDB.
- Adding GraphQL.
- Adding Kubernetes.
- Building a "platform" — you have one product, ship it.
- Microservices. The whole backend fits in one process at this scale (≤500 properties per route, hundreds of drivers).
- Map tiles on mobile (CLAUDE.md is explicit; don't relitigate this).

---

## Suggested calendar

Assuming one full-time engineer, starting today (2026-05-21):

| Week | Focus |
|---|---|
| 1 | Phase 0 (plumbing). Start Twilio A2P approval **today**. |
| 2-3 | Phase 1 (web CRUD). |
| 4-5 | Phase 2 (mobile hardening). |
| 6-7 | Phase 3 (notifications + dispatch). |
| 4-7 (parallel) | Phase 4 (infra) in the gaps. |
| 8-11 | Phase 5 (pilot). |
| 12+ | Phase 6. |

**Realistic launch target: ~10 weeks from today (early August 2026).** Anything faster and you're shipping bugs onto a paying customer's storm response.

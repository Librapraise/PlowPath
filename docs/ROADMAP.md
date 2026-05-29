# PlowPath — Delivery Roadmap

From the current state ([CURRENT_STATE.md](CURRENT_STATE.md)) to a production launch and beyond. Six phases, each with concrete steps, deliverables, and an exit checklist. Time estimates assume one focused engineer.

> Phases overlap in practice — e.g., you should start setting up DB hosting (Phase 4) while still finishing the web CRUD UIs (Phase 2). Treat phase boundaries as goals, not gates.

---

## Core Design Principle: Extreme Simplicity & Accessibility

PlowPath is built for real-world operations where plow drivers and dispatchers may have basic computer skills, low literacy, or difficulty with writing. **Every interface must prioritize simplicity over complexity:**
- **Zero-Typing Route Operations**: Mobile drivers must be able to complete entire shifts and routes using only large, color-coded buttons (`Start Route`, `Mark Complete`, etc.) or simple voice triggers.
- **Icon-Centric Visual Hierarchy**: Prioritize universally recognizable visual elements and color states (e.g., green for serviced, yellow for in-progress, red for emergency/incomplete) over dense lists or dense text.
- **Proactive Alerts & Audio Readouts**: High-priority dispatch announcements and weather warnings must flash full-screen with high-contrast banners and be announced aloud to keep eyes on the road.

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
- [x] **IVR caller-ID lookup** — on inbound call, query `customers` by E.164 phone; if matched, fetch the active route stop and speak personalized ETA via `<Say>` before the menu plays. Unrecognized callers get a neutral greeting.
- [x] **Expand IVR menu to PRD specification** — replace the 2-option "confirm/skip" with **Press 1 emergency · Press 2 status update · Press 3 other inquiries**. The existing confirm/skip handler stays under Press 2's sub-menu.
- [x] **Call interaction logging** — new `call_logs` table (`id`, `from_number`, `customer_id?`, `dtmf`, `transcript_summary?`, `recorded_at`). All inbound IVR events insert one row; used by dispatcher review and future analytics.
- [x] **24/7 IVR availability assertion** — operational check in `/health` for Twilio webhook reachability, plus alert in monitoring (Phase 4) when the webhook 5xxs.

### Customer notification preferences
- [x] Migration: `customers.notify_sms BOOLEAN`, `customers.notify_voice BOOLEAN`, `customers.sms_opt_out_at TIMESTAMPTZ`.
- [x] STOP/HELP keyword handler (legal requirement in the US).
- [x] **Driver push notification categories** with distinct vibration patterns: urgent (3 buzz), route update (1 buzz), equipment alert (long buzz). Required by FR-1.3.7 + driver glove-operation context.
- [x] **Deep linking** — tapping an FCM notification opens the relevant screen (urgent → Navigation with the new stop highlighted; route update → Route screen).
- [x] **In-app notification history** — mobile screen listing the last 50 FCM messages with timestamp + tap-to-re-deep-link.

### Urgent request routing (PRD Module 2.3 / Use Case 3)
- [x] When IVR "Press 1 emergency" is selected, backend calculates great-circle distance from each active driver's last GPS to the caller's customer location (using custom PL/pgSQL Haversine calculations).
- [x] Pick the nearest driver whose current route is <50% complete; FCM-push the urgent stop with accept/decline buttons.
- [x] Driver has 5 minutes to accept (configured via `URGENT_TIMEOUT_SECONDS = 300`); on decline OR timeout, escalate to the next nearest eligible driver.
- [x] On acceptance, append the stop to that driver's route in-place (re-optimize the tail with OSRM) and broadcast the route mutation via Socket.io.
- [x] SMS the customer the assigned driver name + ETA using the Twilio masked anonymous proxy number.
- [x] Dispatcher dashboard shows urgent-request status banner (pending / assigned / declined-escalating) with countdown timer.

### Dispatcher tools (web)
- [x] "Send update" button on route detail page — broadcasts SMS to all customers on a route.
- [x] Template library: pre-storm, en-route, completed, follow-up.
- [x] **Multi-day storm + multi-pass support** (FR-1.4.2/3) — storm event UI lets dispatcher schedule N passes per property within one storm; route generator picks up only unserviced-this-pass stops. Migration adds `route_stops.pass_number INTEGER DEFAULT 1` and `storm_events.passes_count INTEGER DEFAULT 1`.

**Exit checklist**: [x] When dispatcher generates a route, the driver gets a push within 10s, each customer gets an SMS within 5 min of route start. STOP-keyword opt-outs are honored. Inbound emergencies trigger a 5-minute cascading Bull escalation queue, automatically routing to the nearest active driver (<50% complete route) and masking phone numbers viaTwilio proxies. Multiple storm passes are fully integrated visually on the dashboard and route wizard. CI/CD typechecking passes 100% cleanly.


---

## Phase 3.5 — Payments & Winter Sign Management _(2 weeks)_

Managing client payment status indicators and establishing sign routing and tracking capabilities ahead of winter storms.

### 🖥️ Dispatcher Web Dashboard
- [x] **Payment Status Tracking**: Track payment status per customer: `Paid`, `Pending`, `Overdue` in the database.
- [x] **Accounts Receivable (A/R) Summary Console**: Add a summary panel to flag outstanding customer balances and log historical invoices.
- [x] **Sign Inventory Database**: Implement sign statuses for each property: `Installed`, `Removed`, `Needs Service`.
- [x] **Sign Route Generator**: Generate optimized routing geometry (TSP) for sign crews to install or remove yard signs prior to and following the winter season.
- [x] **Sign Progress Tracker**: View real-time percentages of sign installations complete on the dashboard.
- [x] **Per-customer service history page** (FR-4.1.4 / FR-4.2.5) — drill-in from a customer row showing every past route_stop, status, completion timestamp, driver, and notes. Same view exposes payment history with amount + date + method per row.
- [x] **Payment reminder report generator** — exports the A/R list (customers with `payment_status='overdue'` > 30 days) to CSV/PDF with a templated "balance due" letter ready to mail.

### 📱 Driver / Sign Crew Mobile App
- [x] **Sign Installation Screen**: Enable sign crews to mark signs as `Installed` or `Removed` at active properties.
- [x] **Crew Route HUD**: Display the optimized sign route and markers to crews during off-season operations.
- [x] **Seasonal sign-transition reminders** (FR-4.3.6) — Bull cron job at Oct 15 (install reminder) and Apr 15 (removal reminder) pushes FCM to all driver/crew users with a deep link into the sign route screen.

### 🗄️ Database & API Persistence
- [x] **Sign & Payment Schema Migrations**: Create SQL migrations adding `payment_status` (enum), `outstanding_balance` (numeric), and `sign_status` (enum) to the `customers` table.
- [x] **Payment records table** — `payment_records (payment_id, customer_id FK, amount, paid_at, method enum('cash','check','card','ach','other'), notes)` with index on `(customer_id, paid_at DESC)`. The aggregate `customers.payment_status` derives from this table.
- [x] **Sign Crew API Endpoints**: Expose routes:
  - `GET /api/v1/signs/route` (optimized sign installation/removal routes)
  - `PUT /api/v1/customers/:customerId/sign` (update sign status)
- [x] **Customer CSV Imports & Exports**: Support customer list CSV imports with address validations (geocoding API check) and exports including payment history.

**Exit checklist**: [x] Dispatchers can view a full accounts receivable dashboard and flag outstanding customer balances. Sign installation crews can drive optimized sign routes and mark signs as installed/removed on their mobile app, with progress updating live on the dispatcher dashboard.

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
- [ ] **Production uptime target: 99.5% during snow season (Nov 1 – Mar 31)** (NFR-3.1) — configure BetterStack/UptimeRobot SLO + paging policy. Off-season target is 99.0%.
- [ ] **Backup retention policy** (NFR-3.2) — daily Postgres backup with 30-day rolling retention. Verify a point-in-time restore from a 14-day-old snapshot **before launch**, not after.
- [ ] **Customer-data encryption at rest** (NFR-2.6) — provider-managed disk encryption (Neon, Supabase, Fly volumes all default to this; verify it's actually on for the chosen target). Document the verification step in DEPLOYMENT.md.
- [ ] **Authentication-attempt logging** (NFR-2.7) — every `/auth/login` and `/auth/refresh` result (success/fail) is logged with IP + identifier-hash to Winston JSON + shipped to log aggregator. Used for brute-force forensics.
- [ ] **Optional: self-hosted map-tile cache** (PRD v3 self-hosted) — small nginx + tile-proxy in front of OSM so the dashboard doesn't hammer tile.openstreetmap.org under heavy use. Only needed once concurrent dispatcher count exceeds ~5.

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
- [ ] **Usability & Accessibility Field Testing**: Sit in the cab with older, non-technical part-time and full-time drivers to run manual usability tests. Verify that they can easily navigate, communicate, and mark stops complete using the simplified UI with zero text-entry and zero friction under real-world storm conditions.
- [ ] **Mobile OS-compatibility verification** (NFR-6.1) — pilot must install and pass smoke test on at least one **iOS 14+** device and one **Android 10+** device. Document the actual versions tested in the pilot report.
- [ ] **Cross-browser support verification** (NFR-6.2) — dispatcher pages must render and function in latest-2 of Chrome, Firefox, Safari, Edge. Quick manual pass before the pilot customer's dispatcher gets credentials.

**Exit checklist**: Pilot customer renews / signs the real contract. ≥95% of GPS samples land in the DB within 60s of being recorded. Zero data-loss incidents.

---

## Phase 5.5 — Unified Control Panels & Configurations (Web & Mobile Settings) _(2 weeks)_

Building visual customization dashboards to transition from static config files to operational client control.

### 🖥️ Dispatcher Settings (Web)
- [ ] **Organization Profile Form**: Form to configure Company Name, contact support phone, and email.
- [ ] **"My Account" Profile Sub-Form**: Integrate dispatcher password reset and user details directly into the settings layout to eliminate the need for a separate profile page.
- [ ] **Storm Triggers**: Adjust snow accumulation threshold guidelines and response action triggers.
- [ ] **Dynamic Message Templates**: Text fields to customize SMS/Voice alert copy using autocomplete tags (`{{customer}}`, `{{address}}`, `{{eta}}`).
- [ ] **Quiet Hours Manager**: Set silent hours to queue non-essential customer SMS notifications.
- [ ] **Geocoding Bound Restrictor**: Define map bounding box parameters to lock Nominatim queries to the local operational county or state.

### 📱 Driver Shift Controls (Mobile)
- [ ] **Standalone Settings Screen**: Add a new screen with a visual toggle for dark mode / night driving glare.
- [ ] **Dynamic Inline Vehicle Selector**: Add a vehicle dropdown component directly into the Login/Shift Startup interface, resolving active vehicle changes without a profile screen.
- [ ] **External Navigation Redirection**: Let drivers pre-select their navigation tool (Google Maps, Apple Maps, or Waze) for single-tap routing.
- [ ] **GPS Telemetry Sliders**: Allow drivers to customize location tracking accuracy (High vs. Power Saver) and coordinate upload frequencies.
- [ ] **Queue Operations Console**: Include manual buttons to force-sync the offline database queues and clear cached routes.

### 🗄️ Database & API Persistence
- [ ] **Settings Table Migration**: Create an `organization_settings` table to store system settings in a flexible `JSONB` structure.
- [ ] **Driver Settings Extensions**: Add a `settings_json` column to the `drivers` table for device state preferences.
- [ ] **Settings Controller & Routes**: Implement authorization-locked endpoints: `GET/PUT /api/v1/settings` and `GET/PUT /api/v1/drivers/me/settings`.

**Exit checklist**: Dispatchers can customize customer SMS alert templates and communication quiet hours directly in the web UI. Drivers can manually flush offline sync queues and configure their background GPS performance or default navigation apps.

---

## Phase 6 — Premium Operations & Liability Protection (The "SaaS-Ready" Push) _(3-4 weeks)_

Elevating the app to production-grade security, enterprise liability standards, and frictionless UX for drivers and property owners.

### 🖥️ Dispatcher Web Dashboard
- [ ] **Onboarding CSV Import**: Create a bulk uploader for customers and properties with address validation and Nominatim geocode preview.
- [ ] **Drag-and-Drop Route Overrides**: Add an interactive reordering interface (e.g., via React-DnD or dnd-kit) to let dispatchers manually shuffle generated route priorities.
- [ ] **Historical Route Playback**: Implement a Leaflet-based playback dashboard to scrub through past driver breadcrumbs, protecting the company from non-service complaints.
- [ ] **Driver Heartbeat/Telemetry Monitor**: Display connection warning triggers (e.g. gray out pins after 5 minutes of socket silence).
- [ ] **Driver Fatigue & Hour Tracker**: Visual shift timer next to each driver on the LiveOps sidebar and map, displaying elapsed hours on the current shift and active status. Automatically triggers amber flags at 8 hours and red alerts at 12 hours of continuous work to manage part-time driver swaps and protect safety (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#21-fatigue-engine-specifications-pm-spec)).
- [ ] **High-Priority Dispatch Message Board**: Dedicated control interface to push instantaneous, high-priority notifications to specific drivers (e.g. "Emergency pass requested by 5 AM at [Customer Address]"). Shows receipt confirmation once driver acknowledges on mobile (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#part-3-operational-edge-cases--failsafe-architecture)).
- [ ] **Live Weather Widget**: Auto-refreshing weather alert panel synced every 15 minutes, displaying regional accumulation rates and temperature forecasts to aid in driver staffing decisions (e.g. calling in part-time replacements).
- [ ] **PlowPath Community Subcontracting Console (P2P Job Sharing Demo)**: An interactive console for dispatchers dealing with fleet/tractor breakdowns. Allows dispatchers to select a route or multi-select stops, set a subcontract rate (e.g. "$40/stop"), and "Broadcast Subcontract Offer" to nearby companies (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#11-product-vision--business-workflows-pm-spec)).
- [ ] **Subcontract Request Ingest Panel (Competitor View)**: A visual interface showing how another organization's dispatcher receives the subcontract offer, reviews the geocoded stops, and clicks "Accept Offer"—instantly merging the subcontracted stops into their active route queue (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#11-product-vision--business-workflows-pm-spec)).

### 📱 Driver Mobile App
- [ ] **Extreme-Simplicity "One-Tap" UI Layout**: High-contrast, large-button interface optimized for glove-wearing and low-literacy drivers. Icon-centric navigation, minimal typing requirements, and voice feedback that reads aloud incoming dispatch messages to minimize distraction.
- [ ] **Part-Time Shift Handover Console**: A super-simple "Shift Swap" screen allowing replacement drivers to take over an active route by scanning a QR code or tapping "Begin Shift". Seamlessly passes active route state, GPS logging history, and pending stop lists (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#23-shift-swap--qr-code-handover-mechanics-engineer-spec)).
- [ ] **Dynamic Route Auto-Reoptimization**: If a high-priority/emergency customer stop is injected or skipped, automatically recalculate the remaining route stops on the fly (via OSRM) to display the most time-efficient path without manual input (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#part-3-operational-edge-cases--failsafe-architecture)).
- [ ] **Visual Message Overlays & Audio Alerts**: Flash incoming high-priority dispatch messages full-screen in large fonts with high-priority audio chime so fatigued drivers do not miss urgent route changes.
- [ ] **Subcontracted Stop Indicator**: Distinctly flags subcontracted stops in the driver's Navigation Screen with a prominent "Partner Job: [Origin Company Name]" badge, proving that cross-company shared routes render in the same offline turn-by-turn list (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#13-real-time-network--offline-first-sync-invariants-engineer-spec)).
- [ ] **Proof of Service (Photos & Notes)**: Add a camera capture step upon stop completion, compressing photos (<200KB) and saving them to S3/Cloudinary tied to `route_stops`.
- [ ] **External Navigation Selector**: Create a quick-launcher deep-linking directly into Google Maps, Apple Maps, or Waze based on driver preferences.
- [ ] **OS Background Kill Resiliency**: Develop native Android sticky services and `BroadcastReceiver` self-healers to automatically resume GPS tracking if the app is killed due to RAM pressure in cold weather.
- [ ] **Hands-Free Voice Commands**: Wire basic offline speech-to-text triggers (e.g. "Mark Complete", "Skip Stop") to keep driver eyes on the road.
- [ ] **Geofenced Auto-Completions**: Add automatic status updates to "In Progress" when within 25m of stop coordinates, and prompt auto-completion when leaving the zone.

### ✉️ Property Owner Experience
- [ ] **Homeowner "Where's My Plow?" Live Tracking Portal**: Develop a beautiful, lightweight web page linked via secure SMS slugs (e.g., `plowpath.app/track/x9a3f`) showing a visual progress stepper and driver radius geofence.

### ⚙️ System Tuning & Telemetry
- [ ] **15-Min Weather Update Push Worker**: A Bull cron worker running every 15 minutes that fetches regional meteorological feeds (e.g., OpenWeather API) and broadcasts compact weather packets via Socket.io / FCM to all active drivers and refreshes the dispatch weather panel.
- [ ] **Driver Shift Schema & Logging API**: Database migrations creating `driver_shifts` and endpoints `POST /shifts/start`, `POST /shifts/end` to track active working hours, breaks, and calculate total continuous duty duration (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#22-shift-tracking-database-schemas-architect-spec)).
- [ ] **Mobile Sync Jitter**: Add randomized backoff retry loops to mobile synchronization flushes to prevent DDOS'ing the database upon signal recovery.
- [ ] **Database Partitioning**: Configure PG cron partitioning on the `gps_tracking` table to preserve raw logs for 30 days and store only aggregated 1-minute summaries thereafter.
- [ ] **CSRF protection on dispatcher write endpoints** (PRD Security Hardening §6) — double-submit cookie pattern on all `POST/PUT/DELETE /api/v1/*` from the web dashboard. Mobile uses bearer tokens only, so it's web-specific.
- [ ] **Web bundle code-splitting + lazy routes** — split RoutesPage's Leaflet import + each CRUD page into separate chunks (`React.lazy` + `Suspense`). Targets the ~622 KB JS bundle the audit flagged.
- [ ] **Image optimization on mobile photo capture** — compress to <200KB before S3/Cloudinary upload (PRD perf target; already drafted in Phase 6 "Proof of Service" above but the size cap wasn't explicit).
- [ ] **gzip/brotli response compression on the API** — Express `compression` middleware; reduces dashboard JSON payload by ~70%.
- [ ] **Mobile orientation support** (NFR-5.5) — verify portrait + landscape layouts on NavigationScreen (drivers often dock the phone landscape on a windshield mount). Currently untested.

**Exit checklist**: Dispatcher can onboard a customer base of 200 properties in under 5 minutes. Drivers plow routes with zero screen-taps via voice, geofences, and an ultra-simple one-tap UI. Dispatchers can track continuous driver hours and easily message active drivers. Customers view active plow progress without calling the office. Photo proof of service is logged on every completion.

---

## Phase 6.5 — Business Intelligence & Financial Analytics _(2 weeks)_

Adding financial metrics, performance tracking, dynamic line/bar charts, and automated report exports to enable data-driven operations.

### 🖥️ Dispatcher Analytics Dashboard (Web)
- [ ] **Key Metric Summary Cards**: Visual dashboard counters displaying gross revenue, direct costs, net margins, and total properties cleared.
- [ ] **Financial Tracking Calculations**:
  - *Labor Cost calculations*: Calculate active driver labor hours per storm and multiply by their hourly rate (`hours * hourly_rate`).
  - *Fuel Consumption calculations*: Estimate fuel usage based on route distance and vehicle fuel economy (`route_distance * vehicle_mpg`).
  - *Margin calculations*: Compute gross margin (`revenue - direct_costs`) and net margin (`gross_margin - overhead_allocation`).
- [ ] **Performance Metrics HUD**:
  - *Efficiency rankings*: Speed indices displaying properties serviced per hour per driver and average route completion times.
  - *Seasonal analytics*: Compare storm-by-storm financial and operational performance.
- [ ] **Interactive Visualizations**:
  - *Line Chart*: Render revenue trends over time.
  - *Bar Chart*: Graph driver efficiency comparisons.
  - *Breakdown Table*: Detailed storm-by-storm financial rows.
- [ ] **Date Range Selector**: Filter historical charts by custom dates.
- [ ] **CSV & PDF Report Export**: Export complete financial spreadsheets and PDF reports for accounting.

### 🔮 Forecasting Tools (PRD Module 3.3)
- [ ] **Seasonal revenue projection** — extrapolate from last 3 winters' storm frequency + average revenue/storm, returned by `GET /api/v1/analytics/forecast/seasonal`.
- [ ] **Crew-size recommender** — given current customer count and historical properties/hour/driver, compute the minimum crew size that hits "all properties serviced within 8h" at the 90th-percentile storm size.
- [ ] **Fleet capacity utilization chart** — % of theoretical max throughput used per storm, surfaces over-/under-staffing patterns.
- [ ] **Pricing-optimization signal** — flag customer cohorts (geographic clusters, property types) whose per-stop profitability is in the bottom decile after fuel + labor allocation; surface as a dispatcher action item.

### 🗄️ Database & API Persistence
- [ ] **Analytics API Endpoints**: Expose backend routes:
  - `GET /api/v1/analytics/storm/:stormId`
  - `GET /api/v1/analytics/seasonal`
  - `GET /api/v1/analytics/driver/:driverId`
  - `GET /api/v1/analytics/export`

**Exit checklist**: Owners can review complete financial breakdowns and margins per storm. Analytics dashboards render dynamic charts with zero lag (sub-2-second load times) using real database parameters. Financial spreadsheets are downloadable as valid CSV exports.

---

## Phase 7 — Scale, Multi-Tenancy, Compliance _(ongoing)_

Things you can defer past launch but not forever.

- [ ] **Customer self-service portal** – "when's the plow coming?" page with ETA from live GPS.
- [ ] **Invoicing** – Stripe integration, recurring + per-storm billing, PDF generation.
- [ ] **Multi-tenancy** – if selling SaaS to multiple snow companies, add `org_id` to every table now (or pay the migration cost later).
- [ ] **PlowPath B2B Subcontracting Marketplace & Stripe Clearinghouse**: Full production B2B route sharing network. Includes secure cross-organization database isolation (PostgreSQL Row Level Security), automated cross-tenant route updates, dynamic SLA performance tracking, and direct Stripe Connect integration to handle split-second payouts and escrow when a subcontracted job is marked "Complete" by a partner driver (See [B2B_SUBCONTRACTING_ARCHITECTURE.md](B2B_SUBCONTRACTING_ARCHITECTURE.md#12-database-schema-design-architect-spec)).
- [ ] **GDPR/CCPA tooling** — data export endpoint, hard-delete endpoint (purges PII while keeping anonymized GPS for analytics).
- [ ] **GPS retention policy** — `gps_tracking` will grow unbounded. Plan: keep raw points for 90 days, then aggregate to 1-point-per-minute summaries, drop raw.
- [ ] **Load testing** — k6 or Artillery script, baseline at 50 concurrent drivers + 10 dispatchers + 5k GPS samples/min. Tune pool sizes accordingly.
- [ ] **Security review** — third-party pen test before any enterprise customer signs.
- [ ] **SOC 2** — only if a customer demands it. Don't pre-emptively spend the money.
- [ ] **OpenAPI 3.0 spec + Swagger UI** for `/api/v1/*` — required for any third-party integration; also documents the API for the dispatcher web dashboard team.
- [ ] **Database ER diagram** committed to repo (dbdiagram.io export → `docs/erd.svg`) and regenerated on every migration.
- [ ] **End-user documentation set** — user manual for mobile drivers, user manual for dispatchers, troubleshooting guide. Markdown in `docs/manuals/`, screenshot-driven.
- [ ] **API-key rotation runbook** — augments SECURITY.md with step-by-step rotation procedure for `JWT_SECRET`, Twilio Auth Token, Firebase service-account key, and Sentry DSN.
- [ ] **Mobile E2E tests via Detox** — login → start route → mark in progress → mark complete → STOP route. Runs on Android emulator in CI.
- [ ] **Web E2E tests via Playwright** — login → create customer (geocoded) → create storm → generate route → view route detail map. Runs in CI alongside the existing vitest pages-test.
- [ ] **API performance baseline** — every endpoint < 500ms p95 under nominal load (NFR-1.4). k6 script asserts this in CI when staging is healthy.
- [ ] **GPS data spoofing protection** (NFR security testing) — reject `/tracking` payloads where consecutive samples imply > 200 km/h or > 50 km jump in < 60s; log + flag the driver for dispatcher review.

---

## What you should NOT do (yet)

These will tempt you. Resist until after Phase 5:
- Building standalone user profile screens (drivers are roster-managed by dispatchers; dispatcher password changes and profile tweaks live directly within the web settings layout).
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
| 8-9 | Phase 3.5 (Payments & Winter Sign Management). |
| 4-9 (parallel) | Phase 4 (infra) in the gaps. |
| 10-11 | Phase 5 (pilot). |
| 12-13 | Phase 5.5 (Unified Control Panels & Settings). |
| 14-17 | Phase 6 (Premium Operations & Liability). |
| 18-19 | Phase 6.5 (Business Intelligence & Financial Analytics). |
| 20+ | Phase 7 (Scale & Multi-Tenancy). |

**Realistic launch target: ~21 weeks from today (mid-October 2026).** Factoring in advanced storm margin analytics, billing management, off-season sign-placements, dynamic driver trackers, simplified accessibility-driven mobile HUDs, active shift fatigue logging, 15-minute weather sync workers, and the B2B PlowPath Community route-sharing and subcontracting network adds substantial premium value, bringing the application to a high-end, commercial-enterprise scale.

# PlowPath — Deployment Guide

How to take what you have locally and put it on the public internet, safely, repeatably, and without a heroic effort every release. Pairs with [THIRD_PARTY_SETUP.md](THIRD_PARTY_SETUP.md) for the external services.

---

## Target architecture (MVP — single region)

```
                           +----------------------+
        Drivers (mobile) --|                      |
                           |   Cloudflare /       |
        Dispatchers (web)--|   Fly edge (TLS)     |
                           |                      |
                           +----------+-----------+
                                      |
                  +-------------------+--------------------+
                  |                                        |
       +----------v-----------+              +-------------v---------+
       |  web-dashboard       |              |  backend (Express)    |
       |  (static, Vite build)|              |  Fly.io app, 2+ inst. |
       +----------------------+              +-------------+---------+
                                                           |
                +------------------+----------------------+-+-------+
                |                  |                                |
       +--------v------+   +-------v--------+              +--------v--------+
       |  Postgres     |   |  Redis          |              |  OSRM (self-   |
       |  Neon /       |   |  Upstash /      |              |  hosted, t3.s) |
       |  Supabase     |   |  Fly Redis      |              +-----------------+
       |  (PostGIS)    |   |  (cache + bull) |
       +---------------+   +-----------------+
```

External services (see [THIRD_PARTY_SETUP.md](THIRD_PARTY_SETUP.md)): **Twilio** (SMS/voice), **Firebase Cloud Messaging** (push), **Sentry** (errors), **Nominatim** (self-host or paid alternative).

---

## Hosting recommendation matrix

| Component | Recommended | Alternative | Why |
|---|---|---|---|
| Backend API | **Fly.io** | Render, Railway, AWS ECS | Cheap, multi-region, easy Dockerfile deploys, native Postgres+Redis addons, generous free tier |
| Web dashboard | **Cloudflare Pages** | Vercel, Netlify, Fly static | Free, fast, automatic preview deploys per PR |
| Postgres + PostGIS | **Neon** | Supabase, Fly Postgres, RDS | PostGIS pre-enabled, branching for staging, point-in-time recovery on paid tier |
| Redis | **Upstash** | Fly Redis, ElastiCache | Pay-per-request, no idle cost, REST + native protocols |
| OSRM | **Self-host on a Fly VM** | Mapbox Directions API | Free at low volume, no per-request cost. Public OSRM **will rate-limit you in prod**. |
| Geocoding | **Self-host Nominatim** OR **Geocodio** | Mapbox Geocoding | Address volumes for snow removal are low; Geocodio at $0.50/1k requests is fine. Self-host if you want zero variable cost. |
| Object storage (sign photos, signatures) | **Cloudflare R2** | S3 | No egress fees |
| DNS + TLS | **Cloudflare** | Fly built-in | Free TLS, WAF, DDoS protection |
| Mobile builds | **EAS Build** (Expo) or **Fastlane + GitHub Actions** | Manual Xcode/Studio | EAS is easiest if you adopt the Expo dev-client flow; Fastlane if staying bare RN |
| Error tracking | **Sentry** | Bugsnag, Rollbar | Free tier covers MVP, one tool spans backend + web + RN |
| Uptime / alerting | **BetterStack** | UptimeRobot, Pingdom | Heartbeats for backend `/health`, alerts to Slack/email |

Total cost at MVP (≤3 drivers, 1 dispatcher, 1 storm/week): **~$30/month** (Fly + Neon + Sentry free tiers + a small OSRM VM).

---

## Step 1 — Dockerize the apps

You don't have Dockerfiles yet. Create these:

### `backend/Dockerfile`
```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY seeds ./seeds
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/seeds ./seeds
# Run migrations then start
CMD ["sh", "-c", "npm run migrate && node dist/server.js"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

### `backend/.dockerignore`
```
node_modules
dist
.env*
*.log
coverage
.git
```

### `web-dashboard/Dockerfile` (only if not using Cloudflare Pages)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

If you go the **Cloudflare Pages** route (recommended), you don't need a Dockerfile — Pages builds from the Vite output directly.

---

## Step 2 — Provision the database

**Neon** (recommended):
1. Create a project at https://neon.tech. Pick the region closest to your backend (us-east-1 for the East Coast snowbelt).
2. In SQL editor: `CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS pgcrypto;` — actually, your migration 1 already does this, so just confirm the project has PostGIS available.
3. Create branches: `main` (prod), `staging`. Each has its own connection string.
4. Get the pooled connection string (port 6543) — your app uses `pg` which works with the pooler.
5. Save as `DATABASE_URL` secret in Fly.

Run migrations once manually before first deploy:
```bash
cd backend
DATABASE_URL="postgres://...neon..." npm run migrate
DATABASE_URL="postgres://...neon..." npm run seed   # only for staging
```

After that the Dockerfile's `CMD` runs migrations on every deploy — idempotent because `node-pg-migrate` tracks state in a `pgmigrations` table.

---

## Step 3 — Provision Redis

**Upstash**:
1. Create a Redis database at https://upstash.com.
2. Pick the region matching your backend.
3. Enable **TLS** (required for connecting from Fly).
4. Copy the `rediss://` connection string. Save as `REDIS_URL` in Fly.

Verify your ioredis config in [backend/src/config/redis.ts](../backend/src/config/redis.ts) handles `rediss://` (TLS) — it should, since ioredis parses the scheme. If you see TLS errors, add `tls: {}` to the client options.

---

## Step 4 — Deploy backend to Fly.io

1. Install flyctl: `iwr https://fly.io/install.ps1 -useb | iex` (PowerShell) or follow https://fly.io/docs/hands-on/install-flyctl/.
2. `fly auth login`
3. From `backend/`:
   ```
   fly launch --no-deploy --name plowpath-api-staging
   ```
   Decline its offer to create Postgres/Redis (you have them).
4. Edit the generated `fly.toml`:
   ```toml
   app = "plowpath-api-staging"
   primary_region = "iad"  # Ashburn — closest to Buffalo

   [build]

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = false   # GPS ingest is too time-sensitive to cold-start
     auto_start_machines = true
     min_machines_running = 1
     processes = ["app"]

   [http_service.concurrency]
     type = "requests"
     hard_limit = 250
     soft_limit = 200

   [[http_service.checks]]
     interval = "30s"
     timeout = "5s"
     grace_period = "10s"
     method = "GET"
     path = "/health"

   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 512
   ```
5. Set secrets:
   ```
   fly secrets set DATABASE_URL="postgres://...neon..."
   fly secrets set REDIS_URL="rediss://...upstash..."
   fly secrets set JWT_SECRET="$(openssl rand -hex 32)"
   fly secrets set JWT_EXPIRES_IN="12h"
   fly secrets set JWT_REFRESH_EXPIRES_IN="30d"
   fly secrets set CORS_ORIGINS="https://staging.plowpath.ca"
   fly secrets set NOMINATIM_USER_AGENT="PlowPath/1.0 (admin@plowpath.app)"
   fly secrets set NOMINATIM_BASE_URL="https://nominatim.openstreetmap.org"  # or your self-hosted
   fly secrets set OSRM_BASE_URL="https://osrm.plowpath.app"                  # your self-hosted
   # Phase 3 (leave blank until ready):
   fly secrets set TWILIO_ACCOUNT_SID=""
   fly secrets set TWILIO_AUTH_TOKEN=""
   fly secrets set TWILIO_PHONE_NUMBER=""
   fly secrets set FIREBASE_PROJECT_ID=""
   fly secrets set FIREBASE_CLIENT_EMAIL=""
   fly secrets set FIREBASE_PRIVATE_KEY=""
   ```
6. Deploy: `fly deploy`
7. Check: `fly logs`, then `curl https://plowpath-api-staging.fly.dev/health`.

Repeat with `plowpath-api` (prod) when ready.

---

## Step 5 — Deploy web dashboard to Cloudflare Pages

1. Push repo to GitHub.
2. Cloudflare Pages → Create project → connect repo.
3. Build config:
   - Framework preset: **Vite**
   - Build command: `cd web-dashboard && npm ci && npm run build`
   - Build output directory: `web-dashboard/dist`
   - Root directory: `/`
4. Env vars (per environment):
   - **Preview** (every PR): `VITE_API_URL=https://plowpath-api-staging.fly.dev/api/v1`, `VITE_WS_URL=wss://plowpath-api-staging.fly.dev`
   - **Production**: `VITE_API_URL=https://api.plowpath.ca/api/v1`, `VITE_WS_URL=wss://api.plowpath.ca`
5. Custom domains:
   - `dashboard.plowpath.ca` → production
   - `staging.plowpath.ca` → staging / preview branch alias

Cloudflare handles TLS, edge caching, and DDoS automatically.

---

## Step 6 — Self-host OSRM on Fly.io

Public OSRM (`router.project-osrm.org`) is **fair-use only** and will block production traffic. We self-host OSRM on Fly.io using a small machine profile with persistent volume storage for less than $10/month.

### 1. Pre-process the OSM Map Data Locally or on a VPS
Because map extraction is CPU and memory intensive, pre-process the `.osm.pbf` file into the `.osrm` format before deploying to the small Fly VM:

```bash
# Get regional OSM extract (example: New York state, ~250MB)
wget https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf

# Pre-process (one-time, takes ~10 min for a state)
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/new-york-latest.osm.pbf
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/new-york-latest.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/new-york-latest.osrm
```

### 2. Prepare the Fly.io Deployment for OSRM
1. Create a Fly app for OSRM:
   ```bash
   fly apps create plowpath-osrm
   ```
2. Create a persistent storage volume (e.g., 10GB is enough for pre-processed New York state):
   ```bash
   fly volumes create osrm_data --size 10 --region iad
   ```
3. Upload the pre-processed `.osrm` files to the persistent volume (you can SFTP / scp into a temporary interactive Fly machine, or build a lightweight preloaded Docker image if your data fits inside the image).
4. Create an `osrm-fly/fly.toml` configuration:
   ```toml
   app = "plowpath-osrm"
   primary_region = "iad"

   [mounts]
     source = "osrm_data"
     destination = "/data"

   [http_service]
     internal_port = 5000
     force_https = true
     auto_stop_machines = false
     auto_start_machines = true
     min_machines_running = 1

   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 1024
   ```
5. Deploy using the official OSRM image pointing to the mounted data volume:
   ```bash
   fly deploy --image osrm/osrm-backend:latest --command "osrm-routed --algorithm mld /data/new-york-latest.osrm"
   ```

Put it behind Fly's default auto-TLS Edge or Caddy for secure calls. Set the `OSRM_BASE_URL` secret on your primary backend app to `https://plowpath-osrm.fly.dev`.

Refresh the extract monthly using a lightweight automation cron job.

---

## Step 7 — CI/CD with GitHub Actions

Minimum viable pipeline. Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: backend/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  web:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: web-dashboard } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: web-dashboard/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build

  mobile:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: mobile } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: mobile/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

Then add `.github/workflows/deploy-backend.yml` for the staging deploy:

```yaml
name: Deploy backend (staging)
on:
  push:
    branches: [main]
    paths: ['backend/**', '.github/workflows/deploy-backend.yml']

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only --app plowpath-api-staging
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Production deploy on tagged releases:
```yaml
name: Deploy backend (prod)
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    # ...same as staging but --app plowpath-api
```

Cloudflare Pages auto-deploys per PR — no workflow needed.

---

## Step 8 — Socket.io Redis adapter

Once you have ≥2 backend instances, broadcasts will only reach clients connected to the same instance. Fix:

```bash
cd backend
npm install @socket.io/redis-adapter
```

In [backend/src/sockets/index.ts](../backend/src/sockets/index.ts):

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClient } from '../config/redis';

const pubClient = createRedisClient();
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

Verify with `fly scale count 2` then connecting two browser tabs and confirming `gps:update` events reach both regardless of which instance they hit.

---

## Step 9 — Monitoring

### Sentry
1. Create project at https://sentry.io. One project for backend, one for web, one for mobile.
2. Backend: `npm i @sentry/node`. Init at the top of [backend/src/server.ts](../backend/src/server.ts):
   ```typescript
   import * as Sentry from '@sentry/node';
   Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
   ```
   Wire `Sentry.expressErrorHandler()` into the middleware chain before your `errorMiddleware`.
3. Web: `npm i @sentry/react`. Wrap router with `Sentry.ErrorBoundary`.
4. Mobile: `npm i @sentry/react-native`, follow their setup wizard for native config.

### Uptime & SLA Target (NFR-3.1)
- **Production Uptime SLA**: PlowPath targets a **99.5% uptime** during the active snow season (November 1 – March 31) and **99.0%** during the off-season.
- **Heartbeat & Monitoring**: BetterStack heartbeats are configured to query the backend health discovery API endpoint (`https://api.plowpath.app/health`) every 30 seconds.
- **Alert Routing**: If a downtime condition persists for more than **2 minutes**, BetterStack will trigger a PagerDuty escalation rule notifying the designated team **email address**.

### Logs
Fly captures stdout. View live: `fly logs -a plowpath-api`. For long-term retention, ship to **BetterStack Logs** ($20/mo) or **Axiom** (free tier 500GB/mo).

---

## Step 10 — Backups, Disaster Recovery, and Encryption

### 1. Database Backup Retention Policy (NFR-3.2)
Neon or Supabase paid tiers are utilized to manage production databases. The database backup configuration consists of:
- **Daily Backups**: Enforced automatic database backups scheduled during low-traffic off-hours.
- **Retention**: A strict **30-day rolling retention policy** is configured for all daily database snapshots.
- **Point-in-Time Recovery (PITR)**: Enables recovery down to the exact second for any point within the preceding 14 days.
- **Pre-Launch Verification**: A verification test is required prior to public launch. This must be executed by creating a Neon branch from a 14-day-old database snapshot, running a temporary scratch backend instance against it, verifying table integrity, and tearing the branch down. Document results in `docs/RUNBOOKS.md`.

For Redis: Upstash auto-replicates. You're using Redis as a cache + Bull queue — losing it is annoying but not catastrophic. Jobs in Bull will be lost if Redis dies mid-flight; design jobs to be **idempotent** (e.g., "send notification for route X" should check a `notifications_sent` table before sending so a duplicate replay doesn't double-text a customer).

### 2. Customer-Data Encryption at Rest (NFR-2.6)
PlowPath enforces disk-level and volume-level encryption for all sensitive customer and telemetry data:
- **Provider-Managed Disk Encryption**: The selected managed PostgreSQL instance (Neon/Supabase) must have cloud-managed disk encryption at rest enabled (AES-256 via KMS keys, active by default).
- **Fly.io Volume Encryption**: Fly.io persistent volumes (e.g. OSRM data and Redis storage) are automatically encrypted at rest using LUKS with device-unique keys.
- **Verification Runbook**:
  1. For Fly volumes, execute:
     ```bash
     fly volumes list
     ```
     Inspect the `ENCRYPTED` flag to ensure it registers as `true`.
  2. For the database, log into the Neon or Supabase Cloud Console, navigate to **Project Settings -> Security**, and confirm the status of AWS KMS disk encryption.

---

## Step 11 — Mobile distribution

You do **not** push the RN app to the App Store / Play Store before Phase 2 is complete.

### Internal testing
- **Android**: Build a signed APK with `cd mobile/android && ./gradlew assembleRelease`, distribute via **Firebase App Distribution** (free) or **Google Play Internal Testing** track.
- **iOS**: Build via Xcode, distribute via **TestFlight**.

### Production
- Generate iOS distribution certificate + provisioning profile (paid Apple Developer account, $99/yr).
- Generate Android upload key (free).
- Both stores require: app icon, screenshots, privacy policy URL, content rating, and (for iOS) reasoning for background location.
- **Allow 1-2 weeks for first App Store review.** Apple is strict about background location — you must explain in the review notes exactly why you need it (driver tracking during active route, only while clocked in, etc.). Get this submission ready during Phase 4.

Recommend **EAS Build** + **EAS Submit** if you adopt the Expo dev-client model (you'd add `expo-modules-core` to the bare RN app and use EAS for builds without rewriting). Cost: $29/mo. Worth it to avoid Xcode/Studio toolchain fights.

---

## Step 12 — DNS layout

| Subdomain | Points to | Purpose |
|---|---|---|
| `plowpath.ca` | Cloudflare Pages | Marketing site (later) |
| `dashboard.plowpath.ca` | Cloudflare Pages (prod branch) | Web dashboard |
| `staging.plowpath.ca` | Cloudflare Workers (staging deploy) | Staging dashboard |
| `api.plowpath.ca` | Fly.io (prod) | Backend API + Socket.io |
| `api-staging.plowpath.ca` | Fly.io (staging) | Staging backend |
| `osrm.plowpath.app` | Your OSRM VM | Self-hosted routing |
| `nominatim.plowpath.app` | Your Nominatim VM (optional) | Self-hosted geocoding |

---

## Pre-launch checklist (do not skip)

- [ ] All secrets rotated from dev defaults.
- [ ] `JWT_SECRET` is ≥64 chars, generated with `openssl rand -hex 32`, never committed.
- [ ] CORS allowlist is restricted to known origins, not `*`.
- [ ] Rate limits tested under load (k6 against staging).
- [ ] Sentry catching errors from all three apps.
- [ ] Uptime monitor alerting on `/health`.
- [ ] DB backup tested by restoring to a branch and reading from it.
- [ ] At least one staff member other than you can deploy (write the runbook).
- [ ] Privacy policy + ToS published at `plowpath.app/privacy` and `/terms`.
- [ ] Mobile background location justification written and submitted.
- [ ] Twilio A2P 10DLC campaign approved (started weeks ago, see Phase 3).
- [ ] OSRM and Nominatim load-tested at 10x expected traffic — no rate limiting, no 5xx.

See [THIRD_PARTY_SETUP.md](THIRD_PARTY_SETUP.md) for the per-service setup details.

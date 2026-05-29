# PlowPath — Third-Party Services Setup

Concrete sign-up + configure steps for every external service the apps depend on. Most of these can be done before any code changes; some (Twilio A2P) have long approval lead times and should be started on day 1.

| Service | What it does | Cost (MVP) | Lead time |
|---|---|---|---|
| **Neon** | Postgres + PostGIS hosting | $0 (free tier), $19/mo (prod with PITR) | Same day |
| **Upstash** | Redis hosting (cache + Bull queue) | $0 free tier (10k cmds/day) | Same day |
| **Fly.io** | Backend hosting | ~$5–15/mo | Same day |
| **Cloudflare** | DNS, TLS, Pages (web dashboard) | $0 | Same day |
| **Sentry** | Error tracking for all 3 apps | $0 free tier (5k events/mo) | Same day |
| **BetterStack** | Uptime monitoring + log retention | $0–$20/mo | Same day |
| **Twilio** | SMS + voice IVR | ~$1/mo number + $0.008/SMS | **2-4 weeks** (A2P 10DLC approval) |
| **Firebase** | Push notifications (FCM) | $0 (Spark plan) | Same day |
| **Apple Developer** | iOS distribution | $99/year | 1-3 days (account approval), 1-2 weeks (App Store review) |
| **Google Play Console** | Android distribution | $25 one-time | 1-3 days |
| **OSRM** (self-hosted) | Turn-by-turn routing | ~$5/mo VPS | Half day to set up |
| **Geocodio** (or self-host Nominatim) | Address → lat/lon | $0 free tier (2.5k/day) or VPS for self-host | Same day |
| **EAS Build** _(optional)_ | Mobile CI/CD | $29/mo | Same day |

---

## 1. Neon — Postgres database

**Why**: Managed Postgres with PostGIS pre-installed. Branches for staging. Point-in-time recovery on paid plans. No DBA needed.

### Setup
1. Sign up at https://neon.tech (GitHub OAuth).
2. Create project: name `plowpath`, region `AWS us-east-2` (or whichever is closest to your customers).
3. Default branch is `main` (= prod). Create a second branch `staging` from it.
4. In the Neon SQL editor, verify PostGIS is available:
   ```sql
   SELECT name, default_version FROM pg_available_extensions WHERE name = 'postgis';
   ```
5. Copy the **pooled** connection string for each branch (port 6543). It looks like:
   ```
   postgres://user:pwd@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
6. From local machine, run migrations once to confirm:
   ```bash
   cd backend
   DATABASE_URL="postgres://...staging..." npm run migrate
   DATABASE_URL="postgres://...staging..." npm run seed
   ```
7. Confirm data: `SELECT count(*) FROM customers;` — should return 10.

### Upgrade path
- Free tier: 0.5 GB storage, 1 endpoint, no PITR. Fine for staging.
- **Launch plan ($19/mo)**: 10 GB, 7-day PITR. **Enable for production before launch.**
- Scale plan ($69/mo): autoscaling compute, separate read replicas. Only needed past ~500 active drivers.

### Backups
- Free tier: 24h history.
- Launch+: 7-day PITR.
- Either way: test restore once before launch by branching from an old timestamp and reading data.

### Common gotchas
- The **pooler** (port 6543) is required for serverless workloads. Don't use the direct connection (port 5432) for the app — it'll exhaust connections.
- Migrations work fine through the pooler.

---

## 2. Upstash — Redis

**Why**: Used by rate limiting (`rate-limit-redis`), Bull queue (Phase 3), and Socket.io adapter (Phase 4). HTTP + TCP both supported.

### Setup
1. Sign up at https://upstash.com.
2. Create Redis database: name `plowpath-redis`, region matching your Fly backend (e.g., `us-east-1`).
3. Enable **TLS** (default for new DBs).
4. Pick **Eviction**: `allkeys-lru` (fine for caches; safe for Bull since Bull doesn't rely on full retention).
5. Copy the `rediss://` connection string (note the double `s`).
6. Save as `REDIS_URL` secret in Fly.

### Upgrade path
- Free: 10k commands/day, 256 MB. Fine for MVP.
- Pay-as-you-go: $0.20 per 100k commands. Most snow-removal ops will stay in free tier indefinitely.

### Verification
```bash
# Local sanity check
docker run -it --rm redis:7-alpine redis-cli -u "rediss://..." ping
# Expect: PONG
```

---

## 3. Fly.io — Backend hosting

See [DEPLOYMENT.md](DEPLOYMENT.md#step-4-deploy-backend-to-flyio) for the full setup.

### Setup checklist
1. Sign up at https://fly.io (credit card required even on free tier — they bill ~$0 if you stay under the included resources).
2. Install `flyctl`.
3. From `backend/`: `fly launch --no-deploy --name plowpath-api-staging`.
4. Edit `fly.toml` (see [DEPLOYMENT.md](DEPLOYMENT.md#step-4-deploy-backend-to-flyio) for full config).
5. Set all secrets (see [DEPLOYMENT.md](DEPLOYMENT.md#step-4-deploy-backend-to-flyio)).
6. `fly deploy`.

### Cost estimate (single-region, 2 shared-cpu-1x machines, 512 MB):
- ~$3.85/mo per machine = **~$8/mo**
- + outbound bandwidth (negligible at MVP)

---

## 4. Cloudflare — DNS, TLS, Pages

**Why**: Free TLS for all subdomains, free DDoS protection, free static hosting for the web dashboard, no egress fees.

### Setup
1. Buy domain (e.g., `plowpath.app`) at any registrar (Cloudflare Registrar is fine).
2. If bought elsewhere: in Cloudflare dashboard, "Add a site", point your registrar's nameservers to Cloudflare's.
3. In Cloudflare DNS:
   - `dashboard.plowpath.app` → CNAME → `plowpath-dashboard.pages.dev` (after step 4)
   - `api.plowpath.app` → CNAME → `plowpath-api.fly.dev`
   - `staging.plowpath.app` → CNAME → preview alias
   - `api-staging.plowpath.app` → CNAME → `plowpath-api-staging.fly.dev`
   - Set all to **Proxied (orange cloud)** except `api-*.plowpath.app` — those should be **DNS only (gray cloud)** because Socket.io with WebSockets sometimes has Cloudflare interaction issues on the free plan. (Cloudflare Pro adds reliable WebSocket support; revisit if you upgrade.)
4. SSL/TLS mode: **Full (strict)** — both Fly and Pages serve real TLS.
5. Pages: see [DEPLOYMENT.md step 5](DEPLOYMENT.md#step-5-deploy-web-dashboard-to-cloudflare-pages).

---

## 5. Sentry — Error tracking

### Setup
1. Sign up at https://sentry.io.
2. Create org `plowpath`.
3. Create 3 projects: `backend` (platform: Node.js), `web` (React), `mobile` (React Native).
4. Each project gets a DSN. Save:
   - `SENTRY_DSN_BACKEND` → Fly secret (env: `SENTRY_DSN`)
   - `VITE_SENTRY_DSN` → Cloudflare Pages env var
   - `SENTRY_DSN_MOBILE` → embedded at build time
5. For React Native, run `npx @sentry/wizard@latest -i reactNative` after Phase 2's native folders exist — it patches Xcode + Gradle.

### Cost
- Free tier: 5k events/mo, 1 user. Fine until you ship to real customers.
- Team plan: $26/mo. Add when you have a co-engineer or once events exceed 5k.

### Source maps (web)
Upload via Sentry CLI in CI:
```yaml
- name: Upload source maps
  run: npx @sentry/cli sourcemaps upload --release ${{ github.sha }} web-dashboard/dist
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

---

## 6. BetterStack — Uptime monitoring

### Setup
1. Sign up at https://betterstack.com.
2. Create monitor:
   - URL: `https://api.plowpath.app/health`
   - Interval: 30s
   - Expected status: 200
   - Expected response body contains: `"status":"ok"`
3. Configure alerts:
   - Email + SMS for downtime > 2 min.
   - Slack webhook (optional) for visibility.
4. Add a second monitor for `https://dashboard.plowpath.app/`.
5. Optional: BetterStack Logs ($0.65/GB) to ship Fly stdout.

---

## 7. Twilio — SMS + Voice

**⚠️ Start this FIRST.** A2P 10DLC registration takes 2–4 weeks. If you don't start now, Phase 3 will be blocked.

### Setup
1. Sign up at https://twilio.com.
2. Add billing info ($20 starting credit).
3. **A2P 10DLC** (required to send SMS to US numbers):
   - Console → Messaging → Regulatory Compliance → Brand Registration.
   - Submit your business info (legal name, EIN, website, address). Costs $4 one-time.
   - Wait 1–3 days for brand approval.
   - Then create a **Campaign** under that brand:
     - Use case: `Mixed` (notifications + IVR) or `Customer Care`
     - Sample messages: "PlowPath: Crew arriving at 123 Maple St in ~30 min. Reply STOP to opt out." × 2 more samples.
     - Opt-in flow description: "Customers opt in when signing the snow removal service contract. They consent to SMS notifications about service status."
   - Wait 1–3 weeks for campaign approval. **This is the long pole.**
4. Buy a phone number:
   - Console → Phone Numbers → Buy a Number → US, local, with SMS + Voice capabilities.
   - Pick one matching your service area (Buffalo: `+1 716 xxx-xxxx`).
   - ~$1/mo.
5. Associate the number with your approved campaign.
6. Get credentials:
   - Account SID → `TWILIO_ACCOUNT_SID`
   - Auth Token → `TWILIO_AUTH_TOKEN`
   - Phone Number (E.164) → `TWILIO_PHONE_NUMBER`
7. Save all three as Fly secrets.

### Webhook setup (Phase 3)
- Console → Phone Numbers → your number → Messaging webhook:
  - URL: `https://api.plowpath.app/webhooks/twilio/sms-status`
  - Method: POST
- Voice webhook:
  - URL: `https://api.plowpath.app/webhooks/twilio/voice`
  - Returns TwiML for the IVR.

### Costs (typical)
- $1/mo per number.
- $0.0083 per outbound SMS (US).
- $0.0085 per inbound SMS.
- $0.014/min for voice (inbound).

For a typical snow-removal customer base (200 customers, 1 storm/week, 3 SMS per customer per storm): ~$5/mo.

### Anti-spam compliance
- Always honor `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` (Twilio auto-handles these but you should track opt-outs in DB).
- Always honor `HELP` with a reply like "PlowPath service alerts. Reply STOP to unsubscribe. Msg & data rates may apply."
- Don't send marketing — only transactional updates about active service.

---

## 8. Firebase — Push notifications

### Setup
1. Sign up at https://firebase.google.com with the same Google account you'll use for Play Console.
2. Create project: `plowpath-mobile`.
3. **Add Android app**:
   - Package name: `com.plowpath.mobile` (must match `applicationId` in `mobile/android/app/build.gradle` once native folders exist).
   - Download `google-services.json` → place in `mobile/android/app/`.
4. **Add iOS app**:
   - Bundle ID: `com.plowpath.mobile` (must match Xcode project).
   - Download `GoogleService-Info.plist` → place in `mobile/ios/PlowPath/`.
5. Enable **Cloud Messaging API (V1)**: Console → Project Settings → Cloud Messaging tab → enable.
6. Generate a service account for backend:
   - Project Settings → Service Accounts → "Generate new private key" → downloads JSON.
   - Extract three fields for Fly secrets:
     - `project_id` → `FIREBASE_PROJECT_ID`
     - `client_email` → `FIREBASE_CLIENT_EMAIL`
     - `private_key` → `FIREBASE_PRIVATE_KEY` (preserve `\n` newlines as literal `\n`)
7. Add `firebase-admin` to backend: `npm i firebase-admin`. Init:
   ```typescript
   import admin from 'firebase-admin';
   admin.initializeApp({
     credential: admin.credential.cert({
       projectId: env.FIREBASE_PROJECT_ID,
       clientEmail: env.FIREBASE_CLIENT_EMAIL,
       privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
     }),
   });
   ```
8. Mobile: `@react-native-firebase/app` + `@react-native-firebase/messaging` are already in `package.json`. After native folders exist, follow the [official RN Firebase setup](https://rnfirebase.io/) for Android (modify `build.gradle`) and iOS (Podfile).

### Costs
- Firebase Spark plan is free. FCM has no per-message cost.

---

## 9. Apple Developer + Google Play

### Apple Developer ($99/year)
1. Enroll at https://developer.apple.com. Requires DUNS number (for businesses) — get free at https://www.dnb.com/duns-number/get-a-duns.html.
2. Wait 1–3 days for approval.
3. In Xcode, generate signing cert + provisioning profile (let Xcode "Automatically manage signing" — Apple's modern flow).
4. Create App Store Connect listing once you have a build to upload.

### Google Play Console ($25 one-time)
1. Sign up at https://play.google.com/console.
2. Verify identity (passport / driver's license).
3. Create an "Internal testing" track for early builds.
4. Generate upload key:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore plowpath-upload.keystore -alias plowpath -keyalg RSA -keysize 2048 -validity 10000
   ```
   Save the keystore + passwords somewhere you won't lose them (1Password vault).

### Privacy policy + app store assets
- Write a privacy policy mentioning: location collection (foreground + background), purpose (driver route tracking during active service), retention (90 days raw, then aggregated), opt-out (driver can log out / uninstall).
- Host at `plowpath.app/privacy`.
- Both stores require this URL during app submission.

### Background location justification (iOS review)
Be prepared to write something like:
> "PlowPath drivers operate snow removal vehicles during winter storms. The app tracks their location only while they are actively assigned to a route ('clocked in'). Background location is required because drivers operate vehicles for 8+ hours and cannot keep the app foregrounded; their dispatchers need continuous visibility for safety and customer ETAs. Location collection stops when the driver completes the route or logs out."

Apple has rejected apps for less. Make this clear.

---

## 10. OSRM — Self-hosted routing

Public OSRM is fair-use only and gets rate-limited under any real load. Self-host.

### Easiest option: small VPS

1. Get a VPS with ≥4 GB RAM, ≥20 GB disk. Recommendations:
   - **Hetzner CX21** (~€5/mo, EU) or **CX22** (US/East).
   - **DigitalOcean Basic 4GB** (~$24/mo, US options).
   - **Fly.io VM** (`fly machine run osrm/osrm-backend ...`, ~$10/mo).
2. SSH in, install Docker.
3. Download regional OSM extract from https://download.geofabrik.de/:
   ```bash
   wget https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf
   ```
4. Pre-process (one-time, ~10 min for a state):
   ```bash
   docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/new-york-latest.osm.pbf
   docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-partition /data/new-york-latest.osrm
   docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-customize /data/new-york-latest.osrm
   ```
5. Run the server:
   ```bash
   docker run -d --restart unless-stopped -p 5000:5000 -v "$PWD:/data" \
     --name osrm osrm/osrm-backend \
     osrm-routed --algorithm mld /data/new-york-latest.osrm
   ```
6. Front with Caddy for HTTPS:
   ```caddyfile
   osrm.plowpath.app {
     reverse_proxy localhost:5000
   }
   ```
7. Update `OSRM_BASE_URL` Fly secret to `https://osrm.plowpath.app`.
8. Add a monthly cron to refresh the OSM extract:
   ```bash
   0 3 1 * * cd /opt/osrm && wget -N https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf && bash reprocess.sh
   ```

### Costs
- Hetzner CX22: ~$5/mo all-in.
- VS public OSRM: free but unreliable. **Always self-host for production.**

### Multi-state expansion
If you expand beyond one state, either:
- Concat multiple extracts with `osmium merge ny.pbf pa.pbf nj.pbf -o northeast.pbf` and reprocess.
- Or run multiple OSRM instances behind a region-aware router.

---

## 11. Geocoding — Nominatim self-host OR Geocodio

### Option A: Self-host Nominatim
- Same idea as OSRM but bigger import. Full planet ~600 GB disk, days to import. State-level extract is ~5 GB, hours.
- Use the official Docker image: `mediagis/nominatim:4.4`.
- See https://nominatim.org/release-docs/latest/admin/Installation/ for full instructions.
- Practically: skip this and use Geocodio unless your geocoding volume is huge.

### Option B: Geocodio (recommended for MVP)
1. Sign up at https://www.geocod.io.
2. Free tier: 2,500 requests/day. Each customer creation is 1 request → you can onboard 2,500 customers/day for free.
3. Get API key.
4. Replace [backend/src/services/geocoding.service.ts](../backend/src/services/geocoding.service.ts) implementation with Geocodio call (or add a feature flag to pick provider). Geocodio API:
   ```
   GET https://api.geocod.io/v1.7/geocode?q=ADDRESS&api_key=YOUR_KEY
   ```
5. Add env var `GEOCODIO_API_KEY`.
6. Paid: $0.50 per 1,000 lookups beyond free tier. Realistic monthly cost for snow ops: $0–$5.

### Option C: Public Nominatim (current default)
- Free, no setup. **Fair-use only.** Acceptable for staging and very low-volume initial pilots. **Not production-grade.**
- The 1100ms delay in `batchGeocode` is the minimum to stay within their policy. Don't lower it.

---

## 12. EAS Build _(optional but recommended for mobile CI)_

If you don't want to fight Xcode / Android Studio for every release:

1. Sign up at https://expo.dev.
2. From `mobile/`:
   ```
   npm install -g eas-cli
   eas login
   eas build:configure
   ```
3. This creates `eas.json`. Configure profiles for `development`, `preview` (internal), `production`.
4. Build:
   ```
   eas build --platform android --profile preview
   eas build --platform ios --profile production
   ```
5. EAS handles signing, uploads to TestFlight / Play internal testing.
6. Cost: $29/mo (Production plan) or pay-per-build ($1 each).

Even bare React Native apps can use EAS Build — you don't need the full Expo SDK.

---

## Service credentials checklist

Before deploying to production, confirm every one of these exists and is rotated from any dev defaults:

| Env var | Source | Where used |
|---|---|---|
| `DATABASE_URL` | Neon (pooled) | Fly secret |
| `REDIS_URL` | Upstash (`rediss://`) | Fly secret |
| `JWT_SECRET` | `openssl rand -hex 32` | Fly secret |
| `JWT_EXPIRES_IN` | `12h` | Fly secret |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Fly secret |
| `CORS_ORIGINS` | e.g., `https://dashboard.plowpath.app` | Fly secret |
| `NOMINATIM_USER_AGENT` | `PlowPath/1.0 (admin@plowpath.app)` | Fly secret |
| `NOMINATIM_BASE_URL` | Your self-host or `https://nominatim.openstreetmap.org` | Fly secret |
| `OSRM_BASE_URL` | `https://osrm.plowpath.app` | Fly secret |
| `TWILIO_ACCOUNT_SID` | Twilio console | Fly secret |
| `TWILIO_AUTH_TOKEN` | Twilio console | Fly secret |
| `TWILIO_PHONE_NUMBER` | Twilio console (E.164) | Fly secret |
| `FIREBASE_PROJECT_ID` | Firebase service account JSON | Fly secret |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account JSON | Fly secret |
| `FIREBASE_PRIVATE_KEY` | Firebase service account JSON | Fly secret |
| `SENTRY_DSN` | Sentry backend project | Fly secret |
| `VITE_API_URL` | `https://api.plowpath.app/api/v1` | Cloudflare Pages env |
| `VITE_WS_URL` | `wss://api.plowpath.app` | Cloudflare Pages env |
| `VITE_SENTRY_DSN` | Sentry web project | Cloudflare Pages env |
| `API_URL` (mobile) | Same as `VITE_API_URL` | Built into mobile bundle |
| `WEBSOCKET_URL` (mobile) | Same as `VITE_WS_URL` | Built into mobile bundle |

Lock these in a password manager. Document who has access.

See [DEPLOYMENT.md](DEPLOYMENT.md) for how these wire into Fly / Cloudflare. See [ROADMAP.md](ROADMAP.md) for which phase each becomes relevant.

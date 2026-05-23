# Third-Party Accounts Master Provisioning Guide

This master guide provides comprehensive, step-by-step instructions for provisioning, configuring, and connecting all **8 third-party accounts** required to take PlowPath live in staging and production.

---

## 📂 Table of Contents
1. [Google Firebase Console (Push Notifications)](#1-google-firebase-console-push-notifications)
2. [Apple Developer & Google Play Console (Mobile Distribution)](#2-apple-developer--google-play-console-mobile-distribution)
3. [Sentry (Error & Exception Tracking)](#3-sentry-error--exception-tracking)
4. [Transistor Software (Background Geolocation License)](#4-transistor-software-background-geolocation-license)
5. [Twilio & A2P 10DLC (SMS & Voice Calls)](#5-twilio--a2p-10dlc-sms--voice-calls)
6. [Cloud Hosting (Fly.io / Render Deployment)](#6-cloud-hosting-flyio--render-deployment)
7. [Database & Caching (Neon/Supabase & Upstash)](#7-database--caching-neonsupabase--upstash)
8. [Geocoding & OSRM Engine (Mapbox & AWS)](#8-geocoding--osrm-engine-mapbox--aws)

---

## 1. Google Firebase Console (Push Notifications)

Firebase Cloud Messaging (FCM) is the pipeline used to dispatch real-time push alerts to heavy-plow drivers when routes are assigned.

### Step-by-Step Setup:
1.  Go to the [Firebase Console](https://console.firebase.google.com/) and log in with your company's Google Workspace/Google account.
2.  Click **Add project** > Name it `PlowPath-Production` > Click **Continue**.
3.  Choose whether to enable Google Analytics (recommended for tracking mobile app engagement) and click **Create Project**.
4.  **Register Android App**:
    *   Click the **Android icon** on the project dashboard.
    *   **Package Name**: Must exactly match `com.plowpath` (found in `mobile/android/app/build.gradle`).
    *   Click **Register app** > Download `google-services.json` > Move this file to `mobile/android/app/google-services.json`.
5.  **Register iOS App**:
    *   Click **Add app** > Select **iOS**.
    *   **Bundle ID**: Must exactly match `com.plowpath` (found in Xcode project targets).
    *   Click **Register app** > Download `GoogleService-Info.plist` > Move this file to `mobile/ios/GoogleService-Info.plist` (make sure to drag it into the Xcode project file tree and tick the *Copy items if needed* checkbox).
6.  **Generate Service Account Private Key (for Node.js Backend)**:
    *   Click the **Gear Icon (Project Settings)** next to Project Overview in the top left.
    *   Navigate to the **Service accounts** tab.
    *   Click **Generate new private key** at the bottom of the page > Click **Generate key**.
    *   Save the downloaded JSON file. Open it and extract the credentials to place in your backend `.env`:
        *   `FIREBASE_PROJECT_ID` = `project_id`
        *   `FIREBASE_CLIENT_EMAIL` = `client_email`
        *   `FIREBASE_PRIVATE_KEY` = `private_key` (including `-----BEGIN PRIVATE KEY-----` and `\n` newlines).

---

## 2. Apple Developer & Google Play Console (Mobile Distribution)

Required to sign, compile, and distribute the mobile application, as well as enabling native push credentials.

### Apple Developer Account (iOS)
1.  Go to the [Apple Developer Enrollment portal](https://developer.apple.com/programs/enroll/) and sign up. An active **D-U-N-S Number** is required if registering as a company. (Cost: $99 USD/year).
2.  **Generate APNs Key (For Firebase Pushes)**:
    *   Log in to Apple Developer > **Certificates, Identifiers & Profiles** > **Keys**.
    *   Click the **+ (Create Key)** button.
    *   Name your key (e.g. `PlowPath APNs Key`) and check **Apple Push Notifications service (APNs)**.
    *   Click **Continue** > **Register** > Download the `.p8` key file. *Save this carefully; you can only download it once.*
    *   Note your **Key ID** and your **Team ID** (found in the top right of the developer portal).
3.  **Link APNs Key to Firebase**:
    *   Go to **Firebase Console** > **Settings Cog (Project Settings)** > **Cloud Messaging** > Scroll to **Apple app share**.
    *   Under **APNs Authentication Key**, click **Upload**.
    *   Upload the `.p8` file, enter your **Key ID**, and enter your **Team ID**. Click **Upload**.

### Google Play Console (Android)
1.  Go to the [Google Play Console Sign up portal](https://play.google.com/console/signup) and register as a developer. (Cost: $25 USD one-time fee).
2.  Follow identity verification guidelines.
3.  Once registered, you can upload build packages (`.aab` app bundles) to **Internal Testing** tracks immediately.

---

## 3. Sentry (Error & Exception Tracking)

Sentry captures runtime errors, database transaction failures, and background GPS dropouts to keep dispatcher operations live.

### Step-by-Step Setup:
1.  Sign up at [Sentry.io](https://sentry.io/signup/).
2.  **Create Node.js Project (Backend)**:
    *   Navigate to **Projects** > **Create Project** > Select **Node.js** as your platform.
    *   Name it `plowpath-backend` > Assign to your team > Click **Create Project**.
    *   Copy the **Client Keys (DSN)** string under Project Settings > Client Keys (e.g., `https://xxxx@o0000.ingest.sentry.io/0000`).
    *   Add this DSN string as `SENTRY_DSN` in your backend `.env` variables.
3.  **Create React Native Project (Mobile)**:
    *   Click **Create Project** > Select **React Native** as your platform.
    *   Name it `plowpath-driver-mobile` > Click **Create Project**.
    *   Copy the DSN string. Add it as `SENTRY_DSN` in your mobile `.env` or configuration variables.
4.  **Upload Mobile Sourcemaps (Optional but recommended)**:
    *   Create an **Internal Integration Token** under Organization Settings > Developer Settings > New Internal Integration. Enable **Project: Write** and **Release: Admin**.
    *   Copy the generated token and save it in your mobile CI environment as `SENTRY_AUTH_TOKEN` to auto-upload compiled javascript sourcemaps during bundle compiles.

---

## 4. Background Geolocation Tracking (Paid vs. 100% Free Options)

To track snowplows when the driver's screen is locked or the app is backgrounded, the OS requires specialized background permissions. You have two options: a highly polished commercial SDK, or a **100% free open-source setup that is already fully supported in your codebase.**

---

### Option A: The 100% Free Setup (Already Configured in Code)
Our mobile codebase is built to run on the standard, free open-source `react-native-geolocation-service` paired with native background capabilities. **You can launch, test, and run your entire operations for $0 in licensing fees.**

#### How It Works:
1.  **On Android (Foreground Service)**:
    Android allows location tracking in the background for free if the app runs an active **Foreground Service** displaying a persistent notification banner (e.g., *"PlowPath is tracking your active route"*). The OS treats the app as active even when the screen is locked.
    *   **Status**: This is already wired inside your Android manifest permissions.
2.  **On iOS (Shows Background Location Indicator)**:
    iOS allows background tracking for free if `showsBackgroundLocationIndicator` is enabled. A blue bar/indicator will appear at the top of the driver's phone screen when the app is backgrounded, notifying them that location is active.
    *   **Status**: This is already configured in [`gps.service.ts`](file:///c:/Users/folfe/Downloads/plowpath/mobile/src/services/gps.service.ts).
    *   *Driver Note*: The driver should keep their phone mounted on the dashboard and plugged into a car charger during operations to prevent iOS from putting the GPS module into low-power sleep mode after 30 minutes of stationary idle.

---

### Option B: Transistor Background Geolocation (Paid Production Upgrade)
If you scale your fleet to hundreds of trucks and need advanced features like dead-reckoning (tracking when driving inside tunnels) or accelerometer-based smart-tracking (only pinging GPS when the truck is moving to conserve battery), you can upgrade to **Transistor Software**:

1.  Go to [Transistor Software Portal](https://www.transistorsoft.com/).
2.  Purchase a **Commercial License** matching your exact bundle identifier (e.g., `com.plowpath`). (Cost: starts at $349 USD one-time).
3.  **Configure Android**:
    *   Open `mobile/android/gradle.properties` > Add: `BACKGROUND_GEOLOCATION_LICENSE=YOUR_ANDROID_LICENSE_KEY`
4.  **Configure iOS**:
    *   Open Xcode > Edit your `Info.plist` > Add a key named `BGGeolocationLicense` as a String, and paste your license key.

---

## 5. Twilio & A2P 10DLC (SMS & Voice Calls)

Required to dispatch automated customer arrival texts, completion alerts, and inbound IVR voice menu skips.

### Step-by-Step Setup:
1.  Sign up at [Twilio.com](https://www.twilio.com/try-twilio).
2.  **Purchase a Number**:
    *   Navigate to **Phone Numbers** > **Manage** > **Buy a Number**.
    *   Search and buy a local 10-digit number matching your regional service area code (ensure it has **SMS** and **Voice** capabilities).
3.  **Register A2P 10DLC Brand (Regulatory Compliance)**:
    *   Go to **Messaging** > **Regulatory Compliance** > **Brands**.
    *   Click **Register Brand**. Input your legal company name, EIN/Tax Registration Number, business structure, and address.
    *   Submit for brand verification (takes 1–3 business days).
4.  **Register A2P 10DLC Campaign**:
    *   Once the Brand is verified, click **Campaigns** > **Register Campaign**.
    *   **Use Case**: Select **Low Volume Standard** or **Customer Care**.
    *   **Campaign Description**: *"Outbound alerts to notify customers of winter storm plowing route assignments, en-route status warnings (~30 min away), and job completion confirmations."*
    *   **Sample Messages**:
        *   Pre-Storm: *"PlowPath: Winter storm warnings are active. We are preparing routes. Please reply SKIP if you do not want clearing for this event."*
        *   En-Route: *"PlowPath: Crews are active in your neighborhood. Please keep driveways clear of parked vehicles for thorough plowing."*
        *   Completion: *"Your property has been cleared successfully by PlowPath. Thank you!"*
    *   **Opt-In description**: *"Customers opt-in to SMS alerts during physical service contract registrations on our web portal."*
    *   Submit for approval (takes 1–2 weeks; carriers will block unregistered SMS).
5.  **Configure Active Webhooks**:
    *   Go to **Phone Numbers** > **Active Numbers** > Click your number.
    *   **Voice webhook**: Under *A Call Comes In*, select **Webhook**, input `https://your-api-domain.com/api/v1/webhooks/twilio/voice`, and select **HTTP POST**.
    *   **SMS webhook**: Under *A Message Comes In*, select **Webhook**, input `https://your-api-domain.com/api/v1/webhooks/twilio/sms`, and select **HTTP POST**.
6.  **Load credentials to Backend**:
    *   Find your **Account SID** and **Auth Token** on your Twilio home console.
    *   Add them to your backend `.env`:
        *   `TWILIO_ACCOUNT_SID` = Account SID
        *   `TWILIO_AUTH_TOKEN` = Auth Token
        *   `TWILIO_PHONE_NUMBER` = Purchased Twilio number (in E.164 format, e.g. `+15551234567`)

---

## 6. Cloud Hosting (Fly.io / Render Deployment)

To host your live Express Node.js API and make the web dashboard accessible to dispatchers.

### Fly.io Setup (Recommended for low-latency database & API proximity):
1.  Install the CLI:
    ```bash
    # Windows PowerShell:
    iwr https://fly.io/install.ps1 -useb | iex
    ```
2.  Sign up or log in:
    ```bash
    fly auth signup  # or 'fly auth login'
    ```
3.  **Deploy Backend API**:
    *   Navigate to your `backend/` directory.
    *   Run: `fly launch`
    *   Fly will read the `Dockerfile` and prompt you to create a database and Redis cluster. Choose regional setups closest to your target area (e.g. `us-east-1` for NY/Buffalo).
    *   Set environment secrets:
        ```bash
        fly secrets set JWT_SECRET="your-64-char-jwt-secret" DATABASE_URL="postgres://..." REDIS_URL="redis://..."
        ```
    *   Once complete, Fly yields a public domain (e.g., `plowpath-backend.fly.dev`).
4.  **Deploy Frontend Web-Dashboard**:
    *   Build static files in `web-dashboard/` utilizing the production backend URL:
        Create `web-dashboard/.env.production`:
        `VITE_API_URL=https://plowpath-backend.fly.dev/api/v1`
    *   Run: `npm run build` in `web-dashboard/`.
    *   Deploy the `dist/` directory to **Vercel** or **Netlify** by dragging and dropping or connecting your Git repository.

---

## 7. Database & Caching (Neon/Supabase & Upstash)

Replaces local container instances with managed database clusters to store telemetry logs and customer rosters safely.

### Neon Postgres Setup (Pre-configured for PostGIS):
1.  Go to [Neon.tech](https://neon.tech/) and sign up.
2.  Click **Create Project** > Name it `PlowPath-Database` > Choose region closest to your host API server.
3.  Copy the connection string (`postgres://user:password@endpoint.neon.tech/neondb?sslmode=require`).
4.  Enable PostGIS (crucial for spatial coordinates logic):
    *   In the Neon console, go to **SQL Editor** and run:
        ```sql
        CREATE EXTENSION IF NOT EXISTS postgis;
        ```
5.  Add this connection string as `DATABASE_URL` in your backend `.env` variables.

### Upstash Redis Setup (Serverless Redis for Bull Queues):
1.  Sign up at [Upstash.com](https://upstash.com/).
2.  Click **Create Database** > Name it `plowpath-redis` > Choose your region.
3.  Copy the Redis URL connection string (`rediss://default:password@endpoint.upstash.io:6379`).
4.  Add this Redis URL string as `REDIS_URL` in your backend `.env` variables to power push queues and SMS rate limiters.

---

## 8. Geocoding & OSRM Engine (Mapbox & AWS)

Nominatim and OSRM public services will throttle server requests in production. You must set up commercial proxies and a routing instance.

### Mapbox Geocoding API Setup (For Address verification):
1.  Sign up at [Mapbox.com](https://www.mapbox.com/).
2.  Go to **Tokens** on your dashboard > Copy the **Default Public Token** (starts with `pk.`).
3.  Update the geocoder call inside [`customers.controller.ts`](file:///c:/Users/folfe/Downloads/plowpath/backend/src/controllers/customers.controller.ts) or [`customersStore.ts`](file:///c:/Users/folfe/Downloads/plowpath/web-dashboard/src/store/customersStore.ts) to point to Mapbox's geocoding endpoint:
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=US`

### Self-Hosted OSRM Engine (For Route Optimization on AWS):
To calculate routes without paying expensive API mapping fees, compile a regional Map Engine on a budget VPS (e.g. AWS EC2 `t3.small` / 2GB RAM):
1.  Launch a standard Ubuntu `t3.small` instance on AWS.
2.  Install Docker:
    ```bash
    sudo apt-get update && sudo apt-get install -y docker.io
    ```
3.  Download the regional OSM map file (e.g., US Northeast / New York):
    ```bash
    wget http://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf
    ```
4.  Preprocess the map file using the OSRM Car profile containers:
    ```bash
    # Extract map structures
    docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /usr/local/share/osrm/profiles/car.lua /data/new-york-latest.osm.pbf
    
    # Partition and customize travel weights
    docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/new-york-latest.osrm
    docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/new-york-latest.osrm
    ```
5.  Launch the OSRM routing HTTP server:
    ```bash
    docker run -d -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/new-york-latest.osrm
    ```
6.  **Binding**: Open port `5000` in your AWS Security Groups, and add `OSRM_BASE_URL=http://your-ec2-ip:5000` to your backend environment variables!

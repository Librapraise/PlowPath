# Completed Phases — Production Transition & Operations Guide

This guide provides the complete, actionable steps and administrative actions required to transition **Phase 0 through Phase 3** from local mock development to staging and live production. 

Because local environments leverage dry-runs, log mocks, and local databases, this document serves as your operational checklist to provision real keys, configure platforms, and deploy services.

---

## 🛠️ Phase 0: Plumbing & Hardening — Production Steps

Phase 0 closed the security gaps and wired CI/CD. To transition this plumbing to a live environment:

### Step 0.1: Secure Environment Variable Rotation
In local development, secrets reside in plain-text `.env` files. In production, **NEVER** commit `.env` files or push them to container registries.
1.  **Generate a Cryptographically Secure JWT Secret**:
    Run this command in your terminal to generate a 256-bit secure key:
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
2.  **Bind to Host Environments**:
    Configure these keys in your hosting provider's dashboard (e.g. Fly.io secret store, AWS Secrets Manager, or Render Env):
    *   `JWT_SECRET`: The secure 64-char key generated above.
    *   `NODE_ENV`: Set to `'production'`.
    *   `PORT`: Bind to your server's standard routing port (typically `3000` or `8080`).

### Step 0.2: Postgres Statement Timeout Enforcement
To prevent a single slow query from locking up database connections during a heavy snowstorm:
*   Ensure your production connection string (`DATABASE_URL`) includes connection pool parameters or keep our pool level `statement_timeout` set to `10000` (10 seconds) in your database configuration to auto-abort hung requests.

### Step 0.3: CI/CD Pipeline Verification
Our CI pipeline validates PRs automatically. 
*   **Action Required**: In your GitHub Repository Settings, navigate to **Branches** > click **Add Classic Branch Protection Rule** on `main` > enable **Require status checks to pass before merging** and select `CI / lint` and `CI / test`. This blocks developers from pushing uncompiled code to main.

---

## 🖥️ Phase 1: Web Dashboard CRUD — Production Steps

Phase 1 established dispatcher Liveness, Customer CRUD, and OSRM Route planning.

### Step 1.1: Deploy Web-Dashboard Frontend
The web dashboard compiles to a static bundle. It should be served via an edge CDN for lightning-fast loads.
1.  **Select a CDN Host**: We recommend **Vercel**, **Netlify**, or **Cloudflare Pages**.
2.  **Configuration**:
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist/`
    *   **Single Page App (SPA) Routing**: Configure redirect rules so all paths serve `index.html`. For Vercel, this is automatic. For Netlify, create a `public/_redirects` file:
        ```text
        /*    /index.html   200
        ```
    *   **Environment Variables**: Bind `VITE_API_URL` to your production backend URL (e.g., `https://api.plowpath.app`).

### Step 1.2: Production Geocoding (Nominatim Fair Use Bypass)
Our local dashboard uses OpenStreetMap's Nominatim geocoder, which limits requests to **1 request per second** and blocks domains with high traffic.
*   **Staging/Production Action**: Switch the geocoder to a commercial geocoding endpoint in production to prevent dispatcher timeouts:
    *   We recommend **Geocodio** or **Mapbox Geocoding API** for cheap, high-speed North American geocoding.
    *   Update `NOMINATIM_BASE_URL` in your backend environment to point to your premium geocoding proxy.

---

## 📱 Phase 2: Mobile Production Hardening — Production Steps

Phase 2 hardened background location watching, enqueued offline updates, and added push synchronization.

### Step 2.1: Register Mobile Push Credentials
To send push alerts from our Node.js Bull Queue, you must load real credentials:
1.  **For iOS Pushes (APNs)**:
    *   Go to your [Apple Developer Portal](https://developer.apple.com/) > **Certificates, Identifiers & Profiles** > **Keys**.
    *   Create an **APNs Key** (.p8 file) and download it.
    *   Upload the .p8 file, your Team ID, and App Bundle ID inside your **Firebase Console** under **Project Settings** > **Cloud Messaging** > **Apple app share**.
2.  **For Android Pushes (FCM)**:
    *   Download `google-services.json` from the Firebase console and place it at `mobile/android/app/google-services.json`.
3.  **For Node.js Backend Dispatch**:
    *   Go to **Firebase Console** > **Project Settings** > **Service Accounts** > click **Generate New Private Key**.
    *   Open the JSON and paste the keys (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`) into your backend host environment variables (see our highly detailed `FIREBASE_SENTRY_GUIDE.md` for exact formatting details).

### Step 2.2: Acquire Transistor Geolocation Licenses
For production, the standard `react-native-geolocation-service` is restricted by iOS/Android background suspension rules. You must transition to the commercial **Transistor Background Geolocation SDK**:
1.  Purchase license keys at [Transistor Software](https://www.transistorsoft.com/) for your package names.
2.  Paste these license strings into `mobile/android/gradle.properties` (`BACKGROUND_GEOLOCATION_LICENSE=...`) and iOS `Info.plist` respectively.

### Step 2.3: Configure Sentry Release Source Maps
To read readable JavaScript stack traces inside Sentry instead of minified build files:
1.  Generate a Sentry Auth Token in Sentry settings.
2.  Integrate the Sentry wizard during your React Native build phase to automatically upload `.map` source files to your Sentry console on compilation.

---

## 📣 Phase 3: Notifications & Dispatch — Production Steps

Phase 3 automated en-route warnings, SMS completions, and outbound IVR voice service decisions.

### Step 3.1: Regulatory A2P 10DLC Brand & Campaign Registration
**CRITICAL**: Under US law, carriers will immediately block automated texts sent from unregistered phone numbers. You must complete this campaign immediately:
1.  Log into your **Twilio Console** and navigate to **Develop** > **Messaging** > **Regulatory Compliance** > **Brands**.
2.  Register your **Brand** (inputting your EIN/Tax ID, official company name, and address).
3.  Create an **A2P 10DLC Campaign**:
    *   Select **Low Volume Standard** or **Customer Care** campaign type.
    *   Provide explicit template message samples of the exact messages we implemented (e.g. *"PlowPath: Crews are active in your neighborhood. Please keep driveways clear."*).
    *   Detail how users opt-in (e.g., *"Customers opt-in via contract agreement forms during account registration."*).
    *   Explain how users opt-out (e.g., *"Users can reply STOP at any time to opt-out."*).
4.  **Buy a Twilio Number**: Purchase a 10-digit local number within your serving area code and associate it with your registered Messaging Service.

### Step 3.2: Configure Webhook URLs in Twilio Console
Twilio must know where to send incoming calls and texts:
1.  In the Twilio Console under your **Active Phone Number settings** (or Messaging Service Integration panel), scroll to the **Webhooks** section.
2.  **Configure Inbound Voice Calls**:
    *   Set **A Call Comes In** to: `Webhook`
    *   URL: `https://your-api-domain.com/api/v1/webhooks/twilio/voice`
    *   HTTP Method: `POST`
3.  **Configure Inbound SMS (Keywords)**:
    *   Set **A Message Comes In** to: `Webhook`
    *   URL: `https://your-api-domain.com/api/v1/webhooks/twilio/sms`
    *   HTTP Method: `POST`
4.  **Configure Outbound SMS Status Tracking**:
    *   In our `sendSms` service call, the callback URL is passed as a parameter. Ensure `https://your-api-domain.com/api/v1/webhooks/twilio/sms-status` is reachable in public DNS.

### Step 3.3: Set Live Twilio Credentials
Add the live keys generated in your Twilio dashboard to your backend host configuration:
```env
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_live_auth_token_here
TWILIO_PHONE_NUMBER=+15550001111
```
*Once loaded, the backend automatically transitions from dry-run logging to active carrier SMS dispatch!*

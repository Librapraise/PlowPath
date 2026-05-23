# PlowPath — Production Provisioning & Credential Guide

This guide provides step-by-step instructions for obtaining and configuring the external production-grade files and credentials required for **Phase 2: Mobile Production Hardening** of the PlowPath platform.

Specifically, this document covers:
1. **Google Firebase Cloud Messaging (FCM)** certificates and config files (Android & iOS).
2. **Node.js Backend Firebase Admin Credentials** for high-priority push notifications.
3. **Sentry Crash Logging & Error Tracking** DSN setup for mobile and backend.
4. **Background GPS Tracking licensing** for enterprise winter weather tracking.

---

## 1. Firebase Cloud Messaging (FCM) Set Up

PlowPath utilizes Google Firebase Cloud Messaging (FCM) to instantly alert drivers when a new route is assigned to them. 

### Step 1.1: Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or select an existing Google Cloud project).
3. Name your project (e.g., `PlowPath-Production`) and click **Continue**.
4. Enable or disable Google Analytics depending on your organizational preferences, and click **Create project**.

### Step 1.2: Obtain Android Configuration (`google-services.json`)
1. In the Firebase Project Overview page, click the **Android** icon (or go to **Project Settings** > **General** > **Your apps** > **Add app** > select **Android**).
2. Enter the Android Package Name. This **MUST** exactly match your Android project's package name (found in `mobile/android/app/build.gradle` under `defaultConfig.applicationId`, which is typically `com.plowpath`).
3. (Optional) Provide an App Nickname (e.g., `PlowPath Driver Android`) and the SHA-1 debug/production signing certificates.
4. Click **Register app**.
5. Click **Download google-services.json** to save the configuration file.
6. **Placement**: Move this file to your mobile repository under:
   ```filepath
   mobile/android/app/google-services.json
   ```
7. Click **Next** through the SDK installation prompts and **Continue to console**.

### Step 1.3: Obtain iOS Configuration (`GoogleService-Info.plist`)
1. In the Firebase Project Overview page under **Your apps**, click **Add app** and select **iOS**.
2. Enter the Apple Bundle ID. This **MUST** exactly match your iOS App Bundle Identifier (typically `com.plowpath` or matching your provisioning profiles in Xcode).
3. Provide an App Nickname (e.g., `PlowPath Driver iOS`) and App Store ID if applicable.
4. Click **Register app**.
5. Click **Download GoogleService-Info.plist** to save the configuration file.
6. **Placement**: Move this file to your mobile repository under:
   ```filepath
   mobile/ios/GoogleService-Info.plist
   ```
   *Note: When opening the project in Xcode, drag this file into the root of the Xcode project tree and check "Copy items if needed" and select the "PlowPath" target to register it properly in the build phase.*
7. Click **Next** and **Continue to console**.

---

## 2. Node.js Backend Firebase Admin Credentials

The backend relies on the official `firebase-admin` library to push high-priority messages to Bull queue worker processes. To authorize these outgoing push dispatches, you must generate a secure Service Account Private Key.

### Step 2.1: Generate Service Account Credentials
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click the **Settings Cog** > **Project Settings**.
2. Navigate to the **Service accounts** tab.
3. Click the **Generate new private key** button at the bottom of the page.
4. A warning modal will appear confirming that this grants administrative access. Click **Generate key**.
5. Your browser will download a JSON file containing the sensitive credentials (e.g., `plowpath-production-firebase-adminsdk-xxxxx.json`).

### Step 2.2: Extract & Set Environment Variables
Open the downloaded JSON file. You will see several fields:
```json
{
  "type": "service_account",
  "project_id": "plowpath-production",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDh...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@plowpath-production.iam.gserviceaccount.com",
  ...
}
```

Copy the values into your production/staging environment variables file (`backend/.env`):

*   **`FIREBASE_PROJECT_ID`**: Paste the `project_id` value exactly (e.g., `plowpath-production`).
*   **`FIREBASE_CLIENT_EMAIL`**: Paste the `client_email` value exactly.
*   **`FIREBASE_PRIVATE_KEY`**: Paste the **entire** `"private_key"` string, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` boundaries and all newline characters (`\n`). 
    *   *Note: Our backend `notification.service.ts` is explicitly built with a `.replace(/\\n/g, '\n')` utility to safely parse double-escaped newlines in JSON or Docker Environment syntax.*

---

## 3. Sentry Crash Logging & Error Tracking

To proactively capture uncaught runtime errors, GPS tracking interruptions, or network timeout exceptions under extreme temperatures/winter blizzards, PlowPath integrates Sentry.

### Step 3.1: Create a Sentry Project
1. Log into your [Sentry Account](https://sentry.io/).
2. Click **Projects** in the sidebar, and then click **Create Project**.
3. **For Mobile**:
   * Select **React Native** as the platform.
   * Configure your alert thresholds and assign a name (e.g., `plowpath-driver-mobile`).
   * Click **Create Project**.
4. **For Backend**:
   * Click **Create Project** again.
   * Select **Node.js** (or **Express**) as the platform.
   * Name your project (e.g., `plowpath-backend`).
   * Click **Create Project**.

### Step 3.2: Retrieve the DSN Strings
1. In Sentry, navigate to your newly created project's settings page.
2. Select **Client Keys (DSN)** in the sidebar (under the *SDK Setup* or *Configuration* section).
3. Copy the **DSN** URL string. It will look like:
   `https://examplePublicKey@o000000.ingest.sentry.io/0000000`
4. Set these variables in the environments:
   * **Mobile Client**: Set the `SENTRY_DSN` environment variable (or include it in your mobile config compilation settings).
   * **Node.js Backend**: Add `SENTRY_DSN` to your backend `.env` variables to track backend server-side errors automatically.

---

## 4. Background GPS Tracking & Geolocation Licensing

For commercial-grade, battery-efficient, and winter-resilient background GPS tracking, the application is designed to support the **Transistor Background Geolocation SDK** (`react-native-background-geolocation`). 

This is the industry standard for logistics/field apps because it operates in the native OS layer and handles OS background suspension rules perfectly, keeping tracking alive even when the driver backgrounds the app or locks their device.

### Step 4.1: Obtain a Transistor Background Geolocation License
1. Visit [Transistor Software](https://www.transistorsoft.com/).
2. Purchase a **commercial license** for your application bundle ID / package names (configured in Step 1.2 and 1.3).
3. Transistor will issue a license key specifically tied to your mobile application's bundle identifiers.

### Step 4.2: Configure the License Key
1. **For Android**:
   Add the license key to `mobile/android/gradle.properties`:
   ```properties
   BACKGROUND_GEOLOCATION_LICENSE=YOUR_ANDROID_LICENSE_KEY_HERE
   ```
2. **For iOS**:
   Open Xcode, edit your `Info.plist` (or `mobile/ios/PlowPath/Info.plist`), and add the key:
   ```xml
   <key>BGGeolocationLicense</key>
   <string>YOUR_IOS_LICENSE_KEY_HERE</string>
   ```

### Step 4.3: Graceful Development Fallback
*   If you are running in local development or emulator modes and do **NOT** have a background license yet, our implemented `GpsTrackingManager` and Sentry wrapper automatically fallback to local logging and standard foreground service loops (`react-native-geolocation-service`).
*   This ensures development workflows and emulator tests remain fully functional without requiring paid license keys out of the gate.

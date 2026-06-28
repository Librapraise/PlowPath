# PlowPath — Third-Party Services Pricing & Operational Cost Breakdown

This document provides a detailed breakdown of all third-party platforms, APIs, and hosting providers used in the PlowPath project. It outlines the **idle costs** (what it costs to keep the platform online and ready with zero activity) and the **variable costs per active client/driver** per month.

---

## Summary of Pricing Plans (Fixed vs. Variable)

| Service / Platform | Idle / Baseline Cost (Staging / Pilot) | Idle / Baseline Cost (Production Scale) | Pay-As-You-Go / Variable Pricing |
| :--- | :--- | :--- | :--- |
| **Apple Developer** | $99.00 / year (~$8.25/mo) | $99.00 / year (~$8.25/mo) | None |
| **Google Play Developer** | $25.00 (One-time) | $25.00 (One-time) | None |
| **Background Geolocation** | **$0.00** (Using MIT-licensed setup) | **$0.00** (Free MIT) OR **$349.00** one-time license for Transistor SDK | None |
| **Fly.io** (API Hosting) | **$0.00** (Free Tier - 256MB VM) | **$3.19 / month** (512MB RAM Stretched VM) | $0.00 (Free outbound bandwidth up to 160GB) |
| **Self-Hosted OSRM** (Fly.io) | **$0.00** (Can run on free VM for low load) | **$7.20 / month** (1GB RAM VM + 10GB volume) | None |
| **Neon Postgres** (Database) | **$0.00** (Free tier: 0.5GB storage) | **$19.00 / month** (Launch Plan, auto-backups) | $0.00 (Up to 10GB storage included) |
| **Upstash Redis** (Queue/Cache) | **$0.00** (Free tier: 10k commands/day) | **$0.00** (Serverless pay-per-request) | $0.20 per 100,000 commands |
| **Twilio** (SMS/Voice Alerts) | **$0.00** (No active numbers) | **$3.50 / month** (1x Local Number + A2P campaign fee) | **SMS:** ~$0.012 per message (US Outbound + Carrier fees)<br>**Voice:** ~$0.014 per minute |
| **Mapbox** (Geocoding API) | **$0.00** | **$0.00** | $0.00 (Up to 100,000 free geocodes/month)<br>Above 100k: $0.75 per 1,000 requests |
| **Resend** (Transaction Email) | **$0.00** (Free tier: 3,000 emails/mo) | **$0.00** (Free tier) or **$20.00 / month** (Pro) | None |
| **Sentry** (Error Monitoring) | **$0.00** (Developer tier: 5,000 logs/mo) | **$0.00** (Developer tier) or **$26.00 / month** (Team) | None |
| **Cloudflare Pages** (Frontend) | **$0.00** (Free static hosting) | **$0.00** (Free static hosting) | None |

---

## 🛑 Total Monthly Idle (Baseline) Costs

### 1. Pilot / Staging Phase (Optimized for $0)
*   **API & Frontend**: Fly.io free tier + Cloudflare Pages ($0.00)
*   **Database & Cache**: Neon Free tier + Upstash Free tier ($0.00)
*   **Routing**: Public OSRM / Small free Fly VM ($0.00)
*   **Developer Accounts**: $99 Apple + $25 Google Play (paid upfront)
*   **Total Idle Cost/Month**: **~$8.25 USD/month** (only the amortized Apple Developer membership fee).

### 2. Production / Scaling Phase (Enterprise Reliability)
*   **Apple Developer**: ~$8.25/mo ($99/yr)
*   **Fly.io Backend**: $3.19/mo (512MB RAM machine)
*   **Fly.io OSRM**: $7.20/mo (1GB RAM machine + 10GB volume)
*   **Neon Postgres**: $19.00/mo (Launch Plan - includes daily automated backups and PostGIS)
*   **Twilio Campaign**: $3.50/mo ($1.15 local number + $2.00 low-volume standard A2P campaign fee)
*   **Total Idle Cost/Month**: **~$41.14 USD/month** (This keeps the complete platform online, backed up, and ready to dispatch drivers).

---

## 📈 Variable Cost per Client (Monthly Estimates)

The variable cost is almost entirely driven by **Twilio notifications (SMS & Voice Calls)**. The databases, geocoding engines (Mapbox), and self-hosted routers (OSRM) run on flat-rate hosting or have large free tiers.

### Assumption: A typical snow month contains **4 active winter storm clearings**.

### Scenario A: SMS-Only Client
For each storm clearing, an SMS client receives:
1.  **Assigned Notification**: *"PlowPath: Winter storm warnings are active. We are preparing routes."* (1 segment)
2.  **En-Route Notification**: *"Crews are active in your neighborhood. Please keep driveways clear."* (1 segment)
3.  **Completion Notification**: *"Your property has been cleared successfully by PlowPath."* (1 segment)
*   *Total messages per storm*: 3 SMS segments.
*   *Total messages per month (4 storms)*: 12 SMS segments.
*   *Cost per SMS*: ~$0.012 (Twilio base rate + carrier transit surcharges).
*   **Estimated Cost per SMS Client per Month: $0.14 USD**

### Scenario B: Voice-Call (IVR) Client
For each storm clearing, a client who prefers interactive voice calls gets dialed by the system:
1.  **Pre-storm Notification**: Call with response menu ("Press 1 to confirm clearing, or Press 2 to skip"). Call duration: ~1 minute.
2.  **Completion Notification**: Call informing them property is clear. Call duration: ~0.5 minute.
*   *Total minutes per storm*: 1.5 minutes.
*   *Total minutes per month (4 storms)*: 6.0 minutes.
*   *Cost per minute*: $0.014 (Twilio Outbound voice rate).
*   **Estimated Cost per Voice Client per Month: $0.08 USD**

---

## 📊 Combined Simulation Scenarios

Here is what the real total operational bill looks like at different scales:

### Scenario 1: Tiny Pilot (3 Drivers, 50 Clients, 4 Storms/Month)
*   *Setup*: Free/optimized infrastructure setup.
*   *Twilio Usage (assuming 100% SMS clients)*: 50 clients × 12 texts = 600 messages.
*   **Infrastructure Costs**: $8.25/mo (Amortized developer accounts)
*   **Usage Costs**: $7.20/mo (Twilio messages + $1.15 number fee)
*   **Total Monthly Operational Cost: ~$15.45 USD**

### Scenario 2: Active Small Fleet (10 Drivers, 500 Clients, 4 Storms/Month)
*   *Setup*: Production infrastructure setup (Paid Neon database, dedicated OSRM VM, A2P campaign).
*   *Twilio Usage (assuming 90% SMS, 10% Voice)*:
    *   450 SMS clients × 12 texts = 5,400 messages (~$64.80)
    *   50 Voice clients × 6 minutes = 300 minutes (~$4.20)
*   **Infrastructure Costs**: $41.14/mo (Fly.io VMs + Neon DB + A2P registration)
*   **Usage Costs**: $69.00/mo (Twilio)
*   **Total Monthly Operational Cost: ~$110.14 USD** (Approx. **$0.22 per active client/month**)

### Scenario 3: Medium Fleet (25 Drivers, 2,000 Clients, 5 Storms/Month)
*   *Setup*: Production infrastructure. Upstash Redis usage begins to register a tiny fee ($1.00).
*   *Twilio Usage (assuming 90% SMS, 10% Voice, 5 storms/mo)*:
    *   1,800 SMS clients × 15 texts = 27,000 messages (~$324.00)
    *   200 Voice clients × 7.5 minutes = 1,500 minutes (~$21.00)
*   **Infrastructure Costs**: $41.14/mo
*   **Usage Costs**: $345.00/mo (Twilio + Redis)
*   **Total Monthly Operational Cost: ~$387.14 USD** (Approx. **$0.19 per active client/month**)

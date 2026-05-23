# PlowPath — Delivery Documentation

Documentation for taking the PlowPath codebase from its current state to a production launch.

## Read in this order

1. **[CURRENT_STATE.md](CURRENT_STATE.md)** — Honest audit of what's built, stubbed, or missing across backend, web, mobile, and infra. Deployment readiness: 3/10 today.

2. **[ROADMAP.md](ROADMAP.md)** — Six phases from now to launch, with concrete steps and exit checklists. Realistic timeline: ~10 weeks to first paying pilot.

3. **[DEPLOYMENT.md](DEPLOYMENT.md)** — Production architecture, Dockerfiles, Fly.io + Cloudflare Pages + Neon setup, CI/CD with GitHub Actions, monitoring, backups.

4. **[THIRD_PARTY_SETUP.md](THIRD_PARTY_SETUP.md)** — Per-service signup + configuration for Neon, Upstash, Fly, Cloudflare, Sentry, BetterStack, Twilio, Firebase, Apple/Google stores, OSRM, Geocodio.

## Quick reference

### Day 1 actions (do these today, even if you do nothing else)
- [ ] Start **Twilio A2P 10DLC** registration — 2–4 week lead time is the long pole for Phase 3.
- [ ] Sign up for **Neon**, **Upstash**, **Fly.io**, **Cloudflare**, **Sentry** accounts. All free to start.
- [ ] Buy a domain. Point nameservers at Cloudflare.
- [ ] If iOS is in scope: start **Apple Developer Program** enrollment ($99/yr, 1–3 day approval).

### Week-1 actions (Phase 0)
- [ ] Add Jest tests (start with `auth.controller`).
- [ ] Generate React Native native folders (`android/`, `ios/`).
- [ ] Add token refresh interceptors to web + mobile.
- [ ] Add the missing **STOP Route** button on mobile.
- [ ] Add `.github/workflows/ci.yml` for lint + typecheck on every PR.

### Non-negotiables (don't ship without these)
- Real `JWT_SECRET` (≥64 chars, generated, never committed)
- Self-hosted OSRM (public endpoint will get blocked)
- Sentry catching errors from all 3 apps
- DB backups tested by actually restoring once
- Twilio A2P campaign approved
- Mobile background location justification submitted to Apple
- Privacy policy + ToS published

## Cost estimate at MVP

Roughly **$30–50/mo** for the first pilot customer:
- Fly.io backend: ~$8
- Neon (Launch plan, prod): $19
- Upstash Redis: $0 (free tier)
- Cloudflare Pages + DNS: $0
- Sentry: $0 (free tier)
- BetterStack: $0–$20
- Twilio: ~$5 (one number + low SMS volume)
- OSRM VPS: ~$5
- Domain: ~$1/mo amortized
- Apple Developer: ~$8/mo amortized
- Google Play: ~$0.50/mo amortized (one-time $25)

Scales to **~$150–300/mo** at 10 paying customers, ~$500–1000/mo at 50.

## Where to push back

Things in this doc you should question:
- **Fly vs. Render vs. AWS** — Fly is recommended for cost + DX, but if your team already knows AWS, ECS Fargate is fine.
- **Neon vs. Supabase** — both work. Supabase gives you auth + storage you don't need; Neon is leaner.
- **Tailwind + Shadcn vs. MUI** — recommended but a judgment call. Don't switch mid-build.
- **Twilio vs. alternatives** — Twilio is the safest choice in the US for A2P compliance. Switching later is painful.
- **10-week timeline** — assumes one focused engineer with no other duties. Adjust for reality.

## Open questions for the team

These aren't decided yet and shape later phases:
1. **Multi-tenancy** — is PlowPath SaaS to multiple snow companies, or a single-tenant tool for one operator? Adds `org_id` to every table if SaaS. Cheaper to decide now than to migrate later.
2. **Customer-facing portal** — do customers ever log in directly, or only receive SMS? If yes, scope a second web app.
3. **Invoicing** — Stripe integration is Phase 6, but if billing is the actual product wedge, move it earlier.
4. **Service area** — single state (one OSRM extract) or multi-state from day 1?
5. **iOS scope** — Android-only first cuts ~30% of mobile work and skips App Store review purgatory.

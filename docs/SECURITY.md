# Security Policy

PlowPath takes the security of its logistics and operations telemetry seriously. This document describes our security baseline, vulnerability reporting process, and production security hardening standards.

---

## 1. Vulnerability Reporting Process

If you identify a security vulnerability in PlowPath, please do not open a public issue. Instead, report it using the following procedure:

1. **Email the Security Team**: Send a detailed description of the vulnerability, including step-by-step reproduction instructions or proof-of-concept scripts, to `security@plowpath.com` (mock email for demo).
2. **Encrypted Communications**: If required, request our PGP public key to send the report securely.
3. **Response Timeline**: A member of the security team will acknowledge receipt of your report within 24 hours and provide an initial assessment/remediation timeline within 72 hours.
4. **Responsible Disclosure**: We request that you give us reasonable time to investigate and patch the issue before making any public disclosures.

---

## 2. Cryptographic Hardening (JWT Sessions)

PlowPath enforces cryptographic signing for all API access sessions (driver telemetry ingestion, LiveOps dashboard socket connections, and customer routing updates).

### Token Security Standards
- **Algorithm**: HMAC-SHA256 (`HS256`).
- **Signature Length**: Minimum of 512 bits (64 bytes/character hexadecimal representation) to mitigate brute-force and key-recovery attacks.
- **Session Duration**:
  - `Access Token`: 12 hours (suited for driver shift schedules).
  - `Refresh Token`: 30 days.

### JWT Key Generation & Storage
In development and staging, a highly-entropy 64-character token is loaded from environment variables (`JWT_SECRET`). 

To generate a secure cryptographically random key for your deployment:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> [!WARNING]
> Never hardcode `JWT_SECRET` inside version control. Ensure it is injected into the container environment securely using secrets management services (e.g., AWS Secrets Manager, HashiCorp Vault, or encrypted GitHub secrets).

### JWT Secret Key Rotation
To maintain robust session hygiene, the security team recommends rotating the `JWT_SECRET` key:
- Every **90 days** as part of standard compliance sweeps.
- Immediately following any potential exposure of environment configurations or server logs.
- During high-severity developer offboarding.

When rotating keys:
1. Standard user sessions will terminate, requiring clients to re-authenticate with credentials.
2. In-flight driver tracking clients will fallback gracefully due to offline queuing and auto-login interceptors.

---

## 3. Production Environment Hardening

PlowPath implements multiple layers of defense to secure the running backend:

* **HTTP Header Security**: decoupling identifying headers (`x-powered-by` disabled) and deploying `helmet` middleware to force safe transport features (CSP, HSTS, MIME sniffing protection).
* **Rate Limiting**: Rate limiters restrict excessive traffic on API endpoints, backed by Redis for centralized counting.
* **SQL Injection & DB Safety**:
  - Bound queries using PostGIS driver.
  - Query Statement Timeout set strictly to `10000ms` (10s) at the PG pool level (`statement_timeout`) to eliminate DDoS vectors involving un-indexed queries or infinite locking states.
* **Sensitive Store Isolation (Mobile)**:
  - Access and refresh tokens are isolated and saved to OS-level secure enclaves (iOS Keychain / Android KeyStore) via `react-native-keychain`.
  - Non-sensitive structures are kept separate in standard `AsyncStorage`.

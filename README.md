# Merchant Payments & Operations Platform — Backend

A production-oriented REST API for merchant onboarding, risk review, and lifecycle management built with NestJS, TypeScript, PostgreSQL, and Redis.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        HTTP Clients                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   NestJS App    │
              │  (Express)      │
              │  Global Pipe    │
              │  JWT Guard      │
              │  Roles Guard    │
              └────────┬────────┘
       ┌───────────────┼───────────────┐
       │               │               │
  ┌────▼────┐   ┌──────▼──────┐  ┌────▼─────┐
  │  Auth   │   │ Applications│  │  Audit   │
  │ Module  │   │   Module    │  │  Module  │
  └────┬────┘   └──────┬──────┘  └────┬─────┘
       │               │               │
  ┌────▼───────────────▼───────────────▼─────┐
  │              PostgreSQL (TypeORM)         │
  └───────────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   Risk Module   │
              │ BullMQ Worker   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │     Redis       │
              └─────────────────┘
```

**Modules:** AppConfigModule · DatabaseModule · RedisModule · AuthModule · UsersModule · MerchantApplicationsModule · RiskModule · AuditModule · HealthModule

---

## Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- npm >= 10

---

## Environment Setup

```bash
cp .env.example .env
# Edit .env — set strong JWT_SECRET (min 32 chars in production)
```

---

## Docker Compose

```bash
# Start PostgreSQL + Redis
docker compose up -d

# Stop
docker compose down

# Stop and remove volumes (destructive)
docker compose down -v
```

---

## Database Migrations

```bash
# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Generate new migration (after entity changes)
npm run migration:generate -- --name MyMigrationName
```

---

## Seeding Development Users

The seed script prompts for passwords at runtime — passwords are never stored in env files.

```bash
npm run seed:dev
```

| Email | Role |
|-------|------|
| admin@example.com | ADMIN |
| reviewer1@example.com | REVIEWER |
| reviewer2@example.com | REVIEWER |
| sales1@example.com | SALES |
| sales2@example.com | SALES |

---

## Authentication

```bash
# Login
POST /auth/login
{ "email": "sales1@example.com", "password": "<your_password>" }

# Response
{ "accessToken": "<jwt>", "expiresIn": "1h", "user": { "id", "email", "role", ... } }

# Use token
Authorization: Bearer <accessToken>
```

---

## API Endpoints

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /auth/login | Public | Login |
| GET | /health | Public | Health check |
| POST | /api/v1/applications | SALES, ADMIN | Create application |
| GET | /api/v1/applications | All | List applications |
| GET | /api/v1/applications/:id | All | Get application |
| PATCH | /api/v1/applications/:id | Owner, ADMIN | Update application |
| POST | /api/v1/applications/:id/submit | Owner, ADMIN | Submit for review |
| PATCH | /api/v1/applications/:id/assign-reviewer | ADMIN | Assign reviewer |
| POST | /api/v1/applications/:id/decisions | Assigned REVIEWER, ADMIN | Record decision |

**Swagger UI:** http://localhost:3000/api-docs

---

## Application Lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED
                               ↘ REJECTED
                               ↘ INFO_REQUESTED → SUBMITTED (re-submit)
         ↘ RISK_FAILED (async risk processing failed)
```

**Editability:** Only `DRAFT` and `INFO_REQUESTED` applications can be updated.

**Risk processing:** Submitting an application enqueues a BullMQ job. A simulated KYB provider runs asynchronously. A passed or failed KYB moves the application to `UNDER_REVIEW` — a human reviewer still makes the final decision.

---

## Authorization Policy

| Action | ADMIN | REVIEWER | SALES |
|--------|-------|----------|-------|
| Create application | ✓ | ✗ | ✓ (own only) |
| View application | ✓ all | ✓ all | ✓ own only |
| Update application | ✓ | ✗ | ✓ own + editable |
| Submit application | ✓ | ✗ | ✓ own only |
| Assign reviewer | ✓ | ✗ | ✗ |
| Record decision | ✓ | ✓ assigned only | ✗ |

SALES accessing another user's application receives **404** (not 403) to prevent existence leakage.

---

## Testing

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# Integration (e2e) tests — requires Docker services running
docker compose up -d
npm run migration:run
npm run test:e2e
```

---

## Audit & Sensitive Data

All significant business events are persisted to the `audit_logs` table:
- APPLICATION_CREATED, APPLICATION_SUBMITTED
- REVIEWER_ASSIGNED
- RISK_PROCESSED, RISK_FAILED
- DECISION_APPROVED, DECISION_REJECTED, DECISION_INFO_REQUESTED

**Redaction:** Metadata is filtered through an allowlist per action type, then through a blocklist removing: `password`, `passwordHash`, `token`, `ownerEmail`, `ownerPhone`, `ssn`, `taxId`, `bankAccount`, etc.

**Audit records are append-only** — no `updatedAt` column, no update/delete methods on `AuditService`.

### Fields Recommended for Field-Level Encryption (not yet implemented)
- `ownerEmail`, `ownerPhone` — PII contact data
- `businessWebsite` — business confidential
- `riskMetadata` — KYB scoring data

Recommended approach: AES-256-GCM with envelope encryption via AWS KMS / HashiCorp Vault.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | No | development | Runtime environment |
| PORT | No | 3000 | HTTP port |
| APP_API_PREFIX | No | api/v1 | Global route prefix |
| DB_HOST | Yes | — | PostgreSQL host |
| DB_PORT | No | 5432 | PostgreSQL port |
| DB_USER | Yes | — | PostgreSQL user |
| DB_PASSWORD | Yes | — | PostgreSQL password |
| DB_NAME | Yes | — | PostgreSQL database name |
| DB_DIALECT | No | postgres | Database dialect |
| DB_SSL | No | false | Enable PostgreSQL SSL |
| REDIS_URL | Yes | — | Redis connection URL |
| JWT_SECRET | Yes | — | JWT signing secret (min 32 chars) |
| JWT_EXPIRES_IN | No | 1h | JWT expiry |
| BCRYPT_ROUNDS | No | 12 | Bcrypt cost factor |
| RISK_JOB_MAX_ATTEMPTS | No | 3 | Max BullMQ retry attempts |
| KYB_SIMULATION_MODE | No | random | always_pass / always_fail / random |
| KYB_SIMULATION_DELAY_MS | No | 500 | Simulated KYB latency |

---

## Known Limitations & Trade-offs

- **No refresh tokens** — JWT expiry requires re-login. RS256 would be preferred in a multi-service setup.
- **No rate limiting** — login endpoint is unprotected against brute force. Use a reverse proxy (nginx/Cloudflare) or `@nestjs/throttler` in production.
- **KYB is simulated** — no real third-party integration.
- **Field-level encryption not implemented** — documented above as a recommended next step.
- **No automated data retention pipeline** — audit logs and application data retention must be handled by a separate process.
- **`always_pass` KYB mode** is blocked in production as a safety guard.

---

## AI Assistance Disclosure

This project was implemented with the assistance of Kiro AI (Claude-based). All generated code was reviewed for:
- Security vulnerabilities (injection, mass assignment, privilege escalation)
- Correctness of business logic and state transitions
- Test coverage and authorization enforcement

To verify: run `npm run test` (unit) and `npm run test:e2e` (integration) and inspect all passing assertions.

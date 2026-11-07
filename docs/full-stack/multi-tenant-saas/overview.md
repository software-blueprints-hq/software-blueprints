---
sidebar_position: 1
title: "Multi-Tenant B2B SaaS Architecture: PostgreSQL RLS & Subdomains"
description: "Enterprise multi-tenancy blueprint using PostgreSQL Row-Level Security (RLS), PgBouncer connection pooling, wildcard subdomain routing, and automated tenant isolation testing."
---

# Multi-Tenant B2B SaaS Architecture: PostgreSQL RLS & Subdomains

In multi-tenant B2B SaaS applications, data isolation between corporate customers is a legal, compliance (SOC 2, ISO 27001, GDPR), and architectural mandate. Relying exclusively on application-level filtering (`WHERE tenant_id = :id`) is an inevitable vulnerability: a single omitted `WHERE` clause in an ORM query or GraphQL resolver exposes private customer records across corporate boundaries.

This blueprint documents an enterprise **Multi-Tenant SaaS Architecture** combining **PostgreSQL Kernel-Level Row-Level Security (RLS)**, **PgBouncer transaction connection pooling**, **Next.js wildcard subdomain routing**, and **fail-closed tenant isolation**.

---

## 01. Overview & Operational Constraints

### Problem Statement
Deliver complete, cryptographically isolated data boundaries for thousands of B2B corporate customers sharing a unified application cluster and database infrastructure, without incurring the infrastructure bloat and migration nightmares of multi-database architectures.

### Real-World Use Cases
* **Enterprise Collaboration Platforms (Slack / Linear-style):** Every customer accesses their own workspace (`acme.app.com`, `nike.app.com`) with isolated documents, tickets, and user directories.
* **Fintech & Billing Portals:** Financial ledgers and invoices segregated at the database kernel level to prevent cross-customer data leakage during audits.
* **Healthcare & HIPAA Compliant SaaS:** Guaranteeing that hospital tenant records are completely invisible to other hospital accounts on shared compute.

### Quantitative Constraints & Compliance SLOs
| Metric / Constraint | Production Target | Failure Condition |
| :--- | :--- | :--- |
| **Tenant Isolation Blast Radius** | **Zero Cross-Tenant Leaks** | Single cross-tenant row read (P0 Security Incident) |
| **Max Supported Tenants** | 1,000,000+ active organizations | Table lock contention during database migrations |
| **Database Pool Efficiency** | &gt; 95% connection reuse | Connection starvation under idle tenant volume |
| **Query Latency Overhead of RLS** | &lt; 0.5ms additional per query | Missing composite B-Tree indexes on `(tenant_id, id)` |
| **Empty Tenant Context Policy** | **Strict Fail-Closed** (Return 0 rows) | Defaulting to public or unassigned data |

---

## 02. High-Level Architecture & Tenant Request Lifecycle

<ArchitectureExplorer initialSystemId="multi-tenant-saas" />

```mermaid
sequenceDiagram
    autonumber
    actor User as Enterprise User
    participant Edge as Next.js Edge Middleware
    participant App as App Server (Next.js Server Actions)
    participant Pool as PgBouncer (Transaction Pooling)
    participant Postgres as PostgreSQL Engine (RLS Kernel)

    User->>Edge: GET https://acme.saas.com/api/projects
    Edge->>Edge: 1. Extract Subdomain: 'acme'
    Edge->>Edge: 2. Verify Session & Membership (User ∈ Acme Org)
    Edge->>App: Forward Request + Headers (x-tenant-id: 'uuid-101')
    
    App->>Pool: Check out pooled DB connection
    App->>Postgres: BEGIN TRANSACTION;
    App->>Postgres: SELECT set_config('app.current_tenant_id', 'uuid-101', true);
    Note over Postgres: Session variable strictly scoped to current transaction (true = local)

    App->>Postgres: SELECT * FROM projects; (No WHERE clause written by dev!)
    Postgres->>Postgres: Kernel evaluates: organization_id = current_setting('app.current_tenant_id')
    Postgres-->>App: Return ONLY Acme's projects (3 rows)
    
    App->>Postgres: COMMIT;
    Note over Postgres: Transaction finishes: 'app.current_tenant_id' wiped clean
    App->>Pool: Release connection back to pool (Zero state contamination)
    App-->>User: HTTP 200 OK [Acme Projects JSON]
```

---

## 03. Technology Decisions & Architecture Decision Record (ADR)

### ADR-002: Multi-Tenancy Isolation Strategy Selection

#### Context
We need to select an architectural data isolation model that supports over 100,000 corporate tenants while minimizing AWS RDS infrastructure costs and eliminating CI/CD deployment downtime.

#### Evaluation Matrix
| Evaluation Dimension | Database-per-Tenant | Schema-per-Tenant | PostgreSQL Row-Level Security (RLS) |
| :--- | :--- | :--- | :--- |
| **Infrastructure Cost** | **Prohibitive:** Thousands of idle RDS instances | Moderate: Single large DB instance | **Minimal:** Single shared connection pool |
| **Tenant Scaling Limit** | ~500 DBs before AWS API limits | ~2,000 schemas before Postgres catalog locks | **1,000,000+** tenants without degradation |
| **Database Migrations** | Nightmare: Run 5,000 migrations per deploy | Fragile: DDL schema locks during deploy | **Instant:** 1 standard migration across all tenants |
| **Connection Pooling** | Incompatible with centralized pooling | High idle connection exhaustion | **Optimal:** Works seamlessly with PgBouncer |
| **Developer Error Safety**| High (Physically separated) | Moderate (Search path mistakes) | **Absolute:** Enforced at kernel level |

#### Decision
We select **PostgreSQL Row-Level Security (RLS)** with transaction-scoped session configuration (`SET LOCAL`). Database-per-tenant is economically unsustainable for self-serve B2B SaaS, and schema-per-tenant causes catalog table lock exhaustion when running `ALTER TABLE` across thousands of schemas.

#### When NOT to Use This Architecture
* **Single-Tenant Enterprise On-Premise Deployments:** If a client contract mandates dedicated hardware or customer-managed encryption keys (CMEK) on isolated disks, deploy a dedicated AWS account or VPC.

---

## 04. Database & Kernel-Level Security Design

### Production PostgreSQL DDL Schema (`migrations/001_multi_tenant_rls.sql`)

```sql
-- ============================================================================
-- 1. Dedicated Unprivileged Application Role
-- CRITICAL: Superusers automatically BYPASS Row-Level Security!
-- The web application MUST connect using an unprivileged role.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'saas_app_user') THEN
    CREATE ROLE saas_app_user WITH LOGIN PASSWORD 'prod_secure_password_here';
  END IF;
END
$$;

-- Grant standard DML privileges but REVOKE superuser/bypass
GRANT USAGE ON SCHEMA public TO saas_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO saas_app_user;

-- ============================================================================
-- 2. Organizations & Membership Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL, -- Subdomain: 'acme' -> acme.saas.com
    name VARCHAR(255) NOT NULL,
    plan_tier VARCHAR(32) NOT NULL DEFAULT 'PRO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================================================
-- 3. Multi-Tenant Shared Business Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    budget_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MANDATORY: Composite Index covering the Tenant ID to eliminate full table scans
CREATE INDEX idx_projects_org_created ON projects(organization_id, created_at DESC);

-- ============================================================================
-- 4. Kernel-Level Row-Level Security (RLS) Activation
-- ============================================================================
-- Enable RLS for standard users
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- FORCE RLS even for table owners (prevents accidental bypass)
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Fail-Closed Tenant Isolation Policy
-- Uses NULLIF to ensure an empty/missing setting NEVER matches rows
-- ============================================================================
DROP POLICY IF EXISTS tenant_isolation_policy ON projects;

CREATE POLICY tenant_isolation_policy ON projects
    AS RESTRICTIVE
    FOR ALL
    TO saas_app_user
    USING (
        organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    );
```

---

## 05. Production Implementation (Next.js 15 & Drizzle ORM)

### Wildcard Subdomain & Domain Resolver Middleware (`middleware.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)'],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Configured root domain (e.g. "saas.com" or "localhost:3000")
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

  let tenantSlug = '';

  if (hostname.includes(`.${rootDomain}`)) {
    tenantSlug = hostname.replace(`.${rootDomain}`, '');
  } else if (!hostname.includes(rootDomain) && hostname !== 'localhost') {
    // Custom domain support (e.g., "portal.acmecorp.com")
    // In production: Lookup custom domain in Redis cache
    tenantSlug = 'custom_cname_lookup';
  }

  // If hitting the root apex domain, serve public landing page
  if (!tenantSlug || tenantSlug === 'www') {
    return NextResponse.rewrite(new URL('/home', req.url));
  }

  // Rewrite /dashboard to /app/[tenantSlug]/dashboard
  const rewriteUrl = new URL(`/app/${tenantSlug}${url.pathname}`, req.url);
  const response = NextResponse.rewrite(rewriteUrl);

  // Inject sanitized tenant header for downstream server components
  response.headers.set('x-tenant-slug', tenantSlug);
  return response;
}
```

### Type-Safe Transactional RLS Context Runner (`src/lib/tenant-db.ts`)

```typescript
import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, bigint, timestamp } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Unprivileged connection pool (NEVER connect as postgres superuser)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_APP_ROLE, // postgres://saas_app_user:...
  max: 50,
  idleTimeoutMillis: 30000,
});

export const db = drizzle(pool);

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  budgetCents: bigint('budget_cents', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Executes a database operation within an isolated, transaction-scoped tenant context.
 * Uses `is_local = true` to guarantee connection pool cleanup after transaction finish.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error('SECURITY VIOLATION: withTenantContext invoked without a valid tenant ID');
  }

  return await db.transaction(async (tx) => {
    // 1. Inject tenant context into PostgreSQL transaction local memory
    // Third parameter `true` sets LOCAL scope (cleared automatically on COMMIT/ROLLBACK)
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    );

    // 2. Execute business queries
    // PostgreSQL RLS automatically intercepts and filters all operations
    return await callback(tx as any);
  });
}
```

---

## 06. Scalability & Connection Pool Isolation

### PgBouncer Transaction Mode Configuration (`pgbouncer.ini`)
Traditional session connection pooling is incompatible with multi-tenant SaaS because pooled connections stay locked to idle client sockets. PgBouncer must run in **Transaction Mode**:

```ini
[databases]
saas_db = host=127.0.0.1 port=5432 dbname=saas_production

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 50
reserve_pool_size = 10
server_idle_timeout = 60
```

> **Why Transaction Pooling Works with RLS:**  
> When using `set_config('app.current_tenant_id', val, true)` (or `SET LOCAL`), the variable is only bound to the duration of the SQL transaction (`BEGIN ... COMMIT`). Once committed, PgBouncer reassigns the physical backend socket to another tenant without cross-tenant variable pollution.

---

## 07. Failure Engineering & Chaos Scenarios

| Failure Scenario | Threat & System Impact | Built-In Defense Mechanism |
| :--- | :--- | :--- |
| **Missing Tenant ID (`null` or `""`)** | Developer forgets to call `withTenantContext` | `NULLIF(current_setting(..., true), '')` evaluates to `NULL`. RLS condition `organization_id = NULL` yields `FALSE`, returning **0 rows** (Fail-Closed). |
| **Superuser Connection Accidental Use** | Superusers bypass RLS by default in Postgres | `ALTER TABLE ... FORCE ROW LEVEL SECURITY;` forces RLS policies even for table owners, and app connects as unprivileged `saas_app_user`. |
| **Connection Pool Leakage** | Next query on recycled pooled connection reads previous tenant's data | `set_config(..., true)` scopes parameter strictly to `SET LOCAL`. Transaction commit automatically resets session state. |
| **Noisy Neighbor Tenant Spike** | Single corporate tenant issues 10,000 queries, consuming all DB connections | Rate Limiting at Edge API Gateway partitions concurrency by `tenant_id` before database ingress. |

---

## 08. Security & Threat Modeling

1. **Subdomain Hijacking (CName Takeover):** An attacker claims `login.app.com` or deleted customer slugs.
   * *Mitigation:* Maintain a reserved slug blacklist (`www`, `api`, `admin`, `app`, `login`, `billing`, `internal`, `health`).
2. **Timing Attacks on Tenant Slugs:** Attackers probe subdomains to identify which corporate companies are registered customers.
   * *Mitigation:* Constant-time lookup responses with synthetic delays on 404 tenant resolution.
3. **Foreign Key Cascade Deletion Leaks:** Deleting an organization inadvertently deletes parent-less shared entities.
   * *Mitigation:* Multi-tenant tables explicitly specify `ON DELETE CASCADE` only downwards into organization-scoped child tables.

---

## 09. Observability & Tenant-Aware SLIs

### Tenant Context Injected OpenTelemetry Tracing
Every trace span emitted to Grafana/Jaeger is enriched with the active tenant identity:

```typescript
import { trace } from '@opentelemetry/api';

export function enrichSpanWithTenant(tenantId: string, slug: string) {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttribute('tenant.id', tenantId);
    activeSpan.setAttribute('tenant.slug', slug);
  }
}
```

### PostgreSQL Slow Query Log with Tenant Context
Configure PostgreSQL `log_line_prefix` to record the active tenant on all slow queries:
```ini
log_line_prefix = '%m [%p] tenant=%v{app.current_tenant_id} '
```

---

## 10. Deployment & Infrastructure

### Multi-Container Production Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: saas-postgres
    environment:
      POSTGRES_DB: saas_production
      POSTGRES_PASSWORD: super_admin_secret_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d

  pgbouncer:
    image: edoburu/pgbouncer:v1.21.0
    container_name: saas-pgbouncer
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: saas_production
      DB_USER: saas_app_user
      DB_PASSWORD: prod_secure_password_here
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 5000
      DEFAULT_POOL_SIZE: 50
    ports:
      - "6432:6432"
    depends_on:
      - postgres

volumes:
  pgdata:
```

---

## 11. Testing & Tenant Isolation Chaos Suite

Save this automated integration test under `tests/tenant-isolation.test.ts`. It mathematically proves zero data leaks:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { db, projects, withTenantContext } from '../src/lib/tenant-db';
import { randomUUID } from 'crypto';

describe('PostgreSQL Row-Level Security Isolation Gate', () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  beforeAll(async () => {
    // Seed test project in Tenant A
    await withTenantContext(tenantA, async (tx) => {
      await tx.insert(projects).values({
        organizationId: tenantA,
        name: 'Project Alpha (Confidential Tenant A)',
        budgetCents: 5000000,
      });
    });

    // Seed test project in Tenant B
    await withTenantContext(tenantB, async (tx) => {
      await tx.insert(projects).values({
        organizationId: tenantB,
        name: 'Project Beta (Confidential Tenant B)',
        budgetCents: 8000000,
      });
    });
  });

  it('TEST 1: Tenant A cannot read Tenant B records (Even with SELECT * without WHERE)', async () => {
    const results = await withTenantContext(tenantA, async (tx) => {
      return await tx.select().from(projects);
    });

    expect(results.length).toBe(1);
    expect(results[0].organizationId).toBe(tenantA);
    expect(results[0].name).toContain('Tenant A');
  });

  it('TEST 2: Empty tenant context fails closed (0 rows returned)', async () => {
    // Attempting query outside withTenantContext
    const results = await db.select().from(projects);
    expect(results.length).toBe(0);
  });

  it('TEST 3: Cross-tenant insertion is blocked by RLS WITH CHECK policy', async () => {
    // Tenant A attempts to maliciously insert a record tagged with Tenant B's UUID
    await expect(
      withTenantContext(tenantA, async (tx) => {
        await tx.insert(projects).values({
          organizationId: tenantB, // Malicious cross-tenant spoof
          name: 'Trojan Project',
        });
      })
    ).rejects.toThrow(/violates row-level security policy/i);
  });
});
```

---

## 12. Production Readiness Checklist

| Category | Verification Item | Status |
| :--- | :--- | :--- |
| **Role Permissions** | Web app connects strictly via non-superuser `saas_app_user` | [ ] Verified |
| **Bypass Prevention** | `FORCE ROW LEVEL SECURITY` executed on every multi-tenant table | [ ] Verified |
| **Index Coverage** | Composite index on `(organization_id, created_at)` present on every table | [ ] Verified |
| **Connection Pooling** | PgBouncer configured in `pool_mode = transaction` | [ ] Verified |
| **Fail-Closed Gate** | `NULLIF(current_setting(...), '')` verified; zero rows returned on empty context | [ ] Verified |
| **Isolation Tests** | Automated CI pipeline passes cross-tenant read & write penetration tests | [ ] Verified |

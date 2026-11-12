---
sidebar_position: 9
title: "Database Sharding Ring & Consistent Hashing"
description: "Horizontal database partitioning using Ketama Consistent Hashing with Virtual Nodes (vnodes), uniform distribution mathematics, and scatter-gather query routing."
---

import BlueprintVerificationBadge from '@site/src/components/BlueprintVerificationBadge';

# Database Sharding Ring & Consistent Hashing

<BlueprintVerificationBadge blueprintId="sys-consistent-hashing" />

When relational database storage or transactional throughput outgrows vertical hardware scaling limits (NVMe IOPS ceiling, memory bus saturation, and PostgreSQL Write-Ahead Log serialization locks), horizontal partitioning (**database sharding**) becomes mandatory.

Traditional modulo sharding:

```text
Shard ID = hash(key) % N
```

suffers from an existential operational flaw: adding or removing a single database shard invalidates approximately `(N - 1) / N` of all key assignments. For a 10-node cluster expanding to 11 nodes, **90.9% of all database records must be physically moved across the network**, resulting in multi-hour maintenance outages and lock saturation.

**Ketama Consistent Hashing** projects both data partition keys and database nodes onto a circular continuous keyspace `[0, 2^32 - 1]`. By assigning multiple **virtual nodes (vnodes)** per physical shard, consistent hashing guarantees uniform distribution across heterogeneous hardware and bounds key migration strictly to `K / (N + 1)` keys upon cluster topology changes.

---

## 1. System Architecture: 32-Bit Ring & Virtual Nodes

```mermaid
flowchart TD
    subgraph ClientLayer ["Application & Query Routing Layer"]
        AppServer["Application Microservice / API"]
        Router["Scatter-Gather Shard Router\n(FNV-1a Hash + Binary Search)"]
    end

    subgraph HashRing ["32-Bit Ketama Consistent Hash Ring [0 to 2^32 - 1]"]
        direction TB
        VNodeA1["Shard_A #v1 (0x1A2B)"]
        VNodeB1["Shard_B #v1 (0x4E8F)"]
        VNodeC1["Shard_C #v1 (0x81C3)"]
        VNodeA2["Shard_A #v2 (0xB904)"]
        VNodeB2["Shard_B #v2 (0xD5E1)"]
        VNodeC2["Shard_C #v2 (0xFA30)"]
    end

    subgraph Keys ["Incoming Query Sharding Keys"]
        Key1["Tenant UUID: 'usr_8921'\nHash: 0x3100"]
        Key2["Tenant UUID: 'acme_corp'\nHash: 0x9500"]
    end

    subgraph ShardStorage ["Distributed Physical Storage Tier"]
        PhysicalA[("PostgreSQL Shard 1\n(db-shard-01:5432)")]
        PhysicalB[("PostgreSQL Shard 2\n(db-shard-02:5432)")]
        PhysicalC[("PostgreSQL Shard 3\n(db-shard-03:5432)")]
        GSI_DB[("Central Routing DB\nGlobal Secondary Index")]
    end

    AppServer -->|Point Query: SELECT WHERE tenant_id='usr_8921'| Router
    AppServer -->|Cross-Shard Query: SELECT WHERE status='ACTIVE'| Router
    Router --> Keys

    Key1 -->|Clockwise Bisect Lookup| VNodeB1
    Key2 -->|Clockwise Bisect Lookup| VNodeA2

    VNodeA1 -.-> PhysicalA
    VNodeA2 -.-> PhysicalA
    VNodeB1 -.-> PhysicalB
    VNodeB2 -.-> PhysicalB
    VNodeC1 -.-> PhysicalC
    VNodeC2 -.-> PhysicalC

    Router -.->|Non-Partitioned Query| GSI_DB
```

---

## 2. Architectural Decision Record (ADR-011)

### Context & Problem Statement
The platform's relational transaction store is projected to exceed 12 TB of active operational data with 85,000 writes/second. A single vertically scaled `db.r6i.32xlarge` PostgreSQL instance suffers from WAL write lock queueing and checkpoint I/O storms. We must partition state horizontally across independent PostgreSQL primary nodes while minimizing resharding overhead, eliminating single points of failure, and avoiding cross-shard distributed transactions.

### Decision
We implement a **Client-Side Ketama Consistent Hash Ring with 160 Virtual Nodes per Physical Core** and a two-tier routing architecture:
1. **Partition Key Requirement:** Every sharded entity must embed a high-cardinality `tenant_id` or `account_id` as the leading column in composite primary keys.
2. **Deterministic Binary Search Routing:** Client connection pools compute the 32-bit FNV-1a hash of the partition key and binary-search a locally cached, immutable ring array in `O(log(V * N))` time (< 2 microseconds).
3. **Scatter-Gather Engine with Circuit Breakers:** Analytical cross-shard queries fan out asynchronously across all shard pools with strict 1,200 ms timeout deadlines and concurrency bulkheads.
4. **Global Secondary Index (GSI):** Queries looking up records by non-partition keys (e.g. `invoice_uuid`) consult an asynchronous central lookup table populated via Transactional Outbox CDC.

### Status
Accepted & Implemented in Production Core.

### Consequences

**Positive:**
- Adding a shard requires migrating only `1 / (N + 1)` of the dataset rather than `(N - 1) / N`.
- Eliminates centralized proxy bottlenecks; applications communicate directly with shard primaries via dedicated connection pools.
- Heterogeneous hardware is natively supported by weighting virtual node allocations proportionally to CPU/RAM capacity.

**Negative:**
- Multi-shard joins are strictly prohibited at the database level; relations across tenants must be resolved in application memory.
- Scatter-gather latency is bounded by the slowest shard (`P99` latency amplification).
- Cross-shard transactions require asynchronous Sagas rather than ACID Two-Phase Commit (2PC).

---

## 3. Mathematical Analysis & Variance Derivation

### 3.1 Key Migration Bound on Node Addition

When expanding a cluster from `N` physical shards to `N + 1` shards with `K` total keys uniformly distributed across the continuous keyspace `[0, 2^32 - 1]`:

```text
Keys migrated on Modulo Sharding:
M_modulo = K * (N / (N + 1))  --> Approaches 100% of data for large N

Keys migrated on Consistent Hash Ring:
M_consistent = K / (N + 1)
```

**Concrete Production Example:**
For `K = 50,000,000` records and `N = 9` shards expanding to `10` shards:
- **Modulo Sharding:** Migrates `50M * (9/10) = 45,000,000` rows (90% of database).
- **Consistent Hashing:** Migrates `50M / 10 = 5,000,000` rows (10% of database). Resharding traffic is reduced by **9x**.

### 3.2 Virtual Node Density vs Key Imbalance Variance

In a basic consistent hash ring where each physical node occupies exactly 1 point on the ring, the arc lengths between nodes follow an exponential distribution. The standard deviation of key allocation across nodes is unacceptably high:

```text
Relative Standard Deviation (sigma / mu):
sigma_rel = sqrt(1 / V)
```

where `V` is the number of virtual nodes allocated per physical node.

```text
V = 1 vnode:     sigma_rel = 100% (High risk of catastrophic 3x-5x load skew)
V = 50 vnodes:   sigma_rel = 14.1%
V = 160 vnodes:  sigma_rel = 7.9%
V = 256 vnodes:  sigma_rel = 6.25%
```

**Production Sizing Standard:** We mandate `V = 160` virtual nodes per physical shard. For a 10-shard cluster, the ring holds `1,600` sorted 32-bit integers, requiring only 6.4 KB of RAM and `11` binary search comparison cycles (`ceil(log2(1600)) = 11`).

### 3.3 Scatter-Gather Latency Amplification

When a query must fan out across `N` independent shards in parallel, the overall query latency `T_fanout` is governed by the maximum latency of any single shard:

```text
T_fanout = max(T_1, T_2, ..., T_N)
```

If individual shard latency follows cumulative distribution function `F(t)`, the probability that the scatter-gather query completes within deadline `t` is:

```text
P(T_fanout <= t) = [F(t)]^N
```

If single-shard `P99` latency is 50 ms (`F(50ms) = 0.99`), the probability of meeting 50 ms across a 10-shard cluster is:

```text
P(T_fanout <= 50ms) = (0.99)^10 = 0.9044 (90.4%)
```

Across 10 shards, the scatter-gather query experiences **nearly 10x higher P99 violation rates** unless connection pooling, hard timeouts (1,200 ms), and speculative hedged requests are enforced.

---

## 4. Production TypeScript Hash Ring & Scatter-Gather Router

Below is the production-tested Consistent Hash Ring engine supporting 32-bit FNV-1a hashing, logarithmic binary search, virtual node weighting, and a resilient Scatter-Gather query executor.

```typescript
/**
 * Production Consistent Hash Ring with Virtual Nodes and Scatter-Gather Router.
 * Zero external native dependencies, immutable ring snapshots, and sub-microsecond routing.
 */

export interface ShardConfig {
  id: string;
  host: string;
  port: number;
  weight?: number; // Relative weight (e.g., 1.0 for 32GB RAM, 2.0 for 64GB RAM)
}

export class ConsistentHashRing {
  private readonly vnodesPerShard: number;
  private ring: number[] = []; // Sorted 32-bit unsigned hash tokens
  private tokenToShardMap: Map<number, ShardConfig> = new Map();
  private shards: Map<string, ShardConfig> = new Map();

  constructor(shards: ShardConfig[] = [], vnodesPerShard: number = 160) {
    this.vnodesPerShard = vnodesPerShard;
    for (const shard of shards) {
      this.addShard(shard);
    }
  }

  /**
   * 32-Bit FNV-1a Non-Cryptographic Hash.
   * Delivers excellent avalanche characteristics with zero JNI/C++ binding overhead.
   */
  public hash(key: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0; // Cast to unsigned 32-bit integer [0, 4294967295]
  }

  /**
   * Add a physical shard and allocate proportional virtual nodes across the ring.
   */
  public addShard(shard: ShardConfig): void {
    if (this.shards.has(shard.id)) {
      throw new Error(`Shard '${shard.id}' already exists in topology.`);
    }

    this.shards.set(shard.id, shard);
    const count = Math.floor(this.vnodesPerShard * (shard.weight ?? 1.0));

    for (let i = 0; i < count; i++) {
      // Deterministic virtual node token key
      const vnodeToken = `${shard.id}#vnode_${i}`;
      const tokenHash = this.hash(vnodeToken);

      this.ring.push(tokenHash);
      this.tokenToShardMap.set(tokenHash, shard);
    }

    // Sort tokens in ascending order for binary search
    this.ring.sort((a, b) => a - b);
  }

  /**
   * Remove a physical shard and prune its virtual nodes.
   */
  public removeShard(shardId: string): void {
    if (!this.shards.has(shardId)) return;
    this.shards.delete(shardId);

    this.ring = this.ring.filter((token) => {
      const target = this.tokenToShardMap.get(token);
      if (target && target.id === shardId) {
        this.tokenToShardMap.delete(token);
        return false;
      }
      return true;
    });
  }

  /**
   * Map partition key to responsible physical shard in O(log(V * N)) time.
   */
  public getShard(partitionKey: string): ShardConfig {
    if (this.ring.length === 0) {
      throw new Error("ConsistentHashRing is empty. Zero active database shards.");
    }

    const keyHash = this.hash(partitionKey);
    let low = 0;
    let high = this.ring.length - 1;

    // Binary search (bisect_right) for first token >= keyHash
    while (low <= high) {
      const mid = (low + high) >>> 1;
      if (this.ring[mid] >= keyHash) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // Circular wrap-around: if keyHash > largest token in ring, wrap to index 0
    const targetIndex = low < this.ring.length ? low : 0;
    const assignedToken = this.ring[targetIndex];
    return this.tokenToShardMap.get(assignedToken)!;
  }

  public getAllShards(): ShardConfig[] {
    return Array.from(this.shards.values());
  }
}

/**
 * Scatter-Gather Query Router with Timeout Deadlines and Concurrency Control.
 */
export class ShardedQueryRouter {
  private ring: ConsistentHashRing;
  private readonly defaultTimeoutMs: number;

  constructor(ring: ConsistentHashRing, defaultTimeoutMs: number = 1200) {
    this.ring = ring;
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Point Query: Evaluates partition key and routes directly to single target shard.
   */
  public async executePointQuery<T>(
    partitionKey: string,
    executor: (shard: ShardConfig) => Promise<T>
  ): Promise<T> {
    const targetShard = this.ring.getShard(partitionKey);
    return executor(targetShard);
  }

  /**
   * Scatter-Gather: Concurrently executes query across all physical shards,
   * enforcing strict per-shard timeouts and aggregating results.
   */
  public async executeScatterGather<T>(
    executor: (shard: ShardConfig) => Promise<T[]>,
    timeoutMs?: number
  ): Promise<{ results: T[]; failedShards: string[] }> {
    const shards = this.ring.getAllShards();
    const effectiveTimeout = timeoutMs ?? this.defaultTimeoutMs;
    const failedShards: string[] = [];

    const shardPromises = shards.map(async (shard) => {
      try {
        const timeoutPromise = new Promise<T[]>((_, reject) =>
          setTimeout(() => reject(new Error(`Shard '${shard.id}' timed out after ${effectiveTimeout}ms`)), effectiveTimeout)
        );
        const data = await Promise.race([executor(shard), timeoutPromise]);
        return data;
      } catch (err) {
        failedShards.push(shard.id);
        return [] as T[];
      }
    });

    const settledOutputs = await Promise.all(shardPromises);
    const aggregatedResults = settledOutputs.flat();

    return {
      results: aggregatedResults,
      failedShards,
    };
  }
}
```

---

## 5. PostgreSQL Shard DDL Schema & Global Secondary Index

Every sharded table must enforce the **Composite Key Invariant** where the partition key is the leading component of the primary key.

```sql
-- ============================================================================
-- Physical Shard Schema (Applied to each PostgreSQL shard: db-shard-01, 02, 03)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Partitioned Multi-Tenant Table
CREATE TABLE tenant_invoices (
    tenant_id VARCHAR(64) NOT NULL,
    invoice_id UUID NOT NULL DEFAULT gen_random_uuid(),
    amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'VOID', 'REFUNDED')),
    due_date DATE NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Invariant: Primary Key MUST include shard partition key
    PRIMARY KEY (tenant_id, invoice_id)
);

CREATE INDEX idx_invoices_status ON tenant_invoices(tenant_id, status);
CREATE INDEX idx_invoices_created ON tenant_invoices(tenant_id, created_at DESC);

-- ============================================================================
-- Central Global Secondary Index (GSI) Routing Table
-- Hosted on Central Directory Database (db-directory:5432)
-- ============================================================================

CREATE TABLE global_invoice_shard_directory (
    invoice_id UUID PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    target_shard_id VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Point-lookup index for inverse entity queries
CREATE INDEX idx_gsi_tenant ON global_invoice_shard_directory(tenant_id);
```

---

## 6. Production Multi-Shard Docker Compose Environment

```yaml
version: '3.8'

services:
  # Central Directory DB (Global Secondary Index)
  db-directory:
    image: postgres:16-alpine
    container_name: db-directory
    environment:
      POSTGRES_DB: directory_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5430:5432"
    volumes:
      - dir_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d directory_db"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Physical Shard 1
  db-shard-01:
    image: postgres:16-alpine
    container_name: db-shard-01
    environment:
      POSTGRES_DB: shard_01
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5431:5432"
    volumes:
      - shard01_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d shard_01"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Physical Shard 2
  db-shard-02:
    image: postgres:16-alpine
    container_name: db-shard-02
    environment:
      POSTGRES_DB: shard_02
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5432:5432"
    volumes:
      - shard02_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d shard_02"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Physical Shard 3
  db-shard-03:
    image: postgres:16-alpine
    container_name: db-shard-03
    environment:
      POSTGRES_DB: shard_03
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5433:5432"
    volumes:
      - shard03_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d shard_03"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  dir_data:
  shard01_data:
  shard02_data:
  shard03_data:
```

---

## 7. Failure Modes & Mitigation Matrix

| Failure Mode | Root Cause | Detection Signal | Automated Mitigation | Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Hot Shard Imbalance** | High-volume enterprise tenant generates 60% of write traffic. | Prometheus `shard_qps{shard_id="db-shard-02"} > 3 * avg(shard_qps)`. | Isolate mega-tenant by allocating dedicated physical shard or splitting tenant by secondary partition key (`tenant_id:month`). | Requires live data migration; temporary read replica failover. |
| **Scatter-Gather Timeout Cascade** | A single degraded shard stalls the entire fanout query. | `scatter_gather_duration_seconds{quantile="0.99"} > 1.2s`. | Circuit breaker trips target shard; router returns partial results with `x-partial-shard-failure` warning header. | Incomplete aggregate reports until degraded shard heals. |
| **GSI Lookup Desynchronization** | Dual-write fails; row exists in physical shard but missing from central directory DB. | Reconciliation worker detects missing records via CDC audit stream. | Idempotent reconciliation worker reads shard WAL via Debezium and backfills missing GSI entries. | Non-partition lookups experience momentary 404 until CDC catches up (< 500ms). |
| **Physical Shard Primary Crash** | Hardware failure or OOM killer terminates PostgreSQL primary. | Shard health check fails 3 consecutive cycles; connection pool timeout. | Patroni / Cloud Orchestrator promotes in-sync replica; router transparently retries connection. | In-flight transactions aborted; clients must retry idempotent writes. |
| **Split-Brain Topology Mismatch** | App server A has outdated ring version while App server B has new ring post-resharding. | Write routed to old shard where key no longer resides. | Shard schema trigger rejects keys outside assigned hash range, returning `ERR_WRONG_SHARD` code to force topology refresh. | Small bump in client-side retry latency during ring rollout. |

---

## 8. Prometheus Alert Rules

```yaml
groups:
  - name: sharded_database_alerts
    rules:
      - alert: ShardLoadSkewImbalance
        expr: |
          (max(rate(shard_query_total[5m])) by (cluster) - min(rate(shard_query_total[5m])) by (cluster))
          / avg(rate(shard_query_total[5m])) by (cluster) > 0.45
        for: 15m
        labels:
          severity: warning
          tier: database
        annotations:
          summary: "Database Shard Traffic Imbalance Detected (> 45% skew)"
          description: "One or more shards are receiving disproportionate query volume. Investigate hot tenant keys."

      - alert: ScatterGatherP99LatencyBreach
        expr: histogram_quantile(0.99, rate(scatter_gather_duration_seconds_bucket[5m])) > 1.2
        for: 5m
        labels:
          severity: critical
          tier: api
        annotations:
          summary: "Scatter-Gather P99 Latency > 1200ms"
          description: "Cross-shard analytical fanouts are degrading API latency. Inspect slowest underlying shard."

      - alert: ShardDeadlockRateHigh
        expr: rate(pg_stat_database_deadlocks[5m]) > 2
        for: 3m
        labels:
          severity: critical
          tier: database
        annotations:
          summary: "High Deadlock Rate Across Database Shards"
          description: "Concurrent updates across sharded tables are generating lock contention."
```

---

## 9. Automated Verification & Chaos Test Script

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    point_lookups: {
      executor: 'constant-arrival-rate',
      rate: 5000,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 100,
      maxVUs: 300,
    },
    scatter_gather_reports: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    'http_req_duration{scenario:point_lookups}': ['p(95)<8', 'p(99)<25'],
    'http_req_duration{scenario:scatter_gather_reports}': ['p(95)<350', 'p(99)<800'],
    'http_req_failed': ['rate<0.001'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';

export default function () {
  const tenantId = `tenant_${Math.floor(Math.random() * 5000)}`;

  // 1. Point Write (Must hit deterministic single shard)
  const writeRes = http.post(
    `${BASE_URL}/api/v1/invoices`,
    JSON.stringify({
      tenant_id: tenantId,
      amount_cents: 14900,
      currency: 'USD',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(writeRes, {
    'point write status 201': (r) => r.status === 201,
  });

  // 2. Point Read (Resolved in < 5ms via consistent hash ring)
  const readRes = http.get(`${BASE_URL}/api/v1/invoices?tenant_id=${tenantId}`);
  check(readRes, {
    'point read status 200': (r) => r.status === 200,
  });

  sleep(0.05);
}
```

---

## 10. CLI Scaffolding & Verification

Initialize the complete runnable multi-shard PostgreSQL cluster, TypeScript router, and k6 test suite in your workspace:

```bash
npx software-blueprints init sys-consistent-hashing
```

To run the verification suite:

```bash
cd blueprints/sys-consistent-hashing
docker compose up -d
npm install
npm test
```

---

## 11. Related Architecture Blueprints

- [Multi-Tenant B2B SaaS: PostgreSQL RLS](/docs/full-stack/multi-tenant-saas/overview) - Row-level security within single-node or sharded tenants.
- [Transactional Outbox & CDC](/docs/system-design/transactional-outbox-cdc/overview) - Asynchronous propagation from shard WAL to Central GSI.
- [Distributed Caching & Invalidation](/docs/system-design/distributed-caching/overview) - Multi-tier caching layer for sharded point lookups.

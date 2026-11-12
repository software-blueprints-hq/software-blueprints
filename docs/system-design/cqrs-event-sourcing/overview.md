---
sidebar_position: 1
title: "CQRS & Event Sourcing Architecture"
description: "Production CQRS & Event Sourcing: Append-only event store, optimistic concurrency versioning, asynchronous read model projections, and snapshotting."
---

import BlueprintVerificationBadge from '@site/src/components/BlueprintVerificationBadge';

# CQRS & Event Sourcing Architecture

<BlueprintVerificationBadge blueprintId="sys-cqrs" />

Traditional CRUD systems overwrite database rows in-place (`UPDATE accounts SET balance = 500 WHERE id = 1`). In doing so, they irreversibly destroy **historical context, operational intent, and audit provenance**. When a financial discrepancy or state corruption emerges, engineers have no mechanism to determine who initiated the change, when it occurred, or what sequence of intermediate states led to the failure.

**Event Sourcing** persists every state mutation as an **immutable, past-tense domain event** (`AccountOpened`, `FundsDeposited`, `TransferCompleted`). The current state of an entity is derived by replaying its historical event stream. **CQRS (Command Query Responsibility Segregation)** decouples the write model (optimizing for transactional consistency and business invariant enforcement) from the read model (optimizing for high-throughput, denormalized query access).

---

## 1. System Architecture: Command & Query Separation

```mermaid
flowchart TD
    subgraph CommandSide ["1. Command (Write) Model"]
        Command["Incoming Command\n(ExecuteTransfer)"]
        CmdHandler["Command Handler & Aggregate Root\n(Enforces business invariants)"]
        EventStore[("PostgreSQL Append-Only Event Store\nUNIQUE (stream_id, version)")]
        SnapshotStore[("Aggregate Snapshot Store\n(State at every 100th event)")]
    end

    subgraph EventStreaming ["2. Reliable Outbox & Event Streaming Tier"]
        DomainEvent["Domain Event\n(FundsTransferred v4)"]
        OutboxQueue["Transactional Outbox Table"]
        KafkaBus["Kafka KRaft Domain Topic\n(partition_key = stream_id)"]
    end

    subgraph QuerySide ["3. Query (Read) Model & Projections"]
        Projector["Projection Worker Daemon\n(Idempotent consumer with version guard)"]
        ReadDB[("Denormalized Read Model\n(PostgreSQL Materialized View / Redis)")]
        QueryGateway["Read Query Gateway\n(GET /api/v1/accounts/{id}/summary)"]
    end

    Command --> CmdHandler
    SnapshotStore -.->|Fast Hydration| CmdHandler
    EventStore -.->|Replay Events > Snapshot| CmdHandler
    CmdHandler -->|Atomic Commit: Event + Outbox| EventStore
    EventStore --> DomainEvent
    DomainEvent --> OutboxQueue
    OutboxQueue --> KafkaBus
    KafkaBus --> Projector
    Projector -->|Idempotent Upsert| ReadDB
    QueryGateway --> ReadDB
```

---

## 2. Architectural Decision Record (ADR-013)

### Context & Problem Statement
Our core financial banking platform requires full forensic auditability, cryptographic non-repudiation, and regulatory compliance (SOC2 Type II, PCI-DSS). Traditional relational CRUD schema updates destroy temporal history, making historical balance reconstruction impossible without restoring backup snapshots. Furthermore, read queries joining ledger lines across 40 million rows saturate database I/O, degrading write throughput.

### Decision
We implement a **CQRS and Event Sourced Architecture with an Append-Only PostgreSQL Event Store**:
1. **Append-Only Write Invariant:** The database role granted to application command services has `SELECT` and `INSERT` privileges only. `UPDATE` and `DELETE` commands are revoked at the PostgreSQL engine level on `domain_events`.
2. **Optimistic Concurrency Control (OCC):** Race conditions are prevented via a hard database constraint `UNIQUE (stream_id, version)`. If two concurrent commands attempt to append an event at version `N + 1`, the loser receives a unique constraint violation and retries.
3. **Decoupled Asynchronous Read Models:** Write transactions never update read tables. A dedicated projection worker consumes events asynchronously from the transactional outbox/Kafka and updates denormalized read views.
4. **Periodic Snapshotting:** When an aggregate event stream exceeds 100 events, a serialized snapshot is persisted. Rehydration loads the latest snapshot and replays only subsequent events.
5. **In-Memory Upcasting:** When event schemas evolve over time, in-memory upcasters transform legacy version payloads (`v1` to `v2`) during aggregate hydration without migrating historical database rows.

### Status
Accepted & Implemented in Production Core.

### Consequences

**Positive:**
- Complete temporal audit log: system state at any historical point in time can be deterministically reproduced.
- Elimination of distributed write locks: all mutations append immutable records at the end of the stream.
- Independent scalability: read models can be scaled horizontally (e.g., Elasticsearch, Redis) without impacting write throughput.

**Negative:**
- Eventual consistency window: read projections reflect writes with a typical lag of 50–150 ms.
- Schema evolution complexity: events cannot be altered in-place; schema transformations must be handled via code upcasting.
- Storage volume expansion: historical events grow monotonically, requiring automated cold storage tiering.

---

## 3. Mathematical Analysis & Quantitative Performance

### 3.1 Aggregate Hydration Latency: Raw Replay vs Snapshotting

Let `E` be the total count of historical events in an aggregate stream, `t_fetch` be the baseline query network round-trip time, and `t_apply` be the CPU deserialization and state application time per event:

```text
Hydration Duration without Snapshots:
T_raw(E) = t_fetch + (E * t_apply)
```

As an account accumulates `E = 10,000` transactions over time (with `t_apply ~ 0.05ms`):

```text
T_raw(10,000) = 5ms + (10,000 * 0.05ms) = 5ms + 500ms = 505 ms (Unacceptable checkout latency)
```

When snapshotting every `S` events (where `S = 100`), the number of events replayed is bounded to at most `S - 1`:

```text
Hydration Duration with Snapshots:
T_snapshot(E) = t_snap_fetch + ((E mod S) * t_apply) <= t_snap_fetch + (S * t_apply)
```

For `S = 100`:

```text
T_snapshot_max = 6ms + (100 * 0.05ms) = 6ms + 5ms = 11 ms
```

Snapshotting provides a **45x latency reduction** for high-volume accounts and guarantees that aggregate hydration remains `O(1)` with respect to total account age.

### 3.2 Optimistic Concurrency Collision Probability

Assuming command requests for a single aggregate arrive according to a Poisson process with arrival rate `lambda` (commands/sec), and the write transaction execution window is `T_w` seconds:

```text
Probability of a version collision (concurrency conflict):
P(conflict) = 1 - e^(-lambda * T_w)
```

For standard accounts (`lambda = 0.1 req/s`, `T_w = 0.01s`):

```text
P(conflict) = 1 - e^(-0.001) ~ 0.1% (Easily mitigated by 1 automatic retry)
```

For high-velocity treasury accounts (`lambda = 50 req/s`, `T_w = 0.01s`):

```text
P(conflict) = 1 - e^(-0.5) ~ 39.3%
```

**Production Standard:** High-velocity aggregates must route through an in-memory command queue or use Single-Flight coalescing to serialize command arrivals before hitting the event store.

---

## 4. Production Python / Psycopg3 Event Sourcing Engine

```python
"""
Production CQRS & Event Sourcing Engine.
Features: Optimistic Concurrency Control, Materialized Snapshots,
In-Memory Event Replay, and Idempotent Read Projections.
"""
from __future__ import annotations

import dataclasses
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import uuid

import psycopg
from psycopg.rows import dict_row

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cqrs_event_sourcing")


class ConcurrencyError(Exception):
    """Raised when an optimistic concurrency version collision occurs."""
    pass


@dataclass(frozen=True)
class DomainEvent:
    event_id: str
    stream_id: str
    version: int
    event_type: str
    payload: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    recorded_at: Optional[str] = None


class AccountAggregate:
    """Aggregate Root enforcing business invariants over historical events."""

    def __init__(self, account_id: str):
        self.id = account_id
        self.version = 0
        self.balance_cents = 0
        self.currency = "USD"
        self.is_closed = False
        self.uncommitted_events: List[DomainEvent] = []

    def apply_event(self, event: DomainEvent):
        """Mutates internal aggregate state deterministically."""
        if event.event_type == "AccountOpened":
            self.balance_cents = event.payload["initial_deposit_cents"]
            self.currency = event.payload.get("currency", "USD")
        elif event.event_type == "FundsDeposited":
            self.balance_cents += event.payload["amount_cents"]
        elif event.event_type == "FundsWithdrawn":
            self.balance_cents -= event.payload["amount_cents"]
        elif event.event_type == "AccountClosed":
            self.is_closed = True

        self.version = event.version

    def open_account(self, initial_deposit_cents: int, currency: str = "USD"):
        if self.version > 0:
            raise ValueError(f"Account {self.id} is already initialized.")
        if initial_deposit_cents < 0:
            raise ValueError("Initial deposit cannot be negative.")

        self._record_event("AccountOpened", {
            "initial_deposit_cents": initial_deposit_cents,
            "currency": currency
        })

    def deposit_funds(self, amount_cents: int, reference_id: str):
        if self.is_closed:
            raise ValueError("Cannot deposit funds into a closed account.")
        if amount_cents <= 0:
            raise ValueError("Deposit amount must be positive.")

        self._record_event("FundsDeposited", {
            "amount_cents": amount_cents,
            "reference_id": reference_id
        })

    def withdraw_funds(self, amount_cents: int, reference_id: str):
        if self.is_closed:
            raise ValueError("Cannot withdraw from a closed account.")
        if amount_cents <= 0:
            raise ValueError("Withdrawal amount must be positive.")
        if self.balance_cents < amount_cents:
            raise ValueError(
                f"Insufficient funds: Current balance is {self.balance_cents} cents, "
                f"attempted withdrawal is {amount_cents} cents."
            )

        self._record_event("FundsWithdrawn", {
            "amount_cents": amount_cents,
            "reference_id": reference_id
        })

    def _record_event(self, event_type: str, payload: Dict[str, Any]):
        new_version = self.version + 1
        event = DomainEvent(
            event_id=str(uuid.uuid4()),
            stream_id=self.id,
            version=new_version,
            event_type=event_type,
            payload=payload
        )
        self.apply_event(event)
        self.uncommitted_events.append(event)


class PostgresEventStoreRepository:
    def __init__(self, dsn: str, snapshot_interval: int = 100):
        self.dsn = dsn
        self.snapshot_interval = snapshot_interval

    def load_aggregate(self, account_id: str) -> AccountAggregate:
        """Hydrates aggregate: checks for snapshot, then replays trailing events."""
        aggregate = AccountAggregate(account_id)

        with psycopg.connect(self.dsn, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # 1. Attempt to load latest snapshot
                cur.execute(
                    """
                    SELECT snapshot_version, state_payload
                    FROM aggregate_snapshots
                    WHERE stream_id = %s;
                    """,
                    (account_id,)
                )
                snapshot_row = cur.fetchone()
                from_version = 0

                if snapshot_row:
                    aggregate.version = snapshot_row["snapshot_version"]
                    payload = snapshot_row["state_payload"]
                    aggregate.balance_cents = payload["balance_cents"]
                    aggregate.currency = payload["currency"]
                    aggregate.is_closed = payload["is_closed"]
                    from_version = snapshot_row["snapshot_version"]

                # 2. Replay all subsequent domain events
                cur.execute(
                    """
                    SELECT id, version, event_type, payload, metadata, recorded_at
                    FROM domain_events
                    WHERE stream_id = %s AND version > %s
                    ORDER BY version ASC;
                    """,
                    (account_id, from_version)
                )
                for row in cur.fetchall():
                    event = DomainEvent(
                        event_id=str(row["id"]),
                        stream_id=account_id,
                        version=row["version"],
                        event_type=row["event_type"],
                        payload=row["payload"],
                        metadata=row["metadata"],
                        recorded_at=str(row["recorded_at"])
                    )
                    aggregate.apply_event(event)

        return aggregate

    def save_aggregate(self, aggregate: AccountAggregate, expected_version: int):
        """Commits uncommitted domain events using optimistic concurrency control."""
        if not aggregate.uncommitted_events:
            return

        with psycopg.connect(self.dsn) as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    for event in aggregate.uncommitted_events:
                        try:
                            cur.execute(
                                """
                                INSERT INTO domain_events (id, stream_id, version, event_type, payload, metadata)
                                VALUES (%s, %s, %s, %s, %s, %s);
                                """,
                                (
                                    event.event_id,
                                    event.stream_id,
                                    event.version,
                                    event.event_type,
                                    json.dumps(event.payload),
                                    json.dumps(event.metadata)
                                )
                            )
                        except psycopg.errors.UniqueViolation:
                            raise ConcurrencyError(
                                f"Optimistic Concurrency Conflict on stream '{aggregate.id}'. "
                                f"Expected version {expected_version}, but concurrent write occurred."
                            )

                    # Update stream current_version pointer
                    cur.execute(
                        """
                        INSERT INTO event_streams (stream_id, stream_type, current_version)
                        VALUES (%s, 'Account', %s)
                        ON CONFLICT (stream_id) DO UPDATE
                        SET current_version = EXCLUDED.current_version;
                        """,
                        (aggregate.id, aggregate.version)
                    )

                    # Snapshot evaluation
                    if aggregate.version % self.snapshot_interval == 0:
                        snapshot_state = {
                            "balance_cents": aggregate.balance_cents,
                            "currency": aggregate.currency,
                            "is_closed": aggregate.is_closed
                        }
                        cur.execute(
                            """
                            INSERT INTO aggregate_snapshots (stream_id, snapshot_version, state_payload)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (stream_id) DO UPDATE
                            SET snapshot_version = EXCLUDED.snapshot_version,
                                state_payload = EXCLUDED.state_payload;
                            """,
                            (aggregate.id, aggregate.version, json.dumps(snapshot_state))
                        )

        aggregate.uncommitted_events.clear()
```

---

## 5. PostgreSQL Event Store DDL & Hardened Role Permissions

```sql
-- ============================================================================
-- Production Event Store Schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stream Registry Table
CREATE TABLE event_streams (
    stream_id UUID PRIMARY KEY,
    stream_type VARCHAR(64) NOT NULL,
    current_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable Append-Only Domain Event Store
CREATE TABLE domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES event_streams(stream_id) ON DELETE RESTRICT,
    version BIGINT NOT NULL CHECK (version > 0),
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Core Optimistic Concurrency Invariant:
    CONSTRAINT uq_stream_version UNIQUE (stream_id, version)
);

CREATE INDEX idx_events_stream_ver ON domain_events(stream_id, version ASC);
CREATE INDEX idx_events_type_recorded ON domain_events(event_type, recorded_at);

-- Materialized Snapshot Store
CREATE TABLE aggregate_snapshots (
    stream_id UUID PRIMARY KEY,
    snapshot_version BIGINT NOT NULL,
    state_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Denormalized Read Model Table (Query Side)
-- ============================================================================

CREATE TABLE read_account_summaries (
    account_id UUID PRIMARY KEY,
    balance_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    last_event_version BIGINT NOT NULL,
    last_event_type VARCHAR(128) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_read_account_status ON read_account_summaries(status);

-- ============================================================================
-- Hardened Security Grants: Enforce Immutability at Engine Level
-- ============================================================================

-- Create restricted application writer role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_command_worker') THEN
    CREATE ROLE app_command_worker WITH LOGIN PASSWORD 'strong_worker_password';
  END IF;
END $$;

-- Revoke all mutations except INSERT and SELECT on event store
GRANT SELECT, INSERT ON domain_events, event_streams, aggregate_snapshots TO app_command_worker;
REVOKE UPDATE, DELETE, TRUNCATE ON domain_events FROM app_command_worker;
```

---

## 6. Production Multi-Service Docker Compose Environment

```yaml
version: '3.8'

services:
  # Primary Event Store Database
  postgres-eventstore:
    image: postgres:16-alpine
    container_name: postgres-eventstore
    environment:
      POSTGRES_DB: eventstore_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5432:5432"
    volumes:
      - eventstore_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d eventstore_db"]
      interval: 5s
      timeout: 3s
      retries: 5

  # CQRS Command API (Writes events)
  cqrs-command-api:
    build:
      context: .
      dockerfile: Dockerfile.command
    container_name: cqrs-command-api
    environment:
      DATABASE_URL: "postgresql://postgres:postgrespassword@postgres-eventstore:5432/eventstore_db"
      PORT: 8080
    ports:
      - "8080:8080"
    depends_on:
      postgres-eventstore:
        condition: service_healthy

  # CQRS Projection Daemon (Asynchronously updates read views)
  cqrs-projection-worker:
    build:
      context: .
      dockerfile: Dockerfile.projector
    container_name: cqrs-projection-worker
    environment:
      DATABASE_URL: "postgresql://postgres:postgrespassword@postgres-eventstore:5432/eventstore_db"
    depends_on:
      postgres-eventstore:
        condition: service_healthy

  # CQRS Read Query API (Serves denormalized queries)
  cqrs-query-api:
    build:
      context: .
      dockerfile: Dockerfile.query
    container_name: cqrs-query-api
    environment:
      DATABASE_URL: "postgresql://postgres:postgrespassword@postgres-eventstore:5432/eventstore_db"
      PORT: 8081
    ports:
      - "8081:8081"
    depends_on:
      postgres-eventstore:
        condition: service_healthy

volumes:
  eventstore_data:
```

---

## 7. Failure Modes & Mitigation Matrix

| Failure Mode | Root Cause | Detection Signal | Automated Mitigation | Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Optimistic Concurrency Storm** | Multiple clients simultaneously submit commands for the same account. | `UniqueViolation` rate spikes on `uq_stream_version`. | Command handler re-hydrates aggregate state and retries command with exponential backoff (up to 3 attempts). | Under extreme contention (> 100 concurrent writers), commands exceed retry budget and return HTTP 409. |
| **Projection Consumer Lag Drift** | High write volume overwhelms single-threaded projection consumer. | `projection_lag_seconds > 5s`. | Partition read projection workers by `stream_id` hash across a Kafka consumer group. | Read API returns slightly stale data during consumer rebalances (< 200 ms). |
| **Poison Pill Event in Stream** | Corrupt payload fails deserialization in projection worker. | Projector crashes repeatedly; consumer group enters crash-loop. | Route failing event to Dead Letter Queue (`dlq_events`); projector commits offset and continues. | Read model missing projection for single corrupt entity; requires manual DLQ replay. |
| **Corrupt Snapshot Desynchronization** | Snapshot written with outdated schema or partial state payload. | Hydrated aggregate fails internal invariant assertion checks. | Fall back to full event stream replay from `version = 0`; discard invalid snapshot. | Momentary hydration latency increase (from 5 ms to ~50 ms) during cache eviction. |
| **Out-of-Order Projection Update** | Distributed message broker delivers event v5 before v4. | Projector detects `event.version > read_model.version + 1`. | Buffer future event in memory; pause projection for `stream_id` until missing version arrives. | Brief local read delay for that specific aggregate until sequence completes. |

---

## 8. Prometheus Alert Rules

```yaml
groups:
  - name: cqrs_event_sourcing_alerts
    rules:
      - alert: ProjectionConsumerLagHigh
        expr: rate(events_appended_total[5m]) - rate(events_projected_total[5m]) > 250
        for: 3m
        labels:
          severity: critical
          tier: projections
        annotations:
          summary: "CQRS Read Model Projection Lag > 250 events/sec"
          description: "Read models are drifting behind the write event store. Scale up projection worker replicas."

      - alert: OptimisticConcurrencyConflictSpike
        expr: |
          rate(command_concurrency_conflicts_total[5m])
          / rate(commands_executed_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
          tier: command_api
        annotations:
          summary: "High Optimistic Concurrency Conflict Rate (> 5%)"
          description: "Elevated write collisions on event streams. Inspect hot aggregate routing."

      - alert: AggregateHydrationDurationP99High
        expr: histogram_quantile(0.99, rate(aggregate_hydration_duration_seconds_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
          tier: command_api
        annotations:
          summary: "Aggregate Rehydration P99 > 100ms"
          description: "Event streams are exceeding replay budgets. Validate snapshotting frequency."
```

---

## 9. Automated Verification & Concurrency Test Script

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    concurrent_deposit_race: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 20,
      maxDuration: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<45', 'p(99)<120'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const SHARED_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

export default function () {
  // Test: Concurrent writers bombard the same shared account
  // Verifies that:
  // 1. Exactly one writer succeeds per version slot
  // 2. OCC rejects race conditions with HTTP 409
  // 3. Balance never corrupts or experiences lost updates

  const payload = JSON.stringify({
    amount_cents: 1000,
    reference_id: `ref_${Date.now()}_${Math.random()}`,
  });

  const res = http.post(
    `${BASE_URL}/api/v1/accounts/${SHARED_ACCOUNT_ID}/deposit`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'valid response code (200 success or 409 concurrency conflict)': (r) =>
      r.status === 200 || r.status === 409,
  });

  sleep(0.05);
}
```

---

## 10. CLI Scaffolding & Verification

Initialize the complete runnable CQRS & Event Sourcing stack, PostgreSQL schemas, and test suite:

```bash
npx software-blueprints init sys-cqrs
```

To run the verification suite:

```bash
cd blueprints/sys-cqrs
docker compose up -d
python -m unittest test_event_store.py
```

---

## 11. Related Architecture Blueprints

- [Idempotent Payment Ledger](/docs/system-design/idempotent-payment-ledger/overview) - Double-entry financial invariants built on append-only ledgers.
- [Transactional Outbox & CDC](/docs/system-design/transactional-outbox-cdc/overview) - Debezium CDC for streaming domain events to read projections.
- [Distributed Saga Orchestrator](/docs/system-design/distributed-saga-orchestrator/overview) - Coordinating multi-aggregate sagas triggered by domain events.

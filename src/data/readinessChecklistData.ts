export type SeverityLevel = 'P0_BLOCKER' | 'P1_CRITICAL' | 'P2_RECOMMENDED';

export interface ReadinessItem {
  id: string;
  category: string;
  title: string;
  severity: SeverityLevel;
  description: string;
  failureRisk: string;
  verificationQuestion: string;
  remediationAction: string;
  applicablePresets: string[]; // 'all', 'kafka', 'ratelimit', 'saas', 'rag', 'microservice'
}

export interface SystemPreset {
  id: string;
  name: string;
  description: string;
  targetSLO: string;
}

export const READINESS_PRESETS: SystemPreset[] = [
  {
    id: 'all',
    name: '🌐 Universal Production Standard',
    description: 'Comprehensive 8-pillar production audit covering resilience, storage, security, and DR.',
    targetSLO: '99.99% Availability • Zero Data Loss'
  },
  {
    id: 'kafka',
    name: '📨 Kafka Event Streaming & DLQ',
    description: 'Specialized for high-throughput stream processing, consumer fleets, and non-blocking retries.',
    targetSLO: '10,000 EPS • 0ms HoL Blocking • Lag < 500'
  },
  {
    id: 'ratelimit',
    name: '🛡️ Distributed Rate Limiter & Token Bucket',
    description: 'Specialized for API perimeter defense, Redis clustering, and negative cache fallbacks.',
    targetSLO: '50,000 RPS • P99 < 2ms • Fail-Open Safe'
  },
  {
    id: 'saas',
    name: '🏢 Multi-Tenant B2B SaaS (Postgres RLS)',
    description: 'Specialized for multi-tenant data boundaries, connection pooling, and tenant context propagation.',
    targetSLO: 'Zero Cross-Tenant Leaks • Strict Fail-Closed'
  },
  {
    id: 'rag',
    name: '🤖 AI Agent & Hybrid Streaming RAG',
    description: 'Specialized for vector database memory sizing, SSE streaming disconnects, and provider fallbacks.',
    targetSLO: 'TTFT < 800ms • Zero Orphaned Inference Tokens'
  },
  {
    id: 'microservice',
    name: '⚡ Go / Java Clean Microservice API',
    description: 'Specialized for low-latency REST/gRPC backends, connection pool bounds, and distroless builds.',
    targetSLO: '25,000 RPS • P99 < 15ms • < 25MB Distroless'
  }
];

export const READINESS_ITEMS: ReadinessItem[] = [
  // 1. Resilience & Fault Tolerance
  {
    id: 'res-1',
    category: '1. Resilience & Fault Tolerance',
    title: 'Non-Blocking Poison-Pill Quarantine (DLQ)',
    severity: 'P0_BLOCKER',
    description: 'Unprocessable payloads (malformed JSON, validation errors) must be quarantined off-path without stalling healthy queue/partition traffic.',
    failureRisk: 'Single poison-pill message triggers Head-of-Line (HoL) blocking, exploding consumer lag and causing fleet rebalance storms.',
    verificationQuestion: 'Are fatal deserialization or validation errors routed directly to a DLQ within < 5ms without entering retry loops?',
    remediationAction: 'Implement Spring Kafka @RetryableTopic with exclude={JsonParseException.class} or SQS DLQ redrive policy with maxReceiveCount=3.',
    applicablePresets: ['all', 'kafka', 'rag', 'microservice']
  },
  {
    id: 'res-2',
    category: '1. Resilience & Fault Tolerance',
    title: 'Strict Database-Level Idempotency Ledger',
    severity: 'P0_BLOCKER',
    description: 'At-least-once message delivery or network retries must not execute duplicate business mutations (e.g. double charging credit cards).',
    failureRisk: 'Network timeout retries cause duplicate payments, inventory over-allocation, or corrupted database balances.',
    verificationQuestion: 'Is every state-mutating operation protected by an atomic idempotency key check (e.g. INSERT ... ON CONFLICT DO NOTHING)?',
    remediationAction: 'Add a partitioned kafka_processed_events table and wrap the business transaction with the idempotency insert.',
    applicablePresets: ['all', 'kafka', 'saas', 'microservice']
  },
  {
    id: 'res-3',
    category: '1. Resilience & Fault Tolerance',
    title: 'Multi-Tier Cache Fallback & Fail-Open Behavior',
    severity: 'P1_CRITICAL',
    description: 'Distributed caches (Redis/Memcached) must feature a localized in-memory fallback to prevent total application outages during cache downtime.',
    failureRisk: 'Redis outage triggers an instantaneous thundering herd to PostgreSQL, collapsing the primary relational database in seconds.',
    verificationQuestion: 'Does the application fallback to a local LRU cache or graceful degraded mode when Redis is unreachable?',
    remediationAction: 'Configure Envoy failure_mode_deny: false or add a local Go Ristretto / Java Caffeine negative cache.',
    applicablePresets: ['all', 'ratelimit', 'microservice']
  },

  // 2. Data & Storage Integrity
  {
    id: 'data-1',
    category: '2. Data & Storage Integrity',
    title: 'PostgreSQL Kernel-Level Row-Level Security (RLS)',
    severity: 'P0_BLOCKER',
    description: 'Multi-tenant applications must enforce tenant boundary filtering at the database kernel level, not purely in application code.',
    failureRisk: 'A single omitted WHERE tenant_id = :id in an ad-hoc ORM query leaks confidential tenant data across corporate boundaries (P0 incident).',
    verificationQuestion: 'Is FORCE ROW LEVEL SECURITY enabled on all tenant tables with a fail-closed NULLIF policy?',
    remediationAction: 'Execute ALTER TABLE ... FORCE ROW LEVEL SECURITY and define policies checking current_setting(\'app.current_tenant_id\').',
    applicablePresets: ['all', 'saas', 'rag']
  },
  {
    id: 'data-2',
    category: '2. Data & Storage Integrity',
    title: 'Strict Connection Pool Bounds & Transaction Scoping',
    severity: 'P0_BLOCKER',
    description: 'Database connection pools must be strictly bounded to prevent PostgreSQL backend process exhaustion during traffic surges.',
    failureRisk: 'Uncapped connection pools spawn 2,000+ Postgres backends, saturating OS RAM, causing disk thrashing, and dropping all connections.',
    verificationQuestion: 'Are MaxConns capped (e.g. 25-50 per node) and pooled via PgBouncer or pgxpool in transaction pooling mode?',
    remediationAction: 'Configure pool_mode = transaction in pgbouncer.ini and use set_config(\'...\', true) to automatically clear state on COMMIT.',
    applicablePresets: ['all', 'saas', 'microservice', 'rag']
  },
  {
    id: 'data-3',
    category: '2. Data & Storage Integrity',
    title: 'Vector Index In-Memory Sizing Verification',
    severity: 'P1_CRITICAL',
    description: 'pgvector HNSW graphs must fit entirely in RAM (shared_buffers + OS page cache) to sustain sub-50ms search latency.',
    failureRisk: 'HNSW graphs evicting to NVMe/EBS disk trigger page faults, causing P99 search latency to spike from 20ms to 800ms+.',
    verificationQuestion: 'Has HNSW RAM consumption been sized (1.28 * raw vector bytes) and validated against allocated shared_buffers?',
    remediationAction: 'Allocate 8GB+ shared_buffers for 1M 1536-dim vectors and verify with pg_statio_user_tables buffer hit ratio > 99%.',
    applicablePresets: ['all', 'rag']
  },

  // 3. Security & Threat Mitigation
  {
    id: 'sec-1',
    category: '3. Security & Threat Mitigation',
    title: 'Unprivileged Database Roles (Non-Superuser)',
    severity: 'P0_BLOCKER',
    description: 'Application services must connect as an unprivileged database user without SUPERUSER, CREATEDB, or BYPASSRLS permissions.',
    failureRisk: 'Postgres SUPERUSER connections bypass Row-Level Security automatically, nullifying all tenant isolation protections.',
    verificationQuestion: 'Does the application runtime connect using a dedicated role with NOBYPASSRLS and NOSUPERUSER flags?',
    remediationAction: 'CREATE ROLE saas_app_user WITH LOGIN NOSUPERUSER NOBYPASSRLS and grant SELECT/INSERT only on required tables.',
    applicablePresets: ['all', 'saas', 'microservice', 'rag']
  },
  {
    id: 'sec-2',
    category: '3. Security & Threat Mitigation',
    title: 'Strict Parameterized SQL & Disallowed Unknown JSON',
    severity: 'P1_CRITICAL',
    description: 'Dynamic string interpolation in queries must be banned, and JSON decoders must reject unknown parameters to prevent mass-assignment.',
    failureRisk: 'SQL injection attacks or unauthorized field manipulation (e.g. injecting is_admin: true in user profile updates).',
    verificationQuestion: 'Are all SQL statements parameterized ($1, $2) and JSON decoders configured with DisallowUnknownFields()?',
    remediationAction: 'Enable ESLint/golangci-lint rules banning string concatenation in SQL and enable strict schema validation in controllers.',
    applicablePresets: ['all', 'saas', 'microservice', 'ratelimit']
  },

  // 4. Observability & SLIs/SLOs
  {
    id: 'obs-1',
    category: '4. Observability & SLIs/SLOs',
    title: 'Prometheus Alerting Rules for Consumer Lag & P99 Latency',
    severity: 'P0_BLOCKER',
    description: 'Core telemetry must include Prometheus alerts on consumer lag (> 5000 records), P99 latency breaches, and DLQ quarantine counters.',
    failureRisk: 'Silent consumer stalls or memory leaks persist for hours undetected until customers report missing orders or slow response times.',
    verificationQuestion: 'Are alert rules deployed in Prometheus with PagerDuty integration for consumer lag and DLQ rate > 0?',
    remediationAction: 'Deploy Prometheus alert rules: KafkaConsumerLagCritical and KafkaDlqPoisonPillsDetected with 3-minute evaluation windows.',
    applicablePresets: ['all', 'kafka', 'ratelimit', 'microservice']
  },
  {
    id: 'obs-2',
    category: '4. Observability & SLIs/SLOs',
    title: 'W3C Distributed Traceparent Propagation',
    severity: 'P1_CRITICAL',
    description: 'HTTP headers and Kafka record headers must propagate W3C traceparent context across all asynchronous service boundaries.',
    failureRisk: 'Inability to trace multi-service root causes during cross-service latency degradation or failed distributed transactions.',
    verificationQuestion: 'Do message producers and HTTP clients inject traceparent headers into outbound requests?',
    remediationAction: 'Enable OpenTelemetry auto-instrumentation or Micrometer Tracing in the application gateway and consumer fleet.',
    applicablePresets: ['all', 'kafka', 'microservice', 'rag']
  },

  // 5. Scalability & Resource Management
  {
    id: 'scale-1',
    category: '5. Scalability & Resource Management',
    title: 'Client Disconnect Trapping for Streaming Endpoints',
    severity: 'P1_CRITICAL',
    description: 'Server-Sent Events (SSE) and long-polling HTTP connections must monitor client TCP closure to abort upstream work immediately.',
    failureRisk: 'Users closing browser tabs leave backend LLM generation or heavy SQL queries running, wasting 20%+ of cloud spend.',
    verificationQuestion: 'Does the streaming handler check request.is_disconnected() or context.Done() to abort processing within < 100ms?',
    remediationAction: 'Wrap streaming loops in FastAPI with request.is_disconnected() check and cancel the upstream asyncio.Task.',
    applicablePresets: ['all', 'rag', 'microservice']
  },
  {
    id: 'scale-2',
    category: '5. Scalability & Resource Management',
    title: 'Cooperative Consumer Rebalancing Strategy',
    severity: 'P1_CRITICAL',
    description: 'Kafka consumers must use CooperativeStickyAssignor instead of eager assignors to prevent global stop-the-world rebalance pauses.',
    failureRisk: 'Pod auto-scaling revokes all partitions across all consumers, halting event processing cluster-wide for 30-60 seconds.',
    verificationQuestion: 'Is partition.assignment.strategy set to CooperativeStickyAssignor in consumer configuration?',
    remediationAction: 'Set spring.kafka.consumer.properties.partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor.',
    applicablePresets: ['all', 'kafka']
  },

  // 6. Deployment & Operational Hygiene
  {
    id: 'dep-1',
    category: '6. Deployment & Operational Hygiene',
    title: 'Distroless Minimal Container Runtime',
    severity: 'P1_CRITICAL',
    description: 'Production container images must run as non-root users and exclude package managers (apt, apk), shells (sh, bash), and compilers.',
    failureRisk: 'Attacker exploiting a remote code execution vulnerability immediately gains an interactive bash shell in the Kubernetes pod.',
    verificationQuestion: 'Is the container based on gcr.io/distroless/static-debian12:nonroot with an unprivileged UID?',
    remediationAction: 'Use multi-stage Dockerfile: build in golang/maven image, copy static binary into distroless:nonroot, run as USER nonroot.',
    applicablePresets: ['all', 'microservice', 'saas', 'kafka']
  },
  {
    id: 'dep-2',
    category: '6. Deployment & Operational Hygiene',
    title: 'Graceful Shutdown with Active In-Flight Draining',
    severity: 'P1_CRITICAL',
    description: 'Services receiving SIGTERM must stop accepting new traffic and allow in-flight transactions 10-15 seconds to complete before exit.',
    failureRisk: 'SIGKILL drops active database transactions mid-flight, leaving orphaned state, broken TCP connections, and 502 Bad Gateway spikes.',
    verificationQuestion: 'Does the server trap SIGTERM/SIGINT and execute srv.Shutdown(shutdownCtx) with a 10s drain window?',
    remediationAction: 'Implement signal.NotifyContext in Go or set server.shutdown=graceful and spring.lifecycle.timeout-per-shutdown-phase=15s in Spring.',
    applicablePresets: ['all', 'microservice', 'saas', 'kafka', 'ratelimit', 'rag']
  },

  // 7. Disaster Recovery & Runbooks
  {
    id: 'dr-1',
    category: '7. Disaster Recovery & Runbooks',
    title: 'Documented & Tested DLQ Replay Runbook',
    severity: 'P0_BLOCKER',
    description: 'Operations teams must possess an automated, tested CLI runbook to inspect and replay quarantined dead-letter messages back to main topics.',
    failureRisk: 'After a bug is patched, millions of quarantined customer transactions sit trapped in DLQs with no verified procedure to replay safely.',
    verificationQuestion: 'Has the DLQ message replay script (kafka-console-consumer | kafka-console-producer) been tested in staging?',
    remediationAction: 'Publish an executable replay runbook script with rate-limiting to prevent re-flooding the main ingestion topic.',
    applicablePresets: ['all', 'kafka']
  },

  // 8. Testing & Chaos Verification
  {
    id: 'test-1',
    category: '8. Testing & Chaos Verification',
    title: 'Automated Containerized Integration & Chaos Suite',
    severity: 'P0_BLOCKER',
    description: 'Core integration tests must run against real containerized infrastructure (Testcontainers Kafka/PostgreSQL), asserting fault recovery.',
    failureRisk: 'Mock-only tests pass in CI while subtle driver bugs, SQL syntax mismatches, or serialization failures crash production.',
    verificationQuestion: 'Does CI execute Testcontainers integration tests validating real database migrations and poison-pill DLQ routing?',
    remediationAction: 'Integrate testcontainers-go or testcontainers-java in the CI pipeline; assert DLQ routing and cross-tenant zero-reads.',
    applicablePresets: ['all', 'kafka', 'saas', 'rag', 'microservice']
  }
];

export interface BlueprintEntry {
  id: string;
  title: string;
  pillar: string;
  url: string;
  description: string;
  tags: string[];
}

export interface UserBlueprintRequest {
  id: string;
  topic: string;
  pillar: string;
  details: string;
  contactEmail?: string;
  createdAt: string;
  status: 'pending' | 'in_review' | 'planned' | 'implemented';
}

export interface ConceptExplanation {
  keywords: string[];
  explanation: string;
  targetBlueprintId: string;
}

export interface ComparisonDimension {
  dimension: string;
  optionA: string;
  optionB: string;
}

export interface ArchitecturalComparison {
  id: string;
  keywords: string[];
  title: string;
  summary: string;
  optionAName: string;
  optionBName: string;
  dimensions: ComparisonDimension[];
  verdict: string;
  relatedBlueprintIds: string[];
}

export const ARCHITECTURAL_COMPARISONS: ArchitecturalComparison[] = [
  {
    id: 'dpo-vs-ppo',
    keywords: ['dpo vs ppo', 'ppo vs dpo', 'compare dpo and ppo', 'dpo or ppo', 'rlhf vs dpo', 'preference learning vs rlhf'],
    title: 'Direct Preference Optimization (DPO) vs PPO (RLHF)',
    summary: 'DPO trains directly on pairwise (chosen, rejected) completions without training a separate reward model or running actor-critic policy loops.',
    optionAName: 'DPO (Direct Preference Opt)',
    optionBName: 'PPO (Proximal Policy Opt / RLHF)',
    dimensions: [
      { dimension: 'Reward Model', optionA: 'Not required (implicit in loss function)', optionB: 'Mandatory dedicated Bradley-Terry model' },
      { dimension: 'Training Stability', optionA: 'High (Standard supervised cross-entropy)', optionB: 'Fragile (RL hyperparameter sensitivity)' },
      { dimension: 'VRAM & Compute', optionA: 'Low (1x model + reference model)', optionB: 'Very High (Actor, Critic, Reward, Reference)' },
      { dimension: 'Iteration Speed', optionA: '3x-5x faster wall-clock convergence', optionB: 'Slow multi-stage training pipeline' },
      { dimension: 'Online Exploration', optionA: 'Offline pairwise dataset only', optionB: 'Can generate new samples online' },
    ],
    verdict: 'Use DPO for 95% of fine-tuning and safety alignment. Only use PPO if you require dynamic online exploration with live environment feedback.',
    relatedBlueprintIds: ['ml-dpo', 'ml-qlora'],
  },
  {
    id: 'sliding-vs-token-bucket',
    keywords: ['sliding window vs token bucket', 'token bucket vs sliding window', 'rate limit algorithm comparison', 'sliding window counter vs token bucket'],
    title: 'Sliding Window Counter vs Token Bucket',
    summary: 'Sliding window prevents 2x traffic bursts at minute boundaries; Token Bucket permits bursty traffic up to bucket capacity with steady refill.',
    optionAName: 'Sliding Window Counter (Lua)',
    optionBName: 'Token Bucket',
    dimensions: [
      { dimension: 'Boundary Bursting', optionA: '100% prevented (smooth rolling window)', optionB: 'Allows configurable burst up to bucket capacity' },
      { dimension: 'Redis Memory', optionA: '~120-400 bytes per active user', optionB: '~64 bytes per user (timestamp + count)' },
      { dimension: 'Atomic Implementation', optionA: 'Redis Sorted Set (ZADD / ZREMRANGE)', optionB: 'Redis Hash + Lua delta refill' },
      { dimension: 'Latency Impact', optionA: '0.8 - 1.8ms (Sorted Set ops)', optionB: '< 0.5ms (O(1) Hash ops)' },
    ],
    verdict: 'Use Sliding Window for security-critical endpoints (logins, payment APIs). Use Token Bucket for high-throughput public read APIs where bursts are acceptable.',
    relatedBlueprintIds: ['sys-rate-limiter'],
  },
  {
    id: 'kafka-vs-redis-streams',
    keywords: ['kafka vs redis streams', 'redis streams vs kafka', 'event broker comparison', 'redis stream or kafka'],
    title: 'Apache Kafka vs Redis Streams',
    summary: 'Kafka is built for multi-terabyte log retention and massive consumer groups; Redis Streams is built for ultra-low latency sub-millisecond in-memory pipelines.',
    optionAName: 'Redis Streams',
    optionBName: 'Apache Kafka',
    dimensions: [
      { dimension: 'Latency', optionA: 'Sub-millisecond (< 1ms)', optionB: 'Low latency (5 - 15ms)' },
      { dimension: 'Data Retention', optionA: 'Bounded memory (XTRIM MAXLEN)', optionB: 'Multi-terabyte disk / tiered storage' },
      { dimension: 'Operational Overhead', optionA: 'Minimal (Shared Redis cluster)', optionB: 'High (KRaft, topic partitions, rebalancing)' },
      { dimension: 'Replayability', optionA: 'Limited by available RAM', optionB: 'Long-term immutable event log' },
    ],
    verdict: 'Use Redis Streams for fast internal microservice messaging and task fleets. Use Kafka for enterprise event backbones, audit logs, and analytics pipelines.',
    relatedBlueprintIds: ['backend-go-fiber', 'sys-outbox-cdc'],
  },
  {
    id: 'outbox-vs-2pc',
    keywords: ['outbox vs 2pc', 'transactional outbox vs two phase commit', 'dual write solutions', 'outbox pattern vs distributed transactions'],
    title: 'Transactional Outbox (CDC) vs 2-Phase Commit (2PC)',
    summary: 'Transactional Outbox ensures zero data loss between databases and message brokers without the blocking latency bottlenecks of distributed 2PC.',
    optionAName: 'Transactional Outbox + CDC',
    optionBName: 'Two-Phase Commit (2PC / XA)',
    dimensions: [
      { dimension: 'ACID Guarantees', optionA: 'Local ACID + Eventual Consistency', optionB: 'Global Strict Atomicity' },
      { dimension: 'Lock Contention', optionA: 'Zero distributed locks', optionB: 'Holds database row locks across network' },
      { dimension: 'Failure Mode', optionA: 'Resilient at-least-once streaming', optionB: 'Cascading coordinator blocking on timeout' },
      { dimension: 'Throughput Capacity', optionA: 'Tens of thousands msg/s via WAL', optionB: 'Severely degraded at high concurrency' },
    ],
    verdict: 'Never use 2PC in modern microservices. Use Transactional Outbox with PostgreSQL WAL Change Data Capture (Debezium) for guaranteed zero dual-write bugs.',
    relatedBlueprintIds: ['sys-outbox-cdc', 'sys-payment-ledger'],
  },
  {
    id: 'go-vs-rust',
    keywords: ['go vs rust', 'rust vs go', 'golang vs rust microservices', 'go fiber vs rust axum'],
    title: 'Go Fiber vs Rust Axum Microservices',
    summary: 'Go provides ultra-fast development velocity with goroutine concurrency; Rust provides deterministic sub-millisecond p99 latency with zero GC pauses.',
    optionAName: 'Go (Fiber / Gin)',
    optionBName: 'Rust (Axum / Tokio)',
    dimensions: [
      { dimension: 'P99 Latency', optionA: '1.5 - 4ms (Minor GC pauses)', optionB: '< 0.8ms (Zero GC pauses)' },
      { dimension: 'Memory Footprint', optionA: '40 - 120 MB RAM', optionB: '12 - 25 MB RAM (Ultra lean)' },
      { dimension: 'Development Speed', optionA: 'Very High (Simple standard library)', optionB: 'Moderate (Borrow checker, async types)' },
      { dimension: 'Compile Times', optionA: 'Instant (< 2 seconds)', optionB: 'Longer (Monomorphization, macro expansion)' },
    ],
    verdict: 'Choose Go for standard B2B SaaS microservices and rapid team iteration. Choose Rust for core hot-path proxies, financial matching engines, and edge gateways.',
    relatedBlueprintIds: ['backend-go-fiber', 'backend-rust-axum'],
  },
  {
    id: 'vector-vs-hybrid',
    keywords: ['vector vs hybrid search', 'hybrid search vs vector', 'bm25 vs vector', 'rrf vs vector search'],
    title: 'Pure Vector Search vs Hybrid Search (BM25 + pgvector)',
    summary: 'Vector search captures semantic intent but fails on exact codes and acronyms; Hybrid Search fuses keyword BM25 and dense vectors via RRF.',
    optionAName: 'Hybrid Search (pgvector + BM25)',
    optionBName: 'Pure Dense Vector Search',
    dimensions: [
      { dimension: 'Exact Code / SKU Matching', optionA: '100% precision via tsvector BM25', optionB: 'Frequent hallucinations on exact keywords' },
      { dimension: 'Semantic Synonyms', optionA: 'Captured via dense cosine embeddings', optionB: 'Captured via dense cosine embeddings' },
      { dimension: 'Recall @ K', optionA: '88% - 94% Top-5 Recall', optionB: '71% - 79% Top-5 Recall' },
      { dimension: 'Database Overhead', optionA: 'HNSW index + GIN tsvector index', optionB: 'HNSW index only' },
    ],
    verdict: 'Hybrid Search with Reciprocal Rank Fusion (RRF) is mandatory for enterprise production RAG. Pure vector search should only be used for abstract semantic similarity.',
    relatedBlueprintIds: ['rag-hybrid', 'rag-chunking'],
  },
  {
    id: 'rls-vs-schema',
    keywords: ['rls vs schema per tenant', 'multi tenant rls vs separate schema', 'database per tenant vs rls', 'multi-tenancy models'],
    title: 'PostgreSQL Row-Level Security (RLS) vs Schema-per-Tenant',
    summary: 'Row-Level Security enforces data isolation at the database kernel level with a single shared connection pool and zero migration nightmare.',
    optionAName: 'Row-Level Security (RLS)',
    optionBName: 'Schema-per-Tenant',
    dimensions: [
      { dimension: 'Max Tenant Scale', optionA: 'Millions of tenants', optionB: 'Degrades past ~2,000 schemas (lock contention)' },
      { dimension: 'Database Migrations', optionA: '1 single standard migration', optionB: 'Run 1,000+ DDL migrations per deploy' },
      { dimension: 'Connection Pooling', optionA: 'High efficiency single shared pool', optionB: 'High idle connection exhaustion' },
      { dimension: 'Data Isolation', optionA: 'Enforced by Postgres engine kernel', optionB: 'Separate PostgreSQL namespace' },
    ],
    verdict: 'Use PostgreSQL Row-Level Security (RLS) for modern SaaS. It scales to millions of tenants with effortless CI/CD migrations and minimal cloud infrastructure cost.',
    relatedBlueprintIds: ['fullstack-multi-tenant'],
  },
  {
    id: 'saga-orchestrator-vs-choreography',
    keywords: ['orchestrator vs choreography', 'saga orchestrator vs choreography', 'saga pattern comparison', 'distributed transaction patterns'],
    title: 'Saga Orchestrator vs Event Choreography',
    summary: 'Orchestrators centralize distributed workflow logic and rollback ordering; Choreography relies on loose event subscriptions without a single point of failure.',
    optionAName: 'Saga Orchestrator (Centralized)',
    optionBName: 'Event Choreography (Decentralized)',
    dimensions: [
      { dimension: 'Workflow Visibility', optionA: 'High (Single state machine dashboard)', optionB: 'Low (Requires distributed tracing across topics)' },
      { dimension: 'Coupling', optionA: 'Coordinator knows all steps', optionB: 'Services only know their immediate events' },
      { dimension: 'Compensating Complexity', optionA: 'Deterministic reverse unwinding', optionB: 'High risk of cyclic event loops & unhandled errors' },
      { dimension: 'Best Suited For', optionA: 'Complex business flows (Checkout, Billing)', optionB: 'Simple 2-3 step asynchronous notifications' },
    ],
    verdict: 'Use Orchestration for critical financial transactions and multi-step workflows. Reserve Choreography for lightweight notification fans.',
    relatedBlueprintIds: ['sys-saga-orchestrator', 'backend-python-temporal'],
  },
  {
    id: 'circuit-breaker-vs-bulkhead',
    keywords: ['circuit breaker vs bulkhead', 'bulkhead vs circuit breaker', 'resilience patterns comparison'],
    title: 'Circuit Breaker vs Bulkhead Isolation',
    summary: 'Circuit breakers prevent hammering failing dependencies; Bulkheads isolate resource pools so one failing downstream cannot starve the entire server.',
    optionAName: 'Circuit Breaker (Fast-Fail)',
    optionBName: 'Bulkhead Isolation (Resource Pooling)',
    dimensions: [
      { dimension: 'Primary Function', optionA: 'Trip open and fast-fail during outages', optionB: 'Partition concurrency slots per dependency' },
      { dimension: 'Mechanism', optionA: 'Sliding window failure rate state machine', optionB: 'Counting semaphore or separate thread pool' },
      { dimension: 'Protection Target', optionA: 'Protects the downstream dependency', optionB: 'Protects the caller from local resource exhaustion' },
      { dimension: 'Trigger Condition', optionA: 'High error rate (e.g. >= 50% 5xx errors)', optionB: 'High concurrent in-flight requests' },
    ],
    verdict: 'Always pair them together: Bulkheads prevent thread pool exhaustion while the Circuit Breaker detects the failure and fast-fails future calls.',
    relatedBlueprintIds: ['sys-circuit-breaker'],
  },
  {
    id: 'consistent-hashing-vs-modulo',
    keywords: ['consistent hashing vs modulo', 'modulo vs consistent hashing', 'database sharding algorithm comparison'],
    title: 'Consistent Hashing Ring vs Modulo Sharding',
    summary: 'Modulo sharding invalidates (N-1)/N keys when cluster size changes; Consistent Hashing with Vnodes relocates only 1/(N+1) keys smoothly.',
    optionAName: 'Consistent Hashing (Ketama Vnodes)',
    optionBName: 'Modulo Sharding (hash % N)',
    dimensions: [
      { dimension: 'Node Resharding Cost', optionA: 'Minimal (~1/N keys relocated)', optionB: 'Catastrophic (~(N-1)/N keys relocated)' },
      { dimension: 'Load Distribution', optionA: 'Uniform with 150+ virtual nodes (< 3% std dev)', optionB: 'Uniform only if node count is strictly static' },
      { dimension: 'Heterogeneous Nodes', optionA: 'Supported (Weight vnodes by server capacity)', optionB: 'Unsupported (All shards must be equal)' },
      { dimension: 'Lookup Complexity', optionA: 'O(log(V * N)) binary search (~12 ops)', optionB: 'O(1) simple remainder' },
    ],
    verdict: 'Consistent Hashing with Virtual Nodes is essential for dynamic distributed databases and caches to enable zero-downtime horizontal expansion.',
    relatedBlueprintIds: ['sys-consistent-hashing'],
  },
  {
    id: 'api-gateway-vs-mesh',
    keywords: ['api gateway vs service mesh', 'service mesh vs api gateway', 'ingress vs sidecar', 'gateway vs sidecar'],
    title: 'Edge API Gateway vs Service Mesh Sidecar',
    summary: 'API Gateways manage North-South public ingress with TLS, JWT auth, and rate limiting; Service Meshes manage East-West internal mTLS and traffic splitting.',
    optionAName: 'Edge API Gateway (North-South)',
    optionBName: 'Service Mesh (East-West Sidecar)',
    dimensions: [
      { dimension: 'Traffic Direction', optionA: 'North-South (Internet to VPC Ingress)', optionB: 'East-West (Service-to-Service internal mesh)' },
      { dimension: 'Primary Responsibilities', optionA: 'TLS termination, edge JWT auth, rate limits', optionB: 'mTLS encryption, canary routing, circuit breaking' },
      { dimension: 'Deployment Model', optionA: 'Dedicated ingress cluster / reverse proxy', optionB: 'Sidecar proxy per pod/container (Envoy)' },
      { dimension: 'Resource Overhead', optionA: 'Centralized and low overall compute footprint', optionB: 'High memory overhead (1 sidecar per replica)' },
    ],
    verdict: 'Use an Edge API Gateway for all external client traffic. Only introduce a Service Mesh when East-West microservices exceed 50+ services with zero-trust mTLS requirements.',
    relatedBlueprintIds: ['sys-api-gateway'],
  },
];

export const ARCHITECTURAL_EXPLANATIONS: ConceptExplanation[] = [
  // --- Frontend React Blueprints ---
  {
    keywords: ['modal', 'modals', 'dialog', 'dialogs', 'drawer', 'drawers', 'popup', 'alertdialog'],
    explanation: 'Modals and slide-out drawers require WAI-ARIA 1.2 compliance, focus trapping to keep keyboard tabbing within the active layer, ESC key dismissal, backdrop click-to-close, and React portal mounting outside the root DOM hierarchy to avoid CSS z-index stacking bugs.',
    targetBlueprintId: 'ui-modals',
  },
  {
    keywords: ['table', 'tables', 'data table', 'datatable', 'pagination', 'sorting', 'sortable table'],
    explanation: 'Production data tables require accessible column headers, multi-key sorting, client-side pagination with window bounds, row selection checkboxes, and responsive horizontal scrolling with fixed column pin capabilities.',
    targetBlueprintId: 'ui-tables',
  },
  {
    keywords: ['form', 'forms', 'form validation', 'zod form', 'react hook form', 'input validation'],
    explanation: 'Robust form architecture uses controlled state combined with schema-driven validation (Zod). Accessible forms bind htmlFor and aria-describedby to error messages, handle async server submission states, and auto-focus the first invalid field on submit.',
    targetBlueprintId: 'ui-forms',
  },
  {
    keywords: ['button', 'buttons', 'cta', 'loading button', 'icon button'],
    explanation: 'Design system buttons feature distinct semantic variants (primary, secondary, danger, ghost), accessible focus-visible rings, icon wrappers, and built-in SVG loading spinners that disable pointer interactions while operations are pending.',
    targetBlueprintId: 'ui-buttons',
  },
  {
    keywords: ['dropdown', 'dropdowns', 'select menu', 'combobox', 'menu popup'],
    explanation: 'Accessible dropdowns implement keyboard arrow navigation (roving tabindex), type-ahead search matching, ESC dismiss, and click-outside listeners to safely unmount floating action menus.',
    targetBlueprintId: 'ui-dropdowns',
  },
  {
    keywords: ['accordion', 'accordions', 'collapse', 'collapsible', 'faq'],
    explanation: 'Accordion components use aria-expanded and aria-controls attributes for screen readers, provide smooth CSS grid/height transitions, and support both single-panel exclusive open and multi-panel accordion modes.',
    targetBlueprintId: 'ui-accordions',
  },
  {
    keywords: ['tab', 'tabs', 'tabbed', 'tablist'],
    explanation: 'Tabs adhere to the WAI-ARIA Tabs pattern: Left/Right arrow keys navigate tabs, Home/End jump to ends, and panels mount lazily or preserve state with zero layout cumulative shift (CLS).',
    targetBlueprintId: 'ui-tabs',
  },
  {
    keywords: ['alert', 'alerts', 'toast', 'banner', 'notification'],
    explanation: 'Alert components deliver contextual status feedback (info, success, warning, error) with accessible role="alert" or role="status" announcements, dismiss buttons, and optional auto-dismiss timers.',
    targetBlueprintId: 'ui-alerts',
  },
  {
    keywords: ['tooltip', 'tooltips', 'popover', 'hover tip'],
    explanation: 'Tooltips display contextual helper text triggered on hover and keyboard focus with smart viewport edge detection, arrow alignment, and role="tooltip" accessibility binding.',
    targetBlueprintId: 'ui-tooltips',
  },
  {
    keywords: ['stats', 'stat cards', 'metrics card', 'kpi card'],
    explanation: 'Stat cards present enterprise KPIs with positive/negative trend delta badges, numeric formatters, icon wrappers, and optional sparkline SVG visualizers.',
    targetBlueprintId: 'ui-stats',
  },

  // --- Backend Blueprints ---
  {
    keywords: ['golang', 'go microservices', 'go fiber', 'goroutine', 'fasthttp'],
    explanation: 'Go Fiber leverages fasthttp for zero-allocation routing, paired with Redis Streams consumer groups for resilient at-least-once asynchronous message delivery and isolated PostgreSQL database-per-service.',
    targetBlueprintId: 'backend-go-fiber',
  },
  {
    keywords: ['clean architecture', 'go ddd', 'domain driven design', 'hexagonal', 'ports and adapters', 'go architecture'],
    explanation: 'Clean Architecture enforces strict inward dependency flow: pure Go domain aggregates and invariants have zero dependencies on frameworks or ORMs. Use case interactors communicate through repository port interfaces backed by pgxpool PostgreSQL.',
    targetBlueprintId: 'backend-go-clean-ddd',
  },
  {
    keywords: ['worker pool', 'go worker pool', 'goroutine pool', 'backpressure', 'bounded channel', 'concurrency pool'],
    explanation: 'Spawning unmetered goroutines causes OOM under traffic surges. Bounded worker pools utilize fixed worker fleets over buffered channels with non-blocking backpressure rejection (HTTP 429) and panic isolation to protect host memory.',
    targetBlueprintId: 'backend-go-worker-pool',
  },
  {
    keywords: ['fastapi', 'asyncpg', 'python async', 'uvloop', 'pydantic v2', 'async microservice'],
    explanation: 'Blocking asyncio event loops with synchronous ORMs destroys Python concurrency. Production FastAPI architectures utilize asyncpg binary protocol connection pooling, compiled Pydantic v2 Rust schemas, and uvloop for sub-2ms p99 latencies.',
    targetBlueprintId: 'backend-python-fastapi-async',
  },
  {
    keywords: ['temporal', 'temporalio', 'durable execution', 'saga pattern', 'compensations', 'resilient workflows'],
    explanation: 'Durable execution replaces fragile database state machines with event-sourced workflow history. If worker servers crash mid-flight, Temporal replays past events and resumes execution, triggering automated LIFO Saga compensations if downstream APIs fail.',
    targetBlueprintId: 'backend-python-temporal',
  },
  {
    keywords: ['django', 'celery', 'drf', 'pgbouncer', 'gunicorn', 'django rest'],
    explanation: 'Scaling Django requires offloading synchronous I/O to Celery background task workers (dispatched safely via transaction.on_commit()) and multiplexing connection spikes through PgBouncer in transaction pooling mode.',
    targetBlueprintId: 'backend-django',
  },
  {
    keywords: ['spring boot', 'virtual threads', 'project loom', 'kafka', 'resilience4j', 'java microservice'],
    explanation: 'Java 21 Virtual Threads (Project Loom) allow Tomcat to serve tens of thousands of concurrent I/O requests on minimal memory with standard imperative code, protected by Resilience4j circuit breakers and Kafka streaming.',
    targetBlueprintId: 'backend-spring-boot',
  },
  {
    keywords: ['fastify', 'prisma', 'bullmq', 'nodejs backend', 'node microservices', 'express alternative'],
    explanation: 'Fastify delivers 4x higher throughput than Express using compiled Ajv JSON schema serialization and radix tree routers, integrated with Prisma ORM and BullMQ Redis distributed worker fleets.',
    targetBlueprintId: 'backend-nodejs-fastify',
  },
  {
    keywords: ['rust', 'axum', 'tokio', 'sqlx', 'jemalloc', 'rust backend', 'rust microservice'],
    explanation: 'When deterministic sub-millisecond p99 latencies and zero garbage collection pauses are mandatory, Rust with Axum 0.7, Tokio, and compile-time validated SQLx queries delivers unmatched performance on under 25MB RAM.',
    targetBlueprintId: 'backend-rust-axum',
  },
  {
    keywords: ['grpc', 'protobuf', 'proto3', 'http2', 'ipc', 'deadlines', 'rpc'],
    explanation: 'Internal East-West microservice traffic achieves 7x higher serialization speeds using binary Protocol Buffers (proto3) multiplexed over persistent HTTP/2 TCP streams with strict deadline propagation.',
    targetBlueprintId: 'backend-grpc',
  },

  // --- System Design Blueprints ---
  {
    keywords: ['rate limit', 'rate limiting', 'token bucket', 'sliding window', 'throttle', 'ddos', 'api quota', '429'],
    explanation: 'Distributed rate limiting prevents API abuse and cascading downstream failures. Simple fixed-window counters allow 2x bursts at minute boundaries; production systems use a Sliding Window Counter implemented via atomic Redis Lua scripts with an in-memory L1 cache filter to achieve sub-2ms latency.',
    targetBlueprintId: 'sys-rate-limiter',
  },
  {
    keywords: ['payment', 'ledger', 'double entry', 'idempotency', 'idempotent', 'charge', 'money', 'transactional consistency', 'debit', 'credit'],
    explanation: 'Financial engineering requires strict Double-Entry Bookkeeping where every transaction has balanced debit and credit entries summing to zero. To prevent double-charges during network timeouts, requests require unique Idempotency Keys with deterministic row-level lock ordering to eliminate database deadlocks.',
    targetBlueprintId: 'sys-payment-ledger',
  },
  {
    keywords: ['outbox', 'dual write', 'cdc', 'debezium', 'wal', 'write ahead log', 'skip locked', 'eventual consistency'],
    explanation: 'The Dual-Write anti-pattern occurs when attempting to write to a database and publish to a message broker (Kafka/RabbitMQ) in the same endpoint. The Transactional Outbox pattern guarantees atomic consistency by inserting the event into a local outbox table in the same ACID transaction, then streaming it to brokers via Change Data Capture (Debezium) or SKIP LOCKED polling.',
    targetBlueprintId: 'sys-outbox-cdc',
  },
  {
    keywords: ['cache', 'caching', 'stampede', 'thundering herd', 'xfetch', 'singleflight', 'cache-aside', 'redis cache', 'invalidation'],
    explanation: 'Cache stampedes happen when a popular key expires and thousands of concurrent requests simultaneously bombard the database. Production multi-tier architectures (L1 in-memory + L2 Redis) mitigate this using Single-Flight request coalescing and the probabilistic XFetch early expiration algorithm.',
    targetBlueprintId: 'sys-caching',
  },
  {
    keywords: ['distributed lock', 'lock', 'fencing token', 'redlock', 'mutex', 'concurrency control', 'gc pause'],
    explanation: 'Naive distributed locks fail during process pauses (GC pauses, network partitions) because the lock lease expires while the thread is asleep. Production locks use Redis with background watchdog auto-renewal, safe Lua atomic releases, and Monotonic Fencing Tokens at the storage layer to reject stale writes.',
    targetBlueprintId: 'sys-locks',
  },
  {
    keywords: ['cqrs', 'event sourcing', 'event store', 'optimistic concurrency', 'projections', 'read model'],
    explanation: 'Event Sourcing persists state changes as an immutable stream of past-tense domain events rather than destructive in-place updates. CQRS separates the write model (optimistic concurrency checking) from denormalized read model projections (PostgreSQL views or Elasticsearch) optimized for query speed.',
    targetBlueprintId: 'sys-cqrs',
  },
  {
    keywords: ['rag', 'hybrid search', 'dense vector', 'sparse', 'bm25', 'rrf', 'reciprocal rank fusion', 'cross encoder', 'rerank'],
    explanation: 'Pure vector search struggles with exact keywords, SKUs, and acronyms, while pure BM25 fails on semantic synonyms. Production RAG uses Hybrid Search combining pgvector HNSW dense vectors and PostgreSQL BM25 tsvector, fused via in-database Reciprocal Rank Fusion (RRF) and scored with a Cross-Encoder reranker.',
    targetBlueprintId: 'rag-hybrid',
  },
  {
    keywords: ['chunking', 'semantic chunking', 'parent child', 'hierarchical chunking', 'table parsing'],
    explanation: 'Fixed-size chunking slices sentences in half and destroys markdown tables. Production RAG uses Semantic Boundary Inflection (cosine distance drops between adjacent sentences), Parent-Child hierarchical indexing (small 256t vectors for search, large 1024t parents for context), and AST-aware table preservation.',
    targetBlueprintId: 'rag-chunking',
  },
  {
    keywords: ['graphrag', 'knowledge graph', 'neo4j', 'cypher', 'entities', 'relationships', 'multi hop'],
    explanation: 'Vector search fails on global thematic questions across entire corpora and multi-hop entity reasoning. GraphRAG extracts structured entities and relationships into Neo4j property graphs, clusters them via community detection algorithms, and combines 2-hop traversals with vector similarity.',
    targetBlueprintId: 'rag-graphrag',
  },
  {
    keywords: ['crag', 'corrective rag', 'self rag', 'hallucination', 'query rewrite', 'fallback search'],
    explanation: 'Corrective RAG (CRAG) eliminates hallucination by adding active evaluation gates: it grades retrieved document relevance, dynamically rewrites ambiguous queries, triggers fallback web search when internal docs are insufficient, and validates final answer groundedness.',
    targetBlueprintId: 'rag-corrective',
  },
  {
    keywords: ['rag eval', 'rag triad', 'faithfulness', 'context relevance', 'answer relevance', 'mrr', 'hit rate'],
    explanation: 'Evaluating RAG requires isolating retrieval from generation using the RAG Triad: Context Relevance (query vs retrieved chunks), Groundedness/Faithfulness (chunks vs generated answer), and Answer Relevance (query vs answer), benchmarked via HitRate@K and Mean Reciprocal Rank (MRR).',
    targetBlueprintId: 'rag-evals',
  },
  {
    keywords: ['multimodal rag', 'vision rag', 'colpali', 'pdf parsing', 'chart parsing', 'infographics'],
    explanation: 'Enterprise PDFs have multi-column layouts, tables, and architecture diagrams that break standard OCR. Multi-modal RAG uses Vision LLMs to transcribe tables into Markdown and describe charts, or native ColPali visual patch embeddings for direct visual layout retrieval.',
    targetBlueprintId: 'rag-multimodal',
  },
  {
    keywords: ['vllm', 'pagedattention', 'inference serving', 'continuous batching', 'tensor parallelism', 'tps', 'ttft', 'kv cache'],
    explanation: 'Traditional LLM serving wastes up to 80% of VRAM due to KV cache memory fragmentation. vLLM solves this via PagedAttention (managing KV cache like OS virtual memory pages) and Continuous Batching (iteration-level request insertion), delivering maximum Tokens-Per-Second (TPS).',
    targetBlueprintId: 'ml-vllm',
  },
  {
    keywords: ['qlora', 'lora', 'fine tune', 'finetuning', 'peft', 'bitsandbytes', '4-bit', 'nf4', 'adapter'],
    explanation: 'Full fine-tuning of 70B models requires hundreds of gigabytes of VRAM. QLoRA quantizes the base model into 4-bit NormalFloat4 (NF4) while training lightweight low-rank adapter matrices (r=16, alpha=32) targeting all linear projection layers, cutting VRAM by up to 75%.',
    targetBlueprintId: 'ml-qlora',
  },
  {
    keywords: ['dpo', 'direct preference optimization', 'rlhf', 'ppo', 'alignment', 'preference learning', 'orpo'],
    explanation: 'Traditional RLHF requires training fragile reward models and PPO policy networks. Direct Preference Optimization (DPO) mathematically reparameterizes the reward model directly through the policy network loss function, training on pairwise (chosen, rejected) completions with zero reinforcement learning overhead.',
    targetBlueprintId: 'ml-dpo',
  },
  {
    keywords: ['quantization', 'awq', 'fp8', 'gptq', 'gguf', 'model compression', 'int4'],
    explanation: 'Model quantization compresses weights from 16-bit to 8-bit or 4-bit. AWQ protects the top 1% salient weights based on activation magnitudes for near-zero perplexity loss; native FP8 provides 2x throughput on NVIDIA Hopper/Ada; and GGUF optimizes for CPU/edge devices.',
    targetBlueprintId: 'ml-quantization',
  },
  {
    keywords: ['matryoshka', 'mrl', 'embedding finetuning', 'hard negative', 'infonce', 'domain adaptation'],
    explanation: 'Generic embeddings degrade on proprietary company terminology. Fine-tuning bi-encoders with MultipleNegativesRankingLoss and BM25 hard negative mining adapts representations to your domain, while Matryoshka Representation Learning (MRL) allows slicing vectors to 256-dim for 3x storage savings.',
    targetBlueprintId: 'ml-embeddings',
  },
  {
    keywords: ['red teaming', 'jailbreak', 'llm benchmarks', 'mmlu', 'gsm8k', 'humaneval', 'safety evaluation'],
    explanation: 'Production LLMs require empirical validation against reasoning benchmarks (MMLU for knowledge, GSM8K for math, HumanEval for code) to detect catastrophic forgetting, paired with automated adversarial jailbreak probes to verify refusal safety compliance.',
    targetBlueprintId: 'ml-redteam',
  },
  {
    keywords: ['multi agent', 'supervisor', 'langgraph', 'subagent', 'agent team', 'hierarchical'],
    explanation: 'Single monolithic agents degrade on multi-step workflows. The Supervisor-Worker architecture uses an orchestrator agent that inspects tasks and routes execution to specialized subagents (Research, Coder, Reviewer) using typed state graphs and circuit breakers.',
    targetBlueprintId: 'agent-supervisor',
  },
  {
    keywords: ['react loop', 'tool calling', 'function calling', 'step budget', 'thought action observation'],
    explanation: 'Autonomous agents operate through ReAct (Reason + Act) loops: formulating thoughts, calling external API tools, observing results, and correcting errors. Production loops require strict step budgets (e.g. max 5 steps), execution timeouts, and structured schema validation.',
    targetBlueprintId: 'agent-react-loop',
  },
  {
    keywords: ['human in the loop', 'hitl', 'approval gate', 'interrupt', 'checkpoint', 'resume state'],
    explanation: 'Autonomous agents must not execute high-impact mutations (refunding money, deleting accounts) without oversight. Human-in-the-Loop architectures pause state graphs before destructive actions (`interrupt_before`), persist checkpoints to PostgreSQL, and resume upon human approval.',
    targetBlueprintId: 'agent-hitl',
  },
  {
    keywords: ['agent memory', 'episodic memory', 'sliding window', 'semantic memory', 'session store'],
    explanation: 'Agents need structured three-tier memory: short-term sliding context windows for conversation continuity, semantic long-term recall stored in pgvector for past knowledge, and durable session state stores for multi-tenant isolation.',
    targetBlueprintId: 'agent-memory',
  },
  {
    keywords: ['agent observability', 'langfuse', 'opentelemetry', 'tracing', 'token cost', 'latency'],
    explanation: 'Multi-step agent loops require distributed tracing to diagnose failures. By wrapping tool calls in OpenTelemetry spans and Langfuse, teams track exact token consumption, monetary costs, latency bottlenecks, and error rates per execution step.',
    targetBlueprintId: 'agent-observability',
  },
  {
    keywords: ['agent evals', 'trajectory evaluation', 'llm judge', 'golden dataset', 'agent testing'],
    explanation: 'Testing agents requires checking both answer quality and trajectory correctness. Production CI harnesses run deterministic assertions (step budgets, forbidden tools) alongside LLM-as-a-Judge rubrics over golden test datasets.',
    targetBlueprintId: 'agent-evals',
  },
  {
    keywords: ['streaming agent', 'sse', 'server sent events', 'real time agent', 'tool status cards'],
    explanation: 'Agents can take 10-30 seconds to reason and call tools. Server-Sent Events (SSE) stream incremental tokens alongside typed tool status events (`tool_start`, `tool_end`), rendering collapsible visual progress cards on the frontend.',
    targetBlueprintId: 'agent-streaming-ui',
  },
  {
    keywords: ['prompt injection', 'guardrails', 'tool rbac', 'pii masking', 'secret leak'],
    explanation: 'Untrusted user inputs and system instructions share the same LLM context window. Enterprise guardrails enforce inbound regex injection classifiers, PII masking, role-based tool sandboxing (RBAC), and outbound secret scanners.',
    targetBlueprintId: 'agent-security',
  },
  {
    keywords: ['nextjs', 'drizzle', 'server actions', 'rsc', 'react server components', 'postgres'],
    explanation: 'Next.js 15 App Router with React Server Components allows direct asynchronous database queries without REST/GraphQL boilerplate. Mutations run through type-safe Server Actions validated with Zod and executed via Drizzle ORM.',
    targetBlueprintId: 'fullstack-nextjs-drizzle',
  },
  {
    keywords: ['multi tenant', 'rls', 'row level security', 'subdomain', 'tenant isolation', 'b2b saas'],
    explanation: 'Multi-tenancy isolation implemented at the application level (`WHERE tenant_id = :id`) is prone to accidental leaks. PostgreSQL Row-Level Security (RLS) policies enforce data boundaries at the database engine level using session variables.',
    targetBlueprintId: 'fullstack-multi-tenant',
  },
  {
    keywords: ['auth', 'authentication', 'nextauth', 'sessions', 'oauth', 'cookies', 'pkce', 'magic link'],
    explanation: 'Stateless JWTs cannot be revoked immediately upon credential breach without a stateful blacklist. Production auth uses database-backed sliding sessions with `__Host-` prefixed HttpOnly cookies and PKCE OAuth2 verification.',
    targetBlueprintId: 'fullstack-auth',
  },
  {
    keywords: ['stripe', 'subscriptions', 'billing', 'webhook', 'customer portal', 'dunning'],
    explanation: 'Subscription billing requires handling asynchronous, out-of-order webhooks. Production implementations use raw buffer HMAC signature verification and an append-only webhook ledger to prevent duplicate processing.',
    targetBlueprintId: 'fullstack-stripe',
  },
  {
    keywords: ['websockets', 'crdt', 'yjs', 'realtime', 'collaboration', 'presence', 'multiplayer'],
    explanation: 'Multiplayer editing requires strong eventual consistency without centralized lock bottlenecks. Yjs CRDTs allow peer-to-peer and offline editing that merges automatically over WebSockets and Redis pub/sub backplanes.',
    targetBlueprintId: 'fullstack-websockets',
  },
  {
    keywords: ['ephemeral preview', 'database branching', 'neon', 'supabase', 'playwright', 'cicd'],
    explanation: 'Preview deployments break if they share a staging database. Production CI/CD pipelines use instant copy-on-write PostgreSQL database branching (Neon/Supabase) to give every Pull Request an isolated database for Playwright E2E suites.',
    targetBlueprintId: 'fullstack-cicd',
  },
  {
    keywords: ['go fiber', 'redis streams', 'event driven', 'microservices', 'fasthttp'],
    explanation: 'Go Fiber leverages `fasthttp` for ultra-low memory allocations, paired with Redis Streams consumer groups for resilient at-least-once asynchronous message delivery and isolated PostgreSQL database-per-service.',
    targetBlueprintId: 'backend-go-fiber',
  },
  {
    keywords: ['django', 'celery', 'drf', 'pgbouncer', 'gunicorn'],
    explanation: 'Scaling Django requires offloading synchronous I/O to Celery background task workers (dispatched safely via `transaction.on_commit()`) and multiplexing connection spikes through PgBouncer in transaction pooling mode.',
    targetBlueprintId: 'backend-django',
  },
  {
    keywords: ['spring boot', 'virtual threads', 'project loom', 'kafka', 'resilience4j'],
    explanation: 'Java 21 Virtual Threads (Project Loom) allow Tomcat to serve tens of thousands of concurrent I/O requests on minimal memory with standard imperative code, protected by Resilience4j circuit breakers and Kafka streaming.',
    targetBlueprintId: 'backend-spring-boot',
  },
  {
    keywords: ['fastify', 'prisma', 'bullmq', 'typescript backend'],
    explanation: 'Fastify delivers 4x higher throughput than Express using compiled Ajv JSON schema serialization and radix tree routers, integrated with Prisma ORM and BullMQ Redis distributed worker fleets.',
    targetBlueprintId: 'backend-nodejs-fastify',
  },
  {
    keywords: ['rust', 'axum', 'tokio', 'sqlx', 'jemalloc'],
    explanation: 'When deterministic sub-millisecond p99 latencies and zero garbage collection pauses are mandatory, Rust with Axum 0.7, Tokio, and compile-time validated SQLx queries delivers unmatched performance on under 25MB RAM.',
    targetBlueprintId: 'backend-rust-axum',
  },
  {
    keywords: ['grpc', 'protobuf', 'proto3', 'http2', 'ipc', 'deadlines'],
    explanation: 'Internal East-West microservice traffic achieves 7x higher serialization speeds using binary Protocol Buffers (proto3) multiplexed over persistent HTTP/2 TCP streams with strict deadline propagation.',
    targetBlueprintId: 'backend-grpc',
  },
  {
    keywords: ['saga', 'orchestrator', 'choreography', 'compensating', 'distributed transaction', '2pc'],
    explanation: 'Distributed transactions avoid blocking Two-Phase Commit (2PC) by using the Saga Pattern: breaking global workflows into atomic local steps with reverse compensating rollbacks orchestrated via an ACID PostgreSQL state machine.',
    targetBlueprintId: 'sys-saga-orchestrator',
  },
  {
    keywords: ['circuit breaker', 'bulkhead', 'jitter', 'half open', 'exponential backoff', 'fast fail'],
    explanation: 'Protecting microservices from cascading collapses requires 3-state Circuit Breakers to fast-fail unhealthy dependencies, combined with Bulkhead concurrency semaphores and Full Jitter backoff to eliminate synchronized retry storms.',
    targetBlueprintId: 'sys-circuit-breaker',
  },
  {
    keywords: ['sharding', 'consistent hashing', 'hash ring', 'vnodes', 'virtual nodes', 'scatter gather'],
    explanation: 'Horizontal database partitioning uses Ketama 32-bit Consistent Hashing rings with Virtual Nodes (vnodes) to achieve uniform load distribution (< 3% variance) and relocate only 1/(N+1) keys during scale-out with Scatter-Gather cross-shard query routing.',
    targetBlueprintId: 'sys-consistent-hashing',
  },
  {
    keywords: ['api gateway', 'reverse proxy', 'edge jwt', 'token bucket lua', 'hop by hop', 'ingress'],
    explanation: 'Cloud-native API Gateways terminate TLS at the perimeter, validate cryptographic JWT signatures at the edge in < 0.2ms without database lookups, enforce Redis Token Bucket rate limiting, and stream reverse-proxied traffic with zero-copy buffer pooling in Go.',
    targetBlueprintId: 'sys-api-gateway',
  },
];

export const BLUEPRINT_CATALOG: BlueprintEntry[] = [
  // 1. Frontend & UI Design Systems (16 components)
  {
    id: 'ui-buttons',
    title: 'Buttons & Triggers',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/buttons',
    description: 'Accessible solid, outline, ghost, and icon buttons with :focus-visible states.',
    tags: ['button', 'buttons', 'ui', 'react', 'click', 'trigger', 'cta', 'accessibility'],
  },
  {
    id: 'ui-modals',
    title: 'Modals, Dialogs & Drawers',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/modals',
    description: 'Accessible modal dialogs, confirmation alerts, and slide-out panels with focus trapping.',
    tags: ['modal', 'modals', 'dialog', 'dialogs', 'drawer', 'drawers', 'popup', 'alert', 'confirmation', 'overlay'],
  },
  {
    id: 'ui-dropdowns',
    title: 'Dropdowns & Select Menus',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/dropdowns',
    description: 'Action dropdown menus, status select, and keyboard escape dismissals.',
    tags: ['dropdown', 'dropdowns', 'select', 'menu', 'menus', 'combobox', 'options'],
  },
  {
    id: 'ui-inputs',
    title: 'Inputs, Textareas & Validation',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/inputs',
    description: 'Form inputs with success/error validation states and character counter textareas.',
    tags: ['input', 'inputs', 'text', 'textarea', 'validation', 'forms', 'counter'],
  },
  {
    id: 'ui-tables',
    title: 'Data Tables & Sortable Grids',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/tables',
    description: 'Sortable data tables with multi-select checkboxes and responsive horizontal scrolling.',
    tags: ['table', 'tables', 'grid', 'data', 'sort', 'checkbox', 'rows'],
  },
  {
    id: 'ui-cards',
    title: 'Cards & Content Containers',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/cards',
    description: 'Feature cards, pricing tiers, and article preview cards with semantic HTML5 tags.',
    tags: ['card', 'cards', 'pricing', 'container', 'preview', 'feature'],
  },
  {
    id: 'ui-alerts',
    title: 'Alerts & Dynamic Notifications',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/alerts',
    description: 'Success, warning, danger banner alerts and dismissible toast notifications.',
    tags: ['alert', 'alerts', 'notification', 'notifications', 'toast', 'banner', 'message', 'snackbar'],
  },
  {
    id: 'ui-navbars',
    title: 'Navbars & Responsive Headers',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/navbars',
    description: 'Responsive desktop and mobile headers with slide-out navigation drawers.',
    tags: ['navbar', 'navbars', 'header', 'navigation', 'menu', 'mobile'],
  },
  {
    id: 'ui-stats',
    title: 'Dashboards & Metric Cards',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/stats',
    description: 'Metric statistics cards with percentage growth deltas and mini trend sparklines.',
    tags: ['stats', 'kpi', 'metrics', 'dashboard', 'card', 'analytics'],
  },
  {
    id: 'ui-hero',
    title: 'Hero & Landing Sections',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/hero',
    description: 'High-converting product landing hero with badge tags, CTA buttons, and UI mockups.',
    tags: ['hero', 'landing', 'homepage', 'cta', 'banner'],
  },
  {
    id: 'ui-forms',
    title: 'Forms & Authentication Screens',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/forms',
    description: 'Accessible sign-in and sign-up authentication forms with OAuth social login buttons.',
    tags: ['form', 'forms', 'auth', 'login', 'signup', 'register', 'password'],
  },
  {
    id: 'ui-footers',
    title: 'Footers & Legal Blocks',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/footers',
    description: 'Multi-column sitemap footers with newsletter subscription input and copyright rows.',
    tags: ['footer', 'footers', 'sitemap', 'legal', 'newsletter', 'links'],
  },
  {
    id: 'ui-tabs',
    title: 'Tabs & Segmented Controls',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/tabs',
    description: 'Underlined navigation tabs and segmented switches with ArrowLeft/ArrowRight keyboard support.',
    tags: ['tabs', 'tab', 'segmented', 'switch', 'navigation', 'keyboard'],
  },
  {
    id: 'ui-badges',
    title: 'Badges, Tags & Status Pills',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/badges',
    description: 'Live indicator status dots, numeric count pills, and dismissible filter tags.',
    tags: ['badge', 'badges', 'tag', 'tags', 'pill', 'pills', 'status', 'dot', 'filter'],
  },
  {
    id: 'ui-accordions',
    title: 'Accordions & Expandable Disclosures',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/accordions',
    description: 'Collapsible FAQ accordions and disclosure cards with animated chevrons.',
    tags: ['accordion', 'accordions', 'collapse', 'faq', 'disclosure', 'expand'],
  },
  {
    id: 'ui-tooltips',
    title: 'Tooltips & Popovers',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/tooltips',
    description: 'Accessible hover tooltips with arrow pointers and interactive popover dialogs.',
    tags: ['tooltip', 'tooltips', 'popover', 'popovers', 'hover', 'hint', 'pointer'],
  },
  {
    id: 'ui-pagination',
    title: 'Pagination & Breadcrumbs',
    pillar: 'Frontend & UI',
    url: '/docs/frontend/react/pagination',
    description: 'Numbered page pagination with ellipsis jump logic and hierarchical breadcrumb trails.',
    tags: ['pagination', 'breadcrumbs', 'breadcrumb', 'pages', 'navigation', 'trail'],
  },

  // 2. Backend & Distributed Services (6 blueprints)
  {
    id: 'backend-go-fiber',
    title: 'Go Fiber & Redis Streams Microservices',
    pillar: 'Backend & Services',
    url: '/docs/backend/golang-microservices/overview',
    description: 'High-throughput event-driven microservices with Redis Streams consumer groups and Outbox.',
    tags: ['go', 'golang', 'fiber', 'redis', 'streams', 'event-driven', 'microservices'],
  },
  {
    id: 'backend-django',
    title: 'Django 5 Enterprise Architecture',
    pillar: 'Backend & Services',
    url: '/docs/backend/django/overview',
    description: 'DRF viewsets, Celery distributed tasks (transaction.on_commit), and PgBouncer pooling.',
    tags: ['django', 'python', 'celery', 'drf', 'pgbouncer', 'gunicorn', 'postgres'],
  },
  {
    id: 'backend-spring-boot',
    title: 'Spring Boot 3 Microservices',
    pillar: 'Backend & Services',
    url: '/docs/backend/spring-boot/overview',
    description: 'Java 21 Virtual Threads, Spring Cloud Gateway, Kafka event streaming, and Resilience4j.',
    tags: ['java', 'spring-boot', 'virtual-threads', 'kafka', 'resilience4j', 'circuit-breaker', 'loom'],
  },
  {
    id: 'backend-nodejs-fastify',
    title: 'Node.js & Fastify Enterprise Backend',
    pillar: 'Backend & Services',
    url: '/docs/backend/nodejs-fastify/overview',
    description: 'TypeScript, Fastify compiled JSON schema validation, Prisma ORM, and BullMQ queues.',
    tags: ['nodejs', 'fastify', 'typescript', 'prisma', 'bullmq', 'queues', 'redis', 'backend'],
  },
  {
    id: 'backend-rust-axum',
    title: 'Rust & Axum High-Performance Services',
    pillar: 'Backend & Services',
    url: '/docs/backend/rust-axum/overview',
    description: 'Sub-millisecond p99 latency microservices with Tokio, SQLx compile-time queries, and Tower.',
    tags: ['rust', 'axum', 'tokio', 'sqlx', 'high-performance', 'jemalloc', 'sub-millisecond'],
  },
  {
    id: 'backend-grpc',
    title: 'gRPC & Protocol Buffers High-Performance IPC',
    pillar: 'Backend & Services',
    url: '/docs/backend/grpc-microservices/overview',
    description: 'Protocol Buffers (proto3), HTTP/2 connection multiplexing, interceptors, and deadlines.',
    tags: ['grpc', 'protobuf', 'proto3', 'http2', 'ipc', 'rpc', 'microservices'],
  },
  {
    id: 'backend-go-clean-ddd',
    title: 'Go Clean Architecture & Domain-Driven Design (DDD)',
    pillar: 'Backend & Services',
    url: '/docs/backend/golang-clean-architecture/overview',
    description: 'Enterprise Go domain isolation, ports and adapters, use-case interactors, and pgxpool PostgreSQL.',
    tags: ['go', 'golang', 'clean-architecture', 'ddd', 'domain-driven-design', 'hexagonal', 'pgx', 'ports-and-adapters'],
  },
  {
    id: 'backend-go-worker-pool',
    title: 'Go High-Concurrency Bounded Worker Pool',
    pillar: 'Backend & Services',
    url: '/docs/backend/golang-worker-pool/overview',
    description: 'Generic typed worker fleet, bounded channel backpressure rejection, panic isolation, and graceful SIGTERM drain.',
    tags: ['go', 'golang', 'worker-pool', 'concurrency', 'generics', 'channels', 'backpressure', 'goroutines'],
  },
  {
    id: 'backend-python-fastapi-async',
    title: 'Async FastAPI Microservice: asyncpg & Pydantic v2',
    pillar: 'Backend & Services',
    url: '/docs/backend/python-fastapi-async/overview',
    description: 'High-throughput async Python with uvloop, asyncpg connection pooling, Pydantic v2, and Redis cache-aside.',
    tags: ['python', 'fastapi', 'asyncpg', 'pydantic', 'async', 'uvloop', 'redis', 'postgres'],
  },
  {
    id: 'backend-python-temporal',
    title: 'Temporal.io Resilient Distributed Workflows (Python SDK)',
    pillar: 'Backend & Services',
    url: '/docs/backend/python-temporal-workflows/overview',
    description: 'Durable execution state machine, activities with exponential backoff retries, and automated Saga compensation rollbacks.',
    tags: ['python', 'temporal', 'workflows', 'saga', 'durable-execution', 'resilience', 'compensations', 'microservices'],
  },

  // 3. Full-Stack Web Architectures (6 blueprints)
  {
    id: 'fullstack-nextjs-drizzle',
    title: 'Next.js 15, Drizzle ORM & PostgreSQL',
    pillar: 'Full-Stack',
    url: '/docs/full-stack/nextjs-drizzle-postgres/overview',
    description: 'React Server Components, Server Actions, Zod validation, and Drizzle ORM queries.',
    tags: ['nextjs', 'next', 'react', 'drizzle', 'postgres', 'server-actions', 'rsc', 'full-stack'],
  },
  {
    id: 'fullstack-multi-tenant',
    title: 'Multi-Tenant B2B SaaS Architecture',
    pillar: 'Full-Stack',
    url: '/docs/full-stack/multi-tenant-saas/overview',
    description: 'PostgreSQL Row-Level Security (RLS), Next.js wildcard subdomain routing, and organization RBAC.',
    tags: ['multi-tenant', 'multitenant', 'saas', 'rls', 'row-level-security', 'subdomains', 'organizations', 'rbac'],
  },
  {
    id: 'fullstack-auth',
    title: 'Enterprise Authentication & Session Management',
    pillar: 'Full-Stack',
    url: '/docs/full-stack/auth-session-management/overview',
    description: 'Auth.js (NextAuth v5), database sliding sessions, __Host- HttpOnly cookies, and PKCE OAuth.',
    tags: ['auth', 'authentication', 'nextauth', 'sessions', 'session', 'oauth', 'cookies', 'security', 'login', 'jwt'],
  },
  {
    id: 'fullstack-stripe',
    title: 'Stripe Subscription Billing & Webhook Ledger',
    pillar: 'Full-Stack',
    url: '/docs/full-stack/stripe-billing-subscriptions/overview',
    description: 'Stripe Hosted Checkout, Customer Portal, raw HMAC signature verification, and idempotent ledger.',
    tags: ['stripe', 'billing', 'subscriptions', 'subscription', 'webhooks', 'payments', 'idempotent', 'saas'],
  },
  {
    id: 'fullstack-websockets',
    title: 'Real-Time Collaboration & CRDTs',
    pillar: 'Full-Stack',
    url: '/docs/full-stack/realtime-collaboration-websockets/overview',
    description: 'Multiplayer sync using Yjs CRDTs, WebSockets, live cursor presence, and Redis backplanes.',
    tags: ['websockets', 'websocket', 'crdt', 'yjs', 'realtime', 'collaboration', 'presence', 'multiplayer'],
  },
  {
    id: 'fullstack-cicd',
    title: 'Full-Stack CI/CD & Ephemeral Previews',
    pillar: 'Full-Stack',
    url: '/docs/full-stack/cicd-preview-deployments/overview',
    description: 'GitHub Actions, copy-on-write database branching (Neon/Supabase), and Playwright E2E suites.',
    tags: ['cicd', 'github-actions', 'devops', 'preview', 'database-branching', 'playwright', 'testing', 'e2e'],
  },

  // 4. AI Agents & Autonomous Loops (9 blueprints)
  {
    id: 'agent-rag-harness',
    title: 'Agent & RAG Streaming Harness',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/agent-rag-harness/overview',
    description: 'FastAPI, pgvector, Next.js, and Vercel AI SDK streaming agent loop.',
    tags: ['ai-agent', 'agent', 'rag', 'fastapi', 'streaming', 'pgvector', 'vercel-ai-sdk'],
  },
  {
    id: 'agent-supervisor',
    title: 'Multi-Agent Supervisor Pattern',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/multi-agent-supervisor/overview',
    description: 'LangGraph Supervisor-Worker architecture, typed routing, circuit breakers, and subagents.',
    tags: ['multi-agent', 'langgraph', 'supervisor', 'subagents', 'ai-team', 'subagent'],
  },
  {
    id: 'agent-react-loop',
    title: 'ReAct Tool-Calling Engine',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/react-tool-calling/overview',
    description: 'Pure Python typed ReAct loop, step budgets, tool error feedback, and execution traces.',
    tags: ['react-loop', 'react', 'tools', 'tool-calling', 'function-calling', 'reasoning'],
  },
  {
    id: 'agent-hitl',
    title: 'Human-in-the-Loop Approval State',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/human-in-the-loop/overview',
    description: 'Checkpointed state graphs with interrupt_before, approval gateways, and resume endpoints.',
    tags: ['human-in-the-loop', 'hitl', 'approval', 'checkpoints', 'interrupt'],
  },
  {
    id: 'agent-memory',
    title: 'Agent Memory Architecture',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/agent-memory/overview',
    description: 'Three-tier memory: sliding window, semantic pgvector long-term recall, and session stores.',
    tags: ['memory', 'agent-memory', 'short-term', 'long-term', 'episodic'],
  },
  {
    id: 'agent-observability',
    title: 'Observability & Distributed Tracing',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/observability/overview',
    description: 'OpenTelemetry spans, Langfuse distributed tracing, token cost tracking, and latency metrics.',
    tags: ['observability', 'tracing', 'opentelemetry', 'langfuse', 'metrics', 'tokens', 'cost'],
  },
  {
    id: 'agent-evals',
    title: 'Agent Evaluation & Testing Framework',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/agent-evals/overview',
    description: 'Golden datasets, trajectory assertion checks, LLM-as-a-Judge rubrics, and CI regression gates.',
    tags: ['evals', 'eval', 'testing', 'benchmarking', 'llm-judge', 'trajectory', 'regression'],
  },
  {
    id: 'agent-streaming-ui',
    title: 'Real-Time Streaming Agent UI & Protocol',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/streaming-agent-ui/overview',
    description: 'Server-Sent Events (SSE) protocol, tool execution status cards, and React client hooks.',
    tags: ['streaming-ui', 'sse', 'server-sent-events', 'tool-cards', 'react-hook', 'streaming'],
  },
  {
    id: 'agent-security',
    title: 'Agent Security & Guardrails',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/security-guardrails/overview',
    description: 'Prompt injection heuristics, tool RBAC sandboxing, PII masking, and secret filters.',
    tags: ['security', 'guardrails', 'prompt-injection', 'rbac', 'pii-masking', 'safety'],
  },

  // 5. RAG Systems & Vector Search (6 blueprints)
  {
    id: 'rag-hybrid',
    title: 'Hybrid Search & Reranking Architecture',
    pillar: 'RAG Systems',
    url: '/docs/rag-systems/hybrid-search-reranking/overview',
    description: 'PostgreSQL pgvector HNSW + BM25 tsvector, in-database RRF CTE, and Cross-Encoder reranking.',
    tags: ['rag', 'hybrid-search', 'pgvector', 'hnsw', 'bm25', 'rrf', 'reranking', 'cross-encoder', 'vector-search'],
  },
  {
    id: 'rag-chunking',
    title: 'Advanced Document Chunking Strategies',
    pillar: 'RAG Systems',
    url: '/docs/rag-systems/advanced-chunking/overview',
    description: 'Semantic boundary inflection splitting, Parent-Child hierarchical indexing, and AST table preservation.',
    tags: ['chunking', 'semantic-chunking', 'parent-child', 'hierarchical', 'tables', 'markdown', 'splitting'],
  },
  {
    id: 'rag-graphrag',
    title: 'GraphRAG & Knowledge Graphs',
    pillar: 'RAG Systems',
    url: '/docs/rag-systems/graphrag-knowledge-graphs/overview',
    description: 'Neo4j property graph modeling, LLM entity-relationship extraction, and 2-hop traversal.',
    tags: ['graphrag', 'knowledge-graph', 'neo4j', 'cypher', 'entities', 'relationships', 'graph'],
  },
  {
    id: 'rag-corrective',
    title: 'Corrective RAG (CRAG) & Self-Reflection',
    pillar: 'RAG Systems',
    url: '/docs/rag-systems/corrective-rag/overview',
    description: 'Document relevance grading, query transformation, fallback web search, and hallucination gates.',
    tags: ['crag', 'corrective-rag', 'self-rag', 'reflection', 'fallback-search', 'hallucination', 'query-rewriting'],
  },
  {
    id: 'rag-evals',
    title: 'RAG Evaluation & Benchmarking',
    pillar: 'RAG Systems',
    url: '/docs/rag-systems/rag-evaluation/overview',
    description: 'The RAG Triad (Context Relevance, Faithfulness, Answer Relevance), HitRate@K, and MRR metrics.',
    tags: ['rag-evals', 'rag-triad', 'faithfulness', 'context-relevance', 'mrr', 'hit-rate', 'evaluation'],
  },
  {
    id: 'rag-multimodal',
    title: 'Multi-Modal RAG & Vision Document Parsing',
    pillar: 'RAG Systems',
    url: '/docs/rag-systems/multimodal-rag/overview',
    description: 'Vision LLM extraction (tables, charts), ColPali visual page retrieval, and image context.',
    tags: ['multimodal', 'vision', 'pdf', 'charts', 'colpali', 'vlm', 'tables', 'images'],
  },

  // 6. ML, Inference & Fine-Tuning (6 blueprints)
  {
    id: 'ml-vllm',
    title: 'High-Throughput LLM Serving (vLLM)',
    pillar: 'ML & Deep Learning',
    url: '/docs/ml-deeplearning/vllm-inference-serving/overview',
    description: 'vLLM PagedAttention KV-cache, Continuous Batching, Tensor Parallelism (TP=4), and TTFT/ITL benchmarks.',
    tags: ['vllm', 'inference', 'serving', 'pagedattention', 'tensor-parallelism', 'continuous-batching', 'gpu', 'llm-serving'],
  },
  {
    id: 'ml-qlora',
    title: 'LoRA & QLoRA Fine-Tuning Pipeline',
    pillar: 'ML & Deep Learning',
    url: '/docs/ml-deeplearning/lora-qlora-finetuning/overview',
    description: '4-bit NormalFloat4 (NF4) QLoRA, target module selection, prompt loss masking, and weight merging.',
    tags: ['qlora', 'lora', 'finetuning', 'fine-tuning', 'sft', 'bitsandbytes', 'peft', '4bit'],
  },
  {
    id: 'ml-dpo',
    title: 'Preference Alignment & DPO',
    pillar: 'ML & Deep Learning',
    url: '/docs/ml-deeplearning/preference-alignment-dpo/overview',
    description: 'Direct Preference Optimization (DPO), pairwise preference datasets, and ORPO alternative.',
    tags: ['dpo', 'orpo', 'alignment', 'rlhf', 'preferences', 'chosen-rejected', 'ppo'],
  },
  {
    id: 'ml-quantization',
    title: 'Model Quantization & Compression',
    pillar: 'ML & Deep Learning',
    url: '/docs/ml-deeplearning/model-quantization/overview',
    description: 'AWQ INT4, native FP8 for NVIDIA Hopper/Ada, GPTQ, and GGUF k-quants for edge deployment.',
    tags: ['quantization', 'awq', 'fp8', 'gptq', 'gguf', 'compression', 'int4', 'llama.cpp'],
  },
  {
    id: 'ml-embeddings',
    title: 'Embedding & Reranker Fine-Tuning',
    pillar: 'ML & Deep Learning',
    url: '/docs/ml-deeplearning/embedding-finetuning/overview',
    description: 'Matryoshka Representation Learning (MRL), MultipleNegativesRankingLoss, and hard negative mining.',
    tags: ['embeddings', 'embedding', 'mrl', 'matryoshka', 'hard-negatives', 'infonce', 'domain-adaptation'],
  },
  {
    id: 'ml-redteam',
    title: 'Model Evaluation, Benchmarking & Red-Teaming',
    pillar: 'ML & Deep Learning',
    url: '/docs/ml-deeplearning/model-eval-redteaming/overview',
    description: 'Standardized benchmarks (MMLU, GSM8K, HumanEval), lm-eval automation, and adversarial jailbreak probes.',
    tags: ['benchmarks', 'benchmark', 'mmlu', 'gsm8k', 'humaneval', 'redteaming', 'safety', 'jailbreak'],
  },

  // 7. System Design & Distributed Patterns (6 blueprints)
  {
    id: 'sys-rate-limiter',
    title: 'Distributed Rate Limiter & Token Bucket',
    pillar: 'System Design',
    url: '/docs/system-design/distributed-rate-limiter/overview',
    description: 'Redis Sliding Window Counter (Atomic Lua script), L1 In-Memory LRU + L2 Redis, fail-open policy.',
    tags: ['rate-limiter', 'rate-limit', 'ratelimit', 'redis', 'lua', 'sliding-window', 'token-bucket', 'ddos', 'traffic', 'throttle'],
  },
  {
    id: 'sys-payment-ledger',
    title: 'Idempotent Payment Ledger Architecture',
    pillar: 'System Design',
    url: '/docs/system-design/idempotent-payment-ledger/overview',
    description: 'Double-Entry Bookkeeping (Zero-sum Debits/Credits), Idempotency Key locking, and deterministic row locks.',
    tags: ['payment', 'payments', 'ledger', 'double-entry', 'idempotency', 'idempotent', 'acid', 'banking', 'fintech'],
  },
  {
    id: 'sys-outbox-cdc',
    title: 'Transactional Outbox & Change Data Capture (CDC)',
    pillar: 'System Design',
    url: '/docs/system-design/transactional-outbox-cdc/overview',
    description: 'Eliminating dual-write anomalies via single local ACID transactions and PostgreSQL WAL streaming.',
    tags: ['outbox', 'cdc', 'debezium', 'kafka', 'dual-write', 'wal', 'events', 'skip-locked'],
  },
  {
    id: 'sys-caching',
    title: 'Distributed Caching & Invalidation Architecture',
    pillar: 'System Design',
    url: '/docs/system-design/distributed-caching/overview',
    description: 'Multi-tier caching (L1 In-Memory + L2 Redis), Single-Flight stampede coalescing, and probabilistic XFetch.',
    tags: ['caching', 'cache', 'redis', 'singleflight', 'thundering-herd', 'stampede', 'xfetch', 'lru', 'invalidation'],
  },
  {
    id: 'sys-locks',
    title: 'Distributed Locks & Fencing Tokens',
    pillar: 'System Design',
    url: '/docs/system-design/distributed-locks/overview',
    description: 'Redis SET NX PX with Watchdog auto-renewal, safe Lua release, and Monotonic Fencing Tokens.',
    tags: ['distributed-lock', 'locks', 'lock', 'mutex', 'fencing-token', 'redis', 'etcd', 'concurrency'],
  },
  {
    id: 'sys-cqrs',
    title: 'CQRS & Event Sourcing Architecture',
    pillar: 'System Design',
    url: '/docs/system-design/cqrs-event-sourcing/overview',
    description: 'Append-only event store, database unique constraint on (stream_id, version), and read projectors.',
    tags: ['cqrs', 'event-sourcing', 'event-store', 'projections', 'domain-events', 'write-model'],
  },
  {
    id: 'sys-saga-orchestrator',
    title: 'Distributed Saga Pattern: Orchestrator vs Choreography',
    pillar: 'System Design',
    url: '/docs/system-design/distributed-saga-orchestrator/overview',
    description: 'Distributed transactions without 2PC: stateful orchestrator, compensating transactions, idempotent recovery, and PostgreSQL state machine.',
    tags: ['saga', 'orchestrator', 'choreography', 'compensations', 'compensating-transaction', '2pc', 'distributed-transactions', 'eventual-consistency'],
  },
  {
    id: 'sys-circuit-breaker',
    title: 'Circuit Breaker & Bulkhead Isolation',
    pillar: 'System Design',
    url: '/docs/system-design/circuit-breaker-bulkhead/overview',
    description: '3-state failure protection (Closed, Open, Half-Open), semaphore bulkhead concurrency limits, and exponential backoff with full jitter.',
    tags: ['circuit-breaker', 'bulkhead', 'jitter', 'exponential-backoff', 'half-open', 'resilience', 'fault-tolerance', 'concurrency-limits'],
  },
  {
    id: 'sys-consistent-hashing',
    title: 'Database Sharding Ring & Consistent Hashing',
    pillar: 'System Design',
    url: '/docs/system-design/database-sharding-consistent-hashing/overview',
    description: 'Horizontal database partitioning with Ketama 32-bit consistent hash ring, virtual nodes (vnodes), and scatter-gather query routing.',
    tags: ['sharding', 'consistent-hashing', 'hash-ring', 'vnodes', 'virtual-nodes', 'scatter-gather', 'partitioning', 'horizontal-scaling'],
  },
  {
    id: 'sys-api-gateway',
    title: 'Cloud-Native API Gateway & Reverse Proxy',
    pillar: 'System Design',
    url: '/docs/system-design/api-gateway-reverse-proxy/overview',
    description: 'Zero-copy streaming reverse proxy in Go, edge cryptographic JWT validation, Redis Token Bucket rate limiting, and request sanitization.',
    tags: ['api-gateway', 'reverse-proxy', 'edge', 'jwt', 'token-bucket', 'rate-limit', 'httputil', 'ingress', 'tls-termination'],
  },
];

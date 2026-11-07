export interface ComponentIO {
  protocol: string;
  description: string;
  payloadOrFormat: string;
  targetOrSource?: string;
}

export interface ComponentFailureScenario {
  scenario: string;
  systemBehavior: string;
  blastRadius: string;
  mitigation: string;
  runbook: string;
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  category: 'client' | 'gateway' | 'compute' | 'cache' | 'storage' | 'messaging' | 'security' | 'observability';
  badge: string;
  stage: 'ingress' | 'orchestration' | 'data' | 'remediation';
  responsibility: string;
  inputs: ComponentIO[];
  outputs: ComponentIO[];
  metrics: {
    throughput: string;
    latency: string;
    memoryOrScale: string;
  };
  failureScenarios: ComponentFailureScenario[];
  codeSnippet: {
    language: string;
    title: string;
    code: string;
  };
  blueprintUrl: string;
  blueprintTitle: string;
}

export interface TimelineStep {
  timeOffset: string;
  phase: 'DETECTION' | 'CONTAINMENT' | 'STATE_TRANSITION' | 'RECOVERY' | 'POST_INCIDENT';
  eventTitle: string;
  systemAction: string;
  activeTelemetry: string;
  residualRisk: string;
}

export interface FailureSimulation {
  id: string;
  label: string;
  triggerDescription: string;
  failedComponentId: string;
  degradedComponentIds: string[];
  survivingComponentIds: string[];
  impactSummary: string;
  prometheusAlert: string;
  resilienceMechanism: string;
  recoveryProcedure: string;
  timelineSteps: TimelineStep[];
}

export interface SystemArchitecture {
  id: string;
  title: string;
  shortDesc: string;
  category: string;
  tag: string;
  targetSLO: string;
  components: ArchitectureComponent[];
  failureSimulations: FailureSimulation[];
}

export const SYSTEM_ARCHITECTURES: SystemArchitecture[] = [
  {
    id: 'rate-limiter',
    title: 'Distributed Rate Limiter & Token Bucket',
    shortDesc: 'Multi-tier sliding window rate limiter sustaining 50,000 RPS with Redis Cluster and negative cache fallback.',
    category: 'System Design',
    tag: '50k RPS • Redis 7 • Lua',
    targetSLO: 'P99 < 2ms, Zero Upstream Overload',
    components: [
      {
        id: 'client-edge',
        name: 'Client Ingress / CDN Edge',
        category: 'client',
        badge: 'TLS 1.3 / HTTP/2',
        stage: 'ingress',
        responsibility: 'Terminates client TLS connections, validates API keys, and forwards requests with X-Forwarded-For headers.',
        inputs: [
          { protocol: 'HTTPS / TLS 1.3', description: 'Public internet client traffic', payloadOrFormat: 'REST JSON / GraphQL' }
        ],
        outputs: [
          { protocol: 'HTTP/2 Cleartext', description: 'Forwarded to API Gateway with verified client IP', payloadOrFormat: 'Headers: X-Forwarded-For, X-API-Key' }
        ],
        metrics: {
          throughput: '50,000 RPS',
          latency: '< 0.5ms',
          memoryOrScale: 'Anycast Geo-distributed'
        },
        failureScenarios: [
          {
            scenario: 'DDoS volumetric flood',
            systemBehavior: 'Edge WAF drops non-compliant TCP SYNs; rate limiter limits valid IP blocks.',
            blastRadius: 'Edge perimeter only',
            mitigation: 'Cloudflare / AWS Shield Anycast scrubbing',
            runbook: 'curl -I https://api.service.com/health -H "CF-Connecting-IP: test"'
          }
        ],
        codeSnippet: {
          language: 'nginx',
          title: 'Edge Proxy Header Pass',
          code: `proxy_set_header X-Real-IP $remote_addr;\nproxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\nproxy_set_header X-Client-Tenant $http_x_tenant_id;`
        },
        blueprintUrl: '/docs/system-design/distributed-rate-limiter/overview',
        blueprintTitle: 'Distributed Rate Limiter Blueprint'
      },
      {
        id: 'envoy-gateway',
        name: 'Envoy API Gateway (Filter)',
        category: 'gateway',
        badge: 'C++ Async Filter',
        stage: 'ingress',
        responsibility: 'Intersects HTTP requests, checks local negative cache, dispatches async gRPC rate limit check to Redis cluster.',
        inputs: [
          { protocol: 'HTTP/2', description: 'Internal service ingress', payloadOrFormat: 'JSON Request Body + Headers' }
        ],
        outputs: [
          { protocol: 'gRPC / Redis RESP3', description: 'Rate limit counter evaluation', payloadOrFormat: 'Tuple: {key, tokens_requested, window_ms}' },
          { protocol: 'HTTP 429 Too Many Requests', description: 'Emitted immediately when quota is exhausted', payloadOrFormat: 'Headers: Retry-After, X-RateLimit-Remaining' }
        ],
        metrics: {
          throughput: '50,000 RPS',
          latency: 'P95 < 0.8ms',
          memoryOrScale: '8 Gateway Pods (Auto-scaling)'
        },
        failureScenarios: [
          {
            scenario: 'Envoy worker CPU saturation',
            systemBehavior: 'Worker thread pool throttles non-healthcheck connections.',
            blastRadius: 'Ingress latency spikes',
            mitigation: 'HPA triggers scaling from 8 to 24 pods based on CPU > 70%',
            runbook: 'kubectl top pods -n gateway --sort-by=cpu'
          }
        ],
        codeSnippet: {
          language: 'yaml',
          title: 'Envoy Rate Limit Filter Spec',
          code: `name: envoy.filters.http.ratelimit\ntyped_config:\n  "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit\n  domain: api-gateway-tier\n  failure_mode_deny: false # Fail-open with local degraded limit`
        },
        blueprintUrl: '/docs/system-design/distributed-rate-limiter/overview',
        blueprintTitle: 'Distributed Rate Limiter Blueprint'
      },
      {
        id: 'local-negative-cache',
        name: 'Tier-1 In-Memory Negative Cache',
        category: 'cache',
        badge: 'Local LRU / Ristretto',
        stage: 'orchestration',
        responsibility: 'Stores temporary 2-second rate-limit blocks locally in Gateway memory. Rejects known-blocked IPs without hitting Redis.',
        inputs: [
          { protocol: 'In-Memory Call', description: 'Client IP / API Key hash check', payloadOrFormat: 'Key: blocked:{tenant}:{ip}' }
        ],
        outputs: [
          { protocol: 'Immediate Bool', description: 'True if blocked; short-circuits request in < 10μs', payloadOrFormat: 'Fast 429 response' }
        ],
        metrics: {
          throughput: '200,000 Ops/sec',
          latency: '< 10 μs',
          memoryOrScale: '128 MB RAM per gateway pod'
        },
        failureScenarios: [
          {
            scenario: 'LRU Cache Eviction Thrashing',
            systemBehavior: 'Cold keys bypass local cache and query Redis directly.',
            blastRadius: '15% increase in Redis cluster IOPS',
            mitigation: 'TinyLFU admission policy preventing one-hit-wonders from evicting hot keys',
            runbook: 'curl http://localhost:8080/metrics | grep local_cache_hit_ratio'
          }
        ],
        codeSnippet: {
          language: 'go',
          title: 'Local Fast Rejection Check',
          code: `if blockedUntil, exists := localBlockCache.Get(clientKey); exists {\n    if time.Now().Before(blockedUntil.(time.Time)) {\n        return false, ErrRateLimitExceeded // 0 network calls!\n    }\n}`
        },
        blueprintUrl: '/docs/system-design/distributed-rate-limiter/overview',
        blueprintTitle: 'Distributed Rate Limiter Blueprint'
      },
      {
        id: 'redis-cluster',
        name: 'Redis 7 Cluster (Sharded)',
        category: 'cache',
        badge: 'Cluster Sharding • 6 Nodes',
        stage: 'data',
        responsibility: 'Holds global sliding window timestamps and bucket counters across hash slots. Executes atomic Lua script in < 0.2ms.',
        inputs: [
          { protocol: 'RESP3 via TCP', description: 'EVALSHA command with key and capacity params', payloadOrFormat: 'EVALSHA <sha> 1 rate:{ip} 100 60000 1' }
        ],
        outputs: [
          { protocol: 'RESP3 Integer / Array', description: 'Result tuple: [allowed (0 or 1), remaining, reset_ms]', payloadOrFormat: '[1, 84, 52000]' }
        ],
        metrics: {
          throughput: '75,000 QPS aggregate',
          latency: 'P99 < 0.35 ms',
          memoryOrScale: '2.75 GB RAM for 5M active keys'
        },
        failureScenarios: [
          {
            scenario: 'Primary Redis Node Outage',
            systemBehavior: 'Redis Cluster gossip coordinates replica promotion in < 1.5 seconds. Gateway uses Tier-1 negative cache during failover.',
            blastRadius: '1/3 of hash slots enter read-only state for 1.2s',
            mitigation: '3 Master + 3 Replica topology with auto-failover',
            runbook: 'redis-cli -c -p 7000 cluster nodes'
          }
        ],
        codeSnippet: {
          language: 'lua',
          title: 'Atomic Sliding Window Token Bucket (Lua)',
          code: `local key = KEYS[1]\nlocal max_tokens = tonumber(ARGV[1])\nlocal now = tonumber(ARGV[2])\nlocal requested = tonumber(ARGV[3])\n\nredis.call('ZREMRANGEBYSCORE', key, 0, now - 60000)\nlocal count = redis.call('ZCARD', key)\nif count + requested <= max_tokens then\n    redis.call('ZADD', key, now, now)\n    return 1\nelse\n    return 0\nend`
        },
        blueprintUrl: '/docs/system-design/distributed-rate-limiter/overview',
        blueprintTitle: 'Distributed Rate Limiter Blueprint'
      },
      {
        id: 'upstream-fleet',
        name: 'Protected Microservices Fleet',
        category: 'compute',
        badge: 'Zero Overload Guarded',
        stage: 'remediation',
        responsibility: 'Core business services (Order API, Payments, Search) executing business logic free from abusive traffic.',
        inputs: [
          { protocol: 'HTTP/2 / gRPC', description: 'Admitted, rate-limited requests', payloadOrFormat: 'Sanitized Application Payloads' }
        ],
        outputs: [
          { protocol: 'HTTP 200 OK / 201 Created', description: 'Business response', payloadOrFormat: 'JSON Domain Data' }
        ],
        metrics: {
          throughput: 'Guaranteed bounded RPS',
          latency: 'P95 < 25ms',
          memoryOrScale: 'Protected from thread pool exhaustion'
        },
        failureScenarios: [
          {
            scenario: 'Downstream Database Lock Wait',
            systemBehavior: 'Upstream services slow down, triggering Gateway circuit breaker before rate limits are breached.',
            blastRadius: 'Service P99 latency degradation',
            mitigation: 'Envoy connection pooling and max pending requests bounds',
            runbook: 'kubectl get hpa -n microservices'
          }
        ],
        codeSnippet: {
          language: 'go',
          title: 'Upstream Handler',
          code: `func (h *Handler) ProcessOrder(w http.ResponseWriter, r *http.Request) {\n    // Bounded concurrency guaranteed by upstream Envoy Rate Limiter\n    order := h.service.Execute(r.Context(), r.Body)\n    json.NewEncoder(w).Encode(order)\n}`
        },
        blueprintUrl: '/docs/system-design/distributed-rate-limiter/overview',
        blueprintTitle: 'Distributed Rate Limiter Blueprint'
      }
    ],
    failureSimulations: [
      {
        id: 'kill-redis',
        label: 'Kill Primary Redis Shard',
        triggerDescription: 'Master Redis node handling slot range 0-5460 crashes due to OOM.',
        failedComponentId: 'redis-cluster',
        degradedComponentIds: ['envoy-gateway'],
        survivingComponentIds: ['client-edge', 'local-negative-cache', 'upstream-fleet'],
        impactSummary: 'Gateway engages fail-open circuit breaker with local negative cache protection. Upstream fleet remains safe; healthy replica promotes to master in 1.2 seconds.',
        prometheusAlert: 'alert: RedisClusterMasterUnavailable (severity: critical)',
        resilienceMechanism: 'Dual-tier fallback: Envoy switches to local 100 RPS emergency token bucket while Sentinel/Cluster gossip auto-promotes replica.',
        recoveryProcedure: 'redis-cli -p 7001 CLUSTER FAILOVER TAKEOVER && redis-cli cluster check localhost:7000',
        timelineSteps: [
          {
            timeOffset: 'T+0ms',
            phase: 'DETECTION',
            eventTitle: 'Primary Redis Node SIGKILL / OOM Crash',
            systemAction: 'Master Redis node handling hash slots 0-5460 abruptly closes TCP socket.',
            activeTelemetry: 'Envoy upstream_cx_connect_fail spikes; healthchecks time out.',
            residualRisk: 'Active in-flight token increments in socket buffer dropped.'
          },
          {
            timeOffset: 'T+15ms',
            phase: 'CONTAINMENT',
            eventTitle: 'Envoy Circuit Breaker & Negative Cache Activated',
            systemAction: 'Envoy rate limit filter trips circuit breaker to fail-open mode; tier-1 in-memory negative cache shields backend.',
            activeTelemetry: 'Prometheus: ratelimit_circuit_breaker_opened_total counter incremented.',
            residualRisk: 'Unblocked new IPs permitted temporarily at local 100 RPS fallback limit.'
          },
          {
            timeOffset: 'T+800ms',
            phase: 'STATE_TRANSITION',
            eventTitle: 'Cluster Gossip Quorum & Failover Election',
            systemAction: 'Remaining 5 Redis nodes detect master timeout (NODE_TIMEOUT=1000ms); replica node initiates election takeover.',
            activeTelemetry: 'Redis Cluster logs: FAIL state broadcasted; CLUSTERMSG_TYPE_FAILOVER_AUTH_REQUEST received.',
            residualRisk: 'Hash slots 0-5460 in read-only transition state.'
          },
          {
            timeOffset: 'T+1800ms',
            phase: 'RECOVERY',
            eventTitle: 'Replica Promoted to Primary Master',
            systemAction: 'Replica completes promotion, claims slot range 0-5460, and broadcasts new cluster topology to Envoy.',
            activeTelemetry: 'Envoy redis cluster client receives MOVED redirection and updates slot routing table.',
            residualRisk: 'Asynchronous replication lag may permit ~5-10 duplicate token allowances.'
          },
          {
            timeOffset: 'T+6000ms',
            phase: 'POST_INCIDENT',
            eventTitle: 'Normal 50,000 RPS Line Speed Resumed',
            systemAction: 'Circuit breaker resets to CLOSED; all 16,384 hash slots serving live traffic with P99 < 2ms.',
            activeTelemetry: 'Prometheus alert RedisClusterMasterUnavailable automatically resolves.',
            residualRisk: 'Need to spin up replacement replica to restore high-availability redundancy.'
          }
        ]
      },
      {
        id: 'botnet-attack',
        label: 'Simulate 100,000 RPS Botnet Surge',
        triggerDescription: 'Distributed credential stuffing attack surges to 2x capacity on `/api/v1/login`.',
        failedComponentId: 'client-edge',
        degradedComponentIds: [],
        survivingComponentIds: ['envoy-gateway', 'local-negative-cache', 'redis-cluster', 'upstream-fleet'],
        impactSummary: 'Tier-1 local negative cache absorbs 82% of repeats without Redis traffic. Redis atomic Lua rejects remainder. Upstream services see 0 extra load.',
        prometheusAlert: 'alert: RateLimitDropsHighSurge (severity: warning)',
        resilienceMechanism: 'Tier-1 local LRU negative cache stores blocked hashes for 2s, short-circuiting network round-trips.',
        recoveryProcedure: 'Inspect Grafana RateLimiter dashboard; dynamically push IP CIDR ban to Cloudflare edge WAF.',
        timelineSteps: [
          {
            timeOffset: 'T+0ms',
            phase: 'DETECTION',
            eventTitle: 'Botnet Ingress Surge (100,000 RPS)',
            systemAction: 'Attacker launches credential stuffing across 50,000 distributed IP addresses.',
            activeTelemetry: 'Ingress bandwidth surges from 18 MB/s to 42 MB/s.',
            residualRisk: 'Threat of Gateway CPU saturation.'
          },
          {
            timeOffset: 'T+50ms',
            phase: 'CONTAINMENT',
            eventTitle: 'Tier-1 Local LRU Negative Cache Shielding',
            systemAction: 'Gateway local cache rejects 82% of repeat queries in < 10μs without network round-trips.',
            activeTelemetry: 'Prometheus: local_cache_hit_ratio rises to 82.4%; Redis QPS capped at 18k.',
            residualRisk: 'First-time unique IPs still reach Redis.'
          },
          {
            timeOffset: 'T+500ms',
            phase: 'RECOVERY',
            eventTitle: 'Atomic Lua Script Quota Enforcement',
            systemAction: 'Redis ZSET atomic script evaluates remaining requests, returning HTTP 429 Too Many Requests.',
            activeTelemetry: 'Zero requests beyond quota reach upstream microservice fleet.',
            residualRisk: 'None. Backend latency stays flat at P95 < 25ms.'
          }
        ]
      }
    ]
  },
  {
    id: 'kafka-dlq',
    title: 'Spring Boot & Kafka Resilient Consumer with DLQ',
    shortDesc: 'Non-blocking event streaming with progressive exponential retry topics, 0ms HoL blocking, and 14-day quarantine DLQ.',
    category: 'Backend Architecture',
    tag: '10k EPS • KRaft • Java 21',
    targetSLO: 'Zero HoL Blocking, Consumer Lag < 500 records',
    components: [
      {
        id: 'event-producer',
        name: 'Order Event Producer',
        category: 'client',
        badge: 'Idempotent Producer',
        stage: 'ingress',
        responsibility: 'Publishes OrderPlacedEvent to Kafka with transactional durability (`acks=all`) and entity key partitioning.',
        inputs: [
          { protocol: 'Internal Business Logic', description: 'Order checkout finalized', payloadOrFormat: 'Order Aggregate' }
        ],
        outputs: [
          { protocol: 'Kafka Protocol v12', description: 'Publish to orders.events', payloadOrFormat: 'Key: order_id, Payload: OrderPlacedEvent JSON' }
        ],
        metrics: {
          throughput: '10,000 events/sec',
          latency: 'P95 < 5ms publish ack',
          memoryOrScale: '3 Producer Pods'
        },
        failureScenarios: [
          {
            scenario: 'Transient Network Partition to Broker',
            systemBehavior: 'Idempotent producer buffers in local batch memory (`linger.ms=5`) and retries up to `delivery.timeout.ms=120000`.',
            blastRadius: 'Zero event loss',
            mitigation: '`enable.idempotence=true` prevents duplicate records on broker reconnection',
            runbook: 'kafka-producer-perf-test.sh --topic orders.events --num-records 1000'
          }
        ],
        codeSnippet: {
          language: 'properties',
          title: 'Producer Durability Config',
          code: `spring.kafka.producer.acks=all\nspring.kafka.producer.properties.enable.idempotence=true\nspring.kafka.producer.compression-type=zstd`
        },
        blueprintUrl: '/docs/backend/java-kafka-consumer-dlq/overview',
        blueprintTitle: 'Kafka Resilient Consumer Blueprint'
      },
      {
        id: 'kafka-main-topic',
        name: 'orders.events (Main Topic)',
        category: 'messaging',
        badge: '12 Partitions • 3 Replicas',
        stage: 'orchestration',
        responsibility: 'Ordered, persistent message log distributed across 3 KRaft brokers. Segment retention: 3 days.',
        inputs: [
          { protocol: 'Kafka TCP 9092', description: 'Ingress order events', payloadOrFormat: 'Keyed Partition Distribution' }
        ],
        outputs: [
          { protocol: 'Kafka Consumer Fetch', description: 'Polled by Main Consumer Fleet', payloadOrFormat: 'Batches of max 250 records' }
        ],
        metrics: {
          throughput: '10 MB/sec (864 GB/day)',
          latency: '< 1ms disk append',
          memoryOrScale: '2.59 TB storage (3x Replication)'
        },
        failureScenarios: [
          {
            scenario: 'Broker Leader Partition Offline',
            systemBehavior: 'KRaft controller initiates election in < 800ms. In-Sync Replica (ISR) promoted to leader.',
            blastRadius: '1 partition experiences < 1s fetch pause',
            mitigation: '`min.insync.replicas=2` and `replication.factor=3`',
            runbook: 'kafka-topics.sh --describe --topic orders.events --bootstrap-server localhost:9092'
          }
        ],
        codeSnippet: {
          language: 'bash',
          title: 'Topic Creation Command',
          code: `kafka-topics.sh --create --topic orders.events \\\n  --partitions 12 --replication-factor 3 \\\n  --config min.insync.replicas=2 --config retention.ms=259200000`
        },
        blueprintUrl: '/docs/backend/java-kafka-consumer-dlq/overview',
        blueprintTitle: 'Kafka Resilient Consumer Blueprint'
      },
      {
        id: 'spring-main-consumer',
        name: 'Main Consumer Fleet (Java 21)',
        category: 'compute',
        badge: 'Virtual Threads • Manual Ack',
        stage: 'orchestration',
        responsibility: 'Consumes main topic at line speed. Dispatches to virtual threads. Commits offset immediately upon success or retry forward.',
        inputs: [
          { protocol: 'Kafka Polling Loop', description: 'Polls batches from assigned partitions', payloadOrFormat: 'ConsumerRecords<String, OrderEvent>' }
        ],
        outputs: [
          { protocol: 'PostgreSQL SQL', description: 'Idempotency check & order fulfillment', payloadOrFormat: 'INSERT INTO orders ...' },
          { protocol: 'Kafka Forward', description: 'Transient failure -> orders.events-retry-1000', payloadOrFormat: 'Record + Retry Headers' },
          { protocol: 'Kafka Manual Commit', description: 'Acknowledge partition offset', payloadOrFormat: 'Offset Commit Protocol' }
        ],
        metrics: {
          throughput: '10,000 events/sec aggregate',
          latency: 'P95 < 20ms per record',
          memoryOrScale: '4 Pods * 3 Concurrency = 12 Virtual Threads'
        },
        failureScenarios: [
          {
            scenario: 'Consumer Pod Crash Mid-Batch',
            systemBehavior: '`CooperativeStickyAssignor` migrates only the 3 orphaned partitions without stopping the other 9 partitions.',
            blastRadius: 'Zero global downtime',
            mitigation: 'PostgreSQL idempotency ledger prevents re-execution of uncommitted duplicate records',
            runbook: 'kubectl logs -n fulfillment -l app=order-consumer --tail=100'
          }
        ],
        codeSnippet: {
          language: 'java',
          title: 'Virtual Thread Container Config',
          code: `SimpleAsyncTaskExecutor executor = new SimpleAsyncTaskExecutor("kafka-vt-");\nexecutor.setVirtualThreads(true);\nfactory.getContainerProperties().setListenerTaskExecutor(executor);\nfactory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);`
        },
        blueprintUrl: '/docs/backend/java-kafka-consumer-dlq/overview',
        blueprintTitle: 'Kafka Resilient Consumer Blueprint'
      },
      {
        id: 'retry-topics-pipeline',
        name: 'Progressive Retry Topics',
        category: 'messaging',
        badge: '1s, 5s, 30s Backoffs',
        stage: 'remediation',
        responsibility: 'Non-blocking delayed topics (`-retry-1000`, `-retry-5000`, `-retry-30000`). Allows transient errors to clear without HoL blocking.',
        inputs: [
          { protocol: 'Kafka Protocol', description: 'Failed records forwarded from main/prior retry listener', payloadOrFormat: 'Payload + Attempt Count' }
        ],
        outputs: [
          { protocol: 'Kafka Delayed Poll', description: 'Consumed after exact header backoff duration', payloadOrFormat: 'Scheduled Retry Processing' }
        ],
        metrics: {
          throughput: '< 150 events/sec (1.5% transient error rate)',
          latency: 'Exact header-timed backoff',
          memoryOrScale: 'Short 24-hour retention'
        },
        failureScenarios: [
          {
            scenario: 'Downstream Database 30-second outage',
            systemBehavior: 'Failed events traverse Retry-1s -> Retry-5s -> Retry-30s. Main topic continues running at 10k eps line speed.',
            blastRadius: 'Zero HoL blocking on healthy orders',
            mitigation: 'Spring Kafka @RetryableTopic backoff multiplier',
            runbook: 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group order-fulfillment-group'
          }
        ],
        codeSnippet: {
          language: 'java',
          title: 'Non-Blocking Retry Annotation',
          code: `@RetryableTopic(\n    attempts = "4",\n    backoff = @Backoff(delay = 1000, multiplier = 5.0, maxDelay = 30000),\n    topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_DELAY_VALUE,\n    dltTopicSuffix = "-dlq"\n)`
        },
        blueprintUrl: '/docs/backend/java-kafka-consumer-dlq/overview',
        blueprintTitle: 'Kafka Resilient Consumer Blueprint'
      },
      {
        id: 'dlq-quarantine',
        name: 'orders.events-dlq & Audit Ledger',
        category: 'storage',
        badge: '14-Day Quarantine SLA',
        stage: 'data',
        responsibility: 'Quarantines fatal poison pills and messages that exhausted all 3 retries. Writes forensic metadata to PostgreSQL and alerts SREs.',
        inputs: [
          { protocol: 'Kafka Protocol', description: 'Terminal failure message from retry engine', payloadOrFormat: 'Full Stack Trace + Original Partition/Offset' }
        ],
        outputs: [
          { protocol: 'SQL INSERT', description: 'Persists to kafka_dlq_quarantine audit table', payloadOrFormat: 'JSONB Payload + Headers' },
          { protocol: 'Prometheus Metric / PagerDuty', description: 'Triggers P1/P2 engineering alert', payloadOrFormat: 'Alert: KafkaDlqPoisonPillsDetected' }
        ],
        metrics: {
          throughput: '< 5 events/hour (Fatal edge cases)',
          latency: '< 5ms isolation',
          memoryOrScale: '14-day segment retention'
        },
        failureScenarios: [
          {
            scenario: 'Unparseable Malformed JSON Payload',
            systemBehavior: '`ErrorHandlingDeserializer` catches poison bytes, bypasses retry, and routes directly to DLQ in < 5ms.',
            blastRadius: 'Single malformed message quarantined',
            mitigation: 'Zero CPU wasted attempting 4 useless retries',
            runbook: 'psql -U app_user -d orders_db -c "SELECT * FROM kafka_dlq_quarantine WHERE status=\'PENDING_TRIAGE\';"'
          }
        ],
        codeSnippet: {
          language: 'java',
          title: 'DLQ Handler with Error Auditing',
          code: `@DltHandler\npublic void processQuarantinedMessage(\n    @Payload Object rawPayload,\n    Acknowledgment ack,\n    @Header(KafkaHeaders.EXCEPTION_MESSAGE) String errorMsg\n) {\n    dlqCounter.increment();\n    auditRepo.saveQuarantineRecord(rawPayload, errorMsg);\n    ack.acknowledge();\n}`
        },
        blueprintUrl: '/docs/backend/java-kafka-consumer-dlq/overview',
        blueprintTitle: 'Kafka Resilient Consumer Blueprint'
      }
    ],
    failureSimulations: [
      {
        id: 'poison-pill',
        label: 'Inject Malformed Poison-Pill Record',
        triggerDescription: 'Producer emits corrupted JSON missing critical fields to partition 3 of `orders.events`.',
        failedComponentId: 'event-producer',
        degradedComponentIds: [],
        survivingComponentIds: ['kafka-main-topic', 'spring-main-consumer', 'retry-topics-pipeline', 'dlq-quarantine'],
        impactSummary: 'ErrorHandlingDeserializer intercepts poison pill. Message bypasses all retries and routes to DLQ in 4ms. Partition 3 advances immediately; zero HoL blocking!',
        prometheusAlert: 'alert: KafkaDlqPoisonPillsDetected (severity: warning)',
        resilienceMechanism: 'Spring Kafka ErrorHandlingDeserializer passes DeserializationException header to @RetryableTopic, which excludes fatal errors.',
        recoveryProcedure: 'Inspect PostgreSQL kafka_dlq_quarantine table; fix producer serialization bug; replay using CLI runbook.',
        timelineSteps: [
          {
            timeOffset: 'T+0ms',
            phase: 'DETECTION',
            eventTitle: 'Malformed Poison Pill Ingested into Partition 3',
            systemAction: 'Producer publishes malformed byte array with invalid JSON syntax into orders.events partition 3.',
            activeTelemetry: 'Consumer poll returns batch of 250 records containing poison pill at offset 891,204.',
            residualRisk: 'In naive consumers, partition 3 is now completely blocked.'
          },
          {
            timeOffset: 'T+4ms',
            phase: 'CONTAINMENT',
            eventTitle: 'ErrorHandlingDeserializer Interception',
            systemAction: 'ErrorHandlingDeserializer intercepts byte parse exception, attaches DeserializationException header, and delegates to @RetryableTopic.',
            activeTelemetry: 'Spring Kafka logs: Fatal payload detected, bypassing progressive delay topics.',
            residualRisk: 'None. Worker thread never halts.'
          },
          {
            timeOffset: 'T+12ms',
            phase: 'STATE_TRANSITION',
            eventTitle: 'Terminal Quarantine to orders.events-dlq',
            systemAction: 'DeadLetterPublishingRecoverer publishes poisoned payload with full stack trace and original partition/offset to orders.events-dlq.',
            activeTelemetry: 'Prometheus: kafka_dlq_messages_quarantined_total counter incremented.',
            residualRisk: 'Poison payload safely isolated; awaiting SRE triage.'
          },
          {
            timeOffset: 'T+25ms',
            phase: 'RECOVERY',
            eventTitle: 'Immediate Partition Offset Advancement',
            systemAction: 'Consumer fleet invokes ack.acknowledge(), committing offset 891,204 and continuing with remaining 249 valid records at line speed.',
            activeTelemetry: 'Consumer lag on partition 3 stays < 20 records. Zero Head-of-Line blocking.',
            residualRisk: 'Zero. Main order pipeline unaffected.'
          },
          {
            timeOffset: 'T+100ms',
            phase: 'POST_INCIDENT',
            eventTitle: 'Quarantine Audit Persisted & PagerDuty Alert Fired',
            systemAction: 'DLQ listener persists payload and headers to PostgreSQL kafka_dlq_quarantine table; PagerDuty alert fires for on-call SRE.',
            activeTelemetry: 'Prometheus alert: KafkaDlqPoisonPillsDetected active.',
            residualRisk: 'Requires upstream producer bugfix before replaying record.'
          }
        ]
      },
      {
        id: 'db-timeout',
        label: 'Simulate 15-Second Database Lock Spurt',
        triggerDescription: 'PostgreSQL warehouse order table suffers transient row lock timeout.',
        failedComponentId: 'spring-main-consumer',
        degradedComponentIds: ['retry-topics-pipeline'],
        survivingComponentIds: ['event-producer', 'kafka-main-topic', 'dlq-quarantine'],
        impactSummary: 'Failing records are forwarded to orders.events-retry-1000. Offsets on orders.events commit immediately. Partition throughput stays at 10,000 eps!',
        prometheusAlert: 'alert: KafkaConsumerLagWarning (severity: info)',
        resilienceMechanism: 'Non-blocking progressive retry pipeline offloads failed records to delayed topics with exponential backoff.',
        recoveryProcedure: 'Investigate DB locks via pg_stat_activity; retry listener clears events once lock clears.',
        timelineSteps: [
          {
            timeOffset: 'T+0ms',
            phase: 'DETECTION',
            eventTitle: 'PostgreSQL Transient Lock Timeout (503)',
            systemAction: 'Main consumer worker throws TransientDataAccessException during SQL INSERT into orders table.',
            activeTelemetry: 'Spring Kafka detects retryable exception matching @RetryableTopic include list.',
            residualRisk: 'Risk of stalling partition if retried in-place.'
          },
          {
            timeOffset: 'T+8ms',
            phase: 'CONTAINMENT',
            eventTitle: 'Non-Blocking Progressive Forwarding',
            systemAction: 'Record republished to orders.events-retry-1000 with backoff headers; main partition offset committed immediately.',
            activeTelemetry: 'Main topic consumer advances to next record with 0ms stall.',
            residualRisk: 'Temporary lag accumulation on retry topic.'
          },
          {
            timeOffset: 'T+1000ms',
            phase: 'RECOVERY',
            eventTitle: 'First Delayed Retry Attempt Clears',
            systemAction: 'Retry listener polls record after 1,000ms delay header expires; database lock cleared, transaction succeeds.',
            activeTelemetry: 'Retry offset committed; message resolved without reaching DLQ.',
            residualRisk: 'None. Order processed successfully.'
          }
        ]
      }
    ]
  },
  {
    id: 'multi-tenant-saas',
    title: 'Multi-Tenant B2B SaaS: PostgreSQL RLS & Subdomains',
    shortDesc: 'Kernel-level data segregation using PostgreSQL Row-Level Security, PgBouncer transaction pooling, and wildcard edge routing.',
    category: 'Full-Stack Architecture',
    tag: 'Postgres 16 RLS • PgBouncer • Next.js 15',
    targetSLO: 'Zero Cross-Tenant Leaks, < 0.5ms RLS Overhead',
    components: [
      {
        id: 'edge-subdomain-router',
        name: 'Next.js Edge Middleware',
        category: 'gateway',
        badge: 'Subdomain Rewriter',
        stage: 'ingress',
        responsibility: 'Parses incoming tenant subdomains (`acme.saas.com`), validates session JWT, and injects verified `x-tenant-id` header.',
        inputs: [
          { protocol: 'HTTPS / HTTP/2', description: 'Enterprise user web requests', payloadOrFormat: 'Host: acme.saas.com + Session Cookie' }
        ],
        outputs: [
          { protocol: 'Internal HTTP Request', description: 'Forwarded to Next.js App Server', payloadOrFormat: 'Header: x-tenant-id = uuid-101' }
        ],
        metrics: {
          throughput: '25,000 RPS',
          latency: '< 2ms edge eval',
          memoryOrScale: 'Edge V8 Isolates'
        },
        failureScenarios: [
          {
            scenario: 'Attacker spoofing x-tenant-id header',
            systemBehavior: 'Edge middleware overrides any client-supplied header with cryptographically signed JWT claim.',
            blastRadius: 'Zero cross-tenant privilege escalation',
            mitigation: 'Middleware strips inbound x-tenant-id before verification',
            runbook: 'curl -I -H "x-tenant-id: malicious" https://acme.saas.com'
          }
        ],
        codeSnippet: {
          language: 'typescript',
          title: 'Edge Subdomain Resolver',
          code: `const hostname = req.headers.get("host") || "";\nconst subdomain = hostname.split(".")[0];\nconst tenant = await resolveTenant(subdomain);\nreqHeaders.set("x-tenant-id", tenant.id);\nreturn NextResponse.next({ request: { headers: reqHeaders } });`
        },
        blueprintUrl: '/docs/full-stack/multi-tenant-saas/overview',
        blueprintTitle: 'Multi-Tenant B2B SaaS Blueprint'
      },
      {
        id: 'pgbouncer-pool',
        name: 'PgBouncer Connection Pool',
        category: 'gateway',
        badge: 'Transaction Pooling',
        stage: 'orchestration',
        responsibility: 'Maintains 50 persistent server connections to PostgreSQL while serving 5,000+ client transactions with zero idle connection bloat.',
        inputs: [
          { protocol: 'PostgreSQL Wire Protocol', description: 'App server transactional queries', payloadOrFormat: 'BEGIN; SET LOCAL ...; SELECT ...; COMMIT;' }
        ],
        outputs: [
          { protocol: 'Multiplexed DB Connections', description: 'Pooled backend connections', payloadOrFormat: 'Transaction-scoped sessions' }
        ],
        metrics: {
          throughput: '> 95% connection reuse',
          latency: '< 0.1ms checkout',
          memoryOrScale: '15 MB RAM for 5,000 clients'
        },
        failureScenarios: [
          {
            scenario: 'Application executes SET without LOCAL',
            systemBehavior: 'Next client borrowing the connection inherits prior tenant session variable!',
            blastRadius: 'Critical data leakage vulnerability if not prevented',
            mitigation: '`pool_mode = transaction` combined with `set_config(\'...\', true)` strictly resets state on COMMIT',
            runbook: 'pgbouncer-cli -p 6432 -U pgbouncer show pools'
          }
        ],
        codeSnippet: {
          language: 'ini',
          title: 'pgbouncer.ini (Transaction Mode)',
          code: `[databases]\nsaas_db = host=postgres port=5432 dbname=saas_db pool_mode=transaction\n\n[pgbouncer]\npool_mode = transaction\nmax_client_conn = 5000\ndefault_pool_size = 50`
        },
        blueprintUrl: '/docs/full-stack/multi-tenant-saas/overview',
        blueprintTitle: 'Multi-Tenant B2B SaaS Blueprint'
      },
      {
        id: 'postgres-kernel-rls',
        name: 'PostgreSQL 16 Kernel (RLS)',
        category: 'storage',
        badge: 'FORCE ROW LEVEL SECURITY',
        stage: 'data',
        responsibility: 'Kernel-level row filter evaluating `tenant_id = current_setting(\'app.current_tenant_id\')`. Fails closed if variable is empty.',
        inputs: [
          { protocol: 'SQL Queries without WHERE clause', description: 'Developer queries (e.g. SELECT * FROM projects)', payloadOrFormat: 'Raw Table Scan' }
        ],
        outputs: [
          { protocol: 'Filtered Row Results', description: 'Returns ONLY rows belonging to the active tenant', payloadOrFormat: '0 Cross-Tenant Rows' }
        ],
        metrics: {
          throughput: '10,000 Transactions/sec',
          latency: '< 0.3ms RLS evaluation',
          memoryOrScale: 'Composite (tenant_id, id) B-Tree Indexes'
        },
        failureScenarios: [
          {
            scenario: 'Developer forgets WHERE clause in ORM query',
            systemBehavior: 'PostgreSQL engine enforces RLS policy at the query planner level. Only current tenant rows returned.',
            blastRadius: 'Zero leakage; fail-safe defaults',
            mitigation: '`FORCE ROW LEVEL SECURITY` prevents table owners from bypassing policy',
            runbook: 'psql -U saas_app_user -d saas_db -c "SELECT * FROM projects;" -- Returns 0 rows without context!'
          }
        ],
        codeSnippet: {
          language: 'sql',
          title: 'PostgreSQL Fail-Closed RLS Policy',
          code: `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;\nALTER TABLE projects FORCE ROW LEVEL SECURITY;\n\nCREATE POLICY tenant_isolation_policy ON projects\n    FOR ALL\n    USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);`
        },
        blueprintUrl: '/docs/full-stack/multi-tenant-saas/overview',
        blueprintTitle: 'Multi-Tenant B2B SaaS Blueprint'
      }
    ],
    failureSimulations: [
      {
        id: 'unset-tenant-context',
        label: 'Execute Query Without Setting Tenant Context',
        triggerDescription: 'A bug in a new API route forgets to execute `SET LOCAL app.current_tenant_id`.',
        failedComponentId: 'edge-subdomain-router',
        degradedComponentIds: [],
        survivingComponentIds: ['pgbouncer-pool', 'postgres-kernel-rls'],
        impactSummary: 'PostgreSQL kernel evaluates `NULLIF(\'\', \'\')` -> evaluates to NULL. RLS policy returns 0 rows. Absolute fail-closed safety!',
        prometheusAlert: 'alert: EmptyTenantContextQuery (severity: warning)',
        resilienceMechanism: 'Fail-closed RLS design: empty setting returns NULL; condition `organization_id = NULL` evaluates to FALSE.',
        recoveryProcedure: 'Audit application query wrapper; ensure withTenantContext surrounds all database calls.',
        timelineSteps: [
          {
            timeOffset: 'T+0ms',
            phase: 'DETECTION',
            eventTitle: 'Buggy Query Execution Without Context',
            systemAction: 'Application issues SELECT * FROM projects without scoping transaction session variable.',
            activeTelemetry: 'PgBouncer checks out pooled connection with empty transaction session variable.',
            residualRisk: 'Potential cross-tenant leakage in naive database designs.'
          },
          {
            timeOffset: 'T+2ms',
            phase: 'CONTAINMENT',
            eventTitle: 'Kernel-Level RLS Policy Evaluation',
            systemAction: 'PostgreSQL kernel evaluates NULLIF(current_setting(\'app.current_tenant_id\', true), \'\') -> evaluates to NULL.',
            activeTelemetry: 'PostgreSQL query plan: Filter: (organization_id = NULL) evaluates to FALSE for all rows.',
            residualRisk: 'Zero rows returned; fail-closed guarantee mathematically holds.'
          },
          {
            timeOffset: 'T+8ms',
            phase: 'RECOVERY',
            eventTitle: 'Fail-Closed Empty Result Returned',
            systemAction: 'Query returns HTTP 200 with empty array [] or HTTP 403 Forbidden; zero cross-tenant records exposed.',
            activeTelemetry: 'Security log records query without tenant context.',
            residualRisk: 'Zero security exposure; developer bug contained.'
          }
        ]
      }
    ]
  },
  {
    id: 'ai-rag-agent',
    title: 'Streaming AI Agent & Hybrid RAG',
    shortDesc: 'Sub-800ms TTFT streaming AI agent with pgvector HNSW Cosine search, GIN BM25 full-text, and Reciprocal Rank Fusion.',
    category: 'AI & Machine Learning',
    tag: 'pgvector 0.7 • FastAPI • Next.js 15',
    targetSLO: 'TTFT < 800ms, Retrieval Recall > 92%',
    components: [
      {
        id: 'react-chat-client',
        name: 'Client UI (useChat SSE)',
        category: 'client',
        badge: 'React 19 / Vercel AI SDK',
        stage: 'ingress',
        responsibility: 'Streams partial tokens over Server-Sent Events (SSE). Cancels stream immediately when user navigates away or closes tab.',
        inputs: [
          { protocol: 'User Prompt Submission', description: 'Chat query and conversation state', payloadOrFormat: 'JSON Messages Array' }
        ],
        outputs: [
          { protocol: 'HTTP POST /api/chat', description: 'Stream request with session token', payloadOrFormat: 'Streaming fetch()' }
        ],
        metrics: {
          throughput: 'Real-time rendering',
          latency: 'First token render < 800ms',
          memoryOrScale: 'Zero client-side memory leaks'
        },
        failureScenarios: [
          {
            scenario: 'Client closes browser tab during generation',
            systemBehavior: 'HTTP TCP connection closes. Downstream FastAPI catches `request.is_disconnected()` and cancels LLM generation.',
            blastRadius: 'Zero wasted tokens or runaway API costs',
            mitigation: 'Asyncio cancellation propagation',
            runbook: 'Check llm_cancelled_requests_total metric in Prometheus'
          }
        ],
        codeSnippet: {
          language: 'typescript',
          title: 'React useChat Implementation',
          code: `const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({\n    api: '/api/chat',\n    headers: { 'X-Tenant-ID': orgId },\n});`
        },
        blueprintUrl: '/docs/ai-agents/agent-rag-harness/overview',
        blueprintTitle: 'AI Agent & RAG Streaming Blueprint'
      },
      {
        id: 'fastapi-orchestrator',
        name: 'FastAPI Async Agent Engine',
        category: 'compute',
        badge: 'Python 3.12 Asyncio',
        stage: 'orchestration',
        responsibility: 'Extracts query embeddings, dispatches parallel hybrid search (HNSW + GIN), computes RRF score, and streams LLM completion.',
        inputs: [
          { protocol: 'HTTP POST /v1/agent/stream', description: 'Chat request from Next.js Edge', payloadOrFormat: 'Messages + X-Tenant-ID' }
        ],
        outputs: [
          { protocol: 'text/event-stream (SSE)', description: 'Chunked token deltas to client', payloadOrFormat: 'data: {"type":"token","delta":"..."}' },
          { protocol: 'asyncpg SQL', description: 'Hybrid search function call', payloadOrFormat: 'SELECT * FROM hybrid_search_rrf(...)' }
        ],
        metrics: {
          throughput: '1,000 concurrent active SSE streams',
          latency: 'TTFT P95 < 800ms',
          memoryOrScale: '50 asyncpg pooled connections'
        },
        failureScenarios: [
          {
            scenario: 'Primary LLM API 503 Overloaded',
            systemBehavior: 'Circuit breaker trips in < 200ms; automatically reroutes stream to Claude 3.5 Sonnet fallback endpoint.',
            blastRadius: 'Zero dropped user queries',
            mitigation: 'Multi-provider LLM fallback matrix',
            runbook: 'curl -I http://localhost:8000/v1/agent/health'
          }
        ],
        codeSnippet: {
          language: 'python',
          title: 'Async Generator Disconnect Check',
          code: `async for line in response.aiter_lines():\n    if await request.is_disconnected():\n        return # Immediately halts LLM token consumption!\n    yield f"data: {json.dumps({'type': 'token', 'delta': delta})}\\n\\n"`
        },
        blueprintUrl: '/docs/ai-agents/agent-rag-harness/overview',
        blueprintTitle: 'AI Agent & RAG Streaming Blueprint'
      },
      {
        id: 'pgvector-hybrid-store',
        name: 'PostgreSQL 16 (pgvector + GIN)',
        category: 'storage',
        badge: 'HNSW Cosine + BM25 TSVector',
        stage: 'data',
        responsibility: 'Executes parallel Cosine distance (<=>) and keyword BM25 search in a single SQL query, merging ranks with RRF ($k=60$).',
        inputs: [
          { protocol: 'asyncpg SQL Query', description: 'Query text + 1536-dim float vector', payloadOrFormat: 'hybrid_search_rrf($1, $2::vector, tenant_id)' }
        ],
        outputs: [
          { protocol: 'Top-K Ranked Chunks', description: 'Context chunks with combined RRF score', payloadOrFormat: 'UUID, Content, RRF_Score' }
        ],
        metrics: {
          throughput: '1,500 hybrid queries/sec',
          latency: 'P95 < 45ms across 1M vectors',
          memoryOrScale: '7.68 GB RAM dedicated to HNSW graph'
        },
        failureScenarios: [
          {
            scenario: 'HNSW Index evicts from shared_buffers into disk',
            systemBehavior: 'Disk page faults cause retrieval latency to spike from 25ms to 450ms.',
            blastRadius: 'Degraded TTFT across RAG queries',
            mitigation: 'Sized shared_buffers = 8GB + maintenance_work_mem = 4GB',
            runbook: 'psql -c "SELECT relname, heap_blks_read, heap_blks_hit FROM pg_statio_user_tables;"'
          }
        ],
        codeSnippet: {
          language: 'sql',
          title: 'Reciprocal Rank Fusion (RRF) SQL',
          code: `SELECT COALESCE(d.id, s.id) AS chunk_id, d.content,\n  (COALESCE(1.0 / (60 + d.rank), 0.0) + COALESCE(1.0 / (60 + s.rank), 0.0)) AS rrf_score\nFROM dense_candidates d\nFULL OUTER JOIN sparse_candidates s ON d.id = s.id\nORDER BY rrf_score DESC LIMIT 5;`
        },
        blueprintUrl: '/docs/ai-agents/agent-rag-harness/overview',
        blueprintTitle: 'AI Agent & RAG Streaming Blueprint'
      }
    ],
    failureSimulations: [
      {
        id: 'llm-down',
        label: 'Simulate Primary LLM API 503 Outage',
        triggerDescription: 'Primary OpenAI endpoint returns HTTP 503 Service Unavailable.',
        failedComponentId: 'fastapi-orchestrator',
        degradedComponentIds: [],
        survivingComponentIds: ['react-chat-client', 'pgvector-hybrid-store'],
        impactSummary: 'FastAPI circuit breaker trips in < 150ms and seamlessly switches inference stream to Anthropic Claude 3.5 Sonnet. Client stream never disconnects.',
        prometheusAlert: 'alert: LLMProviderErrorRateCritical (severity: page)',
        resilienceMechanism: 'Multi-provider fallback executor in async agent pipeline.',
        recoveryProcedure: 'Verify OpenAI status page; automatic reset occurs after 60s probe.',
        timelineSteps: [
          {
            timeOffset: 'T+0ms',
            phase: 'DETECTION',
            eventTitle: 'Primary LLM API Returns HTTP 503 Overloaded',
            systemAction: 'FastAPI async streaming client receives HTTP 503 Service Unavailable on POST /chat/completions.',
            activeTelemetry: 'Circuit breaker detects consecutive provider failures (failure_count=3).',
            residualRisk: 'Active client SSE connection waiting for first token.'
          },
          {
            timeOffset: 'T+120ms',
            phase: 'CONTAINMENT',
            eventTitle: 'Circuit Breaker Trips & Routes to Secondary Provider',
            systemAction: 'FastAPI orchestrator trips circuit breaker to Claude 3.5 Sonnet fallback route with formatted prompt and context.',
            activeTelemetry: 'Prometheus: llm_provider_fallback_triggered_total incremented.',
            residualRisk: 'Slight latency increase (+120ms) for first token delivery.'
          },
          {
            timeOffset: 'T+450ms',
            phase: 'RECOVERY',
            eventTitle: 'Streaming First Token Delivered to Client UI',
            systemAction: 'Fallback stream emits first chunk data: {"type":"token","delta":"The system "} over SSE; useChat() renders smoothly.',
            activeTelemetry: 'Client connection stays open; zero dropped user queries.',
            residualRisk: 'Different token pricing and model nuance on secondary provider.'
          }
        ]
      }
    ]
  }
];

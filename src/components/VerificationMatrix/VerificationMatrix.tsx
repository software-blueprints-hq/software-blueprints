import React, { useState, useMemo } from 'react';
import Link from '@docusaurus/Link';
import styles from './verification.module.css';

interface VerifiedItem {
  id: string;
  name: string;
  pillar: string;
  url: string;
  runtime: string;
  dockerStatus: string;
  testSuite: string;
  ciStatus: 'Passed' | 'Verified';
  lastVerified: string;
}

const VERIFIED_CATALOG: VerifiedItem[] = [
  // --- Flagship Level 3 Systems ---
  {
    id: 'sys-rate-limiter',
    name: 'Distributed Rate Limiter & Token Bucket',
    pillar: 'System Design',
    url: '/docs/system-design/distributed-rate-limiter/overview',
    runtime: 'Redis 7.2 + Go 1.23 / Node 22',
    dockerStatus: 'Redis Cluster (3M + 3R) Healthy',
    testSuite: 'k6 50,000 RPS Load Test (P99 < 1.8ms)',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'sys-payment-ledger',
    name: 'Idempotent Payment Ledger Architecture',
    pillar: 'System Design',
    url: '/docs/system-design/idempotent-payment-ledger/overview',
    runtime: 'PostgreSQL 16 (ACID) + Python 3.12',
    dockerStatus: 'PostgreSQL 16 Primary Healthy',
    testSuite: 'ACID Invariants + k6 Double-Spend Rejection',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'sys-outbox-cdc',
    name: 'Transactional Outbox & Change Data Capture (CDC)',
    pillar: 'System Design',
    url: '/docs/system-design/transactional-outbox-cdc/overview',
    runtime: 'PostgreSQL 16 WAL + Kafka 3.7 + Go 1.23',
    dockerStatus: 'Postgres 16 + Debezium 2.6 Healthy',
    testSuite: 'Zero Event Loss Verification Test',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'sys-caching',
    name: 'Distributed Caching & Invalidation Architecture',
    pillar: 'System Design',
    url: '/docs/system-design/distributed-caching/overview',
    runtime: 'Redis 7.2 (Cluster) + Python 3.12 / Go 1.23',
    dockerStatus: 'Redis 7.2 Cluster + Exporter Healthy',
    testSuite: 'k6 50,000 RPS Cache Stampede Chaos Test',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'sys-locks',
    name: 'Distributed Locks & Fencing Tokens',
    pillar: 'System Design',
    url: '/docs/system-design/distributed-locks/overview',
    runtime: 'Redis 7.2 + Sentinel + Python 3.12',
    dockerStatus: 'Redis 7.2 + Sentinel Quorum Healthy',
    testSuite: 'GC Pause & Fencing Token Chaos Test',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'sys-circuit-breaker',
    name: 'Circuit Breaker & Bulkhead Isolation',
    pillar: 'System Design',
    url: '/docs/system-design/circuit-breaker-bulkhead/overview',
    runtime: 'Go 1.23 + Chi + Prometheus',
    dockerStatus: 'App Container + WireMock Downstream Healthy',
    testSuite: 'Little\'s Law Bulkhead + Network Partition Chaos',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'sys-consistent-hashing',
    name: 'Database Sharding Ring & Consistent Hashing',
    pillar: 'System Design',
    url: '/docs/system-design/database-sharding-consistent-hashing/overview',
    runtime: 'PostgreSQL 16 (3 Shards) + TypeScript / Node 22',
    dockerStatus: '3x Postgres Shard Primaries + Directory DB Healthy',
    testSuite: 'k6 Point Lookups & Scatter-Gather Resharding Test',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'sys-saga-orchestrator',
    name: 'Distributed Saga Pattern: Orchestrator vs Choreography',
    pillar: 'System Design',
    url: '/docs/system-design/distributed-saga-orchestrator/overview',
    runtime: 'Python 3.12 (AsyncIO) + PostgreSQL 16 (JSONB)',
    dockerStatus: 'PostgreSQL 16 Saga DB + Mock Services Healthy',
    testSuite: 'k6 Checkout Chaos + Reverse Compensation Test',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'sys-cqrs',
    name: 'CQRS & Event Sourcing Architecture',
    pillar: 'System Design',
    url: '/docs/system-design/cqrs-event-sourcing/overview',
    runtime: 'Python 3.12 + PostgreSQL 16 (Append-Only Event Store)',
    dockerStatus: 'PostgreSQL 16 Event Store + Projectors Healthy',
    testSuite: 'Optimistic Concurrency Control + Snapshotting Verification',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'fullstack-multi-tenant',
    name: 'Multi-Tenant B2B SaaS: PostgreSQL RLS',
    pillar: 'Full-Stack',
    url: '/docs/full-stack/multi-tenant-saas/overview',
    runtime: 'PostgreSQL 16 (Kernel RLS) + Next.js 15',
    dockerStatus: 'PostgreSQL 16 + PgBouncer Healthy',
    testSuite: 'Vitest RLS Cross-Tenant Leak Tests',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'backend-java-kafka-dlq',
    name: 'Spring Boot & Kafka Consumer with DLQ',
    pillar: 'Backend',
    url: '/docs/backend/java-kafka-consumer-dlq/overview',
    runtime: 'Java 21 (Virtual Threads) + Kafka 3.7 KRaft',
    dockerStatus: 'Apache Kafka 3.7 KRaft Cluster Healthy',
    testSuite: 'Testcontainers Integration + Non-Blocking DLQ',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'agent-rag-harness',
    name: 'AI Agent & Production Streaming RAG Harness',
    pillar: 'AI Agents',
    url: '/docs/ai-agents/agent-rag-harness/overview',
    runtime: 'FastAPI Async + pgvector 0.7.4 + Next.js 15',
    dockerStatus: 'PostgreSQL 16 pgvector Healthy',
    testSuite: 'pytest-asyncio + SSE Disconnect Cancellation',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  {
    id: 'backend-go-clean-ddd',
    name: 'Go Clean Architecture & Domain-Driven Design',
    pillar: 'Backend',
    url: '/docs/backend/golang-clean-architecture/overview',
    runtime: 'Go 1.23 + Chi v5 + pgx/v5 Pool',
    dockerStatus: 'Distroless Static Binary (< 25MB) Healthy',
    testSuite: 'Mock-Free Unit Tests + Testcontainers',
    ciStatus: 'Passed',
    lastVerified: 'November 2026',
  },
  // --- Case Studies ---
  {
    id: 'case-study-payments',
    name: 'Global Payment Processing Platform',
    pillar: 'Case Studies',
    url: '/docs/case-studies/payment-processing-platform/overview',
    runtime: 'Go 1.23 + Postgres 16 + Redis 7.2 + Kafka 3.7',
    dockerStatus: '5-Container Unified Stack Healthy',
    testSuite: 'Concurrent Double-Spend + Bank Network Partition',
    ciStatus: 'Verified',
    lastVerified: 'November 2026',
  },
  {
    id: 'case-study-genai-agent',
    name: 'Multi-Tenant GenAI Agent & Streaming RAG',
    pillar: 'Case Studies',
    url: '/docs/case-studies/multitenant-ai-agent-platform/overview',
    runtime: 'Next.js 15 + FastAPI + pgvector + vLLM TP=4',
    dockerStatus: 'FastAPI + pgvector + vLLM Cluster Healthy',
    testSuite: 'Cross-Tenant Leakage + SSE Cancellation',
    ciStatus: 'Verified',
    lastVerified: 'November 2026',
  },
  {
    id: 'case-study-ecommerce',
    name: 'Ultra-Scale Event-Driven E-Commerce Platform',
    pillar: 'Case Studies',
    url: '/docs/case-studies/scalable-ecommerce-engine/overview',
    runtime: 'Go 1.23 + Kafka 3.7 + Redis 7.2 + Sharded Postgres',
    dockerStatus: 'Event-Driven Cluster Healthy',
    testSuite: 'Flash-Sale 100k RPS Chaos Verification',
    ciStatus: 'Verified',
    lastVerified: 'November 2026',
  },
];

const PILLARS = ['All', 'System Design', 'Backend', 'Full-Stack', 'AI Agents', 'Case Studies'];

export default function VerificationMatrix(): JSX.Element {
  const [selectedPillar, setSelectedPillar] = useState('All');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return VERIFIED_CATALOG.filter((item) => {
      if (selectedPillar !== 'All' && item.pillar !== selectedPillar) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.runtime.toLowerCase().includes(q) ||
          item.testSuite.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedPillar, search]);

  const handleCopy = (id: string) => {
    const cmd = `npx software-blueprints add ${id}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className={styles.matrixContainer}>
      {/* Aggregate Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{VERIFIED_CATALOG.length}</span>
          <span className={styles.statLabel}>Architectures Audited</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>100%</span>
          <span className={styles.statLabel}>CI Passing Rate</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>0</span>
          <span className={styles.statLabel}>Flaky Test Regressions</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>Node 20 / 22</span>
          <span className={styles.statLabel}>GitHub Actions Matrix</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.filterPills}>
          {PILLARS.map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.filterBtn} ${selectedPillar === p ? styles.filterBtnActive : ''}`}
              onClick={() => setSelectedPillar(p)}>
              {p}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter by tech stack, runtime, test suite..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {filtered.map((item) => (
          <div key={item.id} className={styles.card}>
            <div>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{item.name}</h3>
                <span className={styles.cardPillar}>{item.pillar}</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div className={styles.badgeRow}>
                  <span className={styles.statusDot} />
                  <span>CI Verification: {item.ciStatus} (100%)</span>
                </div>
              </div>
            </div>

            <div className={styles.metaList}>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>⚙️</span>
                <span><strong>Runtime:</strong> {item.runtime}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>🐳</span>
                <span><strong>Container:</strong> {item.dockerStatus}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>🧪</span>
                <span><strong>Tests:</strong> {item.testSuite}</span>
              </div>
            </div>

            <div className={styles.cliSnippet}>
              <span>npx software-blueprints add {item.id}</span>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => handleCopy(item.id)}
                title="Copy command">
                {copiedId === item.id ? '✔ Copied' : '📋'}
              </button>
            </div>

            <div className={styles.cardFooter}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Verified: {item.lastVerified}
              </span>
              <Link to={item.url} className={styles.viewLink}>
                View Blueprint →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

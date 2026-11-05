import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

interface PillarCard {
  id: string;
  category: string;
  title: string;
  icon: string;
  badge: string;
  description: string;
  link: string;
  highlights: string[];
}

const PILLARS: PillarCard[] = [
  {
    id: 'ai-agents',
    category: 'agents',
    title: 'AI Agents & Autonomous Loops',
    icon: '🤖',
    badge: '9 Blueprints',
    description: 'Multi-step reasoning engines, LangGraph supervisor routing, ReAct loops, agent memory, and human-in-the-loop checkpoints.',
    link: '/docs/ai-agents/agent-rag-harness/overview',
    highlights: ['Supervisor Pattern', 'ReAct Tool Loop', '3-Tier Memory', 'OpenTelemetry Tracing', 'Guardrails & RBAC'],
  },
  {
    id: 'rag-systems',
    category: 'rag',
    title: 'RAG Systems & Vector Search',
    icon: '🧠',
    badge: '6 Blueprints',
    description: 'Enterprise retrieval combining dense pgvector HNSW and sparse BM25, Reciprocal Rank Fusion, Neo4j GraphRAG, and ColPali vision.',
    link: '/docs/rag-systems/hybrid-search-reranking/overview',
    highlights: ['pgvector HNSW + BM25', 'Semantic Chunking', 'GraphRAG (Neo4j)', 'Corrective RAG (CRAG)', 'Vision ColPali'],
  },
  {
    id: 'ml-deeplearning',
    category: 'ml',
    title: 'ML, Inference & Fine-Tuning',
    icon: '🔬',
    badge: '6 Blueprints',
    description: 'High-throughput LLM serving clusters with vLLM PagedAttention, 4-bit QLoRA adapters, DPO alignment, and AWQ/FP8 compression.',
    link: '/docs/ml-deeplearning/vllm-inference-serving/overview',
    highlights: ['vLLM Continuous Batching', '4-bit QLoRA', 'Direct Preference Opt (DPO)', 'AWQ & FP8', 'Matryoshka MRL'],
  },
  {
    id: 'system-design',
    category: 'sys',
    title: 'System Design & Distributed Patterns',
    icon: '🛡️',
    badge: '6 Blueprints',
    description: 'Resilient architectures for ultra-high availability: atomic Redis sliding windows, double-entry ledgers, transactional outbox CDC, and distributed locks.',
    link: '/docs/system-design/distributed-rate-limiter/overview',
    highlights: ['Sliding Window Counter', 'Double-Entry Ledger', 'Outbox CDC (Debezium)', 'Redis Redlock', 'CQRS & Event Store'],
  },
  {
    id: 'backend',
    category: 'backend',
    title: 'Backend & Distributed Services',
    icon: '⚙️',
    badge: '6 Blueprints',
    description: 'Polyglot high-throughput microservices: Go Fiber with Redis Streams, Django Celery, Spring Boot 3 Virtual Threads, Rust Axum, and gRPC HTTP/2.',
    link: '/docs/backend/golang-microservices/overview',
    highlights: ['Go Fiber & Redis Streams', 'Django 5 & Celery', 'Spring Boot Virtual Threads', 'Rust Axum (sub-1ms)', 'gRPC Proto3'],
  },
  {
    id: 'full-stack',
    category: 'fullstack',
    title: 'Full-Stack Web Architectures',
    icon: '⚡',
    badge: '6 Blueprints',
    description: 'Modern web applications: Next.js 15 RSC + Drizzle ORM, PostgreSQL kernel RLS multi-tenancy, Stripe webhook ledgers, and realtime CRDTs.',
    link: '/docs/full-stack/nextjs-drizzle-postgres/overview',
    highlights: ['Next.js 15 & Drizzle', 'Multi-Tenant Postgres RLS', 'Database Sliding Sessions', 'Stripe Webhook Ledger', 'Yjs CRDTs'],
  },
  {
    id: 'frontend',
    category: 'frontend',
    title: 'Frontend & UI Design Systems',
    icon: '🎨',
    badge: '16 Components',
    description: 'Accessible React UI component library adhering strictly to WCAG 2.1 AA with focus trapping, roving tabindex, and live code previews.',
    link: '/docs/frontend/react/buttons',
    highlights: ['Accessible Modals & Drawers', 'Sortable Tables', 'Tabs & Segmented Controls', 'Live Badges', 'Accordions & Tooltips'],
  },
];

const CATEGORIES = [
  { key: 'all', label: 'All 7 Pillars' },
  { key: 'agents', label: '🤖 AI Agents' },
  { key: 'rag', label: '🧠 RAG Systems' },
  { key: 'ml', label: '🔬 ML & Deep Learning' },
  { key: 'sys', label: '🛡️ System Design' },
  { key: 'backend', label: '⚙️ Backend' },
  { key: 'fullstack', label: '⚡ Full-Stack' },
  { key: 'frontend', label: '🎨 Frontend UI' },
];

export default function Home(): JSX.Element {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredPillars =
    activeCategory === 'all'
      ? PILLARS
      : PILLARS.filter((p) => p.category === activeCategory);

  const handleOpenAssistant = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-blueprint-assistant'));
    }
  };

  return (
    <Layout
      title="Master Architecture Vault"
      description="55 production software architecture blueprints, distributed system designs, AI agent harnesses, and accessible React components.">
      <div className={styles.homeContainer}>
        {/* Ambient Glow Elements */}
        <div className={styles.ambientAuraTop} />
        <div className={styles.ambientAuraBottom} />

        {/* Hero Section */}
        <header className={styles.heroSection}>
          <div className={styles.pillBadge}>
            <span>✨</span>
            <span>55 Production Blueprints • 7 Core Pillars • Zero API Costs</span>
          </div>

          <Heading as="h1" className={styles.heroTitle}>
            Open-Source System <br />
            <span className={styles.gradientText}>Architecture Designs</span>
          </Heading>

          <p className={styles.heroSubtitle}>
            The definitive engineering reference vault. Production-ready architectures, working implementations, database schemas, and accessible UI design systems.
          </p>

          <div className={styles.heroCtaGroup}>
            <Link className={styles.primaryCta} to="/docs/roadmap">
              Explore Master Catalog 🗺️
            </Link>
            <button
              type="button"
              className={styles.aiCta}
              onClick={handleOpenAssistant}>
              <span>✨ Ask Architecture AI</span>
              <span className={styles.kbdBadge}>⌘K</span>
            </button>
            <Link
              className={styles.secondaryCta}
              to="https://github.com/software-blueprints-hq/software-blueprints">
              <span>GitHub Repo ⭐</span>
            </Link>
          </div>
        </header>

        {/* Bento Stats Grid */}
        <section className={styles.statsContainer}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>55</div>
              <div className={styles.statLabel}>Production Blueprints</div>
              <p className={styles.statSub}>Zero placeholder stubs. Complete diagrams & code.</p>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>7</div>
              <div className={styles.statLabel}>Deep Engineering Pillars</div>
              <p className={styles.statSub}>From UI design systems to deep learning clusters.</p>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>₹0 / $0</div>
              <div className={styles.statLabel}>External API Cost</div>
              <p className={styles.statSub}>100% open source, client-side, zero cloud lock-in.</p>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>100%</div>
              <div className={styles.statLabel}>Production Hardened</div>
              <p className={styles.statSub}>Full TypeScript, PostgreSQL schemas & checklists.</p>
            </div>
          </div>
        </section>

        {/* Filter Section */}
        <section className={styles.filterSection}>
          <div className={styles.filterHeader}>
            <h2>Explore by Architecture Pillar</h2>
            <p>Select a category to jump directly to deep-dive production blueprints.</p>
          </div>

          {/* Interactive Pill Tabs */}
          <div className={styles.pillTabs}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`${styles.filterPill} ${activeCategory === cat.key ? styles.filterPillActive : ''}`}
                onClick={() => setActiveCategory(cat.key)}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Bento Grid */}
          <div className={styles.pillarBentoGrid}>
            {filteredPillars.map((pillar) => (
              <Link key={pillar.id} to={pillar.link} className={styles.bentoCard}>
                <div>
                  <div className={styles.cardTop}>
                    <span className={styles.cardIcon}>{pillar.icon}</span>
                    <span className={styles.badgePill}>{pillar.badge}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{pillar.title}</h3>
                  <p className={styles.cardDesc}>{pillar.description}</p>
                  <div className={styles.highlightList}>
                    {pillar.highlights.map((item) => (
                      <span key={item} className={styles.highlightPill}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.cardAction}>
                  <span>Explore Blueprint</span>
                  <span className={styles.arrowIcon}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

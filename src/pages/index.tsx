import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

interface PillarCard {
  title: string;
  icon: string;
  badge: string;
  description: string;
  link: string;
  highlights: string[];
}

const PILLARS: PillarCard[] = [
  {
    title: 'AI Agents & Autonomous Loops',
    icon: '🤖',
    badge: '9 Blueprints',
    description: 'Multi-step reasoning engines, ReAct tool execution, agent memory tiers, and human-in-the-loop checkpoints.',
    link: '/docs/ai-agents/agent-rag-harness/overview',
    highlights: ['Supervisor Pattern', 'ReAct Loop', 'Agent Memory', 'CI Evals', 'Security Guardrails'],
  },
  {
    title: 'RAG Systems & Vector Search',
    icon: '🧠',
    badge: '6 Blueprints',
    description: 'Enterprise retrieval architectures combining dense vector search and sparse BM25 with cross-encoders.',
    link: '/docs/rag-systems/hybrid-search-reranking/overview',
    highlights: ['pgvector HNSW + BM25', 'Semantic Chunking', 'GraphRAG (Neo4j)', 'Corrective RAG', 'Multi-Modal VLM'],
  },
  {
    title: 'ML, Inference & Fine-Tuning',
    icon: '🔬',
    badge: '6 Blueprints',
    description: 'High-throughput LLM serving clusters, parameter-efficient fine-tuning, and alignment pipelines.',
    link: '/docs/ml-deeplearning/vllm-inference-serving/overview',
    highlights: ['vLLM PagedAttention', '4-bit QLoRA', 'Direct Preference Opt (DPO)', 'AWQ / FP8', 'Matryoshka MRL'],
  },
  {
    title: 'System Design & Distributed Patterns',
    icon: '🛡️',
    badge: '6 Blueprints',
    description: 'Resilient architectures for ultra-high availability, zero-loss accounting, and multi-region coordination.',
    link: '/docs/system-design/distributed-rate-limiter/overview',
    highlights: ['Sliding Window Rate Limiter', 'Double-Entry Ledger', 'Transactional Outbox', 'Distributed Locks', 'CQRS'],
  },
  {
    title: 'Backend & Distributed Services',
    icon: '⚙️',
    badge: '6 Blueprints',
    description: 'Polyglot high-concurrency microservices and asynchronous task fleets across modern languages.',
    link: '/docs/backend/golang-microservices/overview',
    highlights: ['Go Fiber & Redis Streams', 'Django 5 & Celery', 'Spring Boot 3 Virtual Threads', 'Rust Axum', 'gRPC Proto3'],
  },
  {
    title: 'Full-Stack Web Architectures',
    icon: '⚡',
    badge: '6 Blueprints',
    description: 'Complete modern web applications with direct server rendering, multi-tenancy, and subscription billing.',
    link: '/docs/full-stack/nextjs-drizzle-postgres/overview',
    highlights: ['Next.js 15 & Drizzle', 'Multi-Tenant RLS', 'Database Sessions (Auth.js)', 'Stripe Webhook Ledger', 'Yjs CRDTs'],
  },
  {
    title: 'Frontend & UI Design Systems',
    icon: '🎨',
    badge: '16 Components',
    description: 'Enterprise React component library adhering strictly to WCAG 2.1 AA with live interactive code previews.',
    link: '/docs/frontend/react/buttons',
    highlights: ['Accessible Modals', 'Sortable Tables', 'Tabs & Segmented Switches', 'Live Badges', 'Accordions & Tooltips'],
  },
];

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)} style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)', color: '#fff', padding: '5rem 0' }}>
      <div className="container">
        <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '9999px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', fontSize: '13px', fontWeight: '600', color: '#a5b4fc', marginBottom: '1.5rem' }}>
          🏛️ 55 Production Architecture Blueprints
        </div>
        <Heading as="h1" className="hero__title" style={{ fontSize: '3.2rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle" style={{ fontSize: '1.25rem', color: '#cbd5e1', maxWidth: '720px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
          The definitive engineering reference vault. Production-ready architectures, working code implementations, database schemas, and accessible UI design systems.
        </p>
        <div className={styles.buttons} style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            className="button button--secondary button--lg"
            style={{ fontWeight: '600', padding: '0.8rem 2rem', borderRadius: '8px' }}
            to="/docs/roadmap">
            Explore Master Catalog 🗺️
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{ color: '#fff', borderColor: '#475569', fontWeight: '600', padding: '0.8rem 2rem', borderRadius: '8px' }}
            to="/docs/getting-started">
            Getting Started Guide 🚀
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Master Architecture Catalog"
      description="Enterprise software architecture blueprints, system design patterns, and accessible UI design systems.">
      <HomepageHeader />
      <main style={{ background: '#0b0f19', padding: '4rem 0 6rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>
              The 7 Core Architecture Pillars
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
              Deep-dive production blueprints complete with Mermaid diagrams, full working code, and hardening checklists.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}>
            {PILLARS.map((pillar) => (
              <Link
                key={pillar.title}
                to={pillar.link}
                style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    borderRadius: '14px',
                    padding: '24px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#1e293b';
                  }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '2rem' }}>{pillar.icon}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        }}>
                        {pillar.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
                      {pillar.title}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.5', marginBottom: '18px' }}>
                      {pillar.description}
                    </p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {pillar.highlights.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '11px',
                            fontWeight: '500',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: '#0f172a',
                            color: '#cbd5e1',
                            border: '1px solid #334155',
                          }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}

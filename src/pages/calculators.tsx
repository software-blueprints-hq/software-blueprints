import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from '../components/Calculators/calculators.module.css';
import VLLMCalculator from '../components/Calculators/VLLMCalculator';
import RateLimiterCalculator from '../components/Calculators/RateLimiterCalculator';
import PgVectorCalculator from '../components/Calculators/PgVectorCalculator';
import KafkaCalculator from '../components/Calculators/KafkaCalculator';
import ShardingCalculator from '../components/Calculators/ShardingCalculator';

export default function CalculatorsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'vllm' | 'ratelimit' | 'pgvector' | 'kafka' | 'sharding'>('vllm');

  return (
    <Layout
      title="Architecture Sizing Calculators"
      description="Interactive sizing calculators for vLLM GPU VRAM, Redis Rate Limiters, PostgreSQL pgvector HNSW, Kafka Clusters, and Database Sharding.">
      <main style={{ minHeight: '100vh', padding: '4rem 1rem 6rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1080px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '9999px',
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#38bdf8',
                marginBottom: '1rem',
              }}>
              🧮 5-Pillar Architecture Sizing Suite
            </div>
            <Heading as="h1" style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              System Sizing & Capacity Calculators
            </Heading>
            <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '720px', margin: '0 auto', lineHeight: 1.6 }}>
              Production infrastructure sizing tools. Model your VRAM requirements, calculate Redis cluster throughput, scale Kafka partition topologies, and compute database shard counts.
            </p>
          </div>

          {/* Calculator Selector Tabs */}
          <div className={styles.tabContainer}>
            {[
              { id: 'vllm', label: '⚡ vLLM GPU & KV-Cache', desc: 'LLM Cluster Sizing' },
              { id: 'ratelimit', label: '🛡️ Rate Limiter Sizer', desc: 'Redis RAM & QPS' },
              { id: 'pgvector', label: '🧠 pgvector HNSW RAM', desc: 'Vector DB Sizing' },
              { id: 'kafka', label: '📨 Kafka Cluster Sizer', desc: 'Partitions & Storage' },
              { id: 'sharding', label: '🌐 DB Sharding Ring', desc: 'Ketama Vnodes & Nodes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}>
                <div className={styles.tabLabel}>{tab.label}</div>
                <div className={styles.tabDesc}>{tab.desc}</div>
              </button>
            ))}
          </div>

          {/* Active Calculator Component */}
          {activeTab === 'vllm' && <VLLMCalculator />}
          {activeTab === 'ratelimit' && <RateLimiterCalculator />}
          {activeTab === 'pgvector' && <PgVectorCalculator />}
          {activeTab === 'kafka' && <KafkaCalculator />}
          {activeTab === 'sharding' && <ShardingCalculator />}
        </div>
      </main>
    </Layout>
  );
}

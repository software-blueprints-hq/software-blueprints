import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
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
      <main style={{ minHeight: '100vh', background: '#06080d', padding: '4rem 1rem 6rem 1rem' }}>
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
            <Heading as="h1" style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
              System Sizing & Capacity Calculators
            </Heading>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '720px', margin: '0 auto', lineHeight: 1.6 }}>
              Production infrastructure sizing tools. Model your VRAM requirements, calculate Redis cluster throughput, scale Kafka partition topologies, and compute database shard counts.
            </p>
          </div>

          {/* Calculator Selector Tabs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '2.5rem',
            }}>
            {[
              { id: 'vllm', label: '⚡ vLLM GPU VRAM & KV-Cache', desc: 'LLM Cluster Sizing' },
              { id: 'ratelimit', label: '🛡️ Distributed Rate Limiter', desc: 'Redis Memory & Throughput' },
              { id: 'pgvector', label: '🧠 pgvector HNSW & RAM', desc: 'Vector Database Sizing' },
              { id: 'kafka', label: '📨 Kafka Cluster & Partitions', desc: 'Throughput & Disk Sizing' },
              { id: 'sharding', label: '🌐 Database Sharding Ring', desc: 'Ketama Vnodes & Nodes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: activeTab === tab.id ? 'rgba(6, 182, 212, 0.18)' : 'rgba(15, 23, 42, 0.7)',
                  border: activeTab === tab.id ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  color: activeTab === tab.id ? '#00f0ff' : '#cbd5e1',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === tab.id ? '0 0 20px rgba(6, 182, 212, 0.25)' : 'none',
                }}>
                <div>{tab.label}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '2px', fontWeight: 500 }}>
                  {tab.desc}
                </div>
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

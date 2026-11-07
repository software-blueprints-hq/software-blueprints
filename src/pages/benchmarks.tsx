import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BenchmarkRepository from '../components/BenchmarkRepository';

export default function BenchmarksPage(): JSX.Element {
  return (
    <Layout
      title="Engineering Benchmarks & Empirical Performance Evidence"
      description="Empirical, reproducible performance benchmarks for high-throughput distributed systems. Measured on real hardware with exact versions, scripts, and latency distributions.">
      <main style={{ minHeight: '100vh', padding: '3.5rem 1rem 6rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1150px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '9999px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#38bdf8',
                marginBottom: '1rem',
              }}>
              📊 Empirical Performance Evidence &amp; Sizing Proofs
            </div>
            <Heading as="h1" style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Engineering Evidence &amp; Benchmarks
            </Heading>
            <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '780px', margin: '0 auto', lineHeight: 1.6 }}>
              Every performance claim must be accompanied by reproducible evidence. Review hardware specifications, software versions, raw latency percentiles (P50, P95, P99), and exact CLI reproduction commands.
            </p>
          </div>

          {/* Benchmark Repository Component */}
          <BenchmarkRepository />
        </div>
      </main>
    </Layout>
  );
}

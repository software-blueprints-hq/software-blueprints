import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import ArchitectureExplorer from '../components/ArchitectureExplorer';

export default function ExplorerPage(): JSX.Element {
  return (
    <Layout
      title="Interactive Architecture & Failure Mode Explorer"
      description="Interactive component-by-component architecture explorer and failure mode simulator for high-throughput distributed systems.">
      <main style={{ minHeight: '100vh', background: '#06080d', padding: '3.5rem 1rem 6rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '9999px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.35)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#00f0ff',
                marginBottom: '1rem',
              }}>
              ⚡ Live Interactive System Explorer &amp; Chaos Simulator
            </div>
            <Heading as="h1" style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
              Interactive Architecture Explorer
            </Heading>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '780px', margin: '0 auto', lineHeight: 1.6 }}>
              Inspect distributed systems component by component. Explore ingress protocols, latency budgets, data payloads, and trigger live failure simulations to see how resilient architectures prevent cascading outages.
            </p>
          </div>

          {/* Interactive Architecture Explorer Widget */}
          <ArchitectureExplorer />
        </div>
      </main>
    </Layout>
  );
}

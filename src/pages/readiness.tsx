import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import ReadinessChecklist from '../components/ReadinessChecklist';

export default function ReadinessPage(): JSX.Element {
  return (
    <Layout
      title="Production Readiness Checklist & Audit Tool"
      description="Interactive 8-pillar production readiness audit tool for distributed systems, Kafka streaming, multi-tenant databases, and AI RAG pipelines.">
      <main style={{ minHeight: '100vh', padding: '3.5rem 1rem 6rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#10b981',
                marginBottom: '1rem',
              }}>
              ✅ 8-Pillar Engineering Sign-Off Suite
            </div>
            <Heading as="h1" style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Production Readiness Checklist
            </Heading>
            <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '780px', margin: '0 auto', lineHeight: 1.6 }}>
              Audit your system before deploying to production. Clear P0 blockers across fault tolerance, storage limits, security boundaries, and telemetry, then export a GitHub PR sign-off checklist.
            </p>
          </div>

          {/* Interactive Readiness Audit Component */}
          <ReadinessChecklist />
        </div>
      </main>
    </Layout>
  );
}

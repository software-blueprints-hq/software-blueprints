import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import VerificationMatrix from '../components/VerificationMatrix/VerificationMatrix';

export default function VerificationPage(): JSX.Element {
  return (
    <Layout
      title="Production Architecture Verification Matrix"
      description="Live automated CI verification matrix and container health status for all Level 3 software blueprints and case studies.">
      <main style={{ minHeight: '100vh', padding: '3.5rem 1rem 6rem 1rem' }}>
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
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#34d399',
                marginBottom: '1rem',
              }}>
              🛡️ Live Automated Continuous Integration &amp; Container Audits
            </div>
            <Heading as="h1" style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Architecture Verification Matrix
            </Heading>
            <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '780px', margin: '0 auto', lineHeight: 1.6 }}>
              A passing build is not enough. Review exact container runtimes, automated CI test coverage, Docker health checks, and 1-click CLI scaffolding commands for every production-validated system.
            </p>
          </div>

          {/* Verification Matrix Component */}
          <VerificationMatrix />
        </div>
      </main>
    </Layout>
  );
}

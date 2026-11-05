import React, { useState, useEffect } from 'react';

export default function ExportPdfButton(): JSX.Element | null {
  const [isDocPage, setIsDocPage] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkPath = () => {
        setIsDocPage(window.location.pathname.startsWith('/docs/'));
      };
      checkPath();
      window.addEventListener('popstate', checkPath);
      return () => window.removeEventListener('popstate', checkPath);
    }
  }, []);

  if (!isDocPage) return null;

  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Export Architecture Spec as PDF"
      title="Export Executive Spec (PDF / Print)"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 998,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '9999px',
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        color: '#94a3b8',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#ffffff';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#94a3b8';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}>
      <span>📄</span>
      <span>Export Spec (PDF)</span>
    </button>
  );
}

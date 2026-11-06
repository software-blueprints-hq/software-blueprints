import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ErrorBoundary from '@docusaurus/ErrorBoundary';
import { ErrorBoundaryErrorMessageFallback } from '@docusaurus/theme-common';
import {
  MermaidContainerClassName,
  useMermaidRenderResult,
} from '@docusaurus/theme-mermaid/client';
import patchPrototypes from '../../clientModules/d3-polyfill';
import styles from './styles.module.css';

function MermaidModal({
  svgHtml,
  onClose,
}: {
  svgHtml: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalHeader} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>
          <span>🏛️</span>
          <span>Architecture Deep Dive (Zoom & Inspect)</span>
        </div>
        <div className={styles.modalControls}>
          <button
            type="button"
            className={styles.controlBtn}
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            title="Zoom Out">
            −
          </button>
          <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className={styles.controlBtn}
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            title="Zoom In">
            +
          </button>
          <button
            type="button"
            className={styles.controlBtn}
            onClick={() => setScale(1)}
            title="Reset">
            Reset
          </button>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title="Close (ESC)">
            ✕ Close
          </button>
        </div>
      </div>
      <div className={styles.modalBody} onClick={(e) => e.stopPropagation()}>
        <div
          className={styles.zoomContainer}
          style={{ transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>
    </div>,
    document.body
  );
}

function MermaidRenderResult({
  renderResult,
  rawSource,
}: {
  renderResult: any;
  rawSource: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    patchPrototypes();
    const div = ref.current;
    if (div && renderResult?.bindFunctions) {
      try {
        renderResult.bindFunctions(div);
      } catch (err) {
        console.warn('Mermaid bindFunctions caught:', err);
      }
    }
  }, [renderResult]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawSource);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy mermaid source', err);
    }
  };

  const handleOpenLive = () => {
    try {
      const state = {
        code: rawSource,
        mermaid: { theme: 'dark' },
        autoSync: true,
        updateDiagram: true,
      };
      const json = JSON.stringify(state);
      const base64 = btoa(unescape(encodeURIComponent(json)));
      window.open(`https://mermaid.live/edit#base64:${base64}`, '_blank');
    } catch (err) {
      console.error('Failed to open in Mermaid Live', err);
    }
  };

  return (
    <div className={styles.mermaidWrapper}>
      {/* Interactive Action Bar */}
      <div className={styles.actionBar}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleCopy}
          title="Copy Mermaid source">
          {copied ? (
            <>
              <span>✓</span> Copied
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>

        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setIsZoomed(true)}
          title="Fullscreen Zoom">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Zoom
        </button>

        <button
          type="button"
          className={styles.actionButton}
          onClick={handleOpenLive}
          title="Open in Mermaid.live">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Live
        </button>
      </div>

      <div
        ref={ref}
        className={`${MermaidContainerClassName} ${styles.container}`}
        dangerouslySetInnerHTML={{ __html: renderResult.svg }}
      />

      {isZoomed && typeof document !== 'undefined' && (
        <MermaidModal
          svgHtml={renderResult.svg}
          onClose={() => setIsZoomed(false)}
        />
      )}
    </div>
  );
}

function MermaidRenderer({ value }: { value: string }) {
  const renderResult = useMermaidRenderResult({ text: value });
  if (renderResult === null) {
    return null;
  }
  return <MermaidRenderResult renderResult={renderResult} rawSource={value} />;
}

export default function Mermaid(props: { value: string }) {
  return (
    <ErrorBoundary
      fallback={(params) => <ErrorBoundaryErrorMessageFallback {...params} />}>
      <MermaidRenderer {...props} />
    </ErrorBoundary>
  );
}

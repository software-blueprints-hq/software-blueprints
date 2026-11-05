import React, { useEffect, useRef } from 'react';
import ErrorBoundary from '@docusaurus/ErrorBoundary';
import { ErrorBoundaryErrorMessageFallback } from '@docusaurus/theme-common';
import {
  MermaidContainerClassName,
  useMermaidRenderResult,
} from '@docusaurus/theme-mermaid/client';
import patchPrototypes from '../../clientModules/d3-polyfill';
import styles from './styles.module.css';

function MermaidRenderResult({ renderResult }: { renderResult: any }) {
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={ref}
      className={`${MermaidContainerClassName} ${styles.container}`}
      dangerouslySetInnerHTML={{ __html: renderResult.svg }}
    />
  );
}

function MermaidRenderer({ value }: { value: string }) {
  const renderResult = useMermaidRenderResult({ text: value });
  if (renderResult === null) {
    return null;
  }
  return <MermaidRenderResult renderResult={renderResult} />;
}

export default function Mermaid(props: { value: string }) {
  return (
    <ErrorBoundary
      fallback={(params) => <ErrorBoundaryErrorMessageFallback {...params} />}>
      <MermaidRenderer {...props} />
    </ErrorBoundary>
  );
}

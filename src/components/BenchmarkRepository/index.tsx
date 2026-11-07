import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import { BENCHMARK_REPORTS, BenchmarkReport } from '../../data/benchmarkData';
import styles from './index.module.css';

interface BenchmarkRepositoryProps {
  initialReportId?: string;
}

export default function BenchmarkRepository({ initialReportId }: BenchmarkRepositoryProps): JSX.Element {
  const [selectedReportId, setSelectedReportId] = useState<string>(
    initialReportId || BENCHMARK_REPORTS[0].id
  );
  const [copiedCommand, setCopiedCommand] = useState<boolean>(false);

  const currentReport: BenchmarkReport =
    BENCHMARK_REPORTS.find((r) => r.id === selectedReportId) || BENCHMARK_REPORTS[0];

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(currentReport.reproductionCommand);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className={styles.container}>
      {/* 1. Benchmark Report Selector Pills */}
      <div className={styles.benchNav}>
        {BENCHMARK_REPORTS.map((report) => {
          const isActive = report.id === currentReport.id;
          return (
            <button
              key={report.id}
              className={`${styles.benchPill} ${isActive ? styles.benchPillActive : ''}`}
              onClick={() => setSelectedReportId(report.id)}
            >
              <span className={styles.benchPillTitle}>{report.title}</span>
              <span className={styles.benchPillTag}>{report.measuredResults.throughput}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Benchmark Detail Report Card */}
      <div className={styles.reportCard}>
        <div className={styles.reportHeader}>
          <div className={styles.reportMeta}>
            <h3 className={styles.reportTitle}>
              {currentReport.title}
              <span className={styles.verifiedBadge}>✓ {currentReport.status}</span>
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              <span><strong>Architecture:</strong> {currentReport.architecture}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span><strong>Last Verified:</strong> {currentReport.lastTestedDate}</span>
            </div>
            <div className={styles.claimBox}>
              <strong>Hypothesis / Target SLA:</strong> {currentReport.testedClaim}
            </div>
          </div>

          <Link to={currentReport.blueprintUrl} className={styles.blueprintLinkBtn}>
            Open {currentReport.blueprintTitle} →
          </Link>
        </div>

        {/* 3. Measured Results Grid */}
        <div>
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.65rem' }}>
            Empirically Measured Results
          </h4>
          <div className={styles.resultsGrid}>
            <div className={styles.resultCard}>
              <span className={styles.resultTitle}>Throughput</span>
              <span className={styles.resultValue}>{currentReport.measuredResults.throughput}</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultTitle}>P50 Latency</span>
              <span className={styles.resultValue}>{currentReport.measuredResults.latencyP50}</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultTitle}>P90 Latency</span>
              <span className={styles.resultValue}>{currentReport.measuredResults.latencyP90}</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultTitle}>P95 Latency</span>
              <span className={styles.resultValue}>{currentReport.measuredResults.latencyP95}</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultTitle}>P99 Latency</span>
              <span className={styles.resultValue} style={{ color: '#10b981' }}>{currentReport.measuredResults.latencyP99}</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultTitle}>CPU Utilization</span>
              <span className={styles.resultValue} style={{ fontSize: '0.95rem' }}>{currentReport.measuredResults.cpuUtilization}</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultTitle}>Memory RSS</span>
              <span className={styles.resultValue} style={{ fontSize: '0.95rem' }}>{currentReport.measuredResults.memoryRSS}</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultTitle}>Error Rate</span>
              <span className={styles.resultValue} style={{ fontSize: '0.95rem', color: '#34d399' }}>{currentReport.measuredResults.errorRate}</span>
            </div>
          </div>
        </div>

        {/* 4. Hardware & Software Specifications */}
        <div>
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.65rem' }}>
            Test Environment &amp; Hardware Specifications
          </h4>
          <div className={styles.specsGrid}>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Compute Hardware</span>
              <p className={styles.specValue}>{currentReport.hardwareSpec.instanceType}</p>
              <p className={styles.specValue} style={{ color: '#64748b', fontSize: '0.8rem' }}>{currentReport.hardwareSpec.cpu}</p>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Memory &amp; Storage</span>
              <p className={styles.specValue}>{currentReport.hardwareSpec.ram}</p>
              <p className={styles.specValue} style={{ color: '#64748b', fontSize: '0.8rem' }}>{currentReport.hardwareSpec.storage}</p>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Software Stack</span>
              <p className={styles.specValue}>{currentReport.softwareVersions.databaseOrBroker}</p>
              <p className={styles.specValue} style={{ color: '#64748b', fontSize: '0.8rem' }}>{currentReport.softwareVersions.runtime}</p>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Workload Profile</span>
              <p className={styles.specValue}>{currentReport.workloadProfile.concurrency}</p>
              <p className={styles.specValue} style={{ color: '#64748b', fontSize: '0.8rem' }}>{currentReport.workloadProfile.duration}</p>
            </div>
          </div>
        </div>

        {/* 5. Mathematical Formula, Assumptions & Limitations */}
        <div className={styles.mathBox}>
          <h4 className={styles.mathTitle}>
            <span>📐 Engineering Sizing Formula &amp; Assumptions</span>
          </h4>
          <div className={styles.formulaText}>
            <code>{currentReport.mathAndAssumptions.formula}</code>
          </div>
          <ul className={styles.assumptionsList}>
            {currentReport.mathAndAssumptions.assumptions.map((assump, idx) => (
              <li key={idx}>{assump}</li>
            ))}
          </ul>
          <p className={styles.limitationsText}>
            <strong>⚠️ Operational Boundary &amp; Limitation:</strong> {currentReport.mathAndAssumptions.limitations}
          </p>
        </div>

        {/* 6. Reproduction Command */}
        <div className={styles.commandBox}>
          <div className={styles.commandHeader}>
            <span>REPRODUCIBLE BENCHMARK COMMAND</span>
            <button
              onClick={handleCopyCommand}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: copiedCommand ? '#34d399' : '#cbd5e1',
                borderRadius: '4px',
                padding: '3px 10px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              {copiedCommand ? '✓ Copied' : 'Copy Command'}
            </button>
          </div>
          <code className={styles.commandCode}>{currentReport.reproductionCommand}</code>
        </div>

        {/* 7. Raw Tool Output Log */}
        <div>
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>
            Raw Telemetry Output ({currentReport.softwareVersions.loadGenerator})
          </h4>
          <pre className={styles.logBox}>
            <code>{currentReport.rawLogSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

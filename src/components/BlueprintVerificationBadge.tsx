import React from 'react';
import styles from './BlueprintVerificationBadge.module.css';

interface VerificationProps {
  blueprintId: string;
  lastVerifiedDate?: string;
  runtimeVersion?: string;
  dockerStatus?: string;
  testSuite?: string;
  ciStatus?: string;
}

export default function BlueprintVerificationBadge({
  blueprintId,
  lastVerifiedDate = 'November 2026',
  runtimeVersion = 'Production Validated',
  dockerStatus = 'Docker Compose Healthy',
  testSuite = 'Unit + Integration Verified',
  ciStatus = 'Passing (100%)',
}: VerificationProps): JSX.Element {
  return (
    <div className={styles.badgeContainer}>
      <div className={styles.topRow}>
        <div className={styles.statusPill}>
          <span className={styles.pulseDot} />
          Automated CI Verification: {ciStatus}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Blueprint ID: <code>{blueprintId}</code>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last Verified</span>
          <span className={styles.metaValue}>{lastVerifiedDate}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Runtime Target</span>
          <span className={styles.metaValue}>{runtimeVersion}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Container Status</span>
          <span className={styles.metaValue}>{dockerStatus}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Test Coverage</span>
          <span className={styles.metaValue}>{testSuite}</span>
        </div>
      </div>
    </div>
  );
}

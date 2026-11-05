import React, { useState } from 'react';
import styles from './calculators.module.css';

export default function RateLimiterCalculator(): JSX.Element {
  const [peakQps, setPeakQps] = useState<number>(25000);
  const [windowSec, setWindowSec] = useState<number>(60);
  const [activeUsers, setActiveUsers] = useState<number>(250000);
  const [algorithm, setAlgorithm] = useState<'sliding-window' | 'token-bucket' | 'fixed-window'>('sliding-window');
  const [useL1Cache, setUseL1Cache] = useState<boolean>(true);

  // Bytes per entry in Redis
  // Sliding Window (Sorted Set): ~100 bytes per element in zset + dict overhead
  // Token Bucket (Hash): ~64 bytes per user key (2 fields: timestamp + count)
  // Fixed Window (Simple String Key): ~48 bytes per user key
  let bytesPerActiveEntity = 64;
  if (algorithm === 'sliding-window') {
    // Avg requests per user in window = (peakQps * windowSec) / activeUsers
    const avgHitsPerUser = Math.max(2, Math.min(20, (peakQps * windowSec) / activeUsers));
    bytesPerActiveEntity = 120 + avgHitsPerUser * 24;
  } else if (algorithm === 'fixed-window') {
    bytesPerActiveEntity = 48;
  }

  // Memory calculation
  const rawMemoryBytes = activeUsers * bytesPerActiveEntity;
  // Add Redis jemalloc allocator fragmentation overhead (~25%)
  const totalMemoryMB = (rawMemoryBytes * 1.25) / (1024 * 1024);

  // Network Throughput
  // Each request sends an atomic Lua script eval (~250 bytes request, ~50 bytes reply)
  const l1FilterFactor = useL1Cache ? 0.2 : 1.0; // 80% absorbed by local LRU cache
  const effectiveRedisQps = peakQps * l1FilterFactor;
  const networkBandwidthMBps = (effectiveRedisQps * 300) / (1024 * 1024);

  // Architecture Recommendation
  let redisTopology = '';
  if (effectiveRedisQps > 60000 || totalMemoryMB > 12000) {
    const shardCount = Math.ceil(Math.max(effectiveRedisQps / 40000, totalMemoryMB / 8000));
    redisTopology = `${shardCount}-Node Redis Cluster with Hash Tags ({tenant_id})`;
  } else if (effectiveRedisQps > 20000 || totalMemoryMB > 4000) {
    redisTopology = 'Standalone Master-Replica Redis with L1 Go/Node In-Memory LRU';
  } else {
    redisTopology = 'Standard Redis Instance (Managed AWS ElastiCache / Redis Cloud)';
  }

  return (
    <div className={styles.calcContainer}>
      <div className={styles.calcHeader}>
        <div className={styles.titleArea}>
          <div className={styles.calcIcon}>🛡️</div>
          <div>
            <h3>Distributed Rate Limiter Sizer</h3>
            <p>Compute Redis memory footprint, network bandwidth, and clustering topology</p>
          </div>
        </div>
        <span className={styles.calcTag}>System Design</span>
      </div>

      <div className={styles.calcGrid}>
        {/* Controls */}
        <div className={styles.controlsSection}>
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Peak API Throughput (QPS)</label>
              <span className={styles.currentValue}>{peakQps.toLocaleString()} req/s</span>
            </div>
            <input
              type="range"
              min={1000}
              max={250000}
              step={1000}
              value={peakQps}
              onChange={(e) => setPeakQps(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Rate Limiting Algorithm</label>
              <span className={styles.currentValue}>
                {algorithm === 'sliding-window'
                  ? 'Sliding Window (Lua ZSet)'
                  : algorithm === 'token-bucket'
                  ? 'Token Bucket (Hash)'
                  : 'Fixed Window (INCR)'}
              </span>
            </div>
            <div className={styles.radioPills}>
              <button
                type="button"
                className={`${styles.radioBtn} ${algorithm === 'sliding-window' ? styles.radioBtnActive : ''}`}
                onClick={() => setAlgorithm('sliding-window')}>
                Sliding Window (Most Accurate)
              </button>
              <button
                type="button"
                className={`${styles.radioBtn} ${algorithm === 'token-bucket' ? styles.radioBtnActive : ''}`}
                onClick={() => setAlgorithm('token-bucket')}>
                Token Bucket (Low Memory)
              </button>
              <button
                type="button"
                className={`${styles.radioBtn} ${algorithm === 'fixed-window' ? styles.radioBtnActive : ''}`}
                onClick={() => setAlgorithm('fixed-window')}>
                Fixed Window
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Active Concurrent Entities (Users / API Keys)</label>
              <span className={styles.currentValue}>{activeUsers.toLocaleString()} Keys</span>
            </div>
            <input
              type="range"
              min={10000}
              max={2000000}
              step={10000}
              value={activeUsers}
              onChange={(e) => setActiveUsers(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Rolling Window Duration</label>
              <span className={styles.currentValue}>{windowSec} Seconds</span>
            </div>
            <div className={styles.radioPills}>
              {[1, 10, 60, 300, 3600].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`${styles.radioBtn} ${windowSec === sec ? styles.radioBtnActive : ''}`}
                  onClick={() => setWindowSec(sec)}>
                  {sec >= 3600 ? `${sec / 3600}h` : sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Two-Tier L1 In-Memory LRU Filter</label>
              <span className={styles.currentValue}>{useL1Cache ? 'Enabled (-80% I/O)' : 'Disabled'}</span>
            </div>
            <div className={styles.radioPills}>
              <button
                type="button"
                className={`${styles.radioBtn} ${useL1Cache ? styles.radioBtnActive : ''}`}
                onClick={() => setUseL1Cache(true)}>
                Enabled (Recommended)
              </button>
              <button
                type="button"
                className={`${styles.radioBtn} ${!useL1Cache ? styles.radioBtnActive : ''}`}
                onClick={() => setUseL1Cache(false)}>
                Pure Redis Only
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultsSection}>
          <div className={styles.mainMetric}>
            <div className={styles.mainMetricLabel}>Redis RAM Required</div>
            <div className={styles.mainMetricValue}>
              {totalMemoryMB > 1024
                ? `${(totalMemoryMB / 1024).toFixed(2)} GB`
                : `${totalMemoryMB.toFixed(0)} MB`}
            </div>
            <div className={styles.mainMetricSub}>Includes 25% jemalloc fragmentation buffer</div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Network I/O</div>
              <div className={styles.detailValue}>{networkBandwidthMBps.toFixed(2)} MB/s</div>
            </div>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Redis Command Load</div>
              <div className={styles.detailValue}>
                {Math.round(effectiveRedisQps).toLocaleString()} ops/s
              </div>
            </div>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Estimated Latency</div>
              <div className={styles.detailValue}>{useL1Cache ? '< 0.5 ms' : '1.2 - 2.5 ms'}</div>
            </div>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Memory / User Key</div>
              <div className={styles.detailValue}>{bytesPerActiveEntity} Bytes</div>
            </div>
          </div>

          {/* Architecture Recommendation */}
          <div className={styles.hardwareBox}>
            <div className={styles.hardwareIcon}>🏗️</div>
            <div>
              <div className={styles.hardwareTitle}>Recommended Deployment Topology</div>
              <div className={styles.hardwareText}>{redisTopology}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

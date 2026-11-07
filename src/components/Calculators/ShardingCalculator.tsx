import React, { useState } from 'react';
import styles from './calculators.module.css';

export default function ShardingCalculator() {
  const [totalRecordsMillion, setTotalRecordsMillion] = useState<number>(250);
  const [rowSizeBytes, setRowSizeBytes] = useState<number>(1024); // 1KB
  const [annualGrowthPct, setAnnualGrowthPct] = useState<number>(30);
  const [maxShardSizeGB, setMaxShardSizeGB] = useState<number>(150); // 150GB per shard
  const [vnodesPerShard, setVnodesPerShard] = useState<number>(150);
  const [replicationFactor, setReplicationFactor] = useState<number>(2);

  // Current volume
  const totalRawBytes = totalRecordsMillion * 1_000_000 * rowSizeBytes;
  const rawDataGB = totalRawBytes / (1024 * 1024 * 1024);
  // Add 40% overhead for indexes (B-Trees, primary keys, toast tables)
  const totalWithIndexesGB = rawDataGB * 1.4;
  
  // Year 1 growth projection
  const projectedYear1GB = totalWithIndexesGB * (1 + annualGrowthPct / 100);

  // Recommended Shards: Based on keeping each shard below maxShardSizeGB at Year 1
  const recommendedShards = Math.max(2, Math.ceil(projectedYear1GB / maxShardSizeGB));
  
  // Total virtual nodes in ring
  const totalVnodes = recommendedShards * vnodesPerShard;

  // RAM Working set recommended per shard (25% buffer pool)
  const ramBufferPerShardGB = Math.max(8, Math.ceil((maxShardSizeGB * 0.25)));

  // Total cluster disk including replication
  const totalClusterDiskTB = (projectedYear1GB * replicationFactor * 1.3) / 1024; // 30% OS/WAL buffer

  return (
    <div className={styles.calcContainer}>
      <div className={styles.calcHeader}>
        <div className={styles.titleArea}>
          <div className={styles.calcIcon}>🌐</div>
          <div>
            <h3>Database Sharding & Ring Capacity Calculator</h3>
            <p>Determine physical shard counts, Ketama virtual nodes, and working-set RAM buffers</p>
          </div>
        </div>
        <span className={styles.calcTag}>Data Architecture</span>
      </div>

      <div className={styles.calcGrid}>
        {/* Controls */}
        <div className={styles.controlsSection}>
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Total Records Target</label>
              <span className={styles.currentValue}>{totalRecordsMillion} Million Rows</span>
            </div>
            <p className={styles.inputHint}>Total row count across sharded entities (orders, users, invoices)</p>
            <input
              type="range"
              min="10"
              max="2000"
              step="10"
              value={totalRecordsMillion}
              onChange={(e) => setTotalRecordsMillion(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Average Row Footprint</label>
              <span className={styles.currentValue}>{rowSizeBytes} Bytes</span>
            </div>
            <p className={styles.inputHint}>Payload size + primary keys (typically 500B to 2KB)</p>
            <input
              type="range"
              min="256"
              max="4096"
              step="128"
              value={rowSizeBytes}
              onChange={(e) => setRowSizeBytes(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Projected Annual Growth</label>
              <span className={styles.currentValue}>+{annualGrowthPct}% / Year</span>
            </div>
            <p className={styles.inputHint}>Anticipated organic write growth rate</p>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={annualGrowthPct}
              onChange={(e) => setAnnualGrowthPct(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Max Target Size Per Shard</label>
              <span className={styles.currentValue}>{maxShardSizeGB} GB</span>
            </div>
            <p className={styles.inputHint}>Keep under 200GB to ensure fast backups and VACUUM runs</p>
            <input
              type="range"
              min="50"
              max="500"
              step="25"
              value={maxShardSizeGB}
              onChange={(e) => setMaxShardSizeGB(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultsSection}>
          <div className={styles.mainMetric}>
            <div className={styles.mainMetricLabel}>Recommended Physical Shards</div>
            <div className={styles.mainMetricValue}>{recommendedShards} Shards</div>
            <div className={styles.mainMetricSub}>
              Holds {projectedYear1GB.toFixed(0)} GB data + indexes across {totalRecordsMillion}M records
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Total Hash Ring Vnodes</div>
              <div className={styles.detailValue}>{totalVnodes}</div>
              <div className={styles.detailSub}>{vnodesPerShard} vnodes/shard (&lt; 2.5% variance)</div>
            </div>

            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Recommended RAM / Shard</div>
              <div className={styles.detailValue}>{ramBufferPerShardGB} GB</div>
              <div className={styles.detailSub}>25% buffer pool for hot index cache</div>
            </div>

            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Current Data + Indexes</div>
              <div className={styles.detailValue}>{totalWithIndexesGB.toFixed(0)} GB</div>
              <div className={styles.detailSub}>Raw: {rawDataGB.toFixed(0)} GB + 40% B-Tree indexes</div>
            </div>

            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Cluster Storage (RF {replicationFactor})</div>
              <div className={styles.detailValue}>{totalClusterDiskTB.toFixed(2)} TB</div>
              <div className={styles.detailSub}>Includes replication + WAL logs</div>
            </div>
          </div>

          <div className={styles.hardwareBox}>
            <div className={styles.hardwareIcon}>💡</div>
            <div>
              <div className={styles.hardwareTitle}>Engineering Rule of Thumb</div>
              <div className={styles.hardwareText}>
                Sharding before vertical capacity hits 500GB is an anti-pattern. Keep individual shards between 100GB to 250GB for rapid point-in-time recovery and zero-lock index creation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

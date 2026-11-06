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
    <div className={styles.calculatorCard}>
      <div className={styles.calcHeader}>
        <div className={styles.calcTitle}>
          <span className={styles.calcIcon}>🌐</span>
          <div>
            <h3>Database Sharding & Ring Capacity Calculator</h3>
            <p>Determine physical shard counts, Ketama virtual nodes, and working-set RAM buffers.</p>
          </div>
        </div>
      </div>

      <div className={styles.calcGrid}>
        {/* Inputs */}
        <div className={styles.inputSection}>
          <div className={styles.inputGroup}>
            <label>
              Total Records Target: <strong>{totalRecordsMillion} Million Rows</strong>
              <span className={styles.inputHint}>Total row count across sharded entities (orders, users, invoices)</span>
            </label>
            <input
              type="range"
              min="10"
              max="2000"
              step="10"
              value={totalRecordsMillion}
              onChange={(e) => setTotalRecordsMillion(Number(e.target.value))}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              Average Row Footprint: <strong>{rowSizeBytes} Bytes</strong>
              <span className={styles.inputHint}>Payload size + primary keys (typically 500B to 2KB)</span>
            </label>
            <input
              type="range"
              min="256"
              max="4096"
              step="128"
              value={rowSizeBytes}
              onChange={(e) => setRowSizeBytes(Number(e.target.value))}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              Projected Annual Growth: <strong>+{annualGrowthPct}% / Year</strong>
              <span className={styles.inputHint}>Anticipated organic write growth rate</span>
            </label>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={annualGrowthPct}
              onChange={(e) => setAnnualGrowthPct(Number(e.target.value))}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              Max Size Target Per Shard: <strong>{maxShardSizeGB} GB</strong>
              <span className={styles.inputHint}>Keep under 200GB to ensure fast backups and VACUUM runs</span>
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="25"
              value={maxShardSizeGB}
              onChange={(e) => setMaxShardSizeGB(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultSection}>
          <div className={styles.mainStat}>
            <span className={styles.statLabel}>Recommended Physical Shards</span>
            <div className={styles.statValue}>
              {recommendedShards} <span className={styles.unit}>Nodes</span>
            </div>
            <span className={styles.statSub}>
              Holds {projectedYear1GB.toFixed(0)} GB data + indexes across {totalRecordsMillion}M records
            </span>
          </div>

          <div className={styles.statGrid}>
            <div className={styles.subStat}>
              <span className={styles.subLabel}>Total Hash Ring Vnodes</span>
              <span className={styles.subValue}>{totalVnodes}</span>
              <span className={styles.subHint}>{vnodesPerShard} vnodes/shard (&lt; 2.5% std dev)</span>
            </div>

            <div className={styles.subStat}>
              <span className={styles.subLabel}>Recommended RAM / Shard</span>
              <span className={styles.subValue}>{ramBufferPerShardGB} GB</span>
              <span className={styles.subHint}>25% buffer pool for hot index cache</span>
            </div>

            <div className={styles.subStat}>
              <span className={styles.subLabel}>Current Data + Indexes</span>
              <span className={styles.subValue}>{totalWithIndexesGB.toFixed(0)} GB</span>
              <span className={styles.subHint}>Raw: {rawDataGB.toFixed(0)} GB + 40% B-Tree indexes</span>
            </div>

            <div className={styles.subStat}>
              <span className={styles.subLabel}>Total Cluster Storage (RF {replicationFactor})</span>
              <span className={styles.subValue}>{totalClusterDiskTB.toFixed(2)} TB</span>
              <span className={styles.subHint}>Includes replication + WAL logs</span>
            </div>
          </div>

          <div className={styles.formulaBox}>
            <strong>Engineering Rule:</strong> Sharding databases before vertical capacity hits 500GB is an anti-pattern. Keep individual shards between 100GB to 250GB for rapid point-in-time recovery and zero-lock index creation.
          </div>
        </div>
      </div>
    </div>
  );
}

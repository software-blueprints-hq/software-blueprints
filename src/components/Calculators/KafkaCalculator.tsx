import React, { useState } from 'react';
import styles from './calculators.module.css';

export default function KafkaCalculator() {
  const [ingressRateMBps, setIngressRateMBps] = useState<number>(50);
  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [replicationFactor, setReplicationFactor] = useState<number>(3);
  const [consumerGroups, setConsumerGroups] = useState<number>(4);
  const [partitionThroughputMBps, setPartitionThroughputMBps] = useState<number>(5);

  // Calculations
  const recommendedPartitions = Math.max(3, Math.ceil(ingressRateMBps / partitionThroughputMBps));
  
  // Storage: Rate * seconds_per_day * days * replication_factor
  const bytesPerDay = ingressRateMBps * 1024 * 1024 * 86400;
  const rawStorageBytes = bytesPerDay * retentionDays;
  const totalReplicatedBytes = rawStorageBytes * replicationFactor;
  // 25% safety headroom for Kafka index, compaction & OS
  const totalDiskWithHeadroomTB = (totalReplicatedBytes * 1.25) / (1024 * 1024 * 1024 * 1024);

  // Network Egress: Ingress * consumer groups
  const egressNetworkMBps = ingressRateMBps * consumerGroups;

  // Minimum Recommended Brokers (must be >= replication factor)
  const recommendedBrokers = Math.max(replicationFactor, Math.ceil(recommendedPartitions / 10));
  const storagePerBrokerTB = totalDiskWithHeadroomTB / recommendedBrokers;

  return (
    <div className={styles.calculatorCard}>
      <div className={styles.calcHeader}>
        <div className={styles.calcTitle}>
          <span className={styles.calcIcon}>⚡</span>
          <div>
            <h3>Kafka Cluster & Partition Sizing Calculator</h3>
            <p>Calculate topic partitions, disk storage capacity with replication, and broker count.</p>
          </div>
        </div>
      </div>

      <div className={styles.calcGrid}>
        {/* Inputs */}
        <div className={styles.inputSection}>
          <div className={styles.inputGroup}>
            <label>
              Ingress Data Throughput: <strong>{ingressRateMBps} MB/s</strong>
              <span className={styles.inputHint}>Peak incoming message volume across topic</span>
            </label>
            <input
              type="range"
              min="1"
              max="500"
              step="5"
              value={ingressRateMBps}
              onChange={(e) => setIngressRateMBps(Number(e.target.value))}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              Message Retention: <strong>{retentionDays} Days</strong>
              <span className={styles.inputHint}>Log segment retention window before deletion</span>
            </label>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              Replication Factor (RF): <strong>{replicationFactor}x</strong>
              <span className={styles.inputHint}>Standard production is 3 (1 leader + 2 ISR followers)</span>
            </label>
            <select
              value={replicationFactor}
              onChange={(e) => setReplicationFactor(Number(e.target.value))}>
              <option value={1}>1x (No fault tolerance - Dev only)</option>
              <option value={2}>2x (Single broker loss tolerance)</option>
              <option value={3}>3x (Production Gold Standard)</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>
              Active Downstream Consumer Groups: <strong>{consumerGroups} Groups</strong>
              <span className={styles.inputHint}>Each group reads a complete copy of the topic stream</span>
            </label>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={consumerGroups}
              onChange={(e) => setConsumerGroups(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultSection}>
          <div className={styles.mainStat}>
            <span className={styles.statLabel}>Total Cluster Storage (+25% Headroom)</span>
            <div className={styles.statValue}>
              {totalDiskWithHeadroomTB.toFixed(2)} <span className={styles.unit}>TB</span>
            </div>
            <span className={styles.statSub}>
              ~{(totalDiskWithHeadroomTB * 1024).toFixed(0)} GB across {retentionDays} days retention
            </span>
          </div>

          <div className={styles.statGrid}>
            <div className={styles.subStat}>
              <span className={styles.subLabel}>Recommended Partitions</span>
              <span className={styles.subValue}>{recommendedPartitions}</span>
              <span className={styles.subHint}>Based on max 5 MB/s per partition</span>
            </div>

            <div className={styles.subStat}>
              <span className={styles.subLabel}>Recommended Brokers</span>
              <span className={styles.subValue}>{recommendedBrokers}</span>
              <span className={styles.subHint}>Brokers &ge; RF {replicationFactor}</span>
            </div>

            <div className={styles.subStat}>
              <span className={styles.subLabel}>Peak Network Egress</span>
              <span className={styles.subValue}>{egressNetworkMBps} MB/s</span>
              <span className={styles.subHint}>{(egressNetworkMBps * 8).toFixed(0)} Mbps network load</span>
            </div>

            <div className={styles.subStat}>
              <span className={styles.subLabel}>Disk Storage Per Broker</span>
              <span className={styles.subValue}>{storagePerBrokerTB.toFixed(2)} TB</span>
              <span className={styles.subHint}>NVMe SSD recommended</span>
            </div>
          </div>

          <div className={styles.formulaBox}>
            <strong>Sizing Rule:</strong> Partitions = <code>ceil(Throughput / 5MBps)</code>. Never over-partition beyond 2,000 partitions per broker, or partition leader rebalance recovery will stall during broker restarts.
          </div>
        </div>
      </div>
    </div>
  );
}

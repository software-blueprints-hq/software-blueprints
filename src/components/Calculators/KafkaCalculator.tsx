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
    <div className={styles.calcContainer}>
      <div className={styles.calcHeader}>
        <div className={styles.titleArea}>
          <div className={styles.calcIcon}>📨</div>
          <div>
            <h3>Kafka Cluster & Partition Sizing Calculator</h3>
            <p>Calculate topic partitions, disk storage capacity with replication, and broker count</p>
          </div>
        </div>
        <span className={styles.calcTag}>Event Streaming</span>
      </div>

      <div className={styles.calcGrid}>
        {/* Controls */}
        <div className={styles.controlsSection}>
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Ingress Data Throughput</label>
              <span className={styles.currentValue}>{ingressRateMBps} MB/s</span>
            </div>
            <p className={styles.inputHint}>Peak incoming message volume across topic</p>
            <input
              type="range"
              min="1"
              max="500"
              step="5"
              value={ingressRateMBps}
              onChange={(e) => setIngressRateMBps(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Message Retention Window</label>
              <span className={styles.currentValue}>{retentionDays} Days</span>
            </div>
            <p className={styles.inputHint}>Log segment retention window before segment deletion</p>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Replication Factor (RF)</label>
              <span className={styles.currentValue}>{replicationFactor}x Replicas</span>
            </div>
            <p className={styles.inputHint}>Standard production is 3 (1 leader + 2 ISR followers)</p>
            <select
              value={replicationFactor}
              onChange={(e) => setReplicationFactor(Number(e.target.value))}
              className={styles.selectInput}>
              <option value={1}>1x (No fault tolerance - Dev only)</option>
              <option value={2}>2x (Single broker loss tolerance)</option>
              <option value={3}>3x (Production Gold Standard)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Active Consumer Groups</label>
              <span className={styles.currentValue}>{consumerGroups} Groups</span>
            </div>
            <p className={styles.inputHint}>Each consumer group reads a full copy of the topic stream</p>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={consumerGroups}
              onChange={(e) => setConsumerGroups(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultsSection}>
          <div className={styles.mainMetric}>
            <div className={styles.mainMetricLabel}>Total Cluster Storage (+25% Headroom)</div>
            <div className={styles.mainMetricValue}>{totalDiskWithHeadroomTB.toFixed(2)} TB</div>
            <div className={styles.mainMetricSub}>
              ~{(totalDiskWithHeadroomTB * 1024).toLocaleString(undefined, { maximumFractionDigits: 0 })} GB across {retentionDays} days retention
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Recommended Partitions</div>
              <div className={styles.detailValue}>{recommendedPartitions}</div>
              <div className={styles.detailSub}>Max 5 MB/s per partition</div>
            </div>

            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Recommended Brokers</div>
              <div className={styles.detailValue}>{recommendedBrokers}</div>
              <div className={styles.detailSub}>Brokers &ge; RF {replicationFactor}</div>
            </div>

            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Peak Network Egress</div>
              <div className={styles.detailValue}>{egressNetworkMBps} MB/s</div>
              <div className={styles.detailSub}>{(egressNetworkMBps * 8).toLocaleString()} Mbps egress load</div>
            </div>

            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Disk Storage Per Broker</div>
              <div className={styles.detailValue}>{storagePerBrokerTB.toFixed(2)} TB</div>
              <div className={styles.detailSub}>NVMe SSD recommended</div>
            </div>
          </div>

          <div className={styles.hardwareBox}>
            <div className={styles.hardwareIcon}>⚙️</div>
            <div>
              <div className={styles.hardwareTitle}>Partition Sizing Rule</div>
              <div className={styles.hardwareText}>
                Partitions = ceil(Throughput / 5MBps). Keep under 2,000 partitions/broker to avoid leader rebalance stalls.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

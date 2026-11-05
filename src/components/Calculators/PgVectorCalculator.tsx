import React, { useState } from 'react';
import styles from './calculators.module.css';

export default function PgVectorCalculator(): JSX.Element {
  const [vectorCount, setVectorCount] = useState<number>(1000000);
  const [dimension, setDimension] = useState<number>(1536);
  const [hnswM, setHnswM] = useState<number>(16);
  const [metadataKb, setMetadataKb] = useState<number>(2.0);

  // 1. Raw Vector Size (Float32 = 4 bytes per dimension)
  const vectorBytesPerRecord = dimension * 4;
  const rawVectorSizeGB = (vectorCount * vectorBytesPerRecord) / (1024 * 1024 * 1024);

  // 2. HNSW Index Size in RAM
  // HNSW stores neighbor links. Memory ~ vectorCount * (vectorBytes + (2 * m * 4 bytes for neighbor pointers) + 32 bytes overhead)
  const hnswBytesPerVector = vectorBytesPerRecord + hnswM * 2 * 4 + 32;
  const hnswIndexSizeGB = (vectorCount * hnswBytesPerVector * 1.15) / (1024 * 1024 * 1024);

  // 3. Metadata & Document Chunk Table Storage
  const metadataSizeGB = (vectorCount * metadataKb * 1024) / (1024 * 1024 * 1024);

  // Total Disk Footprint (Heap + Index + Toast)
  const totalDiskGB = rawVectorSizeGB + hnswIndexSizeGB + metadataSizeGB;

  // Recommended RAM (Index must fit in shared_buffers / page cache for fast HNSW search)
  const recommendedRamGB = Math.ceil(hnswIndexSizeGB * 1.5 + 4);

  // Postgres Instance Recommendation
  let recommendedInstance = '';
  if (recommendedRamGB <= 8) {
    recommendedInstance = 'AWS db.r6g.large (2 vCPU, 16GB RAM) or Neon 4 CU';
  } else if (recommendedRamGB <= 28) {
    recommendedInstance = 'AWS db.r6g.xlarge (4 vCPU, 32GB RAM) or Supabase Pro 4XL';
  } else if (recommendedRamGB <= 60) {
    recommendedInstance = 'AWS db.r6g.2xlarge (8 vCPU, 64GB RAM) with NVMe gp3';
  } else if (recommendedRamGB <= 120) {
    recommendedInstance = 'AWS db.r6g.4xlarge (16 vCPU, 128GB RAM) with IO2';
  } else {
    recommendedInstance = 'Distributed Qdrant / Milvus Cluster with Tiered NVMe offloading';
  }

  return (
    <div className={styles.calcContainer}>
      <div className={styles.calcHeader}>
        <div className={styles.titleArea}>
          <div className={styles.calcIcon}>🧠</div>
          <div>
            <h3>pgvector HNSW RAM & Disk Sizer</h3>
            <p>Compute HNSW graph index memory requirements, shared_buffers, and database storage</p>
          </div>
        </div>
        <span className={styles.calcTag}>RAG & Vectors</span>
      </div>

      <div className={styles.calcGrid}>
        {/* Controls */}
        <div className={styles.controlsSection}>
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Total Indexed Vectors</label>
              <span className={styles.currentValue}>{vectorCount.toLocaleString()} Records</span>
            </div>
            <input
              type="range"
              min={50000}
              max={10000000}
              step={50000}
              value={vectorCount}
              onChange={(e) => setVectorCount(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Vector Embedding Dimensions</label>
              <span className={styles.currentValue}>{dimension} Dimensions</span>
            </div>
            <div className={styles.radioPills}>
              {[
                { dim: 384, label: '384 (MiniLM / BGE)' },
                { dim: 768, label: '768 (Nomic / BERT)' },
                { dim: 1536, label: '1536 (OpenAI Small)' },
                { dim: 3072, label: '3072 (OpenAI Large)' },
              ].map((item) => (
                <button
                  key={item.dim}
                  type="button"
                  className={`${styles.radioBtn} ${dimension === item.dim ? styles.radioBtnActive : ''}`}
                  onClick={() => setDimension(item.dim)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>HNSW Graph Connectivity (m)</label>
              <span className={styles.currentValue}>m = {hnswM}</span>
            </div>
            <div className={styles.radioPills}>
              {[16, 24, 32, 64].map((mVal) => (
                <button
                  key={mVal}
                  type="button"
                  className={`${styles.radioBtn} ${hnswM === mVal ? styles.radioBtnActive : ''}`}
                  onClick={() => setHnswM(mVal)}>
                  m = {mVal} {mVal === 16 ? '(Standard)' : mVal === 64 ? '(High Recall)' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Chunk Metadata / Document Text per Row</label>
              <span className={styles.currentValue}>{metadataKb} KB</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={16.0}
              step={0.5}
              value={metadataKb}
              onChange={(e) => setMetadataKb(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultsSection}>
          <div className={styles.mainMetric}>
            <div className={styles.mainMetricLabel}>Dedicated RAM for HNSW Index</div>
            <div className={styles.mainMetricValue}>{hnswIndexSizeGB.toFixed(1)} GB</div>
            <div className={styles.mainMetricSub}>Must fit in RAM for sub-5ms retrieval speed</div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Raw Vectors (Float32)</div>
              <div className={styles.detailValue}>{rawVectorSizeGB.toFixed(1)} GB</div>
            </div>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Metadata & Text Storage</div>
              <div className={styles.detailValue}>{metadataSizeGB.toFixed(1)} GB</div>
            </div>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Total Database Disk</div>
              <div className={styles.detailValue}>{totalDiskGB.toFixed(1)} GB</div>
            </div>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>maintenance_work_mem</div>
              <div className={styles.detailValue}>
                {Math.min(16, Math.max(2, Math.ceil(hnswIndexSizeGB * 0.4)))} GB
              </div>
            </div>
          </div>

          {/* Architecture Recommendation */}
          <div className={styles.hardwareBox}>
            <div className={styles.hardwareIcon}>🐘</div>
            <div>
              <div className={styles.hardwareTitle}>Recommended PostgreSQL Sizing</div>
              <div className={styles.hardwareText}>{recommendedInstance}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

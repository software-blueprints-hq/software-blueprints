import React, { useState } from 'react';
import styles from './calculators.module.css';

interface ModelPreset {
  name: string;
  paramsB: number;
  layers: number;
  kvHeads: number;
  headDim: number;
}

const PRESETS: Record<string, ModelPreset> = {
  'llama-3-8b': { name: 'Llama 3 / 3.1 (8B)', paramsB: 8.0, layers: 32, kvHeads: 8, headDim: 128 },
  'mistral-7b': { name: 'Mistral 7B v0.3', paramsB: 7.2, layers: 32, kvHeads: 8, headDim: 128 },
  'qwen-2.5-14b': { name: 'Qwen 2.5 (14B)', paramsB: 14.7, layers: 48, kvHeads: 8, headDim: 128 },
  'qwen-2.5-32b': { name: 'Qwen 2.5 (32B)', paramsB: 32.5, layers: 64, kvHeads: 8, headDim: 128 },
  'llama-3-70b': { name: 'Llama 3 / 3.1 (70B)', paramsB: 70.6, layers: 80, kvHeads: 8, headDim: 128 },
  'llama-3-405b': { name: 'Llama 3.1 (405B)', paramsB: 405.0, layers: 126, kvHeads: 8, headDim: 128 },
};

export default function VLLMCalculator(): JSX.Element {
  const [selectedPreset, setSelectedPreset] = useState<string>('llama-3-8b');
  const [quantization, setQuantization] = useState<'fp16' | 'fp8' | 'int4'>('fp16');
  const [contextLen, setContextLen] = useState<number>(8192);
  const [maxConcurrency, setMaxConcurrency] = useState<number>(16);
  const [kvPrecision, setKvPrecision] = useState<'fp16' | 'fp8'>('fp16');

  const model = PRESETS[selectedPreset];

  // 1. Model Weights Memory (GB)
  let bytesPerParam = 2.0; // fp16
  if (quantization === 'fp8') bytesPerParam = 1.0;
  if (quantization === 'int4') bytesPerParam = 0.55;

  const weightsMemoryGB = model.paramsB * bytesPerParam;

  // 2. KV Cache Memory (GB)
  // KV size per token per request = 2 (key+value) * layers * kvHeads * headDim * bytesPerElement
  const bytesPerKvElement = kvPrecision === 'fp8' ? 1 : 2;
  const kvBytesPerToken = 2 * model.layers * model.kvHeads * model.headDim * bytesPerKvElement;
  const totalTokens = contextLen * maxConcurrency;
  const kvCacheMemoryGB = (kvBytesPerToken * totalTokens) / (1024 * 1024 * 1024);

  // 3. CUDA Runtime & PagedAttention Metadata Overhead (~15% of weights or min 2GB)
  const overheadGB = Math.max(2.0, weightsMemoryGB * 0.15);

  const totalVramGB = weightsMemoryGB + kvCacheMemoryGB + overheadGB;

  // GPU Hardware Recommendation
  let recommendedGpu = '';
  let tensorParallel = 1;

  if (totalVramGB <= 22) {
    recommendedGpu = '1x NVIDIA RTX 4090 (24GB) or 1x A10G (24GB)';
    tensorParallel = 1;
  } else if (totalVramGB <= 44) {
    recommendedGpu = '1x NVIDIA A100 (40GB) or 2x RTX 4090 (24GB)';
    tensorParallel = 2;
  } else if (totalVramGB <= 75) {
    recommendedGpu = '1x NVIDIA A100 / H100 (80GB)';
    tensorParallel = 1;
  } else if (totalVramGB <= 150) {
    recommendedGpu = '2x NVIDIA A100 / H100 (80GB) with TP=2';
    tensorParallel = 2;
  } else if (totalVramGB <= 300) {
    recommendedGpu = '4x NVIDIA H100 (80GB) with TP=4';
    tensorParallel = 4;
  } else {
    recommendedGpu = '8x NVIDIA H100 (80GB) with TP=8 (Full Node)';
    tensorParallel = 8;
  }

  // Segment percentages for visual bar
  const pctWeights = Math.min(100, (weightsMemoryGB / totalVramGB) * 100);
  const pctKv = Math.min(100, (kvCacheMemoryGB / totalVramGB) * 100);
  const pctOverhead = Math.max(0, 100 - pctWeights - pctKv);

  return (
    <div className={styles.calcContainer}>
      <div className={styles.calcHeader}>
        <div className={styles.titleArea}>
          <div className={styles.calcIcon}>⚡</div>
          <div>
            <h3>vLLM GPU VRAM & KV-Cache Sizer</h3>
            <p>Compute exact GPU requirements, PagedAttention capacity, and Tensor Parallelism</p>
          </div>
        </div>
        <span className={styles.calcTag}>ML & Inference</span>
      </div>

      <div className={styles.calcGrid}>
        {/* Controls */}
        <div className={styles.controlsSection}>
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Target Model Architecture</label>
              <span className={styles.currentValue}>{model.paramsB}B Params</span>
            </div>
            <select
              className={styles.selectInput}
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}>
              {Object.entries(PRESETS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.name} ({p.paramsB}B)
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Weight Quantization</label>
              <span className={styles.currentValue}>{quantization.toUpperCase()}</span>
            </div>
            <div className={styles.radioPills}>
              <button
                type="button"
                className={`${styles.radioBtn} ${quantization === 'fp16' ? styles.radioBtnActive : ''}`}
                onClick={() => setQuantization('fp16')}>
                FP16 / BF16 (16-bit)
              </button>
              <button
                type="button"
                className={`${styles.radioBtn} ${quantization === 'fp8' ? styles.radioBtnActive : ''}`}
                onClick={() => setQuantization('fp8')}>
                FP8 (8-bit Hopper)
              </button>
              <button
                type="button"
                className={`${styles.radioBtn} ${quantization === 'int4' ? styles.radioBtnActive : ''}`}
                onClick={() => setQuantization('int4')}>
                INT4 (AWQ / GPTQ)
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Context Window Length</label>
              <span className={styles.currentValue}>{contextLen.toLocaleString()} Tokens</span>
            </div>
            <input
              type="range"
              min={2048}
              max={131072}
              step={2048}
              value={contextLen}
              onChange={(e) => setContextLen(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Max Concurrent Requests</label>
              <span className={styles.currentValue}>{maxConcurrency} Streams</span>
            </div>
            <input
              type="range"
              min={1}
              max={128}
              step={1}
              value={maxConcurrency}
              onChange={(e) => setMaxConcurrency(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>KV-Cache Precision</label>
              <span className={styles.currentValue}>{kvPrecision.toUpperCase()}</span>
            </div>
            <div className={styles.radioPills}>
              <button
                type="button"
                className={`${styles.radioBtn} ${kvPrecision === 'fp16' ? styles.radioBtnActive : ''}`}
                onClick={() => setKvPrecision('fp16')}>
                FP16 (Standard)
              </button>
              <button
                type="button"
                className={`${styles.radioBtn} ${kvPrecision === 'fp8' ? styles.radioBtnActive : ''}`}
                onClick={() => setKvPrecision('fp8')}>
                FP8 KV Cache (-50% VRAM)
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultsSection}>
          <div className={styles.mainMetric}>
            <div className={styles.mainMetricLabel}>Total Required VRAM</div>
            <div className={styles.mainMetricValue}>{totalVramGB.toFixed(1)} GB</div>
            <div className={styles.mainMetricSub}>Minimum dedicated GPU memory needed</div>
          </div>

          {/* Visual Breakdown Bar */}
          <div className={styles.breakdownContainer}>
            <div className={styles.breakdownTitle}>VRAM Allocation Breakdown</div>
            <div className={styles.segmentedBar}>
              <div
                className={styles.segmentWeights}
                style={{ width: `${pctWeights}%` }}
                title={`Weights: ${weightsMemoryGB.toFixed(1)} GB`}
              />
              <div
                className={styles.segmentKv}
                style={{ width: `${pctKv}%` }}
                title={`KV Cache: ${kvCacheMemoryGB.toFixed(1)} GB`}
              />
              <div
                className={styles.segmentOverhead}
                style={{ width: `${pctOverhead}%` }}
                title={`Overhead: ${overheadGB.toFixed(1)} GB`}
              />
            </div>
            <div className={styles.legendRow}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#00f0ff' }} />
                <span>Weights ({weightsMemoryGB.toFixed(1)} GB)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#a855f7' }} />
                <span>KV Cache ({kvCacheMemoryGB.toFixed(1)} GB)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#10b981' }} />
                <span>Overhead ({overheadGB.toFixed(1)} GB)</span>
              </div>
            </div>
          </div>

          {/* Detailed Specs */}
          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>KV Cache / Token</div>
              <div className={styles.detailValue}>{(kvBytesPerToken / 1024).toFixed(1)} KB</div>
            </div>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Tensor Parallelism</div>
              <div className={styles.detailValue}>TP = {tensorParallel}</div>
            </div>
          </div>

          {/* Hardware Recommendation */}
          <div className={styles.hardwareBox}>
            <div className={styles.hardwareIcon}>🖥️</div>
            <div>
              <div className={styles.hardwareTitle}>Recommended Cluster Spec</div>
              <div className={styles.hardwareText}>{recommendedGpu}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

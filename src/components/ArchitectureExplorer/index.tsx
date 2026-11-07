import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import {
  SYSTEM_ARCHITECTURES,
  SystemArchitecture,
  ArchitectureComponent,
  FailureSimulation
} from '../../data/architectureExplorerData';
import styles from './index.module.css';

interface ArchitectureExplorerProps {
  initialSystemId?: string;
}

export default function ArchitectureExplorer({ initialSystemId }: ArchitectureExplorerProps): JSX.Element {
  const [selectedSystemId, setSelectedSystemId] = useState<string>(
    initialSystemId || SYSTEM_ARCHITECTURES[0].id
  );
  
  const currentSystem: SystemArchitecture =
    SYSTEM_ARCHITECTURES.find((s) => s.id === selectedSystemId) || SYSTEM_ARCHITECTURES[0];

  const [selectedComponentId, setSelectedComponentId] = useState<string>(
    currentSystem.components[0].id
  );

  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'io' | 'metrics' | 'failure' | 'code'>('overview');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Switch system handler
  const handleSystemChange = (id: string) => {
    setSelectedSystemId(id);
    const targetSys = SYSTEM_ARCHITECTURES.find((s) => s.id === id) || SYSTEM_ARCHITECTURES[0];
    setSelectedComponentId(targetSys.components[0].id);
    setActiveSimulationId(null);
  };

  const selectedComponent: ArchitectureComponent =
    currentSystem.components.find((c) => c.id === selectedComponentId) ||
    currentSystem.components[0];

  const activeSimulation: FailureSimulation | undefined = currentSystem.failureSimulations.find(
    (f) => f.id === activeSimulationId
  );

  const handleCopyCode = () => {
    if (selectedComponent?.codeSnippet?.code) {
      navigator.clipboard.writeText(selectedComponent.codeSnippet.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. System Architecture Selector Pills */}
      <div className={styles.systemNav}>
        {SYSTEM_ARCHITECTURES.map((sys) => {
          const isActive = sys.id === currentSystem.id;
          return (
            <button
              key={sys.id}
              className={`${styles.systemPill} ${isActive ? styles.systemPillActive : ''}`}
              onClick={() => handleSystemChange(sys.id)}
            >
              <span className={styles.systemPillTitle}>{sys.title}</span>
              <span className={styles.systemPillTag}>{sys.tag}</span>
            </button>
          );
        })}
      </div>

      {/* 2. System Meta Banner */}
      <div className={styles.systemHeader}>
        <div className={styles.systemMeta}>
          <div className={styles.systemTitle}>
            {currentSystem.title}
            <span className={styles.categoryBadge}>{currentSystem.category}</span>
          </div>
          <p className={styles.systemDesc}>{currentSystem.shortDesc}</p>
        </div>
        <div className={styles.sloBadge}>
          <span className={styles.sloLabel}>Production Target SLO</span>
          <span className={styles.sloValue}>{currentSystem.targetSLO}</span>
        </div>
      </div>

      {/* 3. Chaos / Failure Mode Simulator Bar */}
      <div className={styles.simulatorBar}>
        <div className={styles.simLabel}>
          <span>⚡ Failure Simulator:</span>
        </div>
        <div className={styles.simButtons}>
          <button
            className={`${styles.simBtn} ${activeSimulationId === null ? styles.simBtnReset : ''}`}
            onClick={() => setActiveSimulationId(null)}
          >
            🟢 Normal Operation
          </button>
          {currentSystem.failureSimulations.map((sim) => {
            const isSimActive = activeSimulationId === sim.id;
            return (
              <button
                key={sim.id}
                className={`${styles.simBtn} ${isSimActive ? styles.simBtnActive : ''}`}
                onClick={() => {
                  setActiveSimulationId(sim.id);
                  setSelectedComponentId(sim.failedComponentId);
                }}
              >
                💥 {sim.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Failure Diagnostic Card (When Chaos is triggered) */}
      {activeSimulation && (
        <div className={styles.incidentBanner}>
          <div className={styles.incidentHeader}>
            <div className={styles.incidentTitle}>
              <span>⚠️ Active Simulated Outage:</span> {activeSimulation.label}
            </div>
            <span className={styles.incidentAlert}>{activeSimulation.prometheusAlert}</span>
          </div>
          <div className={styles.incidentGrid}>
            <div className={styles.incidentBox}>
              <div className={styles.incidentLabel}>Fault Trigger</div>
              <p className={styles.incidentText}>{activeSimulation.triggerDescription}</p>
            </div>
            <div className={styles.incidentBox}>
              <div className={styles.incidentLabel}>System Impact &amp; Containment</div>
              <p className={styles.incidentText}>{activeSimulation.impactSummary}</p>
            </div>
            <div className={styles.incidentBox}>
              <div className={styles.incidentLabel}>Resilience Mechanism</div>
              <p className={styles.incidentText}>{activeSimulation.resilienceMechanism}</p>
            </div>
            <div className={styles.incidentBox}>
              <div className={styles.incidentLabel}>SRE Runbook Command</div>
              <code style={{ fontSize: '0.75rem', color: '#c084fc' }}>{activeSimulation.recoveryProcedure}</code>
            </div>
          </div>

          {/* Production Failure Laboratory Timeline */}
          {activeSimulation.timelineSteps && activeSimulation.timelineSteps.length > 0 && (
            <div className={styles.timelineLaboratory}>
              <h4 className={styles.timelineLabTitle}>
                🔬 Incident Laboratory: Real-Time State Transition Timeline
              </h4>
              <div className={styles.timelineStepper}>
                {activeSimulation.timelineSteps.map((step, idx) => (
                  <div key={idx} className={styles.timelineStepCard}>
                    <div className={styles.timelineStepTop}>
                      <span className={styles.timelineOffsetBadge}>{step.timeOffset}</span>
                      <span className={`${styles.timelinePhaseBadge} ${styles['phase_' + step.phase]}`}>
                        {step.phase.replace('_', ' ')}
                      </span>
                    </div>
                    <h5 className={styles.timelineStepTitle}>{step.eventTitle}</h5>
                    <p className={styles.timelineStepAction}>{step.systemAction}</p>
                    <div className={styles.timelineStepTelemetry}>
                      <span className={styles.telemetryLabel}>Telemetry:</span> {step.activeTelemetry}
                    </div>
                    {step.residualRisk && (
                      <div className={styles.timelineStepRisk}>
                        <span className={styles.riskLabel}>Residual Risk:</span> {step.residualRisk}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Interactive Topology Map */}
      <div className={styles.topologySection}>
        <div className={styles.topologyHeader}>
          <span>Interactive Component Topology</span>
          <span className={styles.topologyHint}>Click any component below to inspect inputs, outputs, failure modes &amp; code</span>
        </div>

        <div className={styles.nodesFlow}>
          {currentSystem.components.map((comp) => {
            const isSelected = comp.id === selectedComponent.id;
            const isFailed = activeSimulation?.failedComponentId === comp.id;
            const isDegraded = activeSimulation?.degradedComponentIds?.includes(comp.id);
            const isSurviving = activeSimulation && !isFailed && !isDegraded;

            let cardStateClass = '';
            if (isFailed) cardStateClass = styles.nodeCardFailed;
            else if (isDegraded) cardStateClass = styles.nodeCardDegraded;
            else if (isSurviving) cardStateClass = styles.nodeCardSurviving;

            return (
              <div
                key={comp.id}
                className={`${styles.nodeCard} ${isSelected ? styles.nodeCardSelected : ''} ${cardStateClass}`}
                onClick={() => setSelectedComponentId(comp.id)}
              >
                <div className={styles.nodeHeader}>
                  <h4 className={styles.nodeName}>{comp.name}</h4>
                  {isFailed && <span className={`${styles.nodeStatusBadge} ${styles.badgeFailed}`}>Offline</span>}
                  {isDegraded && <span className={`${styles.nodeStatusBadge} ${styles.badgeDegraded}`}>Degraded</span>}
                  {isSurviving && <span className={`${styles.nodeStatusBadge} ${styles.badgeHealthy}`}>Shielded</span>}
                </div>
                <span className={styles.nodeBadge}>{comp.badge}</span>
                <p className={styles.nodeDesc}>{comp.responsibility}</p>
                <div className={styles.nodeFooter}>
                  <span>{comp.category}</span>
                  <span className={styles.nodeThroughput}>{comp.metrics.throughput}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Deep Component Inspector Panel */}
      <div className={styles.inspectorCard}>
        <div className={styles.inspectorHeader}>
          <div className={styles.inspectorTitleGroup}>
            <h3 className={styles.inspectorTitle}>
              {selectedComponent.name}
              <span className={styles.categoryBadge}>{selectedComponent.badge}</span>
            </h3>
            <span className={styles.inspectorSub}>{selectedComponent.responsibility}</span>
          </div>

          <Link to={selectedComponent.blueprintUrl} className={styles.blueprintLinkBtn}>
            Open {selectedComponent.blueprintTitle} →
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📋 Responsibilities &amp; SLOs
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'io' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('io')}
          >
            🔄 Ingress &amp; Egress I/O
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'metrics' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            📊 Latency &amp; Capacity Budgets
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'failure' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('failure')}
          >
            🛡️ Failure Modes &amp; Runbooks
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'code' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('code')}
          >
            💻 Production Code / Config
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === 'overview' && (
            <div>
              <p style={{ color: '#e2e8f0', lineHeight: 1.6 }}>{selectedComponent.responsibility}</p>
              <div className={styles.metricsGrid} style={{ marginTop: '1rem' }}>
                <div className={styles.metricCard}>
                  <span className={styles.metricTitle}>Target Throughput</span>
                  <span className={styles.metricValue}>{selectedComponent.metrics.throughput}</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricTitle}>Latency SLA</span>
                  <span className={styles.metricValue}>{selectedComponent.metrics.latency}</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricTitle}>Resource Sizing / Topology</span>
                  <span className={styles.metricValue}>{selectedComponent.metrics.memoryOrScale}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'io' && (
            <div>
              <h4 style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.5rem' }}>Ingress Inputs</h4>
              <table className={styles.ioTable}>
                <thead>
                  <tr>
                    <th>Protocol</th>
                    <th>Description</th>
                    <th>Payload / Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedComponent.inputs.map((inp, idx) => (
                    <tr key={idx}>
                      <td><span className={styles.protocolPill}>{inp.protocol}</span></td>
                      <td>{inp.description}</td>
                      <td><code>{inp.payloadOrFormat}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ fontSize: '0.9rem', color: '#c084fc', margin: '1.25rem 0 0.5rem 0' }}>Egress Outputs</h4>
              <table className={styles.ioTable}>
                <thead>
                  <tr>
                    <th>Protocol</th>
                    <th>Description</th>
                    <th>Payload / Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedComponent.outputs.map((outp, idx) => (
                    <tr key={idx}>
                      <td><span className={styles.protocolPill}>{outp.protocol}</span></td>
                      <td>{outp.description}</td>
                      <td><code>{outp.payloadOrFormat}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <span className={styles.metricTitle}>Ingress / Processing Throughput</span>
                <span className={styles.metricValue}>{selectedComponent.metrics.throughput}</span>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricTitle}>P95 / P99 Latency Target</span>
                <span className={styles.metricValue}>{selectedComponent.metrics.latency}</span>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricTitle}>Memory &amp; Scale Profile</span>
                <span className={styles.metricValue}>{selectedComponent.metrics.memoryOrScale}</span>
              </div>
            </div>
          )}

          {activeTab === 'failure' && (
            <table className={styles.ioTable}>
              <thead>
                <tr>
                  <th>Failure Scenario</th>
                  <th>System Behavior</th>
                  <th>Blast Radius</th>
                  <th>Mitigation &amp; Runbook</th>
                </tr>
              </thead>
              <tbody>
                {selectedComponent.failureScenarios.map((fail, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#f43f5e' }}>{fail.scenario}</td>
                    <td>{fail.systemBehavior}</td>
                    <td><span style={{ color: '#fbbf24' }}>{fail.blastRadius}</span></td>
                    <td>
                      <div><strong>Mitigation:</strong> {fail.mitigation}</div>
                      <div style={{ marginTop: '4px' }}>
                        <code style={{ fontSize: '0.75rem', color: '#c084fc' }}>{fail.runbook}</code>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'code' && selectedComponent.codeSnippet && (
            <div>
              <div className={styles.codeHeader}>
                <span>{selectedComponent.codeSnippet.title} ({selectedComponent.codeSnippet.language})</span>
                <button
                  onClick={handleCopyCode}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: copiedCode ? '#34d399' : '#cbd5e1',
                    borderRadius: '4px',
                    padding: '3px 10px',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  {copiedCode ? '✓ Copied' : 'Copy Code'}
                </button>
              </div>
              <pre className={styles.codeBox}>
                <code>{selectedComponent.codeSnippet.code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

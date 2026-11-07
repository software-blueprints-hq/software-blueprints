import React, { useState, useMemo } from 'react';
import {
  READINESS_ITEMS,
  READINESS_PRESETS,
  ReadinessItem,
  SystemPreset,
  SeverityLevel
} from '../../data/readinessChecklistData';
import styles from './index.module.css';

interface ReadinessChecklistProps {
  initialPresetId?: string;
}

export default function ReadinessChecklist({ initialPresetId }: ReadinessChecklistProps): JSX.Element {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId || 'all');
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'P0_BLOCKER' | 'P1_CRITICAL'>('ALL');
  const [exportedMarkdown, setExportedMarkdown] = useState<boolean>(false);

  const currentPreset: SystemPreset =
    READINESS_PRESETS.find((p) => p.id === selectedPresetId) || READINESS_PRESETS[0];

  // Filter items for current preset
  const applicableItems: ReadinessItem[] = useMemo(() => {
    return READINESS_ITEMS.filter((item) => {
      if (selectedPresetId === 'all') return true;
      return item.applicablePresets.includes(selectedPresetId) || item.applicablePresets.includes('all');
    });
  }, [selectedPresetId]);

  // Compute weighted readiness score
  const { scorePercent, tier, p0Total, p0Passed } = useMemo(() => {
    let maxScore = 0;
    let earnedScore = 0;
    let p0Count = 0;
    let p0Checked = 0;

    applicableItems.forEach((item) => {
      let weight = 1;
      if (item.severity === 'P0_BLOCKER') {
        weight = 4;
        p0Count++;
        if (checkedItemIds.has(item.id)) p0Checked++;
      } else if (item.severity === 'P1_CRITICAL') {
        weight = 2;
      }
      maxScore += weight;
      if (checkedItemIds.has(item.id)) {
        earnedScore += weight;
      }
    });

    const percent = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;
    let currentTier: 'VALIDATED' | 'IMPLEMENTABLE' | 'BLOCKED' = 'BLOCKED';
    if (percent >= 90 && p0Checked === p0Count) {
      currentTier = 'VALIDATED';
    } else if (percent >= 60) {
      currentTier = 'IMPLEMENTABLE';
    }

    return {
      scorePercent: percent,
      tier: currentTier,
      p0Total: p0Count,
      p0Passed: p0Checked
    };
  }, [applicableItems, checkedItemIds]);

  const toggleItem = (id: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(applicableItems.map((i) => i.id));
    setCheckedItemIds(allIds);
  };

  const handleReset = () => {
    setCheckedItemIds(new Set());
  };

  const handleExportMarkdown = () => {
    let md = `# Production Readiness Audit Report: ${currentPreset.name}\n\n`;
    md += `**Target SLO:** ${currentPreset.targetSLO}\n`;
    md += `**Readiness Score:** ${scorePercent}% (${tier})\n`;
    md += `**P0 Blockers Cleared:** ${p0Passed} / ${p0Total}\n\n`;
    md += `## Sign-Off Checklist\n\n`;

    applicableItems.forEach((item) => {
      const isChecked = checkedItemIds.has(item.id);
      const mark = isChecked ? '[x]' : '[ ]';
      md += `- ${mark} **[${item.severity}] ${item.title}**\n`;
      md += `  - *Requirement:* ${item.verificationQuestion}\n`;
      md += `  - *Action:* ${item.remediationAction}\n\n`;
    });

    navigator.clipboard.writeText(md);
    setExportedMarkdown(true);
    setTimeout(() => setExportedMarkdown(false), 2500);
  };

  // Group items by category
  const categories = useMemo(() => {
    const map = new Map<string, ReadinessItem[]>();
    applicableItems.forEach((item) => {
      if (severityFilter !== 'ALL' && item.severity !== severityFilter) return;
      if (!map.has(item.category)) {
        map.set(item.category, []);
      }
      map.get(item.category)!.push(item);
    });
    return Array.from(map.entries());
  }, [applicableItems, severityFilter]);

  return (
    <div className={styles.container}>
      {/* 1. Preset Selector Pills */}
      <div className={styles.presetNav}>
        {READINESS_PRESETS.map((preset) => {
          const isActive = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              className={`${styles.presetPill} ${isActive ? styles.presetPillActive : ''}`}
              onClick={() => {
                setSelectedPresetId(preset.id);
                setCheckedItemIds(new Set());
              }}
            >
              <span className={styles.presetTitle}>{preset.name}</span>
              <span className={styles.presetTag}>{preset.targetSLO}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Score Summary Card */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreLeft}>
          <h3 className={styles.scoreTitle}>
            {currentPreset.name}
            {tier === 'VALIDATED' && <span className={`${styles.tierBadge} ${styles.tierValidated}`}>🟢 Production Validated</span>}
            {tier === 'IMPLEMENTABLE' && <span className={`${styles.tierBadge} ${styles.tierImplementable}`}>🟡 Implementable with Risks</span>}
            {tier === 'BLOCKED' && <span className={`${styles.tierBadge} ${styles.tierBlocked}`}>🔴 Deployment Blocked</span>}
          </h3>
          <p className={styles.scoreDesc}>{currentPreset.description}</p>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', marginTop: '0.25rem' }}>
            <span><strong>Target SLO:</strong> {currentPreset.targetSLO}</span>
            <span><strong>P0 Blockers:</strong> {p0Passed} / {p0Total} Cleared</span>
          </div>
        </div>

        <div className={styles.scoreRingGroup}>
          <div className={styles.scoreRing} style={{
            borderColor: tier === 'VALIDATED' ? '#10b981' : tier === 'IMPLEMENTABLE' ? '#f59e0b' : '#f43f5e'
          }}>
            <span className={styles.scorePercent} style={{
              color: tier === 'VALIDATED' ? '#10b981' : tier === 'IMPLEMENTABLE' ? '#f59e0b' : '#f43f5e'
            }}>
              {scorePercent}%
            </span>
            <span className={styles.scoreSub}>Readiness</span>
          </div>
        </div>
      </div>

      {/* 3. Action & Filter Bar */}
      <div className={styles.actionBar}>
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterBtn} ${severityFilter === 'ALL' ? styles.filterBtnActive : ''}`}
            onClick={() => setSeverityFilter('ALL')}
          >
            All Items ({applicableItems.length})
          </button>
          <button
            className={`${styles.filterBtn} ${severityFilter === 'P0_BLOCKER' ? styles.filterBtnActive : ''}`}
            onClick={() => setSeverityFilter('P0_BLOCKER')}
          >
            P0 Blockers ({applicableItems.filter((i) => i.severity === 'P0_BLOCKER').length})
          </button>
          <button
            className={`${styles.filterBtn} ${severityFilter === 'P1_CRITICAL' ? styles.filterBtnActive : ''}`}
            onClick={() => setSeverityFilter('P1_CRITICAL')}
          >
            P1 Critical ({applicableItems.filter((i) => i.severity === 'P1_CRITICAL').length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={styles.filterBtn} onClick={handleSelectAll}>
            Check All
          </button>
          <button className={styles.filterBtn} onClick={handleReset}>
            Reset
          </button>
          <button className={styles.exportBtn} onClick={handleExportMarkdown}>
            {exportedMarkdown ? '✓ Copied PR Checklist' : '📋 Export PR Checklist'}
          </button>
        </div>
      </div>

      {/* 4. Categorized Audit Checklist */}
      <div className={styles.checklistGroup}>
        {categories.map(([category, items]) => {
          const catChecked = items.filter((i) => checkedItemIds.has(i.id)).length;
          return (
            <div key={category}>
              <div className={styles.categoryHeader}>
                <span>{category}</span>
                <span className={styles.categoryCount}>
                  {catChecked} / {items.length} Verified
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {items.map((item) => {
                  const isChecked = checkedItemIds.has(item.id);
                  let badgeClass = styles.badgeP2;
                  if (item.severity === 'P0_BLOCKER') badgeClass = styles.badgeP0;
                  else if (item.severity === 'P1_CRITICAL') badgeClass = styles.badgeP1;

                  return (
                    <div
                      key={item.id}
                      className={`${styles.itemCard} ${isChecked ? styles.itemCardChecked : ''}`}
                    >
                      <div className={styles.itemHeader} onClick={() => toggleItem(item.id)}>
                        <div className={`${styles.checkbox} ${isChecked ? styles.checkboxChecked : ''}`}>
                          {isChecked && '✓'}
                        </div>
                        <div className={styles.itemTitleGroup}>
                          <div className={styles.itemTitleRow}>
                            <h4 className={styles.itemTitle}>{item.title}</h4>
                            <span className={`${styles.severityBadge} ${badgeClass}`}>
                              {item.severity.replace('_', ' ')}
                            </span>
                          </div>
                          <p className={styles.itemDesc}>{item.description}</p>
                        </div>
                      </div>

                      {/* Detail Diagnostics */}
                      <div className={styles.itemDetails}>
                        <div className={styles.detailBox}>
                          <span className={styles.detailLabel}>Verification Question</span>
                          <p className={styles.detailText}>{item.verificationQuestion}</p>
                        </div>
                        <div className={styles.detailBox}>
                          <span className={styles.detailLabel} style={{ color: '#f43f5e' }}>Failure Risk</span>
                          <p className={styles.detailText}>{item.failureRisk}</p>
                        </div>
                        <div className={styles.detailBox}>
                          <span className={styles.detailLabel} style={{ color: '#10b981' }}>Remediation Action</span>
                          <p className={styles.detailText}>{item.remediationAction}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

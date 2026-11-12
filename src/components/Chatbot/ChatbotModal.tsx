import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from '@docusaurus/Link';
import styles from './chatbot.module.css';
import { ChatbotEngine, ChatMessage } from './chatbotEngine';
import { UserBlueprintRequest } from './knowledgeBase';

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'wizard' | 'requests'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'bot',
      text: '👋 Welcome to Software Blueprints! I can guide you through our 69 production architecture blueprints, 5 capacity calculators (/calculators), interactive failure simulator (/explorer), readiness audits (/readiness), and empirical benchmarks (/benchmarks). You can also use our 🧭 Architecture Wizard tab to generate tailored system recommendations. What system are you designing today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Request form state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTopic, setReqTopic] = useState('');
  const [reqPillar, setReqPillar] = useState('AI Agents');
  const [reqDetails, setReqDetails] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [requestsList, setRequestsList] = useState<UserBlueprintRequest[]>([]);

  // Guided Architecture Recommendation Wizard State
  const [wizTraffic, setWizTraffic] = useState<'low' | 'medium' | 'high'>('medium');
  const [wizConsistency, setWizConsistency] = useState<'acid' | 'eventual' | 'cqrs'>('acid');
  const [wizDomain, setWizDomain] = useState<'payments' | 'ai_agents' | 'saas' | 'ecommerce' | 'streaming'>('payments');
  const [wizPriority, setWizPriority] = useState<'isolation' | 'sharding' | 'caching' | 'concurrency'>('isolation');
  const [copiedCli, setCopiedCli] = useState(false);

  const recommendation = useMemo(() => {
    if (wizDomain === 'payments' || (wizConsistency === 'acid' && wizDomain !== 'ai_agents')) {
      return {
        title: 'Idempotent Payment Ledger Architecture',
        pillar: 'System Design',
        url: '/docs/system-design/idempotent-payment-ledger/overview',
        summary: 'Zero-sum double-entry financial ledger enforcing strict ACID invariants, deterministic transaction lock ordering, and idempotent credit/debit operations.',
        stack: 'PostgreSQL 16 (ACID) + Redis 7.2 Idempotency + Python 3.12',
        calculator: { name: 'Distributed Rate Limiter Sizer', url: '/calculators' },
        cli: 'npx software-blueprints init sys-payment-ledger',
        verificationSuite: 'ACID double-spend rejection + k6 chaos load test',
      };
    }
    if (wizDomain === 'ai_agents') {
      return {
        title: 'AI Agent & Production Streaming RAG Harness',
        pillar: 'AI Agents',
        url: '/docs/ai-agents/agent-rag-harness/overview',
        summary: 'Sub-800ms Time-To-First-Token streaming RAG engine featuring pgvector HNSW Reciprocal Rank Fusion, async FastAPI workers, and vLLM inference clusters.',
        stack: 'FastAPI Async + pgvector 0.7.4 + vLLM TP=4 + Next.js 15 SSE',
        calculator: { name: 'vLLM GPU VRAM & pgvector HNSW Sizer', url: '/calculators' },
        cli: 'npx software-blueprints init agent-rag-harness',
        verificationSuite: 'pytest-asyncio + SSE client disconnect cancellation tests',
      };
    }
    if (wizConsistency === 'cqrs') {
      return {
        title: 'CQRS & Event Sourcing Architecture',
        pillar: 'System Design',
        url: '/docs/system-design/cqrs-event-sourcing/overview',
        summary: 'Append-only event store with database-enforced optimistic concurrency control, asynchronous materialized read projections, and periodic snapshotting.',
        stack: 'PostgreSQL 16 Append-Only Store + Kafka KRaft + Python 3.12',
        calculator: { name: 'Kafka Cluster & Partition Sizer', url: '/calculators' },
        cli: 'npx software-blueprints init sys-cqrs',
        verificationSuite: 'Optimistic concurrency version conflict rejection test',
      };
    }
    if (wizDomain === 'ecommerce' || (wizTraffic === 'high' && wizConsistency === 'eventual')) {
      return {
        title: 'Distributed Saga Pattern: Orchestrator vs Choreography',
        pillar: 'System Design',
        url: '/docs/system-design/distributed-saga-orchestrator/overview',
        summary: 'Stateful saga orchestrator with persistent PostgreSQL state machine, forward idempotent commands, and automated reverse compensating rollback stack.',
        stack: 'Python 3.12 (AsyncIO) + PostgreSQL 16 (JSONB) + WireMock Services',
        calculator: { name: 'Kafka Cluster & Partition Sizer', url: '/calculators' },
        cli: 'npx software-blueprints init sys-saga-orchestrator',
        verificationSuite: 'Out-of-stock chaos injection + reverse compensation test',
      };
    }
    if (wizPriority === 'sharding' || (wizTraffic === 'high' && wizDomain === 'saas')) {
      return {
        title: 'Database Sharding Ring & Consistent Hashing',
        pillar: 'System Design',
        url: '/docs/system-design/database-sharding-consistent-hashing/overview',
        summary: 'Ketama consistent hash ring with 160 virtual nodes per physical shard, sub-microsecond binary search routing, and scatter-gather query aggregation.',
        stack: 'PostgreSQL 16 (3 Physical Shards) + TypeScript FNV-1a Router',
        calculator: { name: 'Database Sharding Ring Sizer', url: '/calculators' },
        cli: 'npx software-blueprints init sys-consistent-hashing',
        verificationSuite: 'k6 point lookups + scatter-gather resharding chaos test',
      };
    }
    if (wizPriority === 'isolation') {
      return {
        title: 'Circuit Breaker & Bulkhead Isolation',
        pillar: 'System Design',
        url: '/docs/system-design/circuit-breaker-bulkhead/overview',
        summary: 'Three-state circuit breaker state machine combined with Little\'s Law concurrency bulkhead pools and full jitter exponential backoff.',
        stack: 'Go 1.23 + Chi HTTP Router + Prometheus Metrics Exporter',
        calculator: { name: 'Distributed Rate Limiter Sizer', url: '/calculators' },
        cli: 'npx software-blueprints init sys-circuit-breaker',
        verificationSuite: 'Little\'s Law saturation + network partition chaos test',
      };
    }
    if (wizPriority === 'caching') {
      return {
        title: 'Distributed Caching & Invalidation Architecture',
        pillar: 'System Design',
        url: '/docs/system-design/distributed-caching/overview',
        summary: 'Multi-tier L1 in-memory LRU negative cache + L2 Redis Cluster with Single-Flight coalescing and probabilistic early expiration.',
        stack: 'Redis 7.2 Cluster + Go 1.23 / Python 3.12 + Single-Flight',
        calculator: { name: 'Distributed Rate Limiter Sizer', url: '/calculators' },
        cli: 'npx software-blueprints init sys-caching',
        verificationSuite: 'k6 50,000 RPS cache stampede chaos test',
      };
    }
    return {
      title: 'Multi-Tenant B2B SaaS: PostgreSQL RLS',
      pillar: 'Full-Stack',
      url: '/docs/full-stack/multi-tenant-saas/overview',
      summary: 'PostgreSQL kernel-level Row Level Security (RLS) tenant isolation with PgBouncer transaction-mode connection pooling and Next.js 15.',
      stack: 'PostgreSQL 16 (Kernel RLS) + PgBouncer + Next.js 15 App Router',
      calculator: { name: 'Database Sharding Ring Sizer', url: '/calculators' },
      cli: 'npx software-blueprints init fullstack-multi-tenant',
      verificationSuite: 'Vitest cross-tenant RLS bypass regression tests',
    };
  }, [wizTraffic, wizConsistency, wizDomain, wizPriority]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'requests') {
      setRequestsList(ChatbotEngine.getStoredRequests());
    }
  }, [activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showRequestForm]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Process bot response
    setTimeout(() => {
      const botResponse = ChatbotEngine.processUserMessage(text);
      setMessages((prev) => [...prev, botResponse]);
      if (botResponse.isRequestPrompt) {
        setShowRequestForm(true);
        setReqTopic(text);
      }
    }, 250);
  };

  const handleQuickChip = (prompt: string) => {
    handleSend(prompt);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTopic.trim() || !reqDetails.trim()) return;

    const saved = ChatbotEngine.saveRequest({
      topic: reqTopic,
      pillar: reqPillar,
      details: reqDetails,
      contactEmail: reqEmail.trim() || undefined,
    });

    setShowRequestForm(false);
    setReqTopic('');
    setReqDetails('');
    setReqEmail('');

    const confirmMsg: ChatMessage = {
      id: `bot-confirm-${Date.now()}`,
      sender: 'bot',
      text: `✅ Request successfully recorded! Ref: \`${saved.id}\`. Our team reviews roadmap requests to build and deploy new production blueprints. You can track all saved requests in the "Saved Requests" tab.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, confirmMsg]);
  };

  const handleDeleteRequest = (id: string) => {
    const updated = ChatbotEngine.deleteStoredRequest(id);
    setRequestsList(updated);
  };

  const handleExportMarkdown = () => {
    const md = ChatbotEngine.exportRequestsAsMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blueprint-requests-${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.chatWindow} role="dialog" aria-modal="true" aria-label="Architecture Assistant">
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.headerTitle}>
          <span className={styles.headerIcon}>🏛️</span>
          <div className={styles.headerText}>
            <h3>Blueprint Assistant</h3>
            <span>Online • 69 Blueprints & Tools</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('chat')}>
            Chat
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'wizard' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('wizard')}>
            🧭 Wizard
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'requests' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('requests')}>
            Requests
          </button>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        </div>
      </div>

      {/* Tab: Chat */}
      {activeTab === 'chat' && (
        <>
          <div className={styles.chatBody}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${msg.sender === 'user' ? styles.messageUser : styles.messageBot}`}>
                <div
                  className={`${styles.bubble} ${msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
                  {msg.text}

                  {/* Side-by-Side Architectural Tradeoff Matrix */}
                  {msg.comparison && (
                    <div className={styles.comparisonCard}>
                      <div className={styles.compHeader}>
                        <span className={styles.compBadge}>⚖️ Architectural Tradeoff</span>
                        <div className={styles.compTitle}>{msg.comparison.title}</div>
                      </div>
                      <div className={styles.compTableWrapper}>
                        <table className={styles.compTable}>
                          <thead>
                            <tr>
                              <th>Metric</th>
                              <th>{msg.comparison.optionAName}</th>
                              <th>{msg.comparison.optionBName}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {msg.comparison.dimensions.map((dim, idx) => (
                              <tr key={idx}>
                                <td className={styles.dimName}>{dim.dimension}</td>
                                <td className={styles.optionACell}>{dim.optionA}</td>
                                <td className={styles.optionBCell}>{dim.optionB}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className={styles.verdictBox}>
                        <span className={styles.verdictLabel}>🎯 Engineering Verdict</span>
                        <p className={styles.verdictText}>{msg.comparison.verdict}</p>
                      </div>
                    </div>
                  )}

                  {/* Recommendation Blueprint Cards */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className={styles.recContainer}>
                      {msg.recommendations.map((rec) => (
                        <Link
                          key={rec.id}
                          to={rec.url}
                          className={styles.recCard}
                          onClick={() => onClose()}>
                          <div className={styles.recHeader}>
                            <span className={styles.recTitle}>{rec.title}</span>
                            <span className={styles.recPillar}>{rec.pillar}</span>
                          </div>
                          <p className={styles.recDesc}>{rec.description}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <span className={styles.msgTime}>{msg.timestamp}</span>
              </div>
            ))}

            {/* In-chat Blueprint Request Form */}
            {showRequestForm && (
              <div className={styles.requestFormCard}>
                <h4>💡 Submit New Architecture Request</h4>
                <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Topic / Tech Stack (e.g. Apache Flink, SvelteKit)"
                    value={reqTopic}
                    onChange={(e) => setReqTopic(e.target.value)}
                    className={styles.formInput}
                  />
                  <select
                    value={reqPillar}
                    onChange={(e) => setReqPillar(e.target.value)}
                    className={styles.formSelect}>
                    <option value="AI Agents">AI Agents & Autonomous Loops</option>
                    <option value="RAG Systems">RAG Systems & Vector Search</option>
                    <option value="ML & Deep Learning">ML, Inference & Fine-Tuning</option>
                    <option value="System Design">System Design & Distributed Patterns</option>
                    <option value="Backend">Backend & Distributed Services</option>
                    <option value="Full-Stack">Full-Stack Web Architectures</option>
                    <option value="Frontend">Frontend & UI Design Systems</option>
                  </select>
                  <textarea
                    required
                    rows={2}
                    placeholder="Key requirements / use case (e.g. streaming window counts with exactly-once)..."
                    value={reqDetails}
                    onChange={(e) => setReqDetails(e.target.value)}
                    className={styles.formTextarea}
                  />
                  <input
                    type="email"
                    placeholder="Your Email (Optional: for notification when built)"
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    className={styles.formInput}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setShowRequestForm(false)}
                      className={styles.tabBtn}>
                      Cancel
                    </button>
                    <button type="submit" className={styles.submitRequestBtn}>
                      Save Blueprint Request
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Quick Action Chips */}
            <div className={styles.quickChips}>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('Tell me about the capacity calculators')}>
                🧮 Sizing Calculators
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('How does the architecture explorer simulate failures?')}>
                ⚡ System Explorer
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('What is the production readiness audit checklist?')}>
                ✅ Readiness Audit
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('Show me engineering benchmarks')}>
                📊 Benchmarks
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('Show me the production case studies')}>
                🏗️ Case Studies
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('Show me the architecture verification matrix')}>
                🛡️ Verification
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('Compare DPO vs PPO')}>
                ⚖️ DPO vs PPO
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('Kafka vs Redis Streams')}>
                ⚖️ Kafka vs Redis
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('Explain distributed rate limiting')}>
                🛡️ Rate Limiting
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => handleQuickChip('Explain kafka dlq')}>
                📨 Kafka DLQ
              </button>
              <button
                type="button"
                className={styles.chipBtn}
                onClick={() => {
                  setShowRequestForm(true);
                  setReqTopic('');
                }}>
                💡 Request Blueprint
              </button>
            </div>

            <div ref={chatEndRef} />
          </div>

          {/* Footer Input Form */}
          <div className={styles.chatFooter}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className={styles.inputForm}>
              <input
                type="text"
                placeholder="Ask about a blueprint, stack, or pattern..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={styles.chatInput}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className={styles.sendBtn}
                aria-label="Send message">
                ➤
              </button>
            </form>
          </div>
        </>
      )}

      {/* Tab: Guided Architecture Recommendation Wizard */}
      {activeTab === 'wizard' && (
        <div className={styles.wizardContainer}>
          <div className={styles.wizardHeader}>
            <h4>🧭 Architecture Decision Wizard</h4>
            <p>Select your workload parameters to receive a tailored blueprint recommendation, capacity sizing guidance, and scaffolding commands.</p>
          </div>

          {/* Dimension 1: Traffic Scale */}
          <div className={styles.wizardSection}>
            <span className={styles.wizardLabel}>1. Peak Traffic Scale</span>
            <div className={styles.wizardPills}>
              {[
                { id: 'low', label: '< 1,000 RPS', desc: 'Standard Microservices & Web APIs' },
                { id: 'medium', label: '1,000 - 25,000 RPS', desc: 'High-growth platform with multi-service dependencies' },
                { id: 'high', label: '25,000 - 100,000+ RPS', desc: 'Hyper-scale event streaming & flash-sale workloads' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWizTraffic(opt.id as any)}
                  className={`${styles.wizardPillBtn} ${wizTraffic === opt.id ? styles.wizardPillBtnActive : ''}`}>
                  <span className={styles.wizardPillTitle}>{opt.label}</span>
                  <span className={styles.wizardPillDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimension 2: Domain Workload */}
          <div className={styles.wizardSection}>
            <span className={styles.wizardLabel}>2. Workload Domain</span>
            <div className={styles.wizardPills}>
              {[
                { id: 'payments', label: '💳 Financial Payments & Ledger', desc: 'Zero data loss, double-entry auditability, exact idempotency' },
                { id: 'ai_agents', label: '🤖 AI Agents & Streaming RAG', desc: 'Sub-800ms TTFT, pgvector HNSW hybrid search, vLLM clusters' },
                { id: 'ecommerce', label: '🛒 E-Commerce & Flash Sales', desc: 'High concurrency reservations, multi-stage order Sagas' },
                { id: 'saas', label: '🏢 Multi-Tenant Enterprise SaaS', desc: 'Kernel-level row security (RLS), tenant isolation, connection pooling' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWizDomain(opt.id as any)}
                  className={`${styles.wizardPillBtn} ${wizDomain === opt.id ? styles.wizardPillBtnActive : ''}`}>
                  <span className={styles.wizardPillTitle}>{opt.label}</span>
                  <span className={styles.wizardPillDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimension 3: Consistency Model */}
          <div className={styles.wizardSection}>
            <span className={styles.wizardLabel}>3. Consistency & State Model</span>
            <div className={styles.wizardPills}>
              {[
                { id: 'acid', label: 'Strict ACID', desc: 'Immediate transactional consistency across relational tables' },
                { id: 'eventual', label: 'Eventual Consistency', desc: 'Asynchronous event streaming and Saga orchestrators' },
                { id: 'cqrs', label: 'CQRS & Event Sourcing', desc: 'Immutable append-only event store with OCC & projections' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWizConsistency(opt.id as any)}
                  className={`${styles.wizardPillBtn} ${wizConsistency === opt.id ? styles.wizardPillBtnActive : ''}`}>
                  <span className={styles.wizardPillTitle}>{opt.label}</span>
                  <span className={styles.wizardPillDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimension 4: Reliability Priority */}
          <div className={styles.wizardSection}>
            <span className={styles.wizardLabel}>4. Primary Operational Bottleneck</span>
            <div className={styles.wizardPills}>
              {[
                { id: 'isolation', label: '🛡️ Cascading Failure Protection', desc: "Little's Law concurrency bulkheads & circuit breakers" },
                { id: 'sharding', label: '🌐 Horizontal Storage Scaling', desc: 'Ketama consistent hash ring & database sharding' },
                { id: 'caching', label: '⚡ Sub-Millisecond Read Latency', desc: 'L1/L2 multi-tier caching with Single-Flight & XFetch' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWizPriority(opt.id as any)}
                  className={`${styles.wizardPillBtn} ${wizPriority === opt.id ? styles.wizardPillBtnActive : ''}`}>
                  <span className={styles.wizardPillTitle}>{opt.label}</span>
                  <span className={styles.wizardPillDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Recommendation Card */}
          <div className={styles.wizardResultBox}>
            <div className={styles.wizardResultTitle}>
              <span>✨ Recommended Architecture</span>
            </div>
            <h5 style={{ margin: '0', fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>
              {recommendation.title}
            </h5>
            <p className={styles.wizardResultSummary}>{recommendation.summary}</p>

            <div className={styles.wizardResultGrid}>
              <div className={styles.wizardResultItem}>
                <div className={styles.wizardResultItemLabel}>Infrastructure Stack</div>
                <div className={styles.wizardResultItemVal}>{recommendation.stack}</div>
              </div>
              <div className={styles.wizardResultItem}>
                <div className={styles.wizardResultItemLabel}>Capacity Calculator</div>
                <Link to={recommendation.calculator.url} style={{ color: '#00f0ff', fontWeight: 600 }}>
                  {recommendation.calculator.name} →
                </Link>
              </div>
            </div>

            <div className={styles.wizardCliBox}>
              <span>{recommendation.cli}</span>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(recommendation.cli);
                    setCopiedCli(true);
                    setTimeout(() => setCopiedCli(false), 2000);
                  }
                }}
                className={styles.wizardSecondaryBtn}
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                {copiedCli ? 'Copied! ✓' : 'Copy'}
              </button>
            </div>

            <div className={styles.wizardActionRow}>
              <Link
                to={recommendation.url}
                className={styles.wizardPrimaryBtn}
                onClick={onClose}>
                📖 View Blueprint
              </Link>
              <button
                type="button"
                onClick={() => {
                  const prompt = `I am designing a ${wizDomain} architecture targeting ${wizTraffic} RPS with ${wizConsistency} consistency. Can you explain the trade-offs and capacity sizing of ${recommendation.title}?`;
                  setActiveTab('chat');
                  handleSend(prompt);
                }}
                className={styles.wizardSecondaryBtn}>
                💬 Discuss in Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Saved Requests (Admin & User Tracker) */}
      {activeTab === 'requests' && (
        <div className={styles.adminView}>
          <div className={styles.adminHeader}>
            <h4>Recorded Requests ({requestsList.length})</h4>
            {requestsList.length > 0 && (
              <button
                type="button"
                onClick={handleExportMarkdown}
                className={styles.exportBtn}>
                📥 Export Markdown
              </button>
            )}
          </div>

          {requestsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '13px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '24px' }}>📋</p>
              No blueprint requests recorded yet. Submit one through the chat!
            </div>
          ) : (
            requestsList.map((req) => (
              <div key={req.id} className={styles.requestItem}>
                <div className={styles.requestItemTop}>
                  <span className={styles.reqTopic}>{req.topic}</span>
                  <span className={styles.reqBadge}>{req.pillar}</span>
                </div>
                <p className={styles.reqDetails}>{req.details}</p>
                <div className={styles.reqMeta}>
                  <span>
                    {new Date(req.createdAt).toLocaleDateString()} • {req.contactEmail || 'No email'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRequest(req.id)}
                    className={styles.deleteReqBtn}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

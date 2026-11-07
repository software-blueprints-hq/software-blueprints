import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import styles from './chatbot.module.css';
import { ChatbotEngine, ChatMessage } from './chatbotEngine';
import { UserBlueprintRequest } from './knowledgeBase';

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'requests'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'bot',
      text: '👋 Welcome to Software Blueprints! I can guide you through our 68 production architecture blueprints, 5 capacity calculators (/calculators), interactive failure simulator (/explorer), readiness audits (/readiness), and empirical benchmarks (/benchmarks). What system are you designing today?',
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
            <span>Online • 68 Blueprints & Tools</span>
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

import React, { useState, useMemo } from 'react';
import Link from '@docusaurus/Link';
import { BLUEPRINT_CATALOG, BlueprintEntry } from './Chatbot/knowledgeBase';

const TAG_FILTERS = [
  'All',
  'AI Agents',
  'RAG',
  'Postgres',
  'Redis',
  'Kafka',
  'Go',
  'Python',
  'Rust',
  'React',
  'TypeScript',
  'System Design',
];

export default function RoadmapSearch(): JSX.Element {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  const filtered = useMemo(() => {
    return BLUEPRINT_CATALOG.filter((item) => {
      // 1. Tag Filter
      if (selectedTag !== 'All') {
        const tagLower = selectedTag.toLowerCase();
        const matchesTag =
          item.tags.some((t) => t.toLowerCase().includes(tagLower)) ||
          item.pillar.toLowerCase().includes(tagLower) ||
          item.title.toLowerCase().includes(tagLower);
        if (!matchesTag) return false;
      }

      // 2. Query Search
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const inTitle = item.title.toLowerCase().includes(q);
        const inDesc = item.description.toLowerCase().includes(q);
        const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const inPillar = item.pillar.toLowerCase().includes(q);
        return inTitle || inDesc || inTags || inPillar;
      }

      return true;
    });
  }, [query, selectedTag]);

  return (
    <div style={{ margin: '2rem 0 3rem 0' }}>
      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '8px 16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
          marginBottom: '14px',
        }}>
        <span style={{ fontSize: '1.2rem', color: '#64748b' }}>🔍</span>
        <input
          type="text"
          placeholder="Search 68 blueprints & tools by name, tech stack, or architecture pattern..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}>
            ✕
          </button>
        )}
      </div>

      {/* Quick Tag Pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
          Filter:
        </span>
        {TAG_FILTERS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag(tag)}
            style={{
              background: selectedTag === tag ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.04)',
              border: selectedTag === tag ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              padding: '4px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: selectedTag === tag ? '#00f0ff' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}>
            {tag}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          fontSize: '0.85rem',
          color: '#94a3b8',
        }}>
        <span>
          Showing <strong style={{ color: '#00f0ff' }}>{filtered.length}</strong> of {BLUEPRINT_CATALOG.length} blueprints
        </span>
        {(query || selectedTag !== 'All') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedTag('All');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.82rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}>
            Reset filters
          </button>
        )}
      </div>

      {/* Filtered Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '14px',
        }}>
        {filtered.map((item) => (
          <Link
            key={item.id}
            to={item.url}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'rgba(11, 15, 25, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(11, 15, 25, 0.8)';
            }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#c084fc',
                    background: 'rgba(139, 92, 246, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>
                  {item.pillar}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                  🟢 Production
                </span>
              </div>
              <h4
                style={{
                  margin: '0 0 6px 0',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                }}>
                {item.title}
              </h4>
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '0.82rem',
                  color: '#94a3b8',
                  lineHeight: 1.45,
                }}>
                {item.description}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
                color: '#00f0ff',
                fontWeight: 600,
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                paddingTop: '10px',
              }}>
              <span>Read Architecture Spec</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sample hybrid retrieval schema
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR(128) NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    tsv_content TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices: HNSW for dense vectors + GIN for BM25 keyword search
CREATE INDEX IF NOT EXISTS idx_chunks_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_chunks_gin ON document_chunks USING gin (tsv_content);

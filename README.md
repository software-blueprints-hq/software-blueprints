# 🏛️ Software Blueprints

<div align="center">

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Docusaurus](https://img.shields.io/badge/Framework-Docusaurus%20v3-green.svg)
![Pillars](https://img.shields.io/badge/Architecture-7%20Pillars-indigo.svg)
![Blueprints](https://img.shields.io/badge/Total%20Blueprints-55%20Production%20Ready-emerald.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue.svg)

**The definitive production architecture vault, system design catalog, and accessible UI component reference.**

[Explore Catalog](./docs/roadmap.mdx) · [Getting Started](./docs/getting-started.mdx) · [Report Issue](https://github.com/software-blueprints-hq/software-blueprints/issues)

</div>

---

## 🚀 Overview

**Software Blueprints** is an enterprise-grade engineering reference vault designed to eliminate guesswork when architecting production systems. Every blueprint in this vault is built with:
- **Mermaid.js Architecture Diagrams:** Visualizing data flow, edge caching, and component interactions.
- **Full Production Implementations:** Complete, copy-paste-ready code (Go, Python, TypeScript, Java, Rust) rather than superficial pseudo-code.
- **Database Schemas & Indices:** Optimized PostgreSQL DDL, pgvector HNSW configurations, and ACID ledger definitions.
- **Production Hardening Checklists:** Battle-tested operational recommendations covering security, latency budgets, and failure isolation.

---

## 🏛️ The 7 Architecture Pillars

```
software-blueprints/
├── docs/
│   ├── frontend/         # 🎨 1. UI Component Library (WCAG 2.1 AA)
│   ├── backend/          # ⚙️ 2. Distributed Services & Concurrency
│   ├── full-stack/       # ⚡ 3. End-to-End Modern Web Applications
│   ├── ai-agents/        # 🤖 4. Autonomous Loops & Multi-Agent Teams
│   ├── rag-systems/      # 🧠 5. Hybrid Retrieval & Vector Search
│   ├── ml-deeplearning/  # 🔬 6. High-Throughput Serving & Alignment
│   └── system-design/    # 🛡️ 7. Scalability & Resilience Patterns
```

---

### 1. 🎨 Frontend & UI Design Systems (`docs/frontend/`)
Zero-dependency, accessible React component library conforming strictly to WCAG 2.1 AA with `:focus-visible` and keyboard navigation:
- **Buttons, Modals & Drawers:** Solid/outline/ghost variants, confirmation dialogs, slide-out audit panels.
- **Inputs, Dropdowns & Forms:** Validated text fields, character counter textareas, action dropdowns, auth forms.
- **Data Tables & Stats:** Sortable tables with multi-select, dashboard metric sparkline cards.
- **Navigation Atoms:** Underlined tabs, segmented controls, numbered pagination, breadcrumb trails, accordions, and tooltips.

### 2. ⚙️ Backend & Distributed Services (`docs/backend/`)
High-concurrency backend services, event-driven microservices, and asynchronous task workers:
- **Go Fiber & Redis Streams:** High-throughput event-driven microservices with Transactional Outbox.
- **Django 5 Enterprise:** DRF ViewSets, Celery distributed worker fleet (`transaction.on_commit`), PgBouncer pooling.
- **Spring Boot 3.3:** Java 21 Virtual Threads (Project Loom), Spring Cloud Gateway, Kafka event streaming, Resilience4j circuit breakers.
- **Node.js & Fastify:** Compiled Ajv JSON schema validation, Prisma ORM, BullMQ distributed background queue.
- **Rust & Axum:** Sub-millisecond p99 latency, Tokio async runtime, SQLx compile-time query validation, jemalloc memory profiling.
- **gRPC & Protocol Buffers:** Proto3 binary framing, HTTP/2 multiplexing, client/server interceptors, deadline propagation.

### 3. ⚡ Full-Stack Web Architectures (`docs/full-stack/`)
End-to-end full-stack architectures combining type safety, modern ORMs, and direct server rendering:
- **Next.js 15 & Drizzle ORM:** React Server Components, Server Actions, Zod validation, PostgreSQL connection pooling.
- **Multi-Tenant B2B SaaS:** PostgreSQL Row-Level Security (RLS) kernel policies, wildcard subdomain edge routing.
- **Enterprise Authentication:** Auth.js (NextAuth v5), database sliding sessions, `__Host-` HttpOnly cookies, PKCE OAuth2.
- **Stripe Billing Ledger:** Hosted Checkout, Customer Portal, raw buffer HMAC signature verification, idempotent webhook ledger.
- **Real-Time Collaboration:** Multiplayer synchronization via Yjs CRDTs, WebSockets, Redis pub/sub backplane, live cursors.
- **CI/CD & Ephemeral Previews:** GitHub Actions, copy-on-write database branching (Neon/Supabase), automated Playwright E2E suites.

### 4. 🤖 AI Agents & Autonomous Loops (`docs/ai-agents/`)
Multi-step reasoning engines, tool-use harnesses, agent memory, and multi-tenant executors:
- **Agent RAG Streaming Harness:** FastAPI, pgvector, Next.js, Vercel AI SDK real-time streaming agent.
- **Multi-Agent Supervisor:** LangGraph Supervisor-Worker architecture, typed routing, circuit breakers.
- **ReAct Tool-Calling Engine:** Pure Python typed ReAct loop, step budgets, tool error feedback loops.
- **Human-in-the-Loop:** Checkpointed state graphs, `interrupt_before`, approval gateways & resume endpoints.
- **Agent Memory Architecture:** Three-tier memory (sliding window, semantic pgvector long-term, session store).
- **Observability & Tracing:** OpenTelemetry spans, Langfuse distributed tracing, token cost calc & latency metrics.
- **Agent Evaluation & Testing:** Golden datasets, trajectory assertion checks, LLM-as-a-Judge, CI regression gates.
- **Streaming Agent UI & Protocol:** Server-Sent Events (SSE) protocol, tool execution status cards, React custom hook.
- **Agent Security & Guardrails:** Prompt injection heuristics, tool RBAC sandboxing, PII masking, secret scanners.

### 5. 🧠 RAG Systems & Vector Search (`docs/rag-systems/`)
Advanced document ingestion, semantic chunking, and low-latency hybrid retrieval:
- **Hybrid Search & Reranking:** PostgreSQL `pgvector` HNSW + BM25 `tsvector`, in-database RRF CTE, Cross-Encoder reranking.
- **Advanced Chunking Strategies:** Semantic boundary cosine inflection, Parent-Child hierarchical indexing, AST table preservation.
- **GraphRAG & Knowledge Graphs:** Neo4j property graphs, LLM entity-relationship extraction, 2-hop local subgraph traversal.
- **Corrective RAG (CRAG):** Adaptive state machine, document relevance grading, query rewriting, web search fallback.
- **RAG Evaluation & Benchmarking:** The RAG Triad (Context Relevance, Faithfulness, Answer Relevance), HitRate@K, MRR metrics.
- **Multi-Modal RAG:** Vision LLM extraction (markdown tables, infographic summaries), ColPali visual page retrieval.

### 6. 🔬 ML, Inference & Fine-Tuning (`docs/ml-deeplearning/`)
Cost-effective, high-throughput model serving, parameter-efficient fine-tuning, and alignment:
- **vLLM Inference Serving:** PagedAttention KV-cache management, Continuous Batching, Tensor Parallelism (TP=4), TTFT/ITL benchmark tool.
- **LoRA & QLoRA Fine-Tuning:** 4-bit NormalFloat4 (NF4) QLoRA, target module selection, prompt loss masking, zero-overhead adapter merging.
- **Preference Alignment (DPO):** Direct Preference Optimization, pairwise `(chosen, rejected)` training, reference model regularization.
- **Model Quantization & Compression:** AWQ INT4, native FP8 for NVIDIA Hopper/Ada, GPTQ, GGUF k-quants for edge.
- **Embedding & Reranker Fine-Tuning:** Matryoshka Representation Learning (MRL), MultipleNegativesRankingLoss, BM25 hard negative mining.
- **Model Evaluation & Red-Teaming:** Standardized benchmarks (MMLU, GSM8K, HumanEval), `lm-eval` automation, adversarial jailbreak probes.

### 7. 🛡️ System Design & Distributed Patterns (`docs/system-design/`)
Architectures for ultra-high availability, financial consistency, and distributed coordination:
- **Distributed Rate Limiter:** Redis Sliding Window Counter (Atomic Lua script), L1 In-Memory LRU + L2 Redis.
- **Idempotent Payment Ledger:** Double-Entry Bookkeeping (Zero-sum Debits/Credits), Idempotency Key locking, deterministic row locks.
- **Transactional Outbox & CDC:** Eliminating dual-writes via single local ACID transaction, PostgreSQL WAL streaming (Debezium).
- **Distributed Caching & Invalidation:** Multi-tier caching (L1 In-Memory + L2 Redis), Single-Flight stampede coalescing, probabilistic XFetch.
- **Distributed Locks & Fencing Tokens:** Redis `SET NX PX`, Watchdog auto-renewal, safe Lua release, Monotonic Fencing Tokens.
- **CQRS & Event Sourcing:** Append-only event store, database unique constraint on `(stream_id, version)`, asynchronous read projectors.

---

## 💻 Local Development

```bash
# 1. Clone the repository
git clone https://github.com/software-blueprints-hq/software-blueprints.git
cd software-blueprints

# 2. Install dependencies
npm install

# 3. Start development server
npm start

# 4. Verify production build
npm run build
```

The documentation portal will open at `http://localhost:3000`.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

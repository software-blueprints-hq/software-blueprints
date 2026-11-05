# Contributing to Software Blueprints

Welcome to the **Software Blueprints** repository. This guide outlines our architectural standards, directory structure, and contribution requirements.

---

## 🏛️ Repository Architecture: The 7 Pillars

All documentation content lives inside the `docs/` folder, organized strictly across our **7 Architecture Pillars**:

1. `docs/frontend/` — Accessible React Component Library (WCAG 2.1 AA)
2. `docs/backend/` — Distributed Services, Microservices & IPC (Go, Python, Java, Rust)
3. `docs/full-stack/` — End-to-End Web Architectures (Next.js 15, Multi-Tenancy, Auth, Stripe)
4. `docs/ai-agents/` — Autonomous Loops, ReAct, Memory, HITL, Evals, Security Guardrails
5. `docs/rag-systems/` — Hybrid Retrieval, Advanced Chunking, GraphRAG, CRAG, Multi-Modal
6. `docs/ml-deeplearning/` — High-Throughput Serving (vLLM), QLoRA, DPO, Quantization, Red-Teaming
7. `docs/system-design/` — Rate Limiting, Payment Ledgers, Outbox/CDC, Caching, Locks, CQRS

---

## ⛔ Strict Contribution Boundaries

To preserve architectural integrity and avoid Docusaurus build breakages, you **MUST** adhere to these boundaries:
1. **DO NOT modify `docusaurus.config.ts` or `sidebars.ts`.** Sidebar navigation is auto-generated based on `_category_.json` files and folder structures inside `docs/`.
2. **DO NOT modify core files in `src/` without authorization.** The `src/` directory is reserved for Docusaurus layouts and homepage components.
3. **DO NOT commit surface-level or placeholder documentation.** Every blueprint must include working production code, architecture diagrams, and schemas.
4. **DO NOT commit personal private emails.** Commits must use your GitHub noreply address.

---

## 📋 Architectural Blueprint Standards

Every blueprint added to Pillars 2 through 7 **MUST** include:

1. **Front Matter:**
   ```markdown
   ---
   sidebar_position: 1
   title: "Descriptive Architecture Title"
   description: "Concise summary of architecture, stack, and patterns."
   ---
   ```
2. **Mermaid Architecture Diagram:** Visualizing data flow, network boundaries, and state transitions using clean Mermaid syntax (`flowchart TD`, `sequenceDiagram`, etc.).
3. **Decision / Tradeoff Matrix:** Comparing algorithms, frameworks, or isolation strategies with concrete tradeoffs.
4. **Complete Production Implementation:** Working, copy-paste-ready code (Go, Python, TypeScript, Rust, Java) with typed data models (Pydantic, TypeScript interfaces, Go structs) and error handling.
5. **Database Schemas & Indices:** Full PostgreSQL DDL, index declarations (HNSW, GIN, B-tree), and ACID constraints.
6. **Production Hardening Checklist:** Actionable security, performance, and reliability recommendations.

---

## 🎨 Frontend UI Standards (Pillar 1)

All UI components in `docs/frontend/` must adhere to:

1. **Semantic HTML5:** Use `<article>`, `<section>`, `<nav>`, `<aside>`, `<dialog>` rather than generic `<div>` soup.
2. **Strict Accessibility (WCAG 2.1 AA):**
   - Provide `role="dialog"`, `role="tablist"`, `role="tab"`, `aria-selected`, `aria-expanded` attributes.
   - Link form controls with `htmlFor="id"` and `id="id"`.
   - Provide `aria-label` for icon-only buttons.
3. **Keyboard Navigation:**
   - Interactive elements must have explicit `:focus-visible` outlines.
   - Complex widgets (Tabs, Dropdowns, Modals) must support keyboard navigation (`Escape`, `ArrowLeft`/`ArrowRight`, `Tab`).
4. **Tabbed MDX Format:**
   ```jsx
   import Tabs from '@theme/Tabs';
   import TabItem from '@theme/TabItem';

   <Tabs>
     <TabItem value="preview" label="Preview" default>
       {/* Interactive scoped component */}
     </TabItem>
     <TabItem value="code" label="Code">
       {/* Code block */}
     </TabItem>
   </Tabs>
   ```

---

## 💻 Local Development Workflow

```bash
# 1. Clone repository
git clone https://github.com/software-blueprints-hq/software-blueprints.git
cd software-blueprints

# 2. Install dependencies
npm install

# 3. Start local development server
npm start

# 4. ALWAYS verify build before committing
npm run build
```

---

## 🔄 Commit & Push Guidelines

Always run `npm run build` before pushing. If the build exits with code 0, commit your changes:

```bash
git add .
git commit -m "Add descriptive commit message"
git push origin main
```

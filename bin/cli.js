#!/usr/bin/env node

/**
 * Software Blueprints CLI
 * Scaffolds production architectures, distributed systems, and UI components directly into your codebase.
 * Usage: npx software-blueprints add <blueprint-id>
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI Terminal Colors
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const magenta = (text) => `\x1b[35m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;

const BLUEPRINT_MAP = {
  'ui-buttons': {
    name: "Buttons & Triggers",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/buttons.mdx",
    dependencies: [],
    defaultFilename: "Buttons.tsx",
  },
  'ui-modals': {
    name: "Modals, Dialogs & Drawers",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/modals.mdx",
    dependencies: [],
    defaultFilename: "Modals.tsx",
  },
  'ui-dropdowns': {
    name: "Dropdowns & Select Menus",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/dropdowns.mdx",
    dependencies: [],
    defaultFilename: "Dropdowns.tsx",
  },
  'ui-inputs': {
    name: "Inputs, Textareas & Validation",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/inputs.mdx",
    dependencies: [],
    defaultFilename: "Inputs.tsx",
  },
  'ui-tables': {
    name: "Data Tables & Sortable Grids",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/tables.mdx",
    dependencies: [],
    defaultFilename: "Data.tsx",
  },
  'ui-cards': {
    name: "Cards & Content Containers",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/cards.mdx",
    dependencies: [],
    defaultFilename: "Cards.tsx",
  },
  'ui-alerts': {
    name: "Alerts & Dynamic Notifications",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/alerts.mdx",
    dependencies: [],
    defaultFilename: "Alerts.tsx",
  },
  'ui-navbars': {
    name: "Navbars & Responsive Headers",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/navbars.mdx",
    dependencies: [],
    defaultFilename: "Navbars.tsx",
  },
  'ui-stats': {
    name: "Dashboards & Metric Cards",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/stats.mdx",
    dependencies: [],
    defaultFilename: "Dashboards.tsx",
  },
  'ui-hero': {
    name: "Hero & Landing Sections",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/hero.mdx",
    dependencies: [],
    defaultFilename: "Hero.tsx",
  },
  'ui-forms': {
    name: "Forms & Authentication Screens",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/forms.mdx",
    dependencies: [],
    defaultFilename: "Forms.tsx",
  },
  'ui-footers': {
    name: "Footers & Legal Blocks",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/footers.mdx",
    dependencies: [],
    defaultFilename: "Footers.tsx",
  },
  'ui-tabs': {
    name: "Tabs & Segmented Controls",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/tabs.mdx",
    dependencies: [],
    defaultFilename: "Tabs.tsx",
  },
  'ui-badges': {
    name: "Badges, Tags & Status Pills",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/badges.mdx",
    dependencies: [],
    defaultFilename: "Badges.tsx",
  },
  'ui-accordions': {
    name: "Accordions & Expandable Disclosures",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/accordions.mdx",
    dependencies: [],
    defaultFilename: "Accordions.tsx",
  },
  'ui-tooltips': {
    name: "Tooltips & Popovers",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/tooltips.mdx",
    dependencies: [],
    defaultFilename: "Tooltips.tsx",
  },
  'ui-pagination': {
    name: "Pagination & Breadcrumbs",
    pillar: "Frontend & UI",
    docPath: "docs/frontend/react/pagination.mdx",
    dependencies: [],
    defaultFilename: "Pagination.tsx",
  },
  'backend-go-fiber': {
    name: "Go Fiber & Redis Streams Microservices",
    pillar: "Backend & Services",
    docPath: "docs/backend/golang-microservices/overview.md",
    dependencies: [],
    defaultFilename: "main.go",
  },
  'backend-django': {
    name: "Django 5 Enterprise Architecture",
    pillar: "Backend & Services",
    docPath: "docs/backend/django/overview.md",
    dependencies: [],
    defaultFilename: "main.py",
  },
  'backend-spring-boot': {
    name: "Spring Boot 3 Microservices",
    pillar: "Backend & Services",
    docPath: "docs/backend/spring-boot/overview.md",
    dependencies: [],
    defaultFilename: "Application.java",
  },
  'backend-nodejs-fastify': {
    name: "Node.js & Fastify Enterprise Backend",
    pillar: "Backend & Services",
    docPath: "docs/backend/nodejs-fastify/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'backend-rust-axum': {
    name: "Rust & Axum High-Performance Services",
    pillar: "Backend & Services",
    docPath: "docs/backend/rust-axum/overview.md",
    dependencies: [],
    defaultFilename: "main.rs",
  },
  'backend-grpc': {
    name: "gRPC & Protocol Buffers High-Performance IPC",
    pillar: "Backend & Services",
    docPath: "docs/backend/grpc-microservices/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'backend-go-clean-ddd': {
    name: "Go Clean Architecture & Domain-Driven Design (DDD)",
    pillar: "Backend & Services",
    docPath: "docs/backend/golang-clean-architecture/overview.md",
    dependencies: [],
    defaultFilename: "main.go",
  },
  'backend-go-worker-pool': {
    name: "Go High-Concurrency Bounded Worker Pool",
    pillar: "Backend & Services",
    docPath: "docs/backend/golang-worker-pool/overview.md",
    dependencies: [],
    defaultFilename: "main.go",
  },
  'backend-python-fastapi-async': {
    name: "Async FastAPI Microservice: asyncpg & Pydantic v2",
    pillar: "Backend & Services",
    docPath: "docs/backend/python-fastapi-async/overview.md",
    dependencies: [],
    defaultFilename: "main.py",
  },
  'backend-python-temporal': {
    name: "Temporal.io Resilient Distributed Workflows (Python SDK)",
    pillar: "Backend & Services",
    docPath: "docs/backend/python-temporal-workflows/overview.md",
    dependencies: [],
    defaultFilename: "main.py",
  },
  'backend-rust-actor': {
    name: "Rust Tokio Actor Pipeline & Zero-Allocation Queues",
    pillar: "Backend & Services",
    docPath: "docs/backend/rust-tokio-actor-pipeline/overview.md",
    dependencies: [],
    defaultFilename: "main.rs",
  },
  'backend-rust-wasm': {
    name: "Rust WebAssembly (Wasm) Edge Microservices",
    pillar: "Backend & Services",
    docPath: "docs/backend/rust-wasm-edge/overview.md",
    dependencies: [],
    defaultFilename: "main.rs",
  },
  'backend-java-kafka-dlq': {
    name: "Spring Boot & Kafka Resilient Consumer with DLQ",
    pillar: "Backend & Services",
    docPath: "docs/backend/java-kafka-consumer-dlq/overview.md",
    dependencies: [],
    defaultFilename: "Application.java",
  },
  'backend-nestjs-clean': {
    name: "NestJS Enterprise Clean Architecture & CQRS",
    pillar: "Backend & Services",
    docPath: "docs/backend/nestjs-enterprise-clean-architecture/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'fullstack-nextjs-drizzle': {
    name: "Next.js 15, Drizzle ORM & PostgreSQL",
    pillar: "Full-Stack",
    docPath: "docs/full-stack/nextjs-drizzle-postgres/overview.md",
    dependencies: [],
    defaultFilename: "Component.tsx",
  },
  'fullstack-multi-tenant': {
    name: "Multi-Tenant B2B SaaS Architecture",
    pillar: "Full-Stack",
    docPath: "docs/full-stack/multi-tenant-saas/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'fullstack-auth': {
    name: "Enterprise Authentication & Session Management",
    pillar: "Full-Stack",
    docPath: "docs/full-stack/auth-session-management/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'fullstack-stripe': {
    name: "Stripe Subscription Billing & Webhook Ledger",
    pillar: "Full-Stack",
    docPath: "docs/full-stack/stripe-billing-subscriptions/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'fullstack-websockets': {
    name: "Real-Time Collaboration & CRDTs",
    pillar: "Full-Stack",
    docPath: "docs/full-stack/realtime-collaboration-websockets/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'fullstack-cicd': {
    name: "Full-Stack CI/CD & Ephemeral Previews",
    pillar: "Full-Stack",
    docPath: "docs/full-stack/cicd-preview-deployments/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'agent-rag-harness': {
    name: "Agent & RAG Streaming Harness",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/agent-rag-harness/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'agent-supervisor': {
    name: "Multi-Agent Supervisor Pattern",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/multi-agent-supervisor/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'agent-react-loop': {
    name: "ReAct Tool-Calling Engine",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/react-tool-calling/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'agent-hitl': {
    name: "Human-in-the-Loop Approval State",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/human-in-the-loop/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'agent-memory': {
    name: "Agent Memory Architecture",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/agent-memory/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'agent-observability': {
    name: "Observability & Distributed Tracing",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/observability/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'agent-evals': {
    name: "Agent Evaluation & Testing Framework",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/agent-evals/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'agent-streaming-ui': {
    name: "Real-Time Streaming Agent UI & Protocol",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/streaming-agent-ui/overview.md",
    dependencies: [],
    defaultFilename: "Component.tsx",
  },
  'agent-security': {
    name: "Agent Security & Guardrails",
    pillar: "AI Agents",
    docPath: "docs/ai-agents/security-guardrails/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'rag-hybrid': {
    name: "Hybrid Search & Reranking Architecture",
    pillar: "RAG Systems",
    docPath: "docs/rag-systems/hybrid-search-reranking/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'rag-chunking': {
    name: "Advanced Document Chunking Strategies",
    pillar: "RAG Systems",
    docPath: "docs/rag-systems/advanced-chunking/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'rag-graphrag': {
    name: "GraphRAG & Knowledge Graphs",
    pillar: "RAG Systems",
    docPath: "docs/rag-systems/graphrag-knowledge-graphs/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'rag-corrective': {
    name: "Corrective RAG (CRAG) & Self-Reflection",
    pillar: "RAG Systems",
    docPath: "docs/rag-systems/corrective-rag/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'rag-evals': {
    name: "RAG Evaluation & Benchmarking",
    pillar: "RAG Systems",
    docPath: "docs/rag-systems/rag-evaluation/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'rag-multimodal': {
    name: "Multi-Modal RAG & Vision Document Parsing",
    pillar: "RAG Systems",
    docPath: "docs/rag-systems/multimodal-rag/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'ml-vllm': {
    name: "High-Throughput LLM Serving (vLLM)",
    pillar: "ML & Deep Learning",
    docPath: "docs/ml-deeplearning/vllm-inference-serving/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'ml-qlora': {
    name: "LoRA & QLoRA Fine-Tuning Pipeline",
    pillar: "ML & Deep Learning",
    docPath: "docs/ml-deeplearning/lora-qlora-finetuning/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'ml-dpo': {
    name: "Preference Alignment & DPO",
    pillar: "ML & Deep Learning",
    docPath: "docs/ml-deeplearning/preference-alignment-dpo/overview.md",
    dependencies: [],
    defaultFilename: "main.py",
  },
  'ml-quantization': {
    name: "Model Quantization & Compression",
    pillar: "ML & Deep Learning",
    docPath: "docs/ml-deeplearning/model-quantization/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'ml-embeddings': {
    name: "Embedding & Reranker Fine-Tuning",
    pillar: "ML & Deep Learning",
    docPath: "docs/ml-deeplearning/embedding-finetuning/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'ml-redteam': {
    name: "Model Evaluation, Benchmarking & Red-Teaming",
    pillar: "ML & Deep Learning",
    docPath: "docs/ml-deeplearning/model-eval-redteaming/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'sys-rate-limiter': {
    name: "Distributed Rate Limiter & Token Bucket",
    pillar: "System Design",
    docPath: "docs/system-design/distributed-rate-limiter/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'sys-payment-ledger': {
    name: "Idempotent Payment Ledger Architecture",
    pillar: "System Design",
    docPath: "docs/system-design/idempotent-payment-ledger/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'sys-outbox-cdc': {
    name: "Transactional Outbox & Change Data Capture (CDC)",
    pillar: "System Design",
    docPath: "docs/system-design/transactional-outbox-cdc/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'sys-caching': {
    name: "Distributed Caching & Invalidation Architecture",
    pillar: "System Design",
    docPath: "docs/system-design/distributed-caching/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'sys-locks': {
    name: "Distributed Locks & Fencing Tokens",
    pillar: "System Design",
    docPath: "docs/system-design/distributed-locks/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'sys-cqrs': {
    name: "CQRS & Event Sourcing Architecture",
    pillar: "System Design",
    docPath: "docs/system-design/cqrs-event-sourcing/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'sys-saga-orchestrator': {
    name: "Distributed Saga Pattern: Orchestrator vs Choreography",
    pillar: "System Design",
    docPath: "docs/system-design/distributed-saga-orchestrator/overview.md",
    dependencies: [],
    defaultFilename: "main.py",
  },
  'sys-circuit-breaker': {
    name: "Circuit Breaker & Bulkhead Isolation",
    pillar: "System Design",
    docPath: "docs/system-design/circuit-breaker-bulkhead/overview.md",
    dependencies: [],
    defaultFilename: "main.go",
  },
  'sys-consistent-hashing': {
    name: "Database Sharding Ring & Consistent Hashing",
    pillar: "System Design",
    docPath: "docs/system-design/database-sharding-consistent-hashing/overview.md",
    dependencies: [],
    defaultFilename: "index.ts",
  },
  'sys-api-gateway': {
    name: "Cloud-Native API Gateway & Reverse Proxy",
    pillar: "System Design",
    docPath: "docs/system-design/api-gateway-reverse-proxy/overview.md",
    dependencies: [],
    defaultFilename: "main.go",
  },
};

// Aliases for quick typing
const ALIASES = {
  'rate-limiter': 'sys-rate-limiter',
  'ratelimit': 'sys-rate-limiter',
  'ledger': 'sys-payment-ledger',
  'outbox': 'sys-outbox-cdc',
  'caching': 'sys-caching',
  'locks': 'sys-locks',
  'cqrs': 'sys-cqrs',
  'saga': 'sys-saga-orchestrator',
  'orchestrator': 'sys-saga-orchestrator',
  'circuit-breaker': 'sys-circuit-breaker',
  'breaker': 'sys-circuit-breaker',
  'bulkhead': 'sys-circuit-breaker',
  'sharding': 'sys-consistent-hashing',
  'consistent-hash': 'sys-consistent-hashing',
  'hash-ring': 'sys-consistent-hashing',
  'api-gateway': 'sys-api-gateway',
  'gateway': 'sys-api-gateway',
  'reverse-proxy': 'sys-api-gateway',
  'supervisor': 'agent-supervisor',
  'agent': 'agent-supervisor',
  'react-loop': 'agent-react-loop',
  'memory': 'agent-memory',
  'hitl': 'agent-hitl',
  'hybrid-search': 'rag-hybrid',
  'vllm': 'ml-vllm',
  'dpo': 'ml-dpo',
  'go': 'backend-go-fiber',
  'clean-arch': 'backend-go-clean-ddd',
  'worker-pool': 'backend-go-worker-pool',
  'fastapi': 'backend-python-fastapi-async',
  'temporal': 'backend-python-temporal',
  'rust': 'backend-rust-axum',
  'rust-actor': 'backend-rust-actor',
  'actor': 'backend-rust-actor',
  'actor-pipeline': 'backend-rust-actor',
  'rust-wasm': 'backend-rust-wasm',
  'wasm': 'backend-rust-wasm',
  'wasm-edge': 'backend-rust-wasm',
  'kafka-dlq': 'backend-java-kafka-dlq',
  'dlq': 'backend-java-kafka-dlq',
  'spring-kafka': 'backend-java-kafka-dlq',
  'nestjs-clean': 'backend-nestjs-clean',
  'nestjs': 'backend-nestjs-clean',
  'nest-cqrs': 'backend-nestjs-clean',
  'multi-tenant': 'fullstack-multi-tenant',
  'stripe': 'fullstack-stripe',
  'modals': 'ui-modals',
  'modal': 'ui-modals',
  'tables': 'ui-tables',
  'table': 'ui-tables',
};

function printBanner() {
  console.log(`
${cyan('╔═══════════════════════════════════════════════════════════════╗')}
${cyan('║')}  ${bold('Software Blueprints CLI')} ${dim('• Production Architecture Scaffolder')}  ${cyan('║')}
${cyan('╚═══════════════════════════════════════════════════════════════╝')}
`);
}

function printUsage() {
  printBanner();
  console.log(`${bold('USAGE:')}
  ${green('npx software-blueprints')} ${cyan('add')} <blueprint-id>
  ${green('npx software-blueprints')} ${cyan('list')}
  ${green('npx software-blueprints')} ${cyan('info')} <blueprint-id>

${bold('EXAMPLES:')}
  ${dim('$')} npx software-blueprints add sys-rate-limiter
  ${dim('$')} npx software-blueprints add agent-supervisor
  ${dim('$')} npx software-blueprints add ui-modals
  ${dim('$')} npx software-blueprints add fullstack-multi-tenant
`);
}

function listBlueprints() {
  printBanner();
  console.log(bold('AVAILABLE PRODUCTION BLUEPRINTS:\n'));

  const grouped = {};
  for (const [id, meta] of Object.entries(BLUEPRINT_MAP)) {
    if (!grouped[meta.pillar]) grouped[meta.pillar] = [];
    grouped[meta.pillar].push({ id, ...meta });
  }

  for (const [pillar, items] of Object.entries(grouped)) {
    console.log(`${magenta(bold(`[ ${pillar.toUpperCase()} ]`))}`);
    items.forEach((item) => {
      console.log(`  ${cyan(item.id.padEnd(26))} ${dim('→')} ${item.name}`);
    });
    console.log('');
  }

  console.log(dim(`Scaffold any blueprint: npx software-blueprints add <id>\n`));
}

function extractCodeBlocks(markdownContent) {
  const codeBlockRegex = /```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  while ((match = codeBlockRegex.exec(markdownContent)) !== null) {
    const lang = (match[1] || '').trim().toLowerCase();
    const code = match[2].trim();
    if (lang !== 'mermaid' && code.length > 50) {
      blocks.push({ lang, code });
    }
  }
  return blocks;
}

function addBlueprint(blueprintId) {
  const resolvedId = ALIASES[blueprintId] || blueprintId;
  const meta = BLUEPRINT_MAP[resolvedId];

  if (!meta) {
    printBanner();
    console.error(`\x1b[31mError:\x1b[0m Blueprint "${blueprintId}" not found.\n`);
    console.log(`Run ${cyan('npx software-blueprints list')} to see all available blueprints.\n`);
    process.exit(1);
  }

  printBanner();
  console.log(`${dim('Scaffolding:')} ${bold(meta.name)} (${cyan(resolvedId)})`);
  console.log(`${dim('Pillar:')}      ${meta.pillar}`);

  // Resolve source document
  // Search in current directory, parent directory, or global package
  const possiblePaths = [
    path.resolve(__dirname, '..', meta.docPath),
    path.resolve(process.cwd(), meta.docPath),
  ];

  let docContent = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      docContent = fs.readFileSync(p, 'utf8');
      break;
    }
  }

  // Target output directory in user project
  const targetDir = meta.pillar === 'Frontend React'
    ? path.join(process.cwd(), 'components', 'ui')
    : path.join(process.cwd(), 'blueprints', resolvedId);

  fs.mkdirSync(targetDir, { recursive: true });

  const targetFile = path.join(targetDir, meta.defaultFilename);

  if (docContent) {
    const codeBlocks = extractCodeBlocks(docContent);
    if (codeBlocks.length > 0) {
      // Write primary code block
      const primary = codeBlocks[0];
      fs.writeFileSync(targetFile, primary.code, 'utf8');

      // If there is an SQL schema or second block, write that too
      const sqlBlock = codeBlocks.find((b) => b.lang === 'sql');
      if (sqlBlock && meta.defaultFilename !== 'schema.sql') {
        const schemaFile = path.join(targetDir, 'schema.sql');
        fs.writeFileSync(schemaFile, sqlBlock.code, 'utf8');
      }

      // Write companion README
      const readmePath = path.join(targetDir, 'README.md');
      const readmeContent = `# ${meta.name}\n\n**Pillar:** ${meta.pillar}\n\n## Dependencies\n\`\`\`bash\n${meta.dependencies.length > 0 ? `npm install ${meta.dependencies.join(' ')}` : '# Zero external dependencies'}\n\`\`\`\n\n## Integration\nImport and configure \`${meta.defaultFilename}\` into your service.\n`;
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
    }
  } else {
    // Fallback template
    fs.writeFileSync(targetFile, `// Production Blueprint: ${meta.name}\n// Generated by Software Blueprints CLI\n\nexport default {};\n`, 'utf8');
  }

  console.log(`\n${green('✔ Successfully scaffolded files:')}`);
  console.log(`  ${green('+')} ${path.relative(process.cwd(), targetFile)}`);
  console.log(`  ${green('+')} ${path.relative(process.cwd(), path.join(targetDir, 'README.md'))}`);

  if (meta.dependencies && meta.dependencies.length > 0) {
    console.log(`\n${bold('Next step:')} Install required dependencies:`);
    console.log(`  ${cyan(`npm install ${meta.dependencies.join(' ')}`)}\n`);
  } else {
    console.log(`\n${green('✔ No external dependencies required!')}\n`);
  }
}

// Main CLI Entry
const args = process.argv.slice(2);
const command = args[0];
const target = args[1];

if (!command || command === '--help' || command === '-h') {
  printUsage();
} else if (command === 'list' || command === 'ls') {
  listBlueprints();
} else if (command === 'add' && target) {
  addBlueprint(target);
} else if (command === 'add' && !target) {
  console.log(`\x1b[31mError:\x1b[0m Please specify a blueprint ID.\nExample: ${cyan('npx software-blueprints add sys-rate-limiter')}\n`);
  listBlueprints();
} else if (command === 'info' && target) {
  const resolvedId = ALIASES[target] || target;
  const meta = BLUEPRINT_MAP[resolvedId];
  if (meta) {
    printBanner();
    console.log(`${bold('Blueprint:')}    ${meta.name}`);
    console.log(`${bold('ID:')}           ${cyan(resolvedId)}`);
    console.log(`${bold('Pillar:')}       ${meta.pillar}`);
    console.log(`${bold('Dependencies:')} ${meta.dependencies.join(', ') || 'None'}\n`);
  } else {
    console.error(`Blueprint "${target}" not found.`);
  }
} else {
  // If user directly typed a blueprint id like `npx software-blueprints sys-rate-limiter`
  if (BLUEPRINT_MAP[command] || ALIASES[command]) {
    addBlueprint(command);
  } else {
    printUsage();
  }
}

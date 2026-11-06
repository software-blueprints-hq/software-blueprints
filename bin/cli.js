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
  // System Design
  'sys-rate-limiter': {
    name: 'Distributed Rate Limiter & Token Bucket',
    pillar: 'System Design',
    docPath: 'docs/system-design/distributed-rate-limiter/overview.md',
    dependencies: ['ioredis'],
    defaultFilename: 'rateLimiter.ts',
  },
  'sys-payment-ledger': {
    name: 'Idempotent Payment Ledger',
    pillar: 'System Design',
    docPath: 'docs/system-design/idempotent-payment-ledger/overview.md',
    dependencies: ['pg', '@types/pg'],
    defaultFilename: 'ledger.ts',
  },
  'sys-outbox-cdc': {
    name: 'Transactional Outbox & CDC Pattern',
    pillar: 'System Design',
    docPath: 'docs/system-design/transactional-outbox-cdc/overview.md',
    dependencies: ['pg', 'kafkajs'],
    defaultFilename: 'outbox.ts',
  },
  'sys-caching': {
    name: 'Multi-Tier Distributed Caching (XFetch)',
    pillar: 'System Design',
    docPath: 'docs/system-design/distributed-caching/overview.md',
    dependencies: ['ioredis'],
    defaultFilename: 'cache.ts',
  },
  'sys-locks': {
    name: 'Distributed Locks & Redlock Mutex',
    pillar: 'System Design',
    docPath: 'docs/system-design/distributed-locks/overview.md',
    dependencies: ['ioredis'],
    defaultFilename: 'distributedLock.ts',
  },
  'sys-cqrs': {
    name: 'CQRS & Event Sourcing Store',
    pillar: 'System Design',
    docPath: 'docs/system-design/cqrs-event-sourcing/overview.md',
    dependencies: ['pg'],
    defaultFilename: 'eventStore.ts',
  },
  'sys-saga-orchestrator': {
    name: 'Distributed Saga Pattern: Orchestrator vs Choreography',
    pillar: 'System Design',
    docPath: 'docs/system-design/distributed-saga-orchestrator/overview.md',
    dependencies: [],
    defaultFilename: 'saga_orchestrator.py',
  },
  'sys-circuit-breaker': {
    name: 'Circuit Breaker & Bulkhead Isolation',
    pillar: 'System Design',
    docPath: 'docs/system-design/circuit-breaker-bulkhead/overview.md',
    dependencies: [],
    defaultFilename: 'circuit_breaker.go',
  },
  'sys-consistent-hashing': {
    name: 'Database Sharding Ring & Consistent Hashing',
    pillar: 'System Design',
    docPath: 'docs/system-design/database-sharding-consistent-hashing/overview.md',
    dependencies: [],
    defaultFilename: 'consistentHashRing.ts',
  },
  'sys-api-gateway': {
    name: 'Cloud-Native API Gateway & Reverse Proxy',
    pillar: 'System Design',
    docPath: 'docs/system-design/api-gateway-reverse-proxy/overview.md',
    dependencies: ['github.com/golang-jwt/jwt/v5', 'github.com/google/uuid'],
    defaultFilename: 'gateway.go',
  },

  // AI Agents
  'agent-supervisor': {
    name: 'Multi-Agent Supervisor Pattern',
    pillar: 'AI Agents',
    docPath: 'docs/ai-agents/multi-agent-supervisor/overview.md',
    dependencies: ['@langchain/langgraph', '@langchain/core'],
    defaultFilename: 'supervisor.ts',
  },
  'agent-react-loop': {
    name: 'ReAct Agent Tool-Calling Loop',
    pillar: 'AI Agents',
    docPath: 'docs/ai-agents/react-tool-calling/overview.md',
    dependencies: ['zod'],
    defaultFilename: 'reactAgent.ts',
  },
  'agent-memory': {
    name: 'Three-Tier Agent Memory (Short/Episodic/Semantic)',
    pillar: 'AI Agents',
    docPath: 'docs/ai-agents/agent-memory/overview.md',
    dependencies: ['pg', 'pgvector'],
    defaultFilename: 'agentMemory.ts',
  },
  'agent-hitl': {
    name: 'Human-in-the-Loop Approval Checkpoints',
    pillar: 'AI Agents',
    docPath: 'docs/ai-agents/human-in-the-loop/overview.md',
    dependencies: ['@langchain/langgraph'],
    defaultFilename: 'hitlWorkflow.ts',
  },

  // RAG Systems
  'rag-hybrid': {
    name: 'Hybrid Search & Reciprocal Rank Fusion',
    pillar: 'RAG Systems',
    docPath: 'docs/rag-systems/hybrid-search-reranking/overview.md',
    dependencies: ['pg', 'pgvector'],
    defaultFilename: 'hybridSearch.ts',
  },
  'rag-chunking': {
    name: 'Semantic & Parent-Child Document Chunking',
    pillar: 'RAG Systems',
    docPath: 'docs/rag-systems/advanced-chunking/overview.md',
    dependencies: [],
    defaultFilename: 'semanticChunker.ts',
  },

  // ML / Deep Learning
  'ml-vllm': {
    name: 'vLLM High-Throughput Inference Client',
    pillar: 'ML & Deep Learning',
    docPath: 'docs/ml-deeplearning/vllm-inference-serving/overview.md',
    dependencies: ['openai'],
    defaultFilename: 'vllmClient.ts',
  },
  'ml-dpo': {
    name: 'Direct Preference Optimization (DPO) Harness',
    pillar: 'ML & Deep Learning',
    docPath: 'docs/ml-deeplearning/preference-alignment-dpo/overview.md',
    dependencies: ['trl', 'transformers'],
    defaultFilename: 'dpo_trainer.py',
  },

  // Backend
  'backend-go-fiber': {
    name: 'Go Fiber Microservice & Redis Streams',
    pillar: 'Backend',
    docPath: 'docs/backend/golang-microservices/overview.md',
    dependencies: ['github.com/gofiber/fiber/v2', 'github.com/redis/go-redis/v9'],
    defaultFilename: 'main.go',
  },
  'backend-go-clean-ddd': {
    name: 'Go Clean Architecture & Domain-Driven Design (DDD)',
    pillar: 'Backend',
    docPath: 'docs/backend/golang-clean-architecture/overview.md',
    dependencies: ['github.com/jackc/pgx/v5', 'github.com/go-chi/chi/v5'],
    defaultFilename: 'order_interactor.go',
  },
  'backend-go-worker-pool': {
    name: 'Go High-Concurrency Bounded Worker Pool',
    pillar: 'Backend',
    docPath: 'docs/backend/golang-worker-pool/overview.md',
    dependencies: [],
    defaultFilename: 'workerpool.go',
  },
  'backend-python-fastapi-async': {
    name: 'Async FastAPI Microservice (asyncpg & Pydantic v2)',
    pillar: 'Backend',
    docPath: 'docs/backend/python-fastapi-async/overview.md',
    dependencies: ['fastapi', 'uvicorn[standard]', 'asyncpg', 'redis'],
    defaultFilename: 'main.py',
  },
  'backend-python-temporal': {
    name: 'Temporal.io Resilient Workflows (Python SDK)',
    pillar: 'Backend',
    docPath: 'docs/backend/python-temporal-workflows/overview.md',
    dependencies: ['temporalio'],
    defaultFilename: 'workflows.py',
  },
  'backend-rust-axum': {
    name: 'Rust Axum Async Microservice',
    pillar: 'Backend',
    docPath: 'docs/backend/rust-axum/overview.md',
    dependencies: ['axum', 'tokio', 'sqlx'],
    defaultFilename: 'main.rs',
  },

  // Full-Stack
  'fullstack-multi-tenant': {
    name: 'Multi-Tenant PostgreSQL Row-Level Security',
    pillar: 'Full-Stack',
    docPath: 'docs/full-stack/multi-tenant-saas/overview.md',
    dependencies: ['drizzle-orm', 'pg'],
    defaultFilename: 'tenantContext.ts',
  },
  'fullstack-stripe': {
    name: 'Stripe Subscriptions & Webhook Ledger',
    pillar: 'Full-Stack',
    docPath: 'docs/full-stack/stripe-billing-subscriptions/overview.md',
    dependencies: ['stripe'],
    defaultFilename: 'stripeWebhook.ts',
  },

  // Frontend React
  'ui-modals': {
    name: 'Accessible Modals, Dialogs & Drawers',
    pillar: 'Frontend React',
    docPath: 'docs/frontend/react/modals.mdx',
    dependencies: [],
    defaultFilename: 'Modal.tsx',
  },
  'ui-tables': {
    name: 'Sortable Data Table with Pagination',
    pillar: 'Frontend React',
    docPath: 'docs/frontend/react/tables.mdx',
    dependencies: [],
    defaultFilename: 'DataTable.tsx',
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

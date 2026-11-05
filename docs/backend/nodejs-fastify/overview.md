---
sidebar_position: 1
title: "Node.js & Fastify Enterprise Architecture"
description: "High-throughput Node.js & TypeScript architecture: Fastify HTTP framework, Prisma ORM, BullMQ Redis distributed worker queues, and PostgreSQL."
---

# Node.js & Fastify Enterprise Architecture

While Express.js remains historically ubiquitous, its legacy middleware architecture and lack of built-in schema serialization introduce severe performance overhead under high load. **Fastify** delivers up to **4x higher request throughput** than Express through compiled JSON schema serialization (via `fast-json-stringify`), zero-allocation route matching (radix trees), and native async/await plugin encapsulation.

This blueprint implements a modern **Enterprise TypeScript Backend** integrating **Fastify**, **Prisma ORM**, **BullMQ distributed worker queues**, and **PostgreSQL**.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Ingress ["1. Ingress & API Gateway"]
        Client["Web / Mobile API Consumers"]
        FastifyApp["Fastify HTTP Engine\n(Radix Tree Router, Ajv JSON Schema Validation)"]
    end

    subgraph AppPlugins ["2. Modular Plugin Architecture"]
        AuthPlugin["@fastify/jwt & Authentication Guard"]
        RatePlugin["@fastify/rate-limit (Redis Store)"]
        SensiblePlugin["@fastify/sensible (HTTP Error Standards)"]
    end

    subgraph StorageLayer ["3. Database & ORM Tier"]
        PrismaClient["Prisma ORM Client\n(Connection Pooling, Query Engine)"]
        PostgresDB[("PostgreSQL 16 Primary Database")]
    end

    subgraph AsynchronousTier ["4. Background Queue & Workers"]
        BullMQQueue["BullMQ Job Queue (Producer)"]
        RedisStore[("Redis Cluster (Job State & Delays)")]
        WorkerProcess["Dedicated BullMQ Worker Fleets\n(Concurrency = 10, Auto-Retries)"]
    end

    Client --> FastifyApp
    FastifyApp --> AuthPlugin
    FastifyApp --> RatePlugin
    FastifyApp --> SensiblePlugin
    
    FastifyApp --> PrismaClient
    PrismaClient --> PostgresDB

    FastifyApp --> BullMQQueue
    BullMQQueue --> RedisStore
    RedisStore --> WorkerProcess
    WorkerProcess --> PrismaClient
```

---

## 2. Fastify Server Bootstrap & Schema Validation

Fastify achieves peak performance by pre-compiling JSON validation and serialization schemas with Ajv:

```typescript
// src/server.ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { orderRoutes } from './modules/orders/order.routes';
import { prisma } from './infrastructure/database';
import { closeQueueConnections } from './infrastructure/queue';

const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
    trustProxy: true,
  });

  // 1. Core Security Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(sensible);
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'super-secret-key-min-32-chars' });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // 2. Health & Readiness Probes
  app.get('/health', async () => ({ status: 'UP', timestamp: new Date().toISOString() }));
  app.get('/ready', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { database: 'CONNECTED' };
  });

  // 3. Domain Modules
  await app.register(orderRoutes, { prefix: '/api/v1/orders' });

  // 4. Graceful Shutdown Handlers
  const gracefulShutdown = async () => {
    app.log.info('Graceful shutdown initiated...');
    await app.close();
    await prisma.$disconnect();
    await closeQueueConnections();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return app;
};

// Start Server
buildServer().then((server) => {
  server.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
});
```

---

## 3. Route Controller with Pre-Compiled Schemas

```typescript
// src/modules/orders/order.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../infrastructure/database';
import { orderQueue } from '../../infrastructure/queue';

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Input and output schema definition for compile-time and run-time validation
  const createOrderSchema = {
    body: {
      type: 'object',
      required: ['customerId', 'totalCents', 'items'],
      properties: {
        customerId: { type: 'string', format: 'uuid' },
        totalCents: { type: 'integer', minimum: 1 },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['sku', 'quantity'],
            properties: {
              sku: { type: 'string' },
              quantity: { type: 'integer', minimum: 1 },
            },
          },
        },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string' },
          totalCents: { type: 'integer' },
        },
      },
    },
  };

  fastify.post('/', { schema: createOrderSchema }, async (request, reply) => {
    const { customerId, totalCents, items } = request.body as any;

    // Database transaction
    const order = await prisma.order.create({
      data: {
        customerId,
        totalCents,
        status: 'PENDING',
        items: {
          create: items.map((i: any) => ({ sku: i.sku, quantity: i.quantity })),
        },
      },
    });

    // Enqueue background processing job
    await orderQueue.add(
      'processFulfillment',
      { orderId: order.id },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      }
    );

    return reply.status(201).send(order);
  });
};
```

---

## 4. BullMQ Distributed Background Worker Fleet

```typescript
// src/workers/orderFulfillment.worker.ts
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../infrastructure/database';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const orderWorker = new Worker(
  'orderQueue',
  async (job: Job<{ orderId: string }>) => {
    const { orderId } = job.data;
    console.log(`[Worker] Processing fulfillment for order ${orderId} (Attempt: ${job.attemptsMade + 1})`);

    // Execute payment and inventory allocation
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });

    console.log(`[Worker] Order ${orderId} successfully fulfilled.`);
  },
  {
    connection: redisConnection,
    concurrency: 10, // Process 10 concurrent jobs per worker process
  }
);

orderWorker.on('failed', (job, err) => {
  console.error(`[Worker Error] Job ${job?.id} failed with: ${err.message}`);
});
```

---

## 5. Production Hardening Checklist

- [ ] **Strict Ajv Coercion**: Set `ajv: { customOptions: { coerceTypes: false } }` in Fastify options to prevent accidental string-to-number mutations in query parameters.
- [ ] **Prisma Connection Pool Scaling**: Configure `DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"` to match container CPU cores and prevent pool exhaustion.
- [ ] **Clustering with PM2 / Docker**: Run Node.js with PM2 in cluster mode (`pm2 start dist/server.js -i max`) or deploy multiple single-threaded Docker container replicas behind a load balancer.
- [ ] **Isolate Worker Processes from Web Containers**: Never run BullMQ workers in the same OS process as the Fastify HTTP server. Heavy background computations will block the Node.js event loop and degrade HTTP response latencies.

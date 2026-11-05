---
sidebar_position: 9
title: "Async FastAPI Microservice: asyncpg & Pydantic v2"
description: "Production async Python architecture: high-throughput FastAPI, uvloop, asyncpg connection pooling, Pydantic v2 validation, and Redis cache-aside."
---

# Async FastAPI Microservice: asyncpg & Pydantic v2

<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '1rem 0 2rem 0' }}>
  <span style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700, color: '#00f0ff' }}>Python 3.11+</span>
  <span style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700, color: '#c084fc' }}>FastAPI 0.110+ & Pydantic v2</span>
  <span style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700, color: '#34d399' }}>asyncpg (Sub-2ms)</span>
  <span style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontFamily: 'monospace', color: '#cbd5e1' }}>npx software-blueprints add backend-python-fastapi-async</span>
</div>

Standard synchronous Python web frameworks (Flask, legacy Django) waste hundreds of megabytes of memory running dozens of pre-forked worker processes to handle concurrent I/O. When using async frameworks like FastAPI, using synchronous ORMs (like non-async SQLAlchemy or psycopg2) **blocks the entire asyncio event loop**, destroying concurrency.

This blueprint implements a **high-throughput asynchronous FastAPI microservice** utilizing **`asyncpg`** (the fastest PostgreSQL driver for Python, written in Cython), **Pydantic v2** (compiled Rust core validation), **Redis cache-aside**, and **async lifespan connection pooling**.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Client ["1. Ingress"]
        HTTPClient["HTTP/JSON Client (Keep-Alive)"]
    end

    subgraph ASGIRuntime ["2. ASGI Event Loop (uvloop)"]
        Uvicorn["Uvicorn Server (uvloop engine)"]
        CorrelationMW["Correlation ID Middleware\n(x-request-id Injection)"]
        FastAPIRouter["FastAPI 0.110 Router\n(Dependency Injection Container)"]
        PydanticV2["Pydantic v2 (Rust Core)\nZero-Copy Schema Validation"]
    end

    subgraph DataStorage ["3. Async Connection Pools"]
        RedisCache[("Redis 7.2 (redis-py async)\nSub-Millisecond L2 Cache")]
        AsyncPGPool[("asyncpg.Pool (PostgreSQL 16)\nBinary Protocol, Prepared Statements")]
    end

    HTTPClient --> Uvicorn
    Uvicorn --> CorrelationMW
    CorrelationMW --> FastAPIRouter
    FastAPIRouter --> PydanticV2
    FastAPIRouter -->|Cache Check| RedisCache
    FastAPIRouter -->|Cache Miss / Write| AsyncPGPool
```

---

## 2. Production Code Implementation (`main.py`)

Save this complete, production-hardened microservice:

```python
import os
import time
import uuid
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, List
from datetime import datetime, timezone

import asyncpg
import redis.asyncio as aioredis
from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr

# ---------------------------------------------------------------------------
# 1. Structured Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger("api")

# ---------------------------------------------------------------------------
# 2. Pydantic v2 Domain & Request/Response Schemas (Rust-Compiled Core)
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    organization_id: str = Field(min_length=3, max_length=64)

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    organization_id: str
    created_at: datetime
    is_active: bool

# ---------------------------------------------------------------------------
# 3. Application State & Async Lifespan Management
# ---------------------------------------------------------------------------
class AppState:
    db_pool: asyncpg.Pool
    redis_client: aioredis.Redis

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize connection pools
    db_url = os.getenv("DATABASE_URL", "postgresql://blueprint_user:blueprint_password@localhost:5432/blueprints_db")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    logger.info("Initializing asyncpg PostgreSQL pool...")
    state.db_pool = await asyncpg.create_pool(
        dsn=db_url,
        min_size=10,
        max_size=50,
        max_queries=50000,
        max_inactive_connection_lifetime=300.0,
        command_timeout=10.0,
    )

    logger.info("Initializing Redis async client...")
    state.redis_client = aioredis.from_url(redis_url, encoding="utf-8", decode_responses=True)

    # Ensure schema table exists
    async with state.db_pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(64) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                organization_id VARCHAR(64) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT true
            );
            CREATE INDEX IF NOT EXISTS idx_users_org ON users (organization_id);
        """)

    yield

    # Teardown: Close pools gracefully on SIGTERM
    logger.info("Draining and closing asyncpg pool...")
    await state.db_pool.close()
    await state.redis_client.close()
    logger.info("All connection pools closed.")

app = FastAPI(title="Async FastAPI Service", version="1.0.0", lifespan=lifespan)

# ---------------------------------------------------------------------------
# 4. Correlation ID & Latency Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    req_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    start_time = time.perf_counter()
    
    response: Response = await call_next(request)
    
    duration_ms = (time.perf_counter() - start_time) * 1000
    response.headers["x-request-id"] = req_id
    response.headers["x-response-time"] = f"{duration_ms:.2f}ms"
    
    logger.info(f'{{"path": "{request.url.path}", "method": "{request.method}", "status": {response.status_code}, "latency_ms": {duration_ms:.2f}, "request_id": "{req_id}"}}')
    return response

# ---------------------------------------------------------------------------
# 5. Dependency Injection Providers
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    async with state.db_pool.acquire() as connection:
        yield connection

async def get_redis() -> aioredis.Redis:
    return state.redis_client

# ---------------------------------------------------------------------------
# 6. High-Throughput Async Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/v1/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: asyncpg.Connection = Depends(get_db),
    cache: aioredis.Redis = Depends(get_redis),
):
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    try:
        query = """
            INSERT INTO users (id, email, full_name, organization_id, created_at, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, full_name, organization_id, created_at, is_active
        """
        row = await db.fetchrow(query, user_id, payload.email, payload.full_name, payload.organization_id, now, True)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail=f"User with email '{payload.email}' already exists")

    # Invalidate cache for org list
    await cache.delete(f"org:{payload.organization_id}:users")

    return dict(row)

@app.get("/api/v1/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: asyncpg.Connection = Depends(get_db),
    cache: aioredis.Redis = Depends(get_redis),
):
    # 1. Check Redis Cache
    cache_key = f"user:{user_id}"
    cached_data = await cache.get(cache_key)
    if cached_data:
        return UserResponse.model_validate_json(cached_data)

    # 2. Database Fallback (Prepared Statement via asyncpg)
    row = await db.fetchrow("SELECT id, email, full_name, organization_id, created_at, is_active FROM users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    user_obj = UserResponse(**dict(row))
    # Cache for 10 minutes
    await cache.setex(cache_key, 600, user_obj.model_dump_json())

    return user_obj

@app.get("/healthz")
async def health_check():
    return {"status": "ok", "db": state.db_pool.get_size(), "idle": state.db_pool.get_idle_size()}
```

---

## 3. Running with uvloop in Production

Run using Uvicorn with standard production flags:

```bash
uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --loop uvloop \
  --http httptools \
  --no-access-log
```

---

## 4. Production Hardening Checklist

| Verification Item | Target Standard | Failure Mode Prevented |
| :--- | :--- | :--- |
| **No Synchronous I/O in Async Loop** | Zero calls to `time.sleep()`, synchronous `requests`, or raw file I/O | Prevents complete starvation of all concurrent HTTP requests |
| **Connection Pool Bounds** | `min_size=10, max_size=50` on `asyncpg.create_pool` | Eliminates connection storms on PostgreSQL while preventing pool starvation |
| **Cython Binary Protocol** | Prepared statements executed via native binary protocol (`$1, $2`) | Delivers 3x higher throughput than text-protocol psycopg2 drivers |
| **Graceful Pool Teardown** | Connection pool closed inside `@asynccontextmanager lifespan` | Prevents orphaned active backend connections during rolling deploys |
| **Rust Schema Validation** | Pydantic v2 `BaseModel` for all request bodies | Eliminates Python object allocation overhead on request ingestion |

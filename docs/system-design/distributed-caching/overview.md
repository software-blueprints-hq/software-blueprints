---
sidebar_position: 1
title: "Distributed Caching & Invalidation Architecture"
description: "Multi-tier caching architecture: Cache-Aside vs Write-Through, Single-Flight cache stampede mitigation, and probabilistic XFetch early expiration."
---

# Distributed Caching & Invalidation Architecture

Caches are critical for meeting sub-10ms response latencies at scale, but naive caching implementations introduce severe production outages: **Cache Stampedes (Thundering Herd)** on key expiration, **Stale Data Inconsistencies** during concurrent updates, and **Cascading Database Failures** when caches restart cold.

This blueprint implements a production multi-tier caching architecture (L1 In-Process + L2 Redis Cluster) with **Single-Flight request coalescing** and the **XFetch probabilistic early expiration algorithm**.

---

## 1. Multi-Tier Caching Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Traffic"]
        Req["Concurrent Ingress Requests\n(10,000 req/sec for Hot Product SKU)"]
    end

    subgraph AppServer ["Application Node"]
        L1["L1 In-Memory Cache (LRU / Ristretto)\n(~50ns latency | Zero network hop)"]
        SingleFlight["Single-Flight Request Coalescer\n(Collapses 1,000 simultaneous misses into 1 call)"]
    end

    subgraph DistributedTier ["Shared Infrastructure"]
        L2[("L2 Redis Cluster\n(~1.5ms latency | Shared state)")]
        DB[("PostgreSQL Primary Database\n(~20ms latency | System of Record)")]
    end

    Req --> L1
    L1 -->|Cache Hit: 95%| ReturnL1["Return Value (~50ns)"]
    L1 -->|Cache Miss: 5%| L2
    
    L2 -->|L2 Hit| PopulateL1["Populate L1 & Return (~1.5ms)"]
    L2 -->|L2 Miss (Key Expired)| SingleFlight
    
    SingleFlight -->|Only 1 Leader Thread| DB
    SingleFlight -.->|Follower Threads Wait| AwaitLeader["Wait for Leader Response"]
    
    DB --> Repopulate["Repopulate L2 & L1"]
    Repopulate --> ReturnL1
```

---

## 2. Caching Patterns Decision Matrix

| Pattern | Read Path | Write Path | Consistency | Primary Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Cache-Aside (Lazy)** | Read cache; on miss, fetch DB & set cache | Write to DB, then delete cache key | Eventual | Brief read of stale data between DB write and cache delete |
| **Write-Through** | Read cache | Write to cache & DB synchronously | High | Added write latency; cold data fills cache |
| **Write-Behind (Back)** | Read cache | Write to cache; async batch flush to DB | Low (Risk of data loss) | Data loss if cache node crashes before DB sync |
| **Refresh-Ahead** | Read cache; background thread refreshes before expiry | Normal write to DB | Very High | Unnecessary compute if access patterns drop |

---

## 3. Cache Stampede Mitigation: Single-Flight Coalescing

When a heavily queried key expires, thousands of threads encounter a cache miss simultaneously, bombarding the primary database with identical queries. **Single-Flight** ensures only one worker executes the database query while all concurrent requests await that worker's result:

```python
"""
Single-Flight Request Deduplicator
File: src/cache/single_flight.py
"""

from __future__ import annotations

import asyncio
from typing import Any, Callable, Dict


class SingleFlightGroup:
    """
    Coalesces duplicate in-flight async calls so that for a given key,
    only one execution runs at a time.
    """
    def __init__(self):
        self._in_flight: Dict[str, asyncio.Future] = {}

    async def do(self, key: str, fn: Callable[[], Any]) -> Any:
        if key in self._in_flight:
            # Another coroutine is already fetching this key; await its result!
            return await self._in_flight[key]

        future = asyncio.get_event_loop().create_future()
        self._in_flight[key] = future

        try:
            result = await fn()
            future.set_result(result)
            return result
        except Exception as exc:
            future.set_exception(exc)
            raise
        finally:
            del self._in_flight[key]
```

---

## 4. Production Multi-Tier Cache with XFetch Algorithm

The **XFetch algorithm** prevents cache stampedes by probabilistically recomputing the cached value slightly before its actual expiration time, with probability proportional to the query load:

`recompute if: -(beta * delta * ln(random())) > (expiry_timestamp - now)`

```python
"""
Multi-Tier Cache Manager with Probabilistic Early Expiration (XFetch)
File: src/cache/tier_cache.py
"""

from __future__ import annotations

import json
import math
import random
import time
from typing import Any, Callable, Optional
import redis.asyncio as redis


class MultiTierCache:
    def __init__(self, redis_client: redis.Redis, single_flight: SingleFlightGroup):
        self.redis = redis_client
        self.sf = single_flight
        self.l1_local_cache: dict[str, tuple[Any, float]] = {}  # In-memory {key: (val, expire_at)}

    async def get_or_set(
        self,
        key: str,
        fetch_from_db: Callable[[], Any],
        ttl_seconds: int = 300,
        beta: float = 1.0
    ) -> Any:
        now = time.time()

        # Step 1: Check L1 In-Memory Cache
        if key in self.l1_local_cache:
            val, expire_at = self.l1_local_cache[key]
            if now < expire_at:
                return val

        # Step 2: Check L2 Redis Cache
        raw_entry = await self.redis.get(key)
        if raw_entry:
            data = json.loads(raw_entry)
            val = data["value"]
            expire_at = data["expire_at"]
            delta = data["compute_time_seconds"]

            # XFetch: Probabilistic early recomputation check
            # As time approaches expire_at, probability of background refresh increases
            should_refresh_early = -(beta * delta * math.log(random.random())) > (expire_at - now)

            if not should_refresh_early:
                # Update L1 and return cached value immediately
                self.l1_local_cache[key] = (val, expire_at)
                return val

        # Step 3: Cache Miss or Early Recompute triggered -> Run via SingleFlight
        async def loader():
            start_t = time.perf_counter()
            fresh_value = await fetch_from_db()
            compute_duration = time.perf_counter() - start_t

            payload = {
                "value": fresh_value,
                "expire_at": time.time() + ttl_seconds,
                "compute_time_seconds": compute_duration
            }

            # Write to L2 Redis with TTL buffer
            await self.redis.set(key, json.dumps(payload), ex=ttl_seconds + 30)

            # Write to L1 In-Memory
            self.l1_local_cache[key] = (fresh_value, time.time() + min(ttl_seconds, 60))
            return fresh_value

        return await self.sf.do(key, loader)
```

---

## 5. Production Hardening Checklist

- [ ] **Always Invalidate, Never Update**: On database writes, always `DELETE` the cache key rather than setting the new value. In high-concurrency environments, setting values directly causes race condition overwrites between interleaved transactions.
- [ ] **Jitter All TTLs**: When populating thousands of items during batch ingestion, add random jitter (`ttl = base_ttl + random.randint(0, 60)`) to prevent synchronized expiration waves.
- [ ] **Cache NULL Values (Negative Caching)**: When a query finds no record in the database, cache a `NULL` sentinel with a short TTL (e.g., 30s) to protect against Cache Penetration attacks (attackers flooding IDs that do not exist).
- [ ] **Max Memory Policy**: Set Redis `maxmemory-policy volatile-lru` or `allkeys-lru` to guarantee graceful key eviction when memory thresholds are reached rather than rejecting write commands with OOM errors.

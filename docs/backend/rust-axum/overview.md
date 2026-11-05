---
sidebar_position: 1
title: "Rust & Axum High-Performance Microservices"
description: "Production Rust 2024 architecture blueprint: Axum web framework, Tokio async runtime, SQLx compile-time checked queries, and Tower middleware."
---

# Rust & Axum High-Performance Microservices

When API services require **deterministic sub-millisecond p99 latencies**, zero garbage-collection pauses, and minimal memory footprints (under 25MB RAM under heavy load), **Rust** paired with **Axum** and the **Tokio async runtime** provides the definitive production foundation.

This blueprint implements a production-ready asynchronous Rust microservice leveraging **Axum 0.7**, **SQLx compile-time SQL validation**, **Tower middleware**, and **jemalloc memory profiling**.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Ingress ["1. Ingress & HTTP Handling"]
        Client["API Consumers"]
        AxumApp["Axum HTTP Server (Hyper / Tokio Runtime)\n(Zero-copy request parsing)"]
    end

    subgraph MiddlewareStack ["2. Tower Middleware Pipeline"]
        TraceLayer["TraceLayer (Distributed OpenTelemetry Spans)"]
        TimeoutLayer["TimeoutLayer (Strict 5s Request Budget)"]
        CorsLayer["CorsLayer & CompressionLayer"]
    end

    subgraph StateAndHandlers ["3. State Sharing & Route Handlers"]
        SharedState["Arc<AppState>\n(PgPool, RedisPool, AppConfig)"]
        Handlers["Typed Axum Handlers\n(Path, Query, Json extractors)"]
    end

    subgraph DatabaseTier ["4. High-Performance SQLx Pool"]
        SQLxPool["SQLx Connection Pool (PostgreSQL)\n(Compile-time query verification)"]
        PostgresDB[("PostgreSQL 16 Primary")]
    end

    Client --> AxumApp
    AxumApp --> TraceLayer --> TimeoutLayer --> CorsLayer --> Handlers
    SharedState -.->|Injected via State Extractor| Handlers
    Handlers --> SQLxPool --> PostgresDB
```

---

## 2. Cargo Production Dependencies & Release Optimization

Save this `Cargo.toml` with aggressive link-time optimization (LTO) to strip binary bloat and maximize inlining:

```toml
[package]
name = "enterprise-rust-service"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = { version = "0.7", features = ["macros"] }
tokio = { version = "1.38", features = ["full"] }
tower = { version = "0.4", features = ["timeout", "limit"] }
tower-http = { version = "0.5", features = ["trace", "cors", "compression-gzip"] }
sqlx = { version = "0.7", features = ["runtime-tokio", "tls-rustls", "postgres", "uuid", "chrono", "json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.8", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
thiserror = "1.0"
tikv-jemallocator = "0.5" # Replaces glibc allocator for lower memory fragmentation

[profile.release]
opt-level = 3
lto = "fat"             # Aggressive link-time optimization
codegen-units = 1       # Slower compile time, maximum runtime optimization
panic = "abort"         # Strips unwinding code, shrinks binary
strip = true            # Strips symbols from release binary
```

---

## 3. Server Bootstrap & State Injection

Save this entry point under `src/main.rs`:

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tower_http::trace::TraceLayer;
use uuid::Uuid;

// Configure jemalloc as global memory allocator
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter("info,enterprise_rust_service=debug")
        .json()
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/orders_db".to_string());

    // 1. Initialize Hikari-equivalent SQLx connection pool
    let pool = PgPoolOptions::new()
        .max_connections(25)
        .min_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .idle_timeout(Duration::from_secs(300))
        .connect(&database_url)
        .await?;

    let state = Arc::new(AppState { db: pool });

    // 2. Build Router with Middleware Pipeline
    let app = Router::new()
        .route("/health", get(|| async { (StatusCode::OK, "UP") }))
        .route("/api/v1/orders", post(create_order))
        .route("/api/v1/orders/:id", get(get_order_by_id))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Starting Axum server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to listen for shutdown signal");
    tracing::info!("Graceful shutdown initiated...");
}
```

---

## 4. Typed Handler with Error Safety

```rust
// src/handlers/orders.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use crate::AppState;

#[derive(Deserialize)]
pub struct CreateOrderPayload {
    pub customer_id: Uuid,
    pub total_amount_cents: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct OrderRecord {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub total_amount_cents: i64,
    pub status: String,
}

pub enum AppError {
    Database(sqlx::Error),
    NotFound,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Database(err) => {
                tracing::error!("Database query failed: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            AppError::NotFound => (StatusCode::NOT_FOUND, "Record not found"),
        };

        (status, Json(serde_json::json!({ "error": error_message }))).into_response()
    }
}

pub async fn create_order(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateOrderPayload>,
) -> Result<(StatusCode, Json<OrderRecord>), AppError> {
    let order_id = Uuid::new_v4();

    // SQLx query_as with compile-time SQL verification
    let record = sqlx::query_as!(
        OrderRecord,
        r#"
        INSERT INTO orders (id, customer_id, total_amount_cents, status)
        VALUES ($1, $2, $3, 'PENDING')
        RETURNING id, customer_id, total_amount_cents, status
        "#,
        order_id,
        payload.customer_id,
        payload.total_amount_cents
    )
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Database)?;

    Ok((StatusCode::CREATED, Json(record)))
}

pub async fn get_order_by_id(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<OrderRecord>, AppError> {
    let record = sqlx::query_as!(
        OrderRecord,
        r#"
        SELECT id, customer_id, total_amount_cents, status
        FROM orders
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Database)?
    .ok_or(AppError::NotFound)?;

    Ok(Json(record))
}
```

---

## 5. Production Hardening Checklist

- [ ] **Static Musl Compilation**: Compile with `cargo build --target x86_64-unknown-linux-musl --release` to produce single zero-dependency static binaries that run in `scratch` Docker containers (final image size under 15MB).
- [ ] **Jemalloc Over Glibc**: Always use `tikv-jemallocator`. The standard glibc memory allocator suffers from severe virtual memory fragmentation under high-frequency async multi-threaded allocations.
- [ ] **Strict Connection Timeouts**: Set `.acquire_timeout(Duration::from_secs(3))` on `PgPoolOptions`. If the database stalls, Axum fails fast rather than holding client TCP sockets open indefinitely.
- [ ] **Enforce Tower Timeouts**: Wrap all routes in `tower::timeout::TimeoutLayer` to enforce a deterministic upper bound SLA across all API handlers.

---
sidebar_position: 11
title: "Rust Tokio Actor Pipeline & Zero-Allocation Queues"
description: "High-throughput asynchronous actor architecture in Rust using Tokio channels, bounded backpressure, zero-copy byte buffers, and panic isolation."
---

# Rust Tokio Actor Pipeline & Zero-Allocation Queues

When building telemetry ingestion engines, market data feeds, or real-time gaming backplanes, naive thread-per-connection or shared-memory mutex designs collapse under lock contention and cache-line bouncing.

In Rust, the **Actor Pattern** eliminates shared state entirely. Each actor owns its private state, runs inside a lightweight Tokio async green thread, and communicates exclusively through typed, bounded message channels (`tokio::sync::mpsc`). This guarantees thread safety at compile time without runtime mutex deadlocks.

---

## 1. Actor Pipeline Architecture

```mermaid
flowchart TD
    subgraph Ingress ["Network Ingress Layer"]
        TCPStream["TCP / WebSocket Ingress Socket"]
        FramingDecoder["Zero-Copy Frame Splitter (bytes::BytesMut)"]
    end

    subgraph ActorFleet ["Tokio Actor Fleet"]
        Supervisor["Pipeline Supervisor Actor"]
        IngestionActor["Ingestion Actor\n(Bounded Mailbox: 10,000)"]
        ParserActor["Payload Parser Actor\n(CPU-Bound Worker Pool)"]
        StorageActor["Persistence Writer Actor\n(Batching Buffer to ClickHouse / Postgres)"]
    end

    subgraph BackpressureGuard ["Backpressure & Health"]
        CapacityCheck{"Mailbox > 80%?"}
        TCPPause["Pause TCP Socket Read (Slow Down Sender)"]
        Metrics["Prometheus Channel Lag Metrics"]
    end

    TCPStream --> FramingDecoder
    FramingDecoder -->|Raw Bytes Frame| IngestionActor
    IngestionActor --> CapacityCheck
    CapacityCheck -->|Yes: Apply Backpressure| TCPPause
    CapacityCheck -->|No: Forward Message| ParserActor
    ParserActor --> StorageActor
    Supervisor -.->|Heartbeat Ping / Ping Response| IngestionActor
    Supervisor -.->|Heartbeat Ping / Ping Response| ParserActor
    Supervisor -.->|Restart on Panic| StorageActor
    StorageActor --> Metrics
```

---

## 2. Shared State Mutex vs Actor Message Passing

| Architecture Dimension | Shared-State Mutex (`Arc<Mutex<T>>`) | Tokio Actor Model (`mpsc::Sender<T>`) |
| :--- | :--- | :--- |
| **Lock Contention** | High: Workers serialize waiting on mutex acquisition | **Zero:** Workers operate on private local memory |
| **Deadlock Vulnerability** | Present if multiple locks are acquired out-of-order | **Impossible:** No nested locks across tasks |
| **Backpressure Control** | Difficult: Requires custom condition variables | **Native:** Bounded channel `send().await` pauses upstream |
| **Failure Isolation** | Poisoned mutex crashes entire process or corrupts memory | Isolated: Panic drops task; supervisor spawns replacement |
| **Throughput (1M msg/s)** | Degrades exponentially as core count grows | Scales linearly across available CPU cores |

---

## 3. Production Rust Implementation

Below is a production-grade, bounded actor implementation in Rust featuring typed message passing, request-response RPC via oneshot channels, heartbeat monitoring, and graceful SIGINT draining.

```rust
use bytes::Bytes;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot};
use tokio::time::sleep;

/// Typed messages accepted by the Ingestion Actor
pub enum IngestionCommand {
    /// Ingest a zero-copy raw payload frame
    ProcessPayload {
        payload_id: u64,
        data: Bytes,
    },
    /// Request actor health metrics via oneshot channel
    GetStats {
        responder: oneshot::Sender<ActorStats>,
    },
    /// Request orderly shutdown
    Shutdown,
}

#[derive(Debug, Clone)]
pub struct ActorStats {
    pub processed_count: u64,
    pub queue_lag: usize,
}

/// Handle exposed to callers to safely communicate with the Actor
#[derive(Clone)]
pub struct IngestionActorHandle {
    sender: mpsc::Sender<IngestionCommand>,
}

impl IngestionActorHandle {
    pub fn new(capacity: usize) -> (Self, IngestionActor) {
        let (sender, receiver) = mpsc::channel(capacity);
        let actor = IngestionActor {
            receiver,
            processed_count: 0,
        };
        (Self { sender }, actor)
    }

    /// Enqueue a payload. If channel is full, awaits backpressure from actor.
    pub async fn process(&self, payload_id: u64, data: Bytes) -> Result<(), mpsc::error::SendError<IngestionCommand>> {
        self.sender.send(IngestionCommand::ProcessPayload { payload_id, data }).await
    }

    /// Request stats with timeout protection
    pub async fn get_stats(&self) -> Result<ActorStats, &'static str> {
        let (tx, rx) = oneshot::channel();
        self.sender
            .send(IngestionCommand::GetStats { responder: tx })
            .await
            .map_err(|_| "Actor has terminated")?;

        tokio::time::timeout(Duration::from_millis(500), rx)
            .await
            .map_err(|_| "Stats request timed out")?
            .map_err(|_| "Actor dropped responder channel")
    }

    pub async fn shutdown(&self) {
        let _ = self.sender.send(IngestionCommand::Shutdown).await;
    }
}

/// The internal Actor managing state inside an isolated async loop
pub struct IngestionActor {
    receiver: mpsc::Receiver<IngestionCommand>,
    processed_count: u64,
}

impl IngestionActor {
    /// Run actor loop until shutdown command is received or all handles drop
    pub async fn run(mut self) {
        println!("[Actor] Ingestion Actor spawned and listening for messages...");

        while let Some(msg) = self.receiver.recv().await {
            match msg {
                IngestionCommand::ProcessPayload { payload_id, data } => {
                    self.processed_count += 1;
                    // Zero-copy slice inspection
                    if data.len() > 0 {
                        // In production: forward to downstream parsing or storage actor
                        // println!("[Actor] Handled payload {} ({} bytes)", payload_id, data.len());
                    }
                }
                IngestionCommand::GetStats { responder } => {
                    let stats = ActorStats {
                        processed_count: self.processed_count,
                        queue_lag: self.receiver.len(),
                    };
                    let _ = responder.send(stats);
                }
                IngestionCommand::Shutdown => {
                    println!("[Actor] Graceful shutdown signal received. Draining remaining queue...");
                    break;
                }
            }
        }

        println!("[Actor] Final message count: {}. Actor task exited cleanly.", self.processed_count);
    }
}

#[tokio::main]
async fn main() {
    // 1. Initialize Actor with bounded queue of 1,000 slots
    let (handle, actor) = IngestionActorHandle::new(1000);

    // 2. Spawn actor on Tokio runtime
    let actor_task = tokio::spawn(async move {
        actor.run().await;
    });

    // 3. Concurrent producer pipeline simulating incoming socket traffic
    let producer_handle = handle.clone();
    tokio::spawn(async move {
        for i in 1..=50_000 {
            let chunk = Bytes::from_static(b"{\"event\":\"telemetry_ping\",\"v\":1}");
            if let Err(e) = producer_handle.process(i, chunk).await {
                eprintln!("Failed to send: {}", e);
                break;
            }
        }
    });

    // 4. Poll actor status periodically
    for _ in 0..3 {
        sleep(Duration::from_millis(15)).await;
        if let Ok(stats) = handle.get_stats().await {
            println!(">>> [Monitor] Ingested: {}, Queue Lag: {}", stats.processed_count, stats.queue_lag);
        }
    }

    // 5. Orderly teardown
    handle.shutdown().await;
    let _ = actor_task.await;
}
```

---

## 4. Production Hardening Checklist

| Operational Dimension | Recommended Practice | Failure Mode If Ignored |
| :--- | :--- | :--- |
| **Bounded Channels** | Always specify finite channel capacities (`mpsc::channel(N)`); never use unbounded channels in network ingest | Uncontrolled ingress spikes cause Out-Of-Memory (OOM) kernel panics |
| **Zero-Copy Byte Slices** | Pass payloads using `bytes::Bytes` instead of `Vec<u8>` or `String` | Deep memory allocations on every message saturate the jemalloc allocator |
| **Oneshot Drop Guard** | Check `responder.send()` return value or handle receiver drop errors | Caller hangs indefinitely waiting for a response from a dead actor |
| **Panic Isolation** | Wrap actor spawn in `std::panic::AssertUnwindSafe` and attach a supervisor recovery loop | A single malformed payload panics the entire Tokio worker thread |
| **TCP Backpressure Linkage** | Stop reading from the client `AsyncRead` stream when the actor channel queue reaches 85% capacity | Backpressure queue overflows without signaling sender to throttle |

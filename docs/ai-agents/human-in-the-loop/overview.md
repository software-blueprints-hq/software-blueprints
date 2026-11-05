---
sidebar_position: 1
title: "Human-in-the-Loop Approval Gates"
description: "Production LangGraph HITL pattern with PostgreSQL checkpointing, interrupt-before gates, state inspection, approval/rejection flows, and FastAPI integration"
---

# 🛂 Human-in-the-Loop (HITL) Approval Gates

Production blueprint for building AI agents that **autonomously reason** up to a critical decision point, **pause for human review**, and **resume or rollback** based on operator approval. Backed by durable PostgreSQL state persistence.

---

## 1. When You Need This

- Agent is about to **execute a financial transaction** (payment, refund, transfer).
- Agent is about to **send an email or notification** to external users.
- Agent is about to **modify production data** (database writes, API mutations).
- Agent is about to **deploy code** or change infrastructure configuration.
- Any action where **incorrect autonomous execution has real-world consequences**.

---

## 2. Architecture: Interrupt-Resume Lifecycle

```mermaid
sequenceDiagram
    participant Client as Frontend / API Client
    participant API as FastAPI Backend
    participant Graph as LangGraph Agent
    participant PG as PostgreSQL Checkpointer
    participant Human as Human Reviewer (Dashboard)

    Client->>API: POST /agent/run (task + thread_id)
    API->>Graph: stream(task, config)
    Graph->>Graph: Agent Reasoning Node
    Graph->>Graph: Propose Sensitive Action
    Graph-->>PG: Checkpoint state (auto-save)
    Graph-->>API: interrupt_before["execute_action"]
    API-->>Client: SSE: {"status": "awaiting_approval", "proposed_action": {...}}

    Note over Human: Reviews proposed action in dashboard

    Human->>API: POST /agent/approve (thread_id, approved: true)
    API->>Graph: stream(None, config) — Resume
    Graph->>Graph: Execute Action Node
    Graph->>Graph: Synthesize Final Response
    Graph-->>PG: Checkpoint final state
    Graph-->>API: Final streamed response
    API-->>Client: SSE: {"status": "complete", "result": "..."}
```

---

## 3. Graph Definition with Interrupt Gate

```python
from typing import TypedDict, Annotated
import operator
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langgraph.graph import StateGraph, START, END


class HitlState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    proposed_action: dict       # What the agent wants to do
    approval_status: str        # "pending" | "approved" | "rejected"
    execution_result: str       # Result after action execution


def reasoning_node(state: HitlState) -> dict:
    """Agent analyzes the task and proposes a sensitive action."""
    # In production: call LLM with tools to determine what action to take
    proposed = {
        "type": "database_delete",
        "table": "user_accounts",
        "filter": "status = 'deactivated' AND last_login < '2024-01-01'",
        "estimated_rows": 1847,
    }
    
    return {
        "messages": [AIMessage(content=f"I propose to delete {proposed['estimated_rows']} deactivated accounts.")],
        "proposed_action": proposed,
        "approval_status": "pending",
    }


def execute_action_node(state: HitlState) -> dict:
    """Execute the approved action."""
    if state["approval_status"] != "approved":
        return {
            "messages": [AIMessage(content="Action was rejected by reviewer. Operation cancelled.")],
            "execution_result": "CANCELLED",
        }
    
    action = state["proposed_action"]
    # In production: execute the actual operation here
    result = f"Successfully executed {action['type']} on {action['table']}. {action['estimated_rows']} rows affected."
    
    return {
        "messages": [AIMessage(content=result)],
        "execution_result": result,
    }


def build_hitl_graph():
    workflow = StateGraph(HitlState)
    
    workflow.add_node("reasoning", reasoning_node)
    workflow.add_node("execute_action", execute_action_node)
    
    workflow.add_edge(START, "reasoning")
    workflow.add_edge("reasoning", "execute_action")
    workflow.add_edge("execute_action", END)
    
    return workflow
```

---

## 4. Compilation with PostgreSQL Checkpointer

```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool


async def get_hitl_app():
    pool = AsyncConnectionPool(
        conninfo="postgresql://user:pass@localhost:5432/agents_db",
        min_size=2,
        max_size=10,
    )
    
    checkpointer = AsyncPostgresSaver(pool)
    await checkpointer.setup()
    
    workflow = build_hitl_graph()
    
    # CRITICAL: interrupt_before stops execution RIGHT BEFORE this node runs
    app = workflow.compile(
        checkpointer=checkpointer,
        interrupt_before=["execute_action"],
    )
    
    return app
```

---

## 5. FastAPI Endpoints (Full Lifecycle)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid

app = FastAPI()


class RunRequest(BaseModel):
    task: str
    thread_id: str = None


class ApprovalRequest(BaseModel):
    thread_id: str
    approved: bool
    reviewer_note: str = ""


@app.post("/agent/run")
async def start_agent(req: RunRequest):
    """Start agent execution. Will pause at approval gate."""
    thread_id = req.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    
    graph = await get_hitl_app()
    
    events = []
    async for event in graph.astream(
        {"messages": [HumanMessage(content=req.task)], "approval_status": "pending", "iteration_count": 0},
        config,
        stream_mode="updates",
    ):
        events.append(event)
    
    # After interrupt, check the paused state
    current_state = await graph.aget_state(config)
    
    return {
        "thread_id": thread_id,
        "status": "awaiting_approval",
        "next_node": current_state.next,
        "proposed_action": current_state.values.get("proposed_action"),
        "events": events,
    }


@app.post("/agent/approve")
async def approve_action(req: ApprovalRequest):
    """Human approves or rejects the proposed action, then resumes."""
    config = {"configurable": {"thread_id": req.thread_id}}
    graph = await get_hitl_app()
    
    # Verify the graph is actually paused
    current_state = await graph.aget_state(config)
    if not current_state.next:
        raise HTTPException(400, "No pending approval for this thread.")
    
    # Inject human decision into state
    await graph.aupdate_state(
        config,
        {"approval_status": "approved" if req.approved else "rejected"},
    )
    
    # Resume execution from the checkpoint
    events = []
    async for event in graph.astream(None, config, stream_mode="updates"):
        events.append(event)
    
    final_state = await graph.aget_state(config)
    
    return {
        "thread_id": req.thread_id,
        "status": "completed",
        "result": final_state.values.get("execution_result"),
        "events": events,
    }


@app.get("/agent/status/{thread_id}")
async def get_status(thread_id: str):
    """Inspect current state of any thread (for dashboards)."""
    config = {"configurable": {"thread_id": thread_id}}
    graph = await get_hitl_app()
    
    state = await graph.aget_state(config)
    
    return {
        "thread_id": thread_id,
        "is_paused": bool(state.next),
        "next_node": state.next,
        "proposed_action": state.values.get("proposed_action"),
        "approval_status": state.values.get("approval_status"),
    }
```

---

## 6. Production Hardening

1. **Never use `MemorySaver` in production.** If your API pod restarts, all paused approval sessions are lost forever. `AsyncPostgresSaver` survives crashes, scaling events, and deployments.
2. **Thread ID must be a UUID** generated at the API gateway. Never let the LLM generate its own thread identifiers.
3. **Add approval timeouts.** If a human does not respond within N hours, auto-reject and notify. Stale paused graphs accumulate PostgreSQL checkpoint rows.
4. **Audit every approval/rejection** with reviewer identity, timestamp, and note. This is your compliance trail.
5. **State size management.** Long-running agents accumulate large message histories. Implement message trimming reducers to prevent checkpoint rows from growing unbounded.

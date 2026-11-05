---
sidebar_position: 1
title: "Multi-Agent Supervisor-Worker Architecture"
description: "Production LangGraph multi-agent system with typed routing, circuit breakers, PostgreSQL checkpointing, and parallel worker execution"
---

# 🕹️ Multi-Agent Supervisor-Worker Architecture

Production blueprint for orchestrating specialized AI agents under a central **Supervisor** that routes tasks to domain-specific **Workers** using structured output routing, iteration circuit breakers, and durable PostgreSQL state checkpointing.

---

## 1. When to Use This Pattern

- The user's request requires **multiple distinct skill sets** (e.g., research + analysis + code generation + database query).
- You need **auditability** over which sub-agent handled each step.
- Tasks require **iterative refinement** where a supervisor evaluates worker outputs before deciding the next step.
- You want **parallel fan-out** to multiple workers simultaneously.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Entry ["API Entrypoint"]
        API["FastAPI Endpoint / Next.js Route Handler"]
    end

    subgraph StateStore ["Durable State"]
        PGCheckpoint[("PostgreSQL Checkpointer (AsyncPostgresSaver)")]
    end

    subgraph SupervisorLayer ["Orchestration Layer"]
        Supervisor["Supervisor Node (Structured Router)"]
    end

    subgraph Workers ["Specialized Worker Agents"]
        ResearchAgent["Research Agent (Web Search + Document Retrieval)"]
        AnalystAgent["Analyst Agent (Data Processing + Summarization)"]
        CoderAgent["Coder Agent (Code Generation + Execution)"]
        ActionAgent["Action Agent (API Calls + DB Writes + HITL Gate)"]
    end

    subgraph PostProcess ["Post-Processing"]
        Aggregator["Aggregator Node (Clean + Validate Outputs)"]
        Synthesizer["Final Synthesizer (Format User Response)"]
    end

    API -->|"User Task + thread_id"| Supervisor
    Supervisor <-->|"Read/Write State"| PGCheckpoint
    Supervisor -->|"route: research"| ResearchAgent
    Supervisor -->|"route: analyst"| AnalystAgent
    Supervisor -->|"route: coder"| CoderAgent
    Supervisor -->|"route: action"| ActionAgent

    ResearchAgent -->|"Report Back"| Supervisor
    AnalystAgent -->|"Report Back"| Supervisor
    CoderAgent -->|"Report Back"| Supervisor
    ActionAgent -->|"Report Back"| Supervisor

    Supervisor -->|"route: FINISH"| Aggregator
    Aggregator --> Synthesizer
    Synthesizer --> API
```

---

## 3. Typed State Schema

Never use raw dictionaries. A strictly typed state prevents silent data corruption across agent handoffs.

```python
import operator
from typing import Annotated, TypedDict, Literal
from langchain_core.messages import BaseMessage


class SupervisorState(TypedDict):
    """Global state shared across all agents in the graph."""
    
    # Conversation history (append-only via operator.add reducer)
    messages: Annotated[list[BaseMessage], operator.add]
    
    # Original user task (immutable reference)
    task_description: str
    
    # Current routing target set by supervisor
    active_worker: str
    
    # Worker output accumulator
    research_findings: str
    analysis_summary: str
    generated_code: str
    
    # Error tracking
    errors: Annotated[list[str], operator.add]
    
    # Circuit breaker counter
    iteration_count: int
```

---

## 4. Structured Supervisor Routing (Zero String Parsing)

Force the LLM to return typed Pydantic routing decisions instead of parsing free-text responses.

```python
from pydantic import BaseModel, Field
from typing import Literal
from langchain_openai import ChatOpenAI


class RouteDecision(BaseModel):
    """Supervisor's structured routing output."""
    next_worker: Literal[
        "research_agent", 
        "analyst_agent", 
        "coder_agent", 
        "action_agent", 
        "FINISH"
    ] = Field(description="The next specialized agent to delegate to, or FINISH if task is complete.")
    reasoning: str = Field(description="Brief justification for routing this direction.")


SUPERVISOR_SYSTEM_PROMPT = """You are a senior project coordinator managing a team of specialized AI agents.

Available workers:
- research_agent: Searches the web and retrieves documents. Use for gathering raw information.
- analyst_agent: Processes and summarizes structured data. Use for analysis and comparison.
- coder_agent: Writes, reviews, and debugs code. Use for implementation tasks.
- action_agent: Executes external API calls or database mutations. Use for side-effect operations.

Evaluate the current conversation state and decide which worker should act next.
If the task is fully complete with a high-quality answer, route to FINISH."""


def supervisor_node(state: SupervisorState) -> dict:
    model = ChatOpenAI(model="gpt-4o", temperature=0).with_structured_output(RouteDecision)
    
    decision: RouteDecision = model.invoke(
        [{"role": "system", "content": SUPERVISOR_SYSTEM_PROMPT}] + state["messages"]
    )
    
    return {
        "active_worker": decision.next_worker,
        "iteration_count": state.get("iteration_count", 0) + 1,
    }
```

---

## 5. Worker Node Template

Every worker follows an identical interface pattern for consistency:

```python
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI


def create_worker_node(worker_name: str, system_prompt: str, tools: list = None):
    """Factory function to create standardized worker nodes."""
    
    def worker_node(state: SupervisorState) -> dict:
        model = ChatOpenAI(model="gpt-4o", temperature=0)
        
        if tools:
            model = model.bind_tools(tools)
        
        response = model.invoke(
            [{"role": "system", "content": system_prompt}] + state["messages"]
        )
        
        return {
            "messages": [AIMessage(content=response.content, name=worker_name)]
        }
    
    return worker_node


# Instantiate workers
research_node = create_worker_node(
    "research_agent",
    "You are a research specialist. Search for relevant information and return structured findings."
)

analyst_node = create_worker_node(
    "analyst_agent",
    "You are a data analyst. Summarize, compare, and extract insights from provided data."
)

coder_node = create_worker_node(
    "coder_agent",
    "You are a senior software engineer. Write clean, production-ready code with error handling."
)
```

---

## 6. Graph Assembly with Circuit Breaker

```python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


MAX_ITERATIONS = 10  # Hard circuit breaker


def route_after_supervisor(state: SupervisorState) -> str:
    """Conditional edge: route to worker or terminate."""
    
    # Circuit breaker: prevent infinite supervisor-worker loops
    if state.get("iteration_count", 0) >= MAX_ITERATIONS:
        return "aggregator"
    
    destination = state.get("active_worker", "FINISH")
    
    if destination == "FINISH":
        return "aggregator"
    
    return destination


def build_multi_agent_graph():
    workflow = StateGraph(SupervisorState)
    
    # Add all nodes
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("research_agent", research_node)
    workflow.add_node("analyst_agent", analyst_node)
    workflow.add_node("coder_agent", coder_node)
    workflow.add_node("aggregator", aggregator_node)
    workflow.add_node("synthesizer", synthesizer_node)
    
    # Entry point
    workflow.add_edge(START, "supervisor")
    
    # Supervisor routes to workers or finish
    workflow.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {
            "research_agent": "research_agent",
            "analyst_agent": "analyst_agent",
            "coder_agent": "coder_agent",
            "aggregator": "aggregator",
        }
    )
    
    # All workers report back to supervisor for evaluation
    workflow.add_edge("research_agent", "supervisor")
    workflow.add_edge("analyst_agent", "supervisor")
    workflow.add_edge("coder_agent", "supervisor")
    
    # Post-processing chain
    workflow.add_edge("aggregator", "synthesizer")
    workflow.add_edge("synthesizer", END)
    
    return workflow


# Production compilation with PostgreSQL persistence
async def get_compiled_graph():
    async with AsyncPostgresSaver.from_conn_string(
        "postgresql://user:pass@localhost:5432/agents_db"
    ) as checkpointer:
        await checkpointer.setup()
        
        workflow = build_multi_agent_graph()
        return workflow.compile(checkpointer=checkpointer)
```

---

## 7. FastAPI Integration (Streaming to Client)

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

app = FastAPI()


@app.post("/api/agent/run")
async def run_agent(request: dict):
    task = request["task"]
    thread_id = request.get("thread_id", str(uuid.uuid4()))
    
    graph = await get_compiled_graph()
    config = {"configurable": {"thread_id": thread_id}}
    
    async def event_stream():
        async for event in graph.astream(
            {"messages": [{"role": "user", "content": task}], "task_description": task, "iteration_count": 0},
            config,
            stream_mode="updates",
        ):
            for node_name, node_output in event.items():
                yield f"data: {json.dumps({'node': node_name, 'output': str(node_output)})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

---

## 8. Production Hardening Checklist

1. **Never use `MemorySaver` in production.** Use `AsyncPostgresSaver` backed by `psycopg_pool` for crash-safe, multi-instance state recovery.
2. **Enforce `MAX_ITERATIONS` circuit breaker** to prevent runaway supervisor-worker ping-pong loops from burning tokens indefinitely.
3. **Aggregator node is mandatory.** Workers dump raw tool payloads into messages. An aggregator node extracts clean summaries before the final synthesizer to prevent context window overflow.
4. **Use `stream_mode="updates"`** to get per-node incremental outputs for real-time frontend rendering.
5. **Trace every routing decision** via LangSmith or OpenTelemetry to audit which worker handled which subtask.

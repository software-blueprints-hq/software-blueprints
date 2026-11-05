---
sidebar_position: 1
title: "Advanced Document Chunking Strategies"
description: "Production chunking architectures: Semantic boundary inflection splitting, Parent-Child hierarchical indexing, and AST-aware table preservation."
---

# Advanced Document Chunking Strategies

The single most common failure mode in production RAG systems is poor chunking. Fixed-size chunking (e.g. 500 characters with 50 overlap) routinely slices sentences in half, separates questions from their answers, and scrambles markdown tables into unreadable fragments.

This blueprint implements three production-grade chunking strategies: **Semantic Boundary Inflection**, **Parent-Child Hierarchical Indexing**, and **Structure-Aware Table Preservation**.

---

## 1. Chunking Architecture Comparison

```mermaid
flowchart TD
    subgraph RawDoc ["Input Document"]
        Doc["Technical Whitepaper / Specification\n(Headers, Prose, Tables, Code Blocks)"]
    end

    subgraph Strategies ["Chunking Engines"]
        S1["1. Semantic Boundary Chunker\n(Splits on cosine distance percentile drops)"]
        S2["2. Parent-Child Hierarchical\n(Child 256t -> Search | Parent 1024t -> Context)"]
        S3["3. Structure-Aware AST Chunker\n(Never splits tables, lists, or code fences)"]
    end

    subgraph Storage ["Vector & Document Store"]
        VecStore[("Vector DB (pgvector / Qdrant)")]
        DocStore[("Doc Store (Full Parent Context)")]
    end

    Doc --> S1
    Doc --> S2
    Doc --> S3

    S1 -->|Homogeneous semantic chunks| VecStore
    S2 -->|Child vectors (256t)| VecStore
    S2 -->|Parent full text (1024t)| DocStore
    S3 -->|Atomic markdown blocks & tables| VecStore
```

---

## 2. Chunking Strategy Decision Matrix

| Strategy | Best Suited For | Chunk Size / Overlap | Failure Mode If Misapplied |
| :--- | :--- | :--- | :--- |
| **Recursive Character** | Plain narrative text, blog posts | 512 tokens / 64 overlap | Breaks tabular data and multi-column layouts |
| **Semantic Inflection** | Long-form reports, research papers | Dynamic (100 to 800 tokens) | High preprocessing cost (requires embedding every sentence) |
| **Parent-Child** | Enterprise contracts, legal manuals | Child: 200 tokens / Parent: 1200 tokens | Requires dual-store indexing logic |
| **Structure-Aware (AST)** | API documentation, Markdown docs | Block-based (Headers, Tables intact) | Unusually large chunks if a table exceeds token limits |

---

## 3. Production Implementations

Save these production chunking utilities under `src/ingestion/chunkers.py`.

```python
"""
Advanced Document Chunking Engines
Framework: Pure Python 3.11 + Pydantic v2 + NumPy
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional
import numpy as np
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 1. Parent-Child Hierarchical Chunker
# ---------------------------------------------------------------------------

class ChildChunk(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    parent_id: str
    child_text: str
    chunk_index: int
    token_count: int


class ParentDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    parent_text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    children: List[ChildChunk] = Field(default_factory=list)


class HierarchicalChunker:
    """
    Splits documents into large 'Parent' blocks for LLM context,
    and smaller 'Child' segments for high-precision dense vector retrieval.
    """
    def __init__(self, parent_size: int = 1200, child_size: int = 250, child_overlap: int = 40):
        self.parent_size = parent_size
        self.child_size = child_size
        self.child_overlap = child_overlap

    def chunk_document(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[ParentDocument]:
        words = text.split()
        parents: List[ParentDocument] = []

        # 1. Slice parent windows
        for p_start in range(0, len(words), self.parent_size):
            p_end = p_start + self.parent_size
            parent_words = words[p_start:p_end]
            parent_text = " ".join(parent_words)
            parent = ParentDocument(parent_text=parent_text, metadata=metadata or {})

            # 2. Slice overlapping child windows inside the parent
            child_idx = 0
            for c_start in range(0, len(parent_words), self.child_size - self.child_overlap):
                c_end = c_start + self.child_size
                child_words = parent_words[c_start:c_end]
                if not child_words:
                    continue

                child_text = " ".join(child_words)
                child = ChildChunk(
                    parent_id=parent.id,
                    child_text=child_text,
                    chunk_index=child_idx,
                    token_count=len(child_words)
                )
                parent.children.append(child)
                child_idx += 1

            parents.append(parent)

        return parents


# ---------------------------------------------------------------------------
# 2. Semantic Inflection Chunker
# ---------------------------------------------------------------------------

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))


class SemanticChunker:
    """
    Splits text by evaluating semantic cosine distance drops between adjacent sentences.
    Creates cohesive topic boundaries rather than arbitrary token cuts.
    """
    def __init__(
        self,
        embed_fn: Callable[[List[str]], List[List[float]]],
        percentile_threshold: float = 85.0
    ):
        self.embed_fn = embed_fn
        self.percentile_threshold = percentile_threshold

    def split_sentences(self, text: str) -> List[str]:
        # Regex splits on sentence-ending punctuation followed by whitespace
        raw_sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in raw_sentences if s.strip()]

    def chunk(self, text: str) -> List[str]:
        sentences = self.split_sentences(text)
        if len(sentences) <= 1:
            return sentences

        # Step 1: Embed all sentences
        embeddings = np.array(self.embed_fn(sentences))

        # Step 2: Compute cosine distances between sentence(i) and sentence(i+1)
        distances: List[float] = []
        for i in range(len(embeddings) - 1):
            sim = cosine_similarity(embeddings[i], embeddings[i + 1])
            distances.append(1.0 - sim)

        if not distances:
            return [" ".join(sentences)]

        # Step 3: Determine breakpoint cutoff threshold
        breakpoint_cutoff = float(np.percentile(distances, self.percentile_threshold))

        # Step 4: Cluster sentences into chunks where distance does not spike
        chunks: List[str] = []
        current_chunk: List[str] = [sentences[0]]

        for i, dist in enumerate(distances):
            if dist > breakpoint_cutoff:
                # Topic shift detected: flush current chunk
                chunks.append(" ".join(current_chunk))
                current_chunk = [sentences[i + 1]]
            else:
                current_chunk.append(sentences[i + 1])

        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks


# ---------------------------------------------------------------------------
# 3. Structure-Aware (AST / Table Preserving) Chunker
# ---------------------------------------------------------------------------

class StructureAwareChunker:
    """
    Parses Markdown structures ensuring code blocks, tables, and section headers
    remain atomic and are never bisected.
    """
    # Regex detecting markdown tables
    TABLE_PATTERN = re.compile(r"(\|[^\n]+\|\r?\n\|[-:\s|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)")
    # Regex detecting fenced code blocks
    CODE_PATTERN = re.compile(r"(```[\s\S]*?```)")

    @classmethod
    def chunk_markdown(cls, markdown_text: str, max_chunk_chars: int = 1500) -> List[str]:
        # Split document by top-level Markdown headers (## and ###)
        sections = re.split(r"(?=(?:\r?\n|^)#{1,3}\s)", markdown_text)
        final_chunks: List[str] = []

        for section in sections:
            section = section.strip()
            if not section:
                continue

            # If section fits within character budget, keep it intact
            if len(section) <= max_chunk_chars:
                final_chunks.append(section)
            else:
                # Subdivide paragraphs without breaking tables or code fences
                blocks = section.split("\n\n")
                accumulator = ""

                for block in blocks:
                    block_stripped = block.strip()
                    if not block_stripped:
                        continue

                    if len(accumulator) + len(block_stripped) + 2 <= max_chunk_chars:
                        accumulator += ("\n\n" + block_stripped) if accumulator else block_stripped
                    else:
                        if accumulator:
                            final_chunks.append(accumulator)
                        accumulator = block_stripped

                if accumulator:
                    final_chunks.append(accumulator)

        return final_chunks
```

---

## 4. Ingestion Pipeline Integration

```python
# scripts/ingest_documents.py
import asyncio
from src.ingestion.chunkers import HierarchicalChunker, StructureAwareChunker

async def process_incoming_file(file_path: str, tenant_id: str):
    with open(file_path, "r", encoding="utf-8") as f:
        raw_markdown = f.read()

    # Step 1: Extract atomic structural blocks (preserve tables & code)
    structured_blocks = StructureAwareChunker.chunk_markdown(raw_markdown)

    # Step 2: For each block, generate hierarchical Parent-Child chunks
    hierarchical_engine = HierarchicalChunker(parent_size=800, child_size=200, child_overlap=30)
    
    total_parents = []
    for block in structured_blocks:
        parents = hierarchical_engine.chunk_document(block, metadata={"source": file_path, "tenant": tenant_id})
        total_parents.extend(parents)

    print(f"Processed {len(total_parents)} parents with {sum(len(p.children) for p in total_parents)} searchable child vectors.")
    # Next: batch embed children and insert parents into DB
```

---

## 5. Production Hardening Checklist

- [ ] **Preserve Table Semantics**: When storing table chunks, prepend the document title and current section header (`### Section Name`) to every chunk so the vector embedding captures column context.
- [ ] **Deduplication Hashing**: Hash each chunk text using `sha256(chunk_text.strip().lower())` before generating embeddings to eliminate duplicate vector inserts across document versions.
- [ ] **Minimum Chunk Threshold**: Drop or merge chunks under 50 characters (e.g., stray page numbers, lonely timestamps) to prevent low-entropy vectors from polluting top-K recall.
- [ ] **Dual-Store ID Mapping**: Store child vectors with a foreign key referencing `parent_id`. Never return child text to the synthesis LLM when parent context is available.

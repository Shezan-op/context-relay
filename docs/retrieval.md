# Retrieval Architecture Specification

This document details the retrieval architecture in Viora, explaining how natural-language questions from current and incoming account managers are resolved into client-isolated memory queries, multi-strategy recall results, and verifiable evidence.

---

## 1. Overview

Retrieval is executed in:
- API Route: [`src/app/api/query/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/query/route.ts)
- Retrieval Service: [`src/lib/retrieval.ts`](file:///c:/Users/techt/context-relay/src/lib/retrieval.ts)
- Hindsight Wrapper: [`src/lib/hindsight.ts`](file:///c:/Users/techt/context-relay/src/lib/hindsight.ts)

---

## 2. Why Viora Is NOT "Simple Chunk Search"

Standard naive RAG implementations work like this:
```
Document -> Split into 500-token chunks -> Generate dense embeddings -> Cosine similarity search -> Stuff top 3 chunks into LLM prompt
```

This naive approach fails for agency client continuity:
1. **Lack of Entity Understanding:** A query about "sign-off authority" often misses conversations where a client simply said: *"Elena can handle invoices under five grand while Marcus is out."*
2. **Temporal Ignorance:** Naive vector search retrieves whichever chunk has higher token similarity, ignoring whether the decision was made in January or revised in March.
3. **Conversational Clutter:** Raw chunks contain greetings, interruptions, and filler that consume prompt context.
4. **No Cross-Client Isolation:** Multi-tenant vector databases frequently leak embeddings across clients unless complex partition filters are maintained manually.

### How Viora Solves This with Hindsight
Instead of searching raw text chunks, Viora recalls **structured, typed memory facts** linked to a client knowledge graph:
- Semantic vector similarity identifies conceptually related facts.
- BM25 sparse keyword matching captures exact terminology (`PostgreSQL`, `MongoDB`, `Aurora`).
- Knowledge graph traversal identifies facts connected to named entities (`Marcus Vance`, `Elena Rostova`).
- Temporal scoring preserves chronological recency.
- Cross-encoder reranking produces the most authoritative facts within a defined token budget.

---

## 3. Retrieval Request Lifecycle

```
[User Question] "What database technologies did the client reject or mandate?"
                            │
                            ▼
               [POST /api/query { clientId, question }]
                            │
                            ▼
          [1. SQLite Lookup: getClientRecord(clientId)]
          - Resolves: bankId = "client:c8f12a-meridian"
                            │
                            ▼
          [2. Hindsight Recall: recallMemories(bankId, query)]
          - Budget: 'mid'
          - MaxTokens: 4096
          - Types: ['world', 'experience', 'observation']
          - Include: chunks, entities, source facts
                            │
                            ▼
               [3. Multi-Strategy Recall]
          - Dense Vector Search
          - BM25 Sparse Search
          - Entity Knowledge Graph Traversal
          - Temporal Anchoring
          - Cross-Encoder Reranking
                            │
                            ▼
               [4. Memory Evaluation Guard]
      ├── Zero results returned? ────────► STOP. Return "No relevant memory found"
      │                                   (LLM is NEVER called)
      └── >= 1 results returned? ────────► Assemble RecalledEvidenceItem[]
                            │
                            ▼
               [5. Evidence Mapping]
          - Fact text
          - Extraction type
          - Date / Timestamp
          - Verbatim transcript quote from chunk map
          - Entity tags
                            │
                            ▼
          [6. LLM Grounding Synthesis]
          - Calls generateGroundedAnswer(question, evidence, context)
                            │
                            ▼
               [7. Output Response]
          - JSON { answer, hasEvidence: true, evidence, clientName }
```

---

## 4. Hindsight Recall Parameters

The retrieval parameters are configured in [`src/lib/hindsight.ts`](file:///c:/Users/techt/context-relay/src/lib/hindsight.ts):

```typescript
const response = await this.client.recall(bankId, query, {
  budget: 'mid',
  maxTokens: 4096,
  types: ['world', 'experience', 'observation'],
  includeChunks: true,
  includeEntities: true,
  includeSourceFacts: true,
});
```

### Explanation of Parameters:
- `budget: 'mid'`: Balances search breadth, multi-strategy depth, and latency.
- `maxTokens: 4096`: Allocates sufficient token space to return comprehensive supporting facts without overflowing memory.
- `types: ['world', 'experience', 'observation']`: Ensures all three dimensions of client memory are considered:
  - `world`: Technical mandates and non-negotiables.
  - `experience`: Trials, past proposals, and outcomes.
  - `observation`: Governance thresholds and operational patterns.
- `includeChunks: true`: Instructs Hindsight to return the exact source conversation chunk text corresponding to each fact, enabling verbatim quote citations.
- `includeEntities: true`: Provides resolved entity labels for graph transparency.

---

## 5. The Empty Memory Guard

When an account manager queries a topic that has never been discussed in client meetings, Viora executes a **strict short-circuit**:

```typescript
if (!recallPayload.results || recallPayload.results.length === 0) {
  return {
    answer: 'No relevant stored client memory found regarding your question.',
    hasEvidence: false,
    evidence: [],
    clientName: client.name,
  };
}
```

### Why This Matters:
1. **Zero Hallucination:** Naive AI chatbots will generate plausible-sounding advice when data is missing. Viora refuses to answer if evidence is absent.
2. **Cost & Latency Optimization:** External LLM API calls are bypassed entirely when no memory exists.
3. **Automated Verification:** Verified in `tests/core-pipeline.test.ts` (Category 7), ensuring `llmWasCalled` is strictly `false`.

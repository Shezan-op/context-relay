# ContextRelay End-to-End Data Flow

This document specifies the exact data transformations, transport protocols, module invocations, and storage lifecycles in ContextRelay from the moment a transcript is uploaded to the delivery of a grounded answer or handoff brief.

---

## 1. High-Level Data Flow Sequence

```
[Raw Transcript File]
        │ (1) Browser File Upload (HTTP multipart/form-data)
        ▼
[src/app/api/sources/route.ts]
        │ (2) Extract text, validate parameters
        ▼
[src/lib/ingestion.ts: ingestTranscript()]
        │ (3) Client existence check, extension/size validation
        ▼
[src/lib/db.ts: createSourceRecord()] ──► [SQLite: sources table (status: 'processing')]
        │ (4) Dispatch content & documentId
        ▼
[src/lib/hindsight.ts: retainTranscript()]
        │ (5) POST /v1/default/banks/{bankId}/memories
        ▼
[Hindsight Memory Engine] ──► [Isolated Bank: client:<uuid>]
   - Extracts facts (world, experience, observation)
   - Resolves entity knowledge graph
   - Anchors temporal markers
   - Stores raw chunks linked to document ID
        │ (6) Retain success response
        ▼
[src/lib/db.ts: updateSourceStatus()] ──► [SQLite: sources table (status: 'stored')]
        │ (7) JSON response to Browser
        ▼
[Client Workspace UI: Sources Table Updated]

═══════════════════════════════════════════════════════════════════════════════════

[Incoming User Query]
        │ (8) Form Submit (HTTP POST /api/query JSON)
        ▼
[src/app/api/query/route.ts]
        │ (9) Invoke retrieval pipeline
        ▼
[src/lib/retrieval.ts: answerClientQuestion()]
        │ (10) Resolve bankId from SQLite client record
        ▼
[src/lib/hindsight.ts: recallMemories()]
        │ (11) POST /v1/default/banks/{bankId}/memories/recall
        ▼
[Hindsight Memory Engine]
   - Multi-strategy retrieval (vector, keyword, graph, temporal)
   - Cross-encoder reranking
        │ (12) Returns ranked facts & verbatim chunks
        ▼
[src/lib/retrieval.ts: Evidence Filter & Short-Circuit]
   ├── [0 Memories Returned] ──► Short-circuit: Return "No relevant memory found" (LLM bypassed)
   └── [>= 1 Memories] ──────► Assemble RecalledEvidenceItem[]
        │ (13) Grounding prompt + numbered evidence
        ▼
[src/lib/llm.ts: generateGroundedAnswer()]
        │ (14) HTTP POST /chat/completions (Groq/OpenAI/Anthropic/Gemini)
        ▼
[External LLM Provider] ──► Synthesizes grounded natural-language answer
        │ (15) Return LLMAnswerResult
        ▼
[src/app/api/query/route.ts] ──► JSON { answer, hasEvidence, evidence, clientName }
        │ (16) Render Answer + Verifiable Evidence Drawer
        ▼
[User Browser]
```

---

## 2. Granular Step-by-Step Data Lifecycle

### Step 1: Upload Initiation
- **What Moves:** File binary stream containing transcript text.
- **Transmitter:** `src/app/page.tsx` (`handleFileUpload`).
- **Receiver:** `src/app/api/sources/route.ts` via HTTP POST `multipart/form-data`.
- **Payload:** `clientId: string`, `file: File`.
- **Durability:** Ephemeral in-flight network payload.

### Step 2: Payload Extraction & Validation
- **Module:** `src/app/api/sources/route.ts`.
- **Operations:**
  - Reads `file.name`, `file.size`, `file.type`.
  - Executes `await file.text()` to extract plain text string.
  - Verifies presence of `clientId`.
  - Calls `ingestTranscript(clientId, { filename, contentType, sizeBytes, content })`.

### Step 3: Domain Validation & Source Registration
- **Module:** `src/lib/ingestion.ts` (`ingestTranscript`).
- **Verifications:**
  - `getClientRecord(clientId)`: Ensures target client exists in SQLite.
  - Extension check: Must end with `.txt` or `.md`.
  - Content check: `content.trim().length > 0`.
  - Size check: `sizeBytes <= 5 * 1024 * 1024` (5MB).
- **ID Generation:**
  - `sourceId = randomUUID()`
  - `hindsightDocId = "doc:" + sourceId`
- **What is Stored:** SQLite `sources` table receives an entry with `ingestion_status = 'processing'`. This is durable relational metadata.

### Step 4: Bank Provisioning & Hindsight Retain Call
- **Module:** `src/lib/hindsight.ts` (`HindsightWrapper`).
- **Operations:**
  - `ensureClientBank(bankId, clientName)`: Confirms bank exists and applies `HINDSIGHT_MISSION`.
  - `retainTranscript(bankId, content, docId, metadata)`:
    - HTTP endpoint: `POST /v1/default/banks/{bankId}/memories`
    - Option: `async: false` (synchronous execution for deterministic status resolution).
- **What Moves:** Raw conversation text string, document identifier, and upload metadata.

### Step 5: Hindsight Processing & Long-Term Memory Storage
- **System:** Hindsight Server.
- **Operations:**
  - Evaluates text against the Client Memory Mission.
  - Splits text into indexable chunks.
  - Extracts structured facts:
    - `world`: Declarative business constraints and technology decisions.
    - `experience`: Historical trials, proposals, and outcomes.
    - `observation`: Behavioral and stakeholder patterns.
  - Links facts to entities (e.g., `Marcus Vance`, `PostgreSQL`, `MongoDB`).
  - Attaches temporal anchors (`occurred_start`, `mentioned_at`).
- **What is Stored:** Durable memory graph, vector embeddings, inverted keyword index, and raw chunks inside the isolated client bank.

### Step 6: Ingestion Status Finalization
- **Module:** `src/lib/db.ts` (`updateSourceStatus`).
- **State Transition:**
  - On Hindsight 200/201: `ingestion_status = 'stored'`.
  - On error: `ingestion_status = 'failed'` with sanitized error message.
- **What is Returned to Browser:** HTTP 201 JSON `{ source, success: true, message: "..." }`.

---

### Step 7: Natural Language Query Submission
- **What Moves:** JSON payload `{ clientId: string, question: string }`.
- **Transmitter:** `src/app/page.tsx` (`handleQuery`).
- **Receiver:** `src/app/api/query/route.ts` via HTTP POST.
- **Durability:** Ephemeral query string.

### Step 8: Client Bank Resolution
- **Module:** `src/lib/retrieval.ts` (`answerClientQuestion`).
- **Operation:** `getClientRecord(clientId)` queries SQLite to retrieve the trusted `hindsight_bank_id`. The client cannot forge or alter the bank ID.

### Step 9: Hindsight Multi-Strategy Recall
- **Module:** `src/lib/hindsight.ts` (`recallMemories`).
- **Endpoint:** `POST /v1/default/banks/{bankId}/memories/recall`
- **Request Parameters:**
  - `query`: user's question string.
  - `budget`: `'mid'`
  - `maxTokens`: `4096`
  - `types`: `['world', 'experience', 'observation']`
  - `includeChunks: true`, `includeEntities: true`, `includeSourceFacts: true`.
- **Hindsight Execution:**
  - Vector semantic search over fact embeddings.
  - BM25 sparse keyword matching over tokens.
  - Knowledge graph entity hops.
  - Temporal recency decay scoring.
  - Cross-encoder reranking.
- **Output:** `RecallResponse` containing ranked `results`, source `chunks`, and `entities`.

### Step 10: Short-Circuit & Evidence Assembly
- **Module:** `src/lib/retrieval.ts`.
- **Branch A (Zero results):** Halts immediately. Does NOT invoke external LLM. Returns HTTP 200 with `{ answer: "No relevant stored client memory found...", hasEvidence: false, evidence: [] }`.
- **Branch B (>= 1 results):**
  - Iterates up to top 8 items.
  - Maps to `RecalledEvidenceItem`:
    - `id`: unique memory fact UUID.
    - `text`: extracted factual statement.
    - `type`: `world` / `experience` / `observation`.
    - `occurredStart`: temporal date.
    - `sourceChunk`: verbatim transcript sentence quote from Hindsight's chunk map.
    - `entities`: resolved entity labels.

### Step 11: Grounded Answer Synthesis
- **Module:** `src/lib/llm.ts` (`generateGroundedAnswer`).
- **Prompt Composition:**
  - System prompt: `SYSTEM_GROUNDING_PROMPT` (rigid grounding rules, hallucination ban, conflict reconciliation).
  - User prompt: Numbered evidence items (fact + date + verbatim quote) followed by user question.
- **Provider Call:** Invokes configured LLM provider (`groq`, `openai`, `anthropic`, or `gemini`) with `temperature: 0.1`.
- **Output:** Concise natural-language synthesis grounded strictly in the evidence.

### Step 12: Delivery to User
- **Module:** `src/app/page.tsx`.
- **Rendering:**
  - Direct answer rendered in `#grounded-answer-text`.
  - Evidence rendered in `#evidence-drawer` showing fact cards, dates, and verbatim quote blocks.
- **Memory Retention Policy:** User questions and LLM answers are **NEVER** retained into Hindsight, preventing prompt pollution.

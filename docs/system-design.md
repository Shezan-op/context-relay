# ContextRelay System Design Specification

This document defines ContextRelay as a set of discrete engineering components, detailing their boundaries, contracts, inputs, outputs, responsibilities, and failure modes.

---

## 1. System Decomposition

ContextRelay is partitioned into four major subsystems:
1. **Presentation & Workspace Shell** (`src/app/page.tsx`, `src/app/globals.css`)
2. **API & Orchestration Layer** (`src/app/api/*`, `src/lib/ingestion.ts`, `src/lib/retrieval.ts`)
3. **Operational Metadata Store** (`src/lib/db.ts`)
4. **Biomimetic Client Memory Infrastructure** (`src/lib/hindsight.ts`)
5. **Grounded Synthesis Engine** (`src/lib/llm.ts`)

---

## 2. Component Specifications

### 2.1 Metadata Store: SQLite Layer (`src/lib/db.ts`)

- **Purpose:** Fast, embedded relational persistence for operational entities and lifecycle states.
- **Underlying Technology:** Node.js native `DatabaseSync` (`node:sqlite`).
- **Input:** Relational parameters (Client records, Source metadata).
- **Output:** Structured JavaScript objects typed as `ClientRecord` and `SourceRecord`.
- **Dependencies:** Node.js runtime (`node:sqlite`, `node:path`, `node:fs`).
- **What It Owns:**
  - Client registry (`id`, `name`, `hindsight_bank_id`, `created_at`).
  - Source file audit records (`id`, `client_id`, `original_filename`, `content_type`, `size_bytes`, `hindsight_document_id`, `ingestion_status`, `error_message`, `created_at`).
  - Relational mapping between human client names and stable Hindsight bank identifiers.
- **What It Does NOT Own:**
  - Semantic memory facts, entities, or relations.
  - Vector embeddings or similarity indexes.
  - Raw transcript text storage (transcripts live in Hindsight as document chunks).
  - Answering logic.
- **Failure Modes:**
  - Disk write exhaustion: Returns database error, caught by API layer and surfaced to user.
  - Database lock contention: Mitigated by WAL mode (`PRAGMA journal_mode = WAL`) and synchronous operations.

---

### 2.2 Memory Engine: Hindsight Layer (`src/lib/hindsight.ts`)

- **Purpose:** Durable, long-term, biomimetic business memory extraction, entity resolution, temporal indexing, and multi-strategy recall.
- **Underlying Technology:** `@vectorize-io/hindsight-client` interacting with the Hindsight service over HTTP.
- **Input:**
  - Ingestion: Plain text transcript content, `documentId`, `context="client-transcript"`, and metadata.
  - Recall: Natural language search string, token budgets, requested fact types (`world`, `experience`, `observation`).
- **Output:**
  - Retain response: Extraction status and document association.
  - Recall response: Ranked fact statements (`results`), resolved `entities`, and verbatim `chunks` with character offsets.
- **Dependencies:** Hindsight server daemon reachable via `HINDSIGHT_API_URL` (e.g., `http://localhost:8888`), optional `HINDSIGHT_API_KEY`.
- **What It Owns:**
  - Decomposing conversational text into atomic business facts according to the Client Memory Mission.
  - Entity recognition and knowledge graph maintenance.
  - Temporal anchoring (`occurred_start`, `mentioned_at`).
  - Bank-level client memory isolation (`client:<uuid>`).
  - Multi-strategy retrieval (dense vector, BM25, graph hops, temporal recency) and cross-encoder reranking.
- **What It Does NOT Own:**
  - Web UI state or active browser session tracking.
  - Client metadata or relational upload status history.
  - Final natural language answer formatting (owned by the Application LLM).
- **Failure Modes:**
  - Network unreachable: Ingestion marks source as `failed` in SQLite with a readable error message; Recall throws a structured exception advising the user.
  - Empty bank (404): Gracefully caught and returned as an empty array rather than throwing an unhandled exception.

---

### 2.3 Synthesis Engine: Application LLM Layer (`src/lib/llm.ts`)

- **Purpose:** Synthesize concise, natural-language answers and structured handoff dossiers strictly from retrieved Hindsight memory facts and chunks.
- **Underlying Technology:** Configurable external LLM providers: Groq (default, recommended for speed), OpenAI, Anthropic, or Gemini.
- **Input:**
  - System grounding prompt (`SYSTEM_GROUNDING_PROMPT` or `HANDOFF_SYSTEM_PROMPT`).
  - Target question or handoff directive.
  - Formatted evidence blocks (up to 8 facts for queries, up to 15 for handoffs) containing fact text, dates, and verbatim source quotes.
- **Output:** `LLMAnswerResult` containing the grounded answer text.
- **Dependencies:** Valid API key in environment variables (`GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`).
- **What It Owns:**
  - Generating human-readable text that directly addresses the user's inquiry.
  - Recognizing chronological requirement changes across different meeting dates.
  - Explicitly abstaining when supplied evidence does not answer the question.
- **What It Does NOT Own:**
  - Storing memory.
  - Retrieving facts from documents.
  - Guessing client context absent from the evidence.
- **Failure Modes:**
  - Missing API key: Throws immediate configuration error explaining which environment variable is missing.
  - Rate limiting / upstream HTTP failure: Surfaces provider HTTP status and error text cleanly to the caller.

---

### 2.4 Orchestration & Business Logic: Ingestion & Retrieval Services (`src/lib/ingestion.ts`, `src/lib/retrieval.ts`)

- **Purpose:** Coordinate state transitions, file validation, bank resolution, evidence assembly, and LLM invocation.
- **Input:** Client IDs, raw file buffers/strings, query strings.
- **Output:** Structured responses (`IngestResult`, `ClientAnswerResponse`, `ClientHandoffResponse`).
- **What It Owns:**
  - Validating incoming files (checking `.txt` or `.md`, non-empty content, size <= 5MB).
  - Resolving client bank IDs server-side from SQLite.
  - Enforcing the empty-memory short-circuit: if Hindsight returns 0 memories, halting before calling the LLM.
  - Mapping recalled memories to evidence items with source quotes.
- **What It Does NOT Own:**
  - Rendering HTML/CSS.
  - Low-level vector math.
- **Failure Modes:**
  - Invalid file input: Rejects immediately with HTTP 400/422 without allocating resources or calling Hindsight.
  - Missing client: Throws 404 error if `clientId` does not exist in SQLite.

---

### 2.5 Presentation: Minimalist Client Shell (`src/app/page.tsx`, `src/app/globals.css`)

- **Purpose:** Provide an uncluttered, high-contrast, dark interface for managing clients, ingesting transcripts, running continuity queries, and inspecting handoff briefs.
- **Input:** User keystrokes, file drops, tab clicks.
- **Output:** React DOM rendering, form submissions.
- **What It Owns:**
  - Visual layout, sidebar navigation, upload status indicators.
  - Continuity suggested query buttons.
  - Expandable evidence drawers.
- **What It Does NOT Own:**
  - API keys or secrets (strictly server-side).
  - Direct database or Hindsight communication.
- **Failure Modes:**
  - Network disconnection: Renders localized error banner (`alert-box alert-error`) without crashing the application.

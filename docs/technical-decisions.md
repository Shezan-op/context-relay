# Architecture Decision Records (ADRs)

This document records the foundational architectural decisions made in Viora, explaining the technical context, evaluated alternatives, rationale, and consequences for each choice.

---

## ADR 001: Hindsight as the Long-Term Memory Layer

- **Status:** Accepted
- **Context:** Agency client continuity requires preserving facts, preferences, decisions, and temporal shifts (e.g., "PostgreSQL was approved in Q1, but replaced by TimescaleDB in Q3") across years of meetings.
- **Alternatives Evaluated:**
  1. *Naive Vector Database (Pinecone / Chroma / Weaviate / Qdrant):* Splits transcripts into arbitrary 500-token chunks and computes dense embeddings.
  2. *Full-Text Inverted Index (Elasticsearch / Meilisearch):* Keyword search over stored transcripts.
  3. *Hindsight Memory Platform:* Entity-centric memory retention with temporal awareness, fact extraction, and multi-faceted recall.
- **Decision:** Use Hindsight as the dedicated long-term memory engine.
- **Rationale:** Naive chunking in vector databases destroys temporal relationships and loses entity continuity when context spans across chunks or sessions. Hindsight extracts structured facts, resolves entity references, and retains temporal progression natively.
- **Consequences:** Dependency on Hindsight API service or self-hosted Hindsight engine; external network call during ingestion and retrieval.

---

## ADR 002: SQLite for Operational Metadata and Ingestion State

- **Status:** Accepted
- **Context:** The application needs to track client registrations, source file upload states, ingestion progress, and source-level provenance.
- **Alternatives Evaluated:**
  1. *PostgreSQL / Supabase:* High-concurrency relational database requiring network infrastructure, connection pools, and migration management.
  2. *In-Memory JSON / File System:* Ephemeral storage with race condition vulnerabilities.
  3. *Embedded SQLite (`node:sqlite` DatabaseSync):* Zero-configuration, ACID-compliant, native single-file embedded database built into Node.js.
- **Decision:** Use Node.js built-in `node:sqlite` (`DatabaseSync`) stored locally at `context_relay.sqlite`.
- **Rationale:** Viora is designed for single-agency deployment or edge instances. Native SQLite eliminates external database dependencies and C++ build toolchains, starts instantly, executes sub-millisecond queries, and provides rock-solid transaction guarantees.
- **Consequences:** SQLite operates under single-writer locking with WAL enabled, which is completely sufficient for agency account teams but requires persistent disk mounting when running in containerized environments.

---

## ADR 003: Deterministic Client-Specific Memory Banks

- **Status:** Accepted
- **Context:** An agency manages dozens of confidential client accounts simultaneously. Knowledge, agreements, and technical decisions from Client A must never leak into queries about Client B.
- **Alternatives Evaluated:**
  1. *Single Shared Memory Bank with Metadata Filtering:* Ingesting all agency data into one global bank and filtering queries by `client_id` tag.
  2. *Isolated Per-Client Memory Banks:* Creating an isolated Hindsight memory bank for every client (e.g., `client-acme-corp-102938`).
- **Decision:** Mandate isolated per-client Hindsight memory banks resolved server-side.
- **Rationale:** Metadata filters can fail due to human tagging errors or SDK bugs. Physical bank isolation guarantees cryptographic/logical separation at the engine level. Even if an LLM is prompted to bypass boundaries, Hindsight recall never touches other bank IDs.
- **Consequences:** Ingestion and retrieval functions must always validate and pass the client's verified bank ID; global cross-client aggregation is intentionally impossible.

---

## ADR 004: Strict Evidence-Bound LLM Grounding

- **Status:** Accepted
- **Context:** When a new account manager asks "What did the client say about our deployment schedule?", an LLM must not guess, extrapolate, or hallucinate dates.
- **Alternatives Evaluated:**
  1. *Direct Raw Transcript Prompting:* Feeding all raw historical transcripts into a large LLM context window.
  2. *Unconstrained Assistant:* Prompting the LLM with general knowledge plus retrieved snippets, allowing it to "fill in the blanks".
  3. *Strict Evidence Grounding:* Providing only recalled Hindsight facts and enforcing a strict negative constraint ("If the provided evidence does not contain the answer, explicitly state that no record exists").
- **Decision:** Enforce strict evidence grounding with explicit citations.
- **Rationale:** Agency client relationships are destroyed when account managers promise deliverables or repeat rejected ideas based on AI hallucinations. Grounding guarantees that every statement in an answer links to a verifiable retained fact.
- **Consequences:** Answers are concise and factually bounded; the model refuses to answer questions outside the retained memory scope.

---

## ADR 005: Read-Only Recall / No Query Retention

- **Status:** Accepted
- **Context:** When users ask questions in the continuity workspace (e.g., "Is PostgreSQL still allowed?"), should the query or answer be saved into memory?
- **Alternatives Evaluated:**
  1. *Retain Everything (Chatbot Style):* Retaining every user question and AI response into Hindsight as a new memory.
  2. *Read-Only Query Interface:* Querying executes pure recall; memory is only written when verified meeting transcripts/documents are ingested.
- **Decision:** Treat `POST /api/query` and `POST /api/handoff` as strictly read-only operations.
- **Rationale:** Saving user queries into memory causes severe memory contamination and feedback loops. Prompt injection attempts or speculative questions (e.g., "What if we fired the CTO?") would become durable client facts. Memory must only originate from authoritative client communication sources.
- **Consequences:** Users cannot manually "tell" the AI facts through the chat box; they must upload or record meeting notes as a source.

---

## ADR 006: Synchronous Retain (`async: false`)

- **Status:** Accepted
- **Context:** When a transcript is uploaded via `POST /api/sources`, Hindsight can process it asynchronously (queued) or synchronously.
- **Alternatives Evaluated:**
  1. *Asynchronous (`async: true`):* Immediate HTTP 200 response; client must poll to check if facts have finished processing.
  2. *Synchronous (`async: false`):* HTTP request waits until Hindsight extracts entities and updates the memory bank.
- **Decision:** Enforce synchronous retention (`async: false`).
- **Rationale:** Ensures deterministic state transitions. When the UI or test runner receives an HTTP 201 response, the memory is immediately queryable. This eliminates race conditions during rapid handovers or sequential test execution.
- **Consequences:** Ingestion requests take 2 to 6 seconds depending on transcript length. Enforced file size limit of 5MB prevents timeouts.

---

## ADR 007: Fallback Short-Circuit on Empty Retrieval

- **Status:** Accepted
- **Context:** If a query yields zero relevant facts from Hindsight recall, should we still invoke the LLM?
- **Alternatives Evaluated:**
  1. *Invoke LLM with Empty Context:* Prompt the LLM with empty evidence and let it say it doesn't know.
  2. *Deterministic Server-Side Short-Circuit:* If `facts.length === 0`, bypass LLM inference entirely and return a standard "No relevant stored client memory found" payload.
- **Decision:** Server-side short-circuit on zero retrieved facts.
- **Rationale:** Saves LLM inference latency and token costs. Eliminates the possibility of the LLM hallucinating an answer when memory is completely empty.
- **Consequences:** Instant deterministic responses for unknown topics; zero token expenditure for off-topic inquiries.

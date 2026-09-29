# ContextRelay Architecture

**Durable Client Memory for Agency Account Continuity**

ContextRelay preserves the decisions, preferences, history, and institutional knowledge built up during client relationships so the next person on the account can continue where the previous person stopped.

This document describes the technical architecture of ContextRelay, detailing data flow boundaries, storage contracts, Hindsight memory infrastructure, and LLM grounding constraints.

---

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 USER BROWSER                                      |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |    Client List     |   | Transcript Ingestion  |   |  Answer & Evidence UI  |  |
|  | (Empty / Real-only)|   |     (.txt / .md)      |   | (Facts, Chunks, Dates) |  |
|  +---------+----------+   +-----------+-----------+   +-----------▲------------+  |
+------------|--------------------------|---------------------------|---------------+
             |                          |                           |
             | POST /api/clients        | POST /api/sources         | POST /api/query
             ▼                          ▼                           |
+-------------------------------------------------------------------|---------------+
|                            NEXT.JS SERVER APPLICATION             |               |
|                                                                   |               |
|  +--------------------+   +-----------------------+   +-----------+------------+  |
|  |   Client Service   |   |   Ingestion Service   |   |   Retrieval Service    |  |
|  |  (UUID Bank Gen)   |   | (Validation, Status)  |   |  (Bank Match, Guard)   |  |
|  +---------+----------+   +-----------+-----------+   +-----------+------------+  |
|            |                          |                           |               |
|            +-------------------+      |       +-------------------+               |
|                                |      |       |                                   |
|                                ▼      ▼       ▼                                   |
|                    +------------------------------------+                         |
|                    |           SQLite Layer             |                         |
|                    |   (Clients & Sources Metadata)     |                         |
|                    +------------------------------------+                         |
|                                       |                                           |
+---------------------------------------|-------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 ▼ Server-to-Server                            ▼ Server-to-Server
+------------------------------------+        +------------------------------------+
|          HINDSIGHT SERVER          |        |        APPLICATION LLM API         |
|                                    |        |   (Groq / OpenAI / Gemini / etc.)  |
|  +------------------------------+  |        |                                    |
|  | Bank: `client:<uuid>`        |  |        |  +------------------------------+  |
|  | - Client Retain Mission      |  |        |  | Grounding System Prompt      |  |
|  | - Fact & Entity Extraction   |  |        |  | - Strict context evidence    |  |
|  | - Knowledge Graph & Temporal |  |        |  | - Conflict identification    |  |
|  | - Multi-Strategy Recall      |  |        |  | - Abstention on missing facts|  |
|  | - Chunks & Provenance        |  |        |  +------------------------------+  |
|  +------------------------------+  |        +------------------------------------+
+------------------------------------+
```

---

## 2. Component List

1. **Next.js Web Application (React UI + Next.js App Router API Routes)**
   - Frontend: Clean, minimalist three-area interface (Client List/Empty State, Client Workspace, Answer + Evidence Card).
   - Backend API: Server-side route handlers (`/api/clients`, `/api/sources`, `/api/query`) orchestrating database access, Hindsight communication, and LLM calls.
2. **SQLite Database Layer (`better-sqlite3` or Node.js native sqlite)**
   - Local database storing metadata records in `clients` and `sources` tables.
3. **Hindsight Memory Server (`@vectorize-io/hindsight-client` / REST API)**
   - Dedicated biomimetic memory system managing client-isolated memory banks, document retention, extraction, and multi-strategy recall.
4. **Application LLM Provider (Configurable: Groq, OpenAI, Anthropic, Gemini)**
   - Generates grounded, natural-language answers strictly conditioned on evidence retrieved from Hindsight.

---

## 3. Why Each Component Exists

- **Next.js Full-Stack Web App:** Combines responsive UI rendering with secure, server-only API endpoints in a single repository, keeping credentials completely hidden from client browsers.
- **SQLite Database:** Provides fast, zero-dependency persistence for operational application metadata (client registry, bank ID mappings, file upload history, ingestion statuses).
- **Hindsight Server:** Provides dedicated long-term client memory extraction, entity resolution, temporal mapping, and hybrid multi-strategy recall (semantic + BM25 + graph + temporal) without needing custom vector/graph plumbing.
- **Application LLM:** Synthesizes human-readable, grounded answers from structured retrieved memories and detects chronological shifts between multiple meetings.

---

## 4. What Would Break If That Component Were Removed

- **Without Next.js:** No unified application runtime; would require splitting into separate frontend and backend services with complex CORS and packaging overhead.
- **Without SQLite:** The app would have no way to remember which clients exist across browser refreshes or map client names to stable Hindsight bank IDs without exposing raw bank IDs to the browser.
- **Without Hindsight:** The application would have no durable memory extraction, no temporal entity graph, and no multi-strategy recall, degrading to either a stateless prompt-chucker or requiring thousands of lines of fragile vector/graph plumbing.
- **Without Application LLM:** The user would only receive a raw list of disjointed memory bullets and chunks without cohesive narrative synthesis, temporal reconciliation, or direct answers to specific queries.

---

## 5. What Is Intentionally NOT in the Architecture

- **No Vector Databases (Pinecone, Weaviate, Chroma, Qdrant):** Hindsight is the sole memory and retrieval system.
- **No Redis / Memcached / Caches:** Premature optimization; queries are routed directly to Hindsight.
- **No Message Queues / Event Buses (Kafka, RabbitMQ, BullMQ):** Synchronous, predictable request-response cycles keep the architecture understandable and easy to debug.
- **No Heavy Frameworks (LangChain, LlamaIndex):** Replaced with clean, typed, deterministic functions.
- **No Multi-Agent Frameworks (CrewAI, AutoGen, Agent Swarms):** ContextRelay has one clear agentic behavior: client context retrieval and grounded answering.
- **No Audio Recording or Transcription Bots:** Transcripts are generated externally and ingested as `.txt` or `.md`.
- **No Authentication / Multi-Tenant Billing:** Scoped as a single agency workspace.
- **No Synthetic Demo Data / Fake Seed Records:** The app starts completely empty.

---

## 6. Exact Hindsight Role

Hindsight acts as the **exclusive long-term memory engine**:
1. **Bank Isolation:** Maintains an isolated memory bank for each client using the naming pattern `client:<uuid>`.
2. **Memory Mission:** Each bank is configured with the explicit client-memory mission:
   > *"Extract durable business memory about this specific client. Prioritize explicit client preferences, likes/dislikes, decisions, approvals, rejections, constraints, goals, stakeholder roles, commitments, timelines, previous attempts, outcomes, and the reasons behind decisions when the reason is explicitly stated. Preserve temporal information and the source context. Prefer explicit statements over guesses. Ignore greetings, filler, small talk, transient scheduling chatter, generic conversation, repetitive phrasing, unrelated personal details, secrets, credentials, API keys, and information that has no likely future value for serving this client. Never invent facts."*
3. **Retention (`retain`):** Ingests raw meeting transcripts as documents, decomposes them into structured facts (`world`, `experience`, `observation`), resolves entity links, and tracks event dates.
4. **Recall (`recall`):** Executes multi-strategy retrieval (semantic vector, BM25 keyword, knowledge graph, temporal recency) and cross-encoder reranking to return the most relevant facts and source chunks within a requested token budget.

---

## 7. Exact Application LLM Role

The application LLM operates with a **strict, minimal scope**:
1. **Inputs:** System prompt, user question, and retrieved Hindsight facts/chunks.
2. **Behavior:**
   - Synthesizes a direct, factual answer using *only* the provided evidence.
   - Detects and articulates when client preferences changed over time (e.g., "The client initially approved X in January, but revised this to Y in March").
   - Explicitly states lack of knowledge if the evidence does not contain the answer.
   - Does NOT invent facts, assume world knowledge about the client, or retain questions into memory.
3. **Output:** Grounded natural-language text with citations to the evidence items.

---

## 8. Exact SQLite Role

SQLite acts as the **operational metadata store**:
1. Stores the `clients` table:
   - `id` (TEXT PRIMARY KEY - UUID)
   - `name` (TEXT NOT NULL)
   - `hindsight_bank_id` (TEXT NOT NULL UNIQUE)
   - `created_at` (TEXT ISO 8601)
2. Stores the `sources` table:
   - `id` (TEXT PRIMARY KEY - UUID)
   - `client_id` (TEXT NOT NULL, FOREIGN KEY)
   - `original_filename` (TEXT NOT NULL)
   - `content_type` (TEXT NOT NULL)
   - `size_bytes` (INTEGER NOT NULL)
   - `meeting_date` (TEXT)
   - `hindsight_document_id` (TEXT NOT NULL)
   - `ingestion_status` (TEXT: `processing`, `stored`, `failed`)
   - `error_message` (TEXT)
   - `created_at` (TEXT ISO 8601)
3. **Never stores memory:** Facts, entities, and vector embeddings are stored solely in Hindsight. SQLite never duplicates transcript texts or extracted facts.

---

## 9. Request Flow for Ingestion

```
1. User uploads .txt or .md file via Client Workspace UI.
2. Browser sends multipart/form-data to POST /api/sources?clientId=<id>.
3. Server validates:
   - Client exists in SQLite.
   - File is non-empty, valid UTF-8, and has .txt or .md extension.
   - File size is within limits (e.g., <= 5MB).
4. Server creates a `sources` record in SQLite with status `processing`.
5. Server calls Hindsight Retain:
   - Endpoint: POST /v1/default/banks/{bank_id}/memories
   - Body: MemoryItem with content, document_id, context="client-transcript", metadata.
6. Hindsight processes chunks, extracts facts, links entities, and builds memory graph.
7. Upon Hindsight success, server updates SQLite `sources` record status to `stored`.
8. If Hindsight fails, server updates status to `failed` and records a sanitized error message.
9. Server returns JSON response to browser: { id, filename, status: "stored" }.
```

---

## 10. Request Flow for Question Answering

```
1. User enters natural-language question in Client Workspace and clicks "Ask".
2. Browser sends POST /api/query with { clientId, question }.
3. Server verifies client in SQLite and resolves the client's `hindsight_bank_id`.
4. Server calls Hindsight Recall:
   - Endpoint: POST /v1/default/banks/{bank_id}/memories/recall
   - Query: user question
   - Budget: "mid", max_tokens: 4096
   - Include: { chunks: { max_tokens: 4096 }, entities: {} }
5. Hindsight returns RecallResponse with ranked `results`, `chunks`, and `entities`.
6. Server evaluates results:
   - If results array is empty:
     -> Server returns immediately: { answer: "No relevant stored client memory found.", evidence: [] }
     -> LLM is NOT called.
   - If results array is non-empty:
     -> Server formats evidence into prompt.
     -> Server calls Application LLM with grounding system prompt.
     -> LLM generates grounded answer.
     -> Server returns { answer: llmResponse, evidence: mappedEvidence }.
7. Browser renders the answer prominently, with the expandable Evidence drawer beneath it.
8. Neither question nor answer is retained into Hindsight.
```

---

## 11. Memory Isolation Strategy

- Each client account in ContextRelay is provisioned with a dedicated, isolated Hindsight bank (`client:<uuid>`).
- Hindsight provides strict multi-bank isolation: memory searches in bank A cannot view, traverse, or retrieve facts from bank B.
- The client bank ID is generated server-side and stored in SQLite. The browser only submits the `clientId`; the server securely resolves the corresponding `hindsight_bank_id`. Users cannot manipulate or forge bank IDs from the client.

---

## 12. Conflict Handling Strategy

- When clients change requirements across meetings (e.g., switching tech stacks, revising launch dates), Hindsight retains both statements as distinct facts with their respective document IDs and timestamps (`occurred_start`, `mentioned_at`).
- During recall, both facts are returned if relevant to the query.
- The Application LLM's grounding instructions mandate:
  1. Identifying when two pieces of evidence conflict or describe different moments in time.
  2. Prioritizing the newest explicit statement based on recorded dates.
  3. Clearly articulating the transition to the user (e.g., "The client initially preferred X on Jan 10, but updated this to Y on March 15").

---

## 13. Failure Handling Strategy

- **Missing Configuration:** If `HINDSIGHT_API_URL` or `LLM_API_KEY` is missing or invalid, the API routes return clear, user-friendly HTTP 500 error messages detailing the exact missing environment variable, without exposing internal secrets.
- **Ingestion Failures:** If Hindsight is unreachable or rejects a file during retain, the SQLite source record is marked `failed` with a readable error message. The UI reflects the failed state with a retry option.
- **Recall Failures:** If Hindsight recall fails or times out, the server returns a friendly error advising the user that the memory service could not be contacted.
- **LLM Failures:** If the LLM provider fails, times out, or throws a rate limit error, the server returns a structured error instructing the user to retry, while preserving the raw evidence if retrieval was successful.
- **Empty Memory:** If no memories are found for a query, the system gracefully returns "No relevant stored client memory found" without making an unnecessary LLM call.

---

## 14. Security Boundary

1. **Server-Side API Isolation:** All calls to Hindsight and external LLMs occur exclusively on the Node.js server. No API keys or tokens are ever sent to the browser or bundled in client-side scripts.
2. **Bank ID Protection:** Bank IDs are resolved server-side from the trusted SQLite client record.
3. **No Sensitive Data Logging:** Full transcript contents, API keys, and sensitive authorization headers are never written to server console logs.
4. **File Validation:** File type (`.txt`, `.md`), UTF-8 encoding, and file size limits are strictly enforced server-side before processing.
5. **No Secret Storage in Hindsight:** Passwords, API credentials, and personal information are explicitly excluded by the Hindsight retain mission.

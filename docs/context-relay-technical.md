# ContextRelay Technical Specification

## 1. Product Problem

In professional agency operations, the most critical asset in a client relationship is institutional context. Over months or years, an account manager learns nuanced details about a client:
- Brand preferences and visual constraints (what they love and what they hate).
- Previously rejected proposals, architectures, or pricing models (what failed and should never be repeated).
- Key stakeholder sign-off authorities (who actually approves budgets versus who manages day-to-day deliverables).
- Explicit technical constraints and regulatory mandates.
- How and why decisions were made when reasons were stated.
- How requirements shifted over time.

When that account manager leaves or transitions off the account, that context walks out the door with them. The historical artifacts—meeting recordings, transcripts, slide decks, and email threads—may remain in agency shared drives, but the synthesis that lived inside the human's head is effectively lost. 

The incoming account manager enters the relationship at a severe disadvantage. They lack historical clarity, inadvertently re-propose solutions the client already rejected, ask questions the client already answered, misidentify approval authorities, and restart client discovery from zero.

Transcripts alone do not solve this problem. A raw transcript is an unindexed chronological narrative full of filler, transient scheduling chatter, and conversational pleasantries. Expecting an incoming account manager to read hundreds of hours of raw transcripts before a client meeting is unrealistic.

ContextRelay exists to prevent agency-client knowledge loss by transforming raw meeting conversations into durable, client-isolated institutional memory, allowing incoming team members to query client history and receive evidence-grounded answers before making decisions.

---

## 2. Product Solution

ContextRelay preserves institutional client memory through an automated, server-orchestrated pipeline:
1. **Client Isolation:** Every client account is provisioned with a dedicated, isolated Hindsight memory bank (`client:<uuid>`).
2. **Zero Manual Memory Management:** The human account manager does not need to manually highlight text or command the system with "remember this." The raw conversation transcript is the direct input.
3. **Mission-Driven Fact Extraction:** Hindsight extracts durable business facts (preferences, decisions, rejections, constraints, stakeholder roles) while discarding transient conversational noise.
4. **Temporal Context & Provenance:** Memories are linked to entity graphs, chronological timestamps (`occurred_start`, `mentioned_at`), and verbatim source chunks.
5. **Multi-Strategy Recall:** Incoming team members ask natural-language questions. Hindsight executes hybrid retrieval (vector semantic, BM25 keyword, entity graph traversal, and temporal recency) to surface ranked evidence.
6. **Strictly Grounded LLM Answering:** An Application LLM synthesizes an authoritative answer conditioned strictly on retrieved evidence. If no memory exists, the system abstains from answering rather than hallucinating.
7. **Verifiable Evidence Drawer:** Every answer is backed by verifiable quotes, dates, and extraction types, providing the incoming account manager with full confidence.

---

## 3. System Architecture

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

## 4. Input

ContextRelay accepts two primary inputs:
1. **Client Name:** A UTF-8 string entered by the agency user to identify the client entity (e.g., `Meridian Logistics`).
2. **Conversation Transcript File:**
   - Supported file extensions: `.txt`, `.md`
   - Content encoding: Valid UTF-8 plain text or markdown
   - File size ceiling: 5 MB (enforced on both file byte length and string length)
   - Source origins: Meeting transcripts exported from Zoom, Microsoft Teams, Google Meet, Whisper, or Otter.

The application explicitly does NOT accept binary file formats (PDF, DOCX) or audio/video streams in this layer, avoiding opaque parsing artifacts and focusing strictly on verifiable conversation text.

---

## 5. Ingestion Pipeline

Ingestion is executed server-side in [`src/lib/ingestion.ts`](file:///c:/Users/techt/context-relay/src/lib/ingestion.ts) via `ingestTranscript(clientId, fileInput, options?)`:

```
Client File Upload (.txt / .md)
      │
      ▼
1. Validate Client Exists in SQLite
      │
      ▼
2. Validate File Extension (.txt or .md)
      │
      ▼
3. Validate Non-Empty UTF-8 Content
      │
      ▼
4. Validate File Size <= 5MB
      │
      ▼
5. Generate UUIDs (`sourceId`, `doc:sourceId`)
      │
      ▼
6. Insert Source Record into SQLite (`ingestion_status = 'processing'`)
      │
      ▼
7. Call `hindsight.ensureClientBank(bankId, clientName)`
      │
      ▼
8. Call `hindsight.retainTranscript(bankId, content, docId, metadata)`
      ├── Success ──► Update SQLite Source (`ingestion_status = 'stored'`)
      └── Failure ──► Update SQLite Source (`ingestion_status = 'failed'`, sanitized error)
```

Ingestion is synchronous (`async: false` in Hindsight Retain), ensuring that the UI status updates immediately upon completion of memory extraction.

---

## 6. SQLite Metadata Layer

ContextRelay uses Node.js native `DatabaseSync` (or file-backed SQLite in production) configured in WAL mode with foreign keys enabled:

### Schema: `clients`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Client UUID |
| `name` | TEXT | NOT NULL | Human-readable client name |
| `hindsight_bank_id` | TEXT | NOT NULL UNIQUE | Stable Hindsight bank identifier (`client:<uuid>`) |
| `created_at` | TEXT | NOT NULL | ISO 8601 creation timestamp |

### Schema: `sources`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Source UUID |
| `client_id` | TEXT | NOT NULL, REFERENCES clients(id) ON DELETE CASCADE | Parent client reference |
| `original_filename` | TEXT | NOT NULL | Original uploaded filename |
| `content_type` | TEXT | NOT NULL | MIME type (`text/plain` or `text/markdown`) |
| `size_bytes` | INTEGER | NOT NULL | File size in bytes |
| `meeting_date` | TEXT | NULL | Extracted or specified meeting date |
| `hindsight_document_id`| TEXT | NOT NULL | Hindsight document ID (`doc:<sourceId>`) |
| `ingestion_status` | TEXT | NOT NULL CHECK(status IN ('processing', 'stored', 'failed')) | Current lifecycle state |
| `error_message` | TEXT | NULL | Sanitized error message if failed |
| `created_at` | TEXT | NOT NULL | ISO 8601 creation timestamp |

**Storage Boundary Rule:** SQLite stores operational relational metadata only. It NEVER stores memory facts, entity nodes, or vector embeddings, preventing data duplication and split-brain states.

---

## 7. Hindsight Retain

When a transcript enters Hindsight Retain, Hindsight evaluates the conversation against the bank's configured **Client Memory Mission**:

```
Extract durable business memory about this specific client. Prioritize explicit client preferences, likes/dislikes, decisions, approvals, rejections, constraints, goals, stakeholder roles, commitments, timelines, previous attempts, outcomes, and the reasons behind decisions when the reason is explicitly stated. Preserve temporal information and the source context. Prefer explicit statements over guesses. Ignore greetings, filler, small talk, transient scheduling chatter, generic conversation, repetitive phrasing, unrelated personal details, secrets, credentials, API keys, and information that has no likely future value for serving this client. Never invent facts.
```

Hindsight decomposes the transcript into:
1. **Source Chunks:** Verbatim blocks of conversation retained with their character offsets and document associations.
2. **Extracted Facts:** Granular atomic statements categorized into types:
   - `world`: Objective facts about client requirements, architecture, or agreements.
   - `experience`: Events, attempts, and outcomes that took place.
   - `observation`: Synthesized patterns and behavioral nuances.
3. **Entity Resolution:** Named entities (e.g., `Sarah Jenkins`, `Aurora PostgreSQL`, `MongoDB`) linked to facts.
4. **Temporal Markers:** `occurred_start`, `occurred_end`, and `mentioned_at` timestamps derived from meeting headers or conversational context.

---

## 8. Hindsight Memory Architecture

Hindsight is not a generic vector index. It provides biomimetic, multi-faceted memory structures:
- **Bank Isolation:** Complete memory encapsulation per client bank. Bank queries cannot cross boundaries.
- **Knowledge Graph:** Facts are connected to entities, enabling graph-traversal queries (e.g., finding all decisions involving a specific stakeholder).
- **Temporal Indexing:** Every fact preserves its chronological anchor, allowing the system to distinguish between what was true in January versus what changed in March.
- **Source Provenance:** Every fact maintains pointers back to its originating `document_id` and `chunk_id`.

---

## 9. Hindsight Recall

When an account manager submits a query, ContextRelay invokes `recallMemories(bankId, query)` in [`src/lib/hindsight.ts`](file:///c:/Users/techt/context-relay/src/lib/hindsight.ts):
- **Budget:** `'mid'` (balanced latency and recall depth)
- **Max Tokens:** `4096`
- **Types Requested:** `['world', 'experience', 'observation']`
- **Include Options:** `includeChunks: true`, `includeEntities: true`, `includeSourceFacts: true`

Hindsight executes a hybrid search combining:
1. Dense vector semantic similarity.
2. Sparse BM25 keyword matching.
3. Knowledge graph entity hops.
4. Temporal recency scoring.
5. Cross-encoder reranking to return the most salient facts and matching source chunks.

---

## 10. Evidence Structure

The server formats retrieved memories into structured `RecalledEvidenceItem` objects:

```typescript
export interface RecalledEvidenceItem {
  id: string;
  text: string;                  // Extracted factual statement
  type: string;                  // 'world' | 'experience' | 'observation'
  context?: string | null;       // Context label ('client-transcript')
  occurredStart?: string | null; // ISO 8601 temporal marker
  occurredEnd?: string | null;
  mentionedAt?: string | null;
  documentId?: string | null;    // Originating document ID
  chunkId?: string | null;
  sourceChunk?: string | null;   // Verbatim transcript text excerpt
  entities?: string[] | null;    // Resolved entity tags
}
```

This evidence payload is returned directly to the UI alongside the synthesized answer, providing the user with full visibility into the source facts.

---

## 11. LLM Grounding

The Application LLM (Groq, OpenAI, Anthropic, or Gemini) operates strictly as a synthesis engine. It receives a rigid grounding prompt defined in [`src/lib/llm.ts`](file:///c:/Users/techt/context-relay/src/lib/llm.ts):

### Grounding System Prompt
```
You answer questions about a specific client account using only the memory evidence supplied by ContextRelay. The evidence comes from Hindsight. Do not invent facts. If the evidence does not answer the question, clearly say that the stored client memory does not contain enough information. When sources conflict, identify the conflict and prefer the newest explicit statement when dates are available. Preserve the distinction between what the client explicitly said and what is merely inferred. Keep answers useful, professional, and direct.
```

### Prompt Construction
The prompt includes:
- Up to 8 top evidence items with Fact text, Date, and Verbatim Source Quote.
- Strict instructions to answer strictly from the supplied evidence.
- Explicit directive to state lack of information if evidence is insufficient.
- Explicit directive to highlight changes over time when conflicting dates appear.

---

## 12. Output Contract

The API endpoint `/api/query` returns a clean JSON response contract:

```typescript
export interface ClientAnswerResponse {
  answer: string;                  // Natural language synthesized answer
  hasEvidence: boolean;            // Boolean flag
  evidence: RecalledEvidenceItem[];// Full supporting evidence array
  clientName: string;              // Target client name
}
```

If Hindsight returns 0 memories:
- The server halts immediately.
- The LLM is NEVER called.
- The response returns:
  `{ answer: "No relevant stored client memory found regarding your question.", hasEvidence: false, evidence: [], clientName }`

---

## 13. Client Isolation

ContextRelay guarantees total client isolation:
1. **Isolated Banks:** Client A is mapped to `client:<uuid_A>`; Client B is mapped to `client:<uuid_B>`.
2. **Server-Side Bank Resolution:** The browser client only submits the `clientId`. The server resolves the `hindsight_bank_id` from the trusted SQLite database. Bank IDs cannot be guessed or forged by the client.
3. **No Cross-Contamination:** Hindsight recall runs exclusively against the resolved bank ID. Memories from Client A can never leak into Client B's query results.

---

## 14. Temporal Context & Conflicting Information

Client relationships evolve over time. Decisions made during kickoff are frequently revised in later review meetings. ContextRelay handles this deterministically:
1. **Non-Destructive Retention:** Retaining a new transcript never overwrites or deletes earlier memories. Both kickoff memories and revision memories coexist in the client's bank.
2. **Dual Memory Surfacing:** When a query targets a changed requirement (e.g., launch deadline or database choice), Hindsight surfaces both the earlier and later facts with their respective timestamps.
3. **Chronological Synthesis:** The grounding prompt instructs the LLM to identify the temporal transition:
   > *"The client initially established May 15, 2026 as the launch date on January 15. However, on March 20, the client officially rescheduled the portal launch to June 30, 2026."*

---

## 15. Error Handling & Resilience

- **Missing Environment Variables:** If `HINDSIGHT_API_URL` or `LLM_API_KEY` is missing, endpoints fail gracefully with readable HTTP 500 JSON errors detailing what is required.
- **Hindsight Connectivity Failures:** If the Hindsight daemon is down or unreachable during retain, the SQLite source record is marked `'failed'` with a sanitized error message (`Ingestion failed: Connection refused...`), preventing broken state.
- **Malicious or Oversized Files:** Files without `.txt` or `.md` extensions, empty files, or files > 5MB are rejected with HTTP 400/422 before reaching Hindsight.
- **Secret Sanitization:** Error messages strip out API tokens and internal credentials before writing to SQLite or returning to the client.

---

## 16. Security & Credential Boundary

- **Zero Client-Side Exposure:** All API keys (`HINDSIGHT_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) reside exclusively in server-side environment variables.
- **No Build Secrets:** Automated CI/CD and regression tests verify that no API keys or environment variable names are bundled into client-side JavaScript chunks.
- **No Memory Retention of Lookups:** User questions and LLM answers are never retained into Hindsight, preventing prompt injection attacks or transient queries from polluting the durable client memory graph.

---

## 17. Honest Architectural Limitations

ContextRelay is intentionally scoped to do one thing with high reliability. It explicitly does not:
1. **Transcribe Audio:** The system requires plain text or markdown transcripts. It does not record audio or deploy automated meeting bots into Zoom/Teams calls.
2. **Perform Multi-Tenant User Management:** The application represents a single agency workspace. It does not feature user login credentials, tenant billing, or granular role-based permissions.
3. **Support Live Real-Time Collaboration:** Transcripts are ingested asynchronously after meetings conclude. It does not perform real-time speech streaming during live meetings.
4. **Replace Human Judgement:** ContextRelay recalls what was stated and decided in client meetings. It does not invent strategy or override client instructions.

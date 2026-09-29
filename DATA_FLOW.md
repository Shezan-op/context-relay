# Viora Data Flow

This document specifies the exact end-to-end data flow in Viora, detailing data transformations, storage boundaries, and payload contracts.

---

## 1. Complete Conceptual Data Flow Diagram

```
REAL CLIENT TRANSCRIPT FILE (.txt / .md)
        ↓
Next.js upload endpoint (/api/sources)
        ↓
Transcript validation (format, size, UTF-8, non-empty, max 5MB)
        ↓
SQLite SOURCE metadata (status: 'processing')
        ↓
Hindsight Retain (POST /v1/default/banks/{bank_id}/memories)
        ↓
Hindsight extracts durable client memory (via Client Memory Mission)
        ↓
Client-specific Hindsight bank (isolated `client:<uuid>`)
        ↓
+-------------------------------------------------------------------------------+
|                       CLIENT CONTINUITY REQUEST CHANNELS                      |
|                                                                               |
| 1. Don't Repeat This (/api/dont-repeat)                                       |
|    → Targeted Hindsight recall on rejections, failed approaches, dislikes     |
|    → Reason extraction without fabrication + date preservation + status       |
|                                                                               |
| 2. Decision Timeline (/api/timeline)                                          |
|    → Targeted Hindsight recall on decisions, approvals, mandates             |
|    → Chronological sorting + supersession tracking + evidence attachments     |
|                                                                               |
| 3. Handoff Brief (/api/handoff)                                               |
|    → Multi-faceted Hindsight recall across 6 operational dimensions           |
|    → Grounded synthesis into executive dossier + cross-links                  |
|                                                                               |
| 4. Ad-Hoc Grounded Query (/api/query)                                         |
|    → Natural language recall + strict grounding prompt + verbatim drawer      |
+-------------------------------------------------------------------------------+
        ↓
UI Workspace (Dark monochrome, verifiable evidence drawers, cross-links)
```

---

## 2. Step-by-Step Data Flow

### Step 1: Real Client Transcript Upload
The user uploads a real client meeting transcript file (`.txt` or `.md`) through the Client Workspace web interface. The browser sends a `multipart/form-data` request to the Next.js API route `/api/sources?clientId=<id>`.

### Step 2: Next.js Upload Endpoint & Server Validation
The Next.js route handler receives the file stream:
- Verifies that the client exists in the SQLite database and retrieves its associated `hindsight_bank_id`.
- Validates the file extension (`.txt` or `.md`).
- Validates that the file is not empty and does not exceed the maximum allowed size (5MB).
- Extracts plain text UTF-8 content from the file.

### Step 3: SQLite Source Metadata Recording
The server generates a new UUID for the source and records an entry in the SQLite `sources` table:
- `id`: `<uuid>`
- `client_id`: `<clientId>`
- `original_filename`: e.g., `"2026-03-12_q1_review.txt"`
- `content_type`: `"text/plain"` or `"text/markdown"`
- `size_bytes`: e.g., `42150`
- `hindsight_document_id`: `doc:<uuid>`
- `ingestion_status`: `"processing"`
- `created_at`: Current ISO 8601 timestamp

### Step 4: Hindsight Retain
The server calls the Hindsight API:
- **HTTP Endpoint:** `POST /v1/default/banks/{bank_id}/memories`
- **Request Body:**
  ```json
  {
    "items": [
      {
        "content": "<raw_transcript_text>",
        "document_id": "doc:<uuid>",
        "context": "client-transcript",
        "metadata": {
          "source_id": "<uuid>",
          "filename": "2026-03-12_q1_review.txt"
        }
      }
    ]
  }
  ```

### Step 5: Hindsight Fact Extraction
Hindsight splits the content into chunks and evaluates them against the bank's configured **client-memory mission**:
- Extracts structured facts (preferences, constraints, decisions, roles, timelines, and reasons).
- Links extracted entities into the client knowledge graph.
- Records temporal anchors (`occurred_start`, `mentioned_at`).
- Stores raw source chunks linked to the document ID.

### Step 6: Ingestion Completion
Upon receiving a successful HTTP response from Hindsight:
- The server updates the SQLite `sources` record: `ingestion_status = 'stored'`.
- The browser reflects the updated status in the uploaded files table.
- If Hindsight fails, the status is set to `'failed'` with a sanitized error message.

### Step 7: User Question Submission
The user enters a natural-language question regarding the client (e.g., *"What did the client decide regarding our staging rollout?"*) and submits the query form in the Client Workspace. The browser sends `POST /api/query` with `{ clientId, question }`.

### Step 8: Hindsight Recall
The server looks up the client's `hindsight_bank_id` from SQLite and queries Hindsight:
- **HTTP Endpoint:** `POST /v1/default/banks/{bank_id}/memories/recall`
- **Request Body:**
  ```json
  {
    "query": "What did the client decide regarding our staging rollout?",
    "types": ["world", "experience", "observation"],
    "budget": "mid",
    "max_tokens": 4096,
    "include": {
      "chunks": { "max_tokens": 4096 },
      "entities": { "max_tokens": 500 }
    }
  }
  ```

### Step 9: Multi-Strategy Retrieval & Evaluation
Hindsight executes multi-strategy retrieval (semantic vector search, BM25 keyword matching, graph traversal, and temporal recency) and cross-encoder reranking. It returns a `RecallResponse` containing ranked `results`, `chunks`, and `entities`.

The server checks if any memories were returned:
- **Case A (No memories returned):** The server immediately returns `{ answer: "No relevant stored client memory found.", evidence: [] }`. The Application LLM is NOT called.
- **Case B (Memories returned):** The server maps the facts and matching source chunks into a concise evidence payload and proceeds to Step 10.

### Step 10: Application LLM Grounding & Answer Synthesis
The server formats the grounding prompt with the user question and the retrieved evidence:
- **System Prompt:** Instructs the LLM to answer strictly from the supplied evidence, highlight chronological changes, and avoid hallucination.
- **User Prompt:** Contains the question and the numbered evidence items (facts, dates, source documents, and verbatim chunks).
- The LLM synthesizes a concise, authoritative answer referencing the evidence.

### Step 11: UI Rendering
The server returns `{ answer, evidence }` to the browser:
- The UI prominently displays the direct answer.
- Beneath the answer, the UI displays an **Evidence Drawer** showing each supporting memory fact, its timestamp, original file name, and expandable transcript chunk excerpt.

### Step 12: Don't Repeat This Flow
1. User clicks or views "Don't Repeat This" tab (`GET /api/dont-repeat?clientId=<id>`).
2. Server queries Hindsight using targeted negative recall queries (`rejected ideas, client dislikes, failed approaches`).
3. For each recalled fact, server extracts:
   - What was rejected/disliked.
   - Why it was rejected (extracted strictly from explicit `because/due to` evidence; if not present, marks `"Reason not recorded in available client memory."`).
   - When it occurred (from Hindsight `occurred_start` or `mentioned_at`).
   - Source document filename and verbatim quote.
   - Active vs superseded status (if later evidence shows client adopted it).
4. Returns `{ clientId, items, hasEvidence }`. The UI renders cards with explicit reasons, dates, and evidence quotes.

### Step 13: Decision Timeline Flow
1. User clicks or views "Decision Timeline" tab (`GET /api/timeline?clientId=<id>`).
2. Server queries Hindsight using decision-focused recall queries (`explicit decisions, approvals, mandates`).
3. Server filters candidates using decision indicators (`approved`, `decided`, `mandated`, `selected`).
4. Sorts decisions chronologically (oldest first, undated at end).
5. Detects superseded decisions by evaluating subsequent contradicting choices in the same domain.
6. Returns `{ clientId, timeline, hasEvidence }`. The UI renders a clean vertical timeline showing progression from historical choices to current state.

### Step 14: Handoff Brief Flow
1. User clicks "Prepare Handoff Brief" (`POST /api/handoff`).
2. Server executes parallel targeted recalls across 6 core continuity dimensions (decisions, preferences, stakeholders, rejections, constraints, history).
3. Evaluates retrieved evidence:
   - If zero facts are returned across all dimensions, short-circuits with an honest empty state without calling LLM.
   - If facts are present, feeds the evidence into the LLM with strict grounding instructions to synthesize the 9 structured sections.
4. Concurrently embeds the structured `dontRepeat` and `decisions` lists to provide one-click jump links ("Review Don't Repeat This →", "Explore Decision Timeline →").
5. Returns `{ clientId, brief, dontRepeat, decisions, evidence, generatedAt }`.

---

## 3. Storage and Transmission Breakdown

| Category | Description |
|---|---|
| **What is stored in SQLite** | Client records (`id`, `name`, `hindsight_bank_id`, `created_at`) and Source file metadata (`id`, `client_id`, `original_filename`, `content_type`, `size_bytes`, `meeting_date`, `hindsight_document_id`, `ingestion_status`, `error_message`, `created_at`). |
| **What is stored in Hindsight** | Document records, raw source text chunks, structured extracted memory facts (`world`, `experience`, `observation`), entity graph nodes/edges, and temporal event timestamps. |
| **What is sent to Hindsight** | During retain: raw transcript text, `document_id`, `context="client-transcript"`, and source metadata.<br>During recall: natural language query, fact types, budget, token limits, and include options (`chunks`, `entities`). |
| **What is retrieved from Hindsight** | Ranked fact objects (text, type, context, entity names, timestamps, chunk IDs, document IDs), source chunk map (text, chunk index), and entity states. |
| **What is sent to the LLM** | Grounding system prompt, the user's specific question, and the formatted list of retrieved memories and source chunk snippets. |
| **What is returned by the LLM** | Grounded natural-language answer text citing the supplied evidence. |
| **What is shown to the user** | The client workspaces, upload status table, user question, synthesized answer, and explicit evidence cards (memory text, date, source filename, chunk quote). |
| **What is NOT stored** | User questions and generated answers are NEVER retained into Hindsight (preventing memory pollution). Full transcripts are NOT duplicated in SQLite. API keys, secrets, and raw internal credentials are NEVER stored in Hindsight or sent to the browser. |

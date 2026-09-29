# Viora Architecture

**Durable Client Memory for Agency Account Continuity**

Viora preserves the decisions, preferences, history, and institutional knowledge built up during client relationships so the next person on the account can continue where the previous person stopped.

This document describes the end-to-end technical architecture of Viora, detailing data flow boundaries, storage contracts, Hindsight memory infrastructure, and LLM grounding constraints.

---

## 1. System Overview

In professional agency operations, account ownership frequently rotates. When an account manager rolls off, critical context vanishes:
- Client preferences and visual restrictions
- Explicit rejections (architectures, pricing structures, or approaches that failed)
- Key stakeholder sign-off authorities (who approves budget vs. deliverables)
- Technical mandates and compliance restrictions
- Changes in milestones and decisions over time

Viora is a single-workspace web application that ingests real meeting transcripts, extracts durable business memory into isolated Hindsight memory banks, and surfaces evidence-grounded recall to current and incoming team members.

---

## 2. System Architecture Diagram

```mermaid
flowchart TD
    subgraph Browser ["User Browser (Next.js Client)"]
        UI_List["Client Selector / Registry"]
        UI_Upload["Transcript Dropzone (.txt / .md)"]
        UI_Query["Query Interface & Continuity Prompts"]
        UI_Handoff["Account Handover Brief View"]
        UI_Answer["Grounded Answer + Evidence Drawer"]
    end

    subgraph Server ["Next.js Server Application (Node.js)"]
        API_Clients["/api/clients (Provision & List)"]
        API_Sources["/api/sources (Validation & Ingest)"]
        API_Query["/api/query (Recall & Answering)"]
        API_Handoff["/api/handoff (Handover Brief)"]

        Service_Ingest["Ingestion Service (lib/ingestion.ts)"]
        Service_Retrieval["Retrieval Service (lib/retrieval.ts)"]
        Service_LLM["LLM Grounding Service (lib/llm.ts)"]
    end

    subgraph Storage ["Persistent Operational Metadata"]
        SQLite[("SQLite Layer (node:sqlite / WAL Mode)\nclients table\nsources table")]
    end

    subgraph MemoryEngine ["Long-Term Memory Infrastructure (Hindsight)"]
        Bank["Isolated Bank: client:<uuid>\n- Client Memory Mission\n- Atomic Facts (world, experience, observation)\n- Entity Knowledge Graph\n- Temporal Timestamps\n- Verbatim Source Chunks"]
    end

    subgraph LLMProvider ["External Application LLM"]
        Provider["Configured Provider (Groq / OpenAI / Anthropic / Gemini)\nStrict Grounding System Prompt"]
    end

    UI_Upload -->|POST multipart/form-data| API_Sources
    API_Sources --> Service_Ingest
    Service_Ingest -->|Record Source metadata (processing)| SQLite
    Service_Ingest -->|Retain Transcript (Mission Extraction)| Bank
    Bank -->|Status OK| Service_Ingest
    Service_Ingest -->|Update Source status (stored)| SQLite

    UI_Query -->|POST JSON {clientId, question}| API_Query
    API_Query --> Service_Retrieval
    Service_Retrieval -->|Resolve Bank ID| SQLite
    Service_Retrieval -->|Recall Memories (vector, keyword, graph, temporal)| Bank
    Bank -->|Ranked Facts + Source Chunks| Service_Retrieval
    Service_Retrieval -->|Prompt + Evidence Items| Service_LLM
    Service_LLM --> Provider
    Provider -->|Grounded Natural Language Answer| Service_LLM
    Service_LLM --> UI_Answer

    UI_Handoff -->|POST JSON {clientId}| API_Handoff
    API_Handoff --> Service_Retrieval
```

---

## 3. Core Component Responsibilities

| Component | Module | Responsibility | What It Does NOT Own |
|---|---|---|---|
| **Client UI Shell** | `src/app/page.tsx` | Minimalist dark interface, workspace navigation, client selection, transcript upload dropzone, query input, handoff brief view, and evidence rendering. | Server credentials, LLM API keys, database execution, memory extraction. |
| **API Layer** | `src/app/api/*` | Route handlers (`/api/clients`, `/api/sources`, `/api/query`, `/api/handoff`), request validation, error formatting, HTTP status mapping. | Long-term memory storage, prompt engineering logic. |
| **Ingestion Service** | `src/lib/ingestion.ts` | File extension checking, 5MB size guard, UUID generation, SQLite source recording, invoking Hindsight Retain. | Fact extraction parsing, LLM answer synthesis. |
| **Retrieval Service** | `src/lib/retrieval.ts` | Resolving client bank IDs, orchestrating Hindsight Recall, empty-memory guards, assembling evidence items, generating handoff briefs. | Direct database schema creation, external HTTP routing. |
| **LLM Grounding Service** | `src/lib/llm.ts` | Formatting evidence into strict grounding prompts, calling configured providers (Groq, OpenAI, Anthropic, Gemini), preventing hallucinations, reconciling chronological shifts. | Memory storage, persistence, indexing. |
| **Metadata Store** | `src/lib/db.ts` | SQLite database (`node:sqlite`) managing `clients` and `sources` tables. Tracks bank mappings and ingestion states (`processing`, `stored`, `failed`). | Memory facts, embeddings, knowledge graphs, vector search. |
| **Memory Engine** | `src/lib/hindsight.ts` | Biomimetic memory layer powered by `@vectorize-io/hindsight-client`. Manages bank provisioning, Client Memory Mission, fact extraction (`world`, `experience`, `observation`), temporal anchors, and multi-strategy recall. | Operational file upload tracking, HTTP routing. |

---

## 4. Ingestion Flow

1. **User Action:** The user uploads a `.txt` or `.md` transcript in the Client Workspace.
2. **Transport:** The browser sends `multipart/form-data` to `POST /api/sources?clientId=<id>`.
3. **Validation (`src/lib/ingestion.ts`):**
   - Client is verified to exist in SQLite.
   - File extension must end with `.txt` or `.md`.
   - File content must be valid UTF-8 and non-empty.
   - File size must not exceed 5 MB.
4. **Metadata Recording:** A record is inserted into SQLite's `sources` table with status `processing`.
5. **Hindsight Bank Verification:** `ensureClientBank(bankId, clientName)` confirms the bank exists and applies the configured Client Memory Mission.
6. **Retention:** `hindsight.retainTranscript(bankId, textContent, docId, metadata)` is called synchronously (`async: false`).
7. **Extraction:** Hindsight splits the document into chunks, extracts structured facts, resolves entities, and attaches temporal anchors.
8. **Finalization:**
   - On success: SQLite source status is updated to `stored`.
   - On failure: SQLite source status is updated to `failed` with a sanitized error message.

---

## 5. Retrieval & Answering Flow

1. **User Action:** The account manager enters a question (e.g., *"What database technologies did the client reject or mandate?"*) and submits the query form.
2. **Transport:** The browser sends `POST /api/query` with `{ clientId, question }`.
3. **Bank Resolution:** The server resolves the client's `hindsight_bank_id` from trusted SQLite records.
4. **Hindsight Recall:** The server calls `hindsight.recallMemories(bankId, question)`:
   - Budget: `'mid'`
   - Max tokens: `4096`
   - Fact types: `['world', 'experience', 'observation']`
   - Include options: `includeChunks: true`, `includeEntities: true`, `includeSourceFacts: true`.
5. **Empty Memory Guard:** If Hindsight returns 0 memories:
   - The system halts immediately.
   - The LLM is **NEVER** called.
   - Returns: `{ answer: "No relevant stored client memory found regarding your question.", hasEvidence: false, evidence: [], clientName }`.
6. **Evidence Formatting:** If memories exist, the top evidence items (up to 8) are mapped with their fact statements, temporal timestamps, and verbatim source chunk quotes.
7. **LLM Synthesis (`src/lib/llm.ts`):**
   - The Application LLM receives the strict grounding system prompt.
   - The LLM answers solely based on the evidence.
   - If evidence reflects conflicting dates, it highlights the transition and prioritizes the newest explicit statement.
8. **Response:** The server returns `{ answer, hasEvidence: true, evidence, clientName }`.
9. **Zero Memory Pollution:** Neither the user question nor the LLM answer is retained into Hindsight, preventing lookup chatter from polluting client memory.

---

## 6. Memory Isolation Strategy

Agency clients often operate in competing markets. Cross-client data leaks are catastrophic. Viora enforces isolation at three levels:
1. **Bank Architecture:** Hindsight isolates memory banks by identifier (`client:<uuid>`). Bank A cannot read or traverse Bank B.
2. **Server-Side Resolution:** The browser never specifies or sees raw bank IDs; it only transmits application `clientId` values. The server looks up the corresponding `hindsight_bank_id` from SQLite.
3. **Automated Test Verification:** `tests/core-pipeline.test.ts` (Category 5) and `tests/acceptance-e2e.test.ts` programmatically verify that querying Client B cannot retrieve memories belonging to Client A.

---

## 7. Error Handling & Security Boundaries

1. **Credential Boundary:** All LLM API keys (`GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) and Hindsight credentials (`HINDSIGHT_API_KEY`, `HINDSIGHT_API_URL`) reside exclusively in server environment variables.
2. **Bundle Protection:** Automated tests verify that secret variable names never appear in client bundles.
3. **Sanitization:** Ingestion errors strip raw tokens and credentials before writing to SQLite or returning JSON errors.
4. **Input Sanitization:** Strict type checking on file extensions, non-empty text validation, and a 5MB payload limit prevent denial-of-service and buffer exhaustion.
5. **Failure Recovery:** If Hindsight is temporarily unreachable, the source record is marked `failed` rather than corrupting the database.

---

## 8. Current Architectural Limitations

Viora is intentionally scoped to do one thing with high reliability. It explicitly does NOT:
- Transcribe raw audio or deploy bots into live calls (requires text/markdown transcripts).
- Implement multi-tenant authentication, login credentials, or RBAC (single agency workspace).
- Integrate third-party CRM systems (Salesforce, HubSpot, Notion).
- Retain user queries or chat dialogues into long-term memory (prevents prompt injection and memory pollution).

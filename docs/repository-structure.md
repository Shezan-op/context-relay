# Repository Structure & Component Ownership

This document details the code organization of ContextRelay. For each primary directory and module, it defines explicit ownership boundaries: **what the component owns** and **what it does not own**.

---

## High-Level Directory Tree

```
context-relay/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── clients/          # Client CRUD & bank allocation
│   │   │   ├── dont-repeat/      # Targeted recall of rejected/failed approaches
│   │   │   ├── handoff/          # Account handover brief synthesis & cross-links
│   │   │   ├── query/            # Memory recall & grounded query
│   │   │   ├── sources/          # Transcript upload & synchronous retention
│   │   │   └── timeline/         # Chronological decision evolution & supersession
│   │   ├── globals.css           # Minimalist design tokens & stylesheet
│   │   ├── layout.tsx            # Root Next.js layout & typography
│   │   └── page.tsx              # Minimalist Continuity Workspace (3 features + query)
│   └── lib/
│       ├── db.ts                 # SQLite schema, migrations & CRUD operations (node:sqlite)
│       ├── hindsight.ts          # Hindsight HTTP client (Retain, Recall, Banks)
│       ├── llm.ts                # Multi-provider LLM grounding & prompt formatting
│       ├── retrieval.ts          # Orchestration layer connecting Hindsight & LLM
│       └── types.ts              # TypeScript interfaces & domain data models
├── tests/
│   ├── core-pipeline.test.ts     # Automated verification suite (15 categories)
│   ├── acceptance-e2e.test.ts    # End-to-end real lifecycle acceptance scenario
│   └── fixtures/                 # Sample test transcripts for automated runs
├── transcripts/                  # Production reference transcripts (kickoff, review)
├── docs/                         # Engineering architecture & technical specifications
├── package.json                  # Dependencies & execution scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## Component Ownership Matrix

### 1. `src/app/` — Application Presentation & Web Routing

#### `src/app/page.tsx`
- **What it Owns:**
  - Client-side interface rendering (Minimalist Utilitarian theme).
  - Client switching and workspace state management.
  - File upload trigger and ingestion progress feedback.
  - Query input, suggested continuity queries, and answer display.
  - Expandable verifiable evidence drawer showing quotes and timestamps.
  - Dedicated "Account Handover Brief" view toggle and rendering.
- **What it Does NOT Own:**
  - Direct database or SQLite connections.
  - Direct communication with Hindsight or LLM APIs (must route through `/api/*`).
  - Storage of server-side API keys (must never contain `process.env` secrets).

#### `src/app/globals.css`
- **What it Owns:**
  - Color tokens (near-black surfaces `#0c0d0e`, `#141618`, softened text `#ededed`, `#8e9099`, neutral borders `#212328`, accent `#3b82f6`).
  - Monospace typography hierarchy, button states, and layout grid styling.
- **What it Does NOT Own:**
  - Component business logic or layout state.

---

### 2. `src/app/api/` — HTTP API Layer & Request Validation

#### `src/app/api/clients/`
- **What it Owns:** Request validation for client creation and deletion; querying SQLite client tables.
- **What it Does NOT Own:** Long-term memory storage or semantic memory querying.

#### `src/app/api/sources/`
- **What it Owns:** Multipart form parsing, file extension validation (`.txt`, `.md`), file size enforcement (max 5MB limit), and invoking synchronous Hindsight retain. Programmatic JSON payloads accepted directly.
- **What it Does NOT Own:** Text extraction or entity recognition (delegated to Hindsight).

#### `src/app/api/dont-repeat/`
- **What it Owns:** Targeted recall of rejected ideas, failed approaches, client dislikes, and explicitly negative preferences; extracting verified reasons and dates; tracking superseded rejections.
- **What it Does NOT Own:** Ingestion or writing new facts to Hindsight.

#### `src/app/api/timeline/`
- **What it Owns:** Chronological ordering of verified client decisions, approvals, and mandates; identifying superseded historical choices vs current active decisions; preserving source provenance and temporal context.
- **What it Does NOT Own:** Fabricating timestamps or hallucinating decisions without underlying evidence.

#### `src/app/api/query/`
- **What it Owns:** Validating query payload, resolving client memory bank, invoking retrieval service, and returning grounded answer with evidence.
- **What it Does NOT Own:** Modifying long-term memory (queries are strictly read-only).

#### `src/app/api/handoff/`
- **What it Owns:** Handling requests for full account handover dossiers, aggregating multi-faceted memory recalls (decisions, preferences, rejections, stakeholders, constraints, unknowns), and connecting with Don't Repeat This and Decision Timeline via cross-links.
- **What it Does NOT Own:** Autonomous email dispatch or external notifications.

---

### 3. `src/lib/` — Core Engine & Integration Services

#### `src/lib/db.ts`
- **What it Owns:**
  - SQLite database initialization via Node.js native `node:sqlite` (`DatabaseSync`).
  - Relational schema tables (`clients`, `sources`).
  - CRUD operations for clients and source file metadata, including mapping Hindsight doc IDs back to original filenames.
- **What it Does NOT Own:**
  - Semantic memory search or embeddings.
  - Durable fact storage (owned by Hindsight).

#### `src/lib/hindsight.ts`
- **What it Owns:**
  - Direct HTTP interaction with the Hindsight engine (`/retain`, `/recall`, `/banks`).
  - Constructing retention payloads with document type and metadata.
  - Parsing recalled fact candidates and similarity scores.
- **What it Does NOT Own:**
  - LLM answer generation or prompt construction.
  - Storing operational source records.

#### `src/lib/llm.ts`
- **What it Owns:**
  - Provider auto-detection (Groq, OpenAI, Anthropic, Gemini).
  - Grounded system prompt formulation with negative constraints.
  - Evidence list serialization for LLM ingestion.
- **What it Does NOT Own:**
  - Memory search or retrieval logic.
  - Inventing answers outside the supplied evidence facts.

#### `src/lib/retrieval.ts`
- **What it Owns:**
  - End-to-end orchestration connecting Hindsight recall to continuity features (`getDontRepeatItems`, `getDecisionTimeline`, `generateClientHandoffBrief`, `answerClientQuestion`).
  - Short-circuit fallback execution when zero facts are recalled.
  - Reason extraction without fabrication and chronological sorting.
- **What it Does NOT Own:**
  - HTTP request/response formatting (owned by `src/app/api/`).

---

### 4. `tests/` — Automated Quality Gate

#### `tests/core-pipeline.test.ts`
- **What it Owns:**
  - Verification of 15 distinct pipeline categories: client registration, file validation, Hindsight retention, memory recall, grounded synthesis, negative grounding, multi-provider fallbacks, client bank isolation, decision evolution over time, zero client-side secrets, account handover brief generation, Don't Repeat This retrieval & reason preservation, Decision Timeline chronological ordering & supersession, Multi-Client Continuity Isolation, and end-to-end acceptance.
- **What it Does NOT Own:**
  - Production runtime data or persistent client state (tests run in temporary or isolated banks).

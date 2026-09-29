# API Reference

This document provides complete technical specifications for all REST API endpoints implemented in ContextRelay. All endpoints are hosted under `/api` and implemented via Next.js App Router route handlers.

---

## Endpoint Summary

| Method | Endpoint | Purpose | Downstream Dependencies | Source File |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/clients` | List all registered clients with source counts | SQLite | [`src/app/api/clients/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/clients/route.ts) |
| `POST` | `/api/clients` | Register a new client and allocate Hindsight bank | SQLite, Hindsight (Bank resolution) | [`src/app/api/clients/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/clients/route.ts) |
| `GET` | `/api/clients/:id` | Get client details and associated source files | SQLite | [`src/app/api/clients/[id]/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/clients/[id]/route.ts) |
| `DELETE` | `/api/clients/:id` | Delete a client and associated metadata | SQLite | [`src/app/api/clients/[id]/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/clients/[id]/route.ts) |
| `POST` | `/api/sources` | Upload and ingest a meeting transcript / document | SQLite, Hindsight (`POST /banks/{bank_id}/retain`) | [`src/app/api/sources/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/sources/route.ts) |
| `POST` | `/api/query` | Query client long-term memory with grounded response | SQLite, Hindsight (`POST /banks/{bank_id}/recall`), LLM | [`src/app/api/query/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/query/route.ts) |
| `POST` | `/api/handoff` | Generate structured account handover brief | SQLite, Hindsight (`POST /banks/{bank_id}/recall`), LLM | [`src/app/api/handoff/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/handoff/route.ts) |

---

## 1. Client Management

### 1.1 List Clients

`GET /api/clients`

Retrieves all registered agency client workspaces and the number of ingested sources for each.

- **Request Headers:** None
- **Query Parameters:** None
- **Success Response (HTTP 200):**
  ```json
  [
    {
      "id": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "name": "Acme Health",
      "hindsight_bank_id": "client-acme-health-x98f21",
      "created_at": "2026-01-15T10:00:00.000Z",
      "source_count": 3
    }
  ]
  ```

---

### 1.2 Create Client

`POST /api/clients`

Registers a new client workspace and assigns a deterministic, isolated Hindsight memory bank identifier.

- **Request Body (JSON):**
  ```json
  {
    "name": "Acme Health"
  }
  ```
- **Validation Rules:**
  - `name`: String, required, non-empty, max 100 characters.
- **Success Response (HTTP 201):**
  ```json
  {
    "id": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Acme Health",
    "hindsight_bank_id": "client-acme-health-x98f21",
    "created_at": "2026-01-15T10:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `HTTP 400`: `Client name is required`

---

### 1.3 Get Client by ID

`GET /api/clients/:id`

Retrieves client metadata and the complete list of ingested transcript sources.

- **URL Parameters:** `id` (Client UUID)
- **Success Response (HTTP 200):**
  ```json
  {
    "client": {
      "id": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "name": "Acme Health",
      "hindsight_bank_id": "client-acme-health-x98f21",
      "created_at": "2026-01-15T10:00:00.000Z"
    },
    "sources": [
      {
        "id": "src_1a2b3c4d",
        "client_id": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "filename": "kickoff_2026_01_15.txt",
        "document_type": "meeting_transcript",
        "status": "stored",
        "fact_count": 14,
        "created_at": "2026-01-15T10:05:00.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - `HTTP 404`: `Client not found`

---

### 1.4 Delete Client

`DELETE /api/clients/:id`

Deletes a client record and cascades deletion to associated SQLite source records.

- **URL Parameters:** `id` (Client UUID)
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true
  }
  ```
- **Error Responses:**
  - `HTTP 404`: `Client not found`

---

## 2. Ingestion Pipeline

### 2.1 Ingest Source Document

`POST /api/sources`

Uploads a meeting transcript or agreement, records operational metadata in SQLite, and invokes Hindsight Retain (`async: false`) to extract durable facts and entities into the client's memory bank.

- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `clientId` (string, required): Target client ID.
  - `file` (File, required): The document to ingest.
  - `documentType` (string, optional): E.g., `meeting_transcript`, `email_thread`, `specification` (defaults to `meeting_transcript`).
- **Validation Rules:**
  - File extension must be `.txt`, `.md`, or `.json`.
  - File size must not exceed 2MB (2,097,152 bytes).
  - Target `clientId` must exist in SQLite.
- **Success Response (HTTP 201):**
  ```json
  {
    "id": "src_1a2b3c4d",
    "filename": "tech_architecture_review.txt",
    "documentType": "meeting_transcript",
    "status": "stored",
    "factCount": 18,
    "createdAt": "2026-01-16T14:22:00.000Z"
  }
  ```
- **Error Responses:**
  - `HTTP 400`: `Invalid file type. Only .txt, .md, and .json files are supported.`
  - `HTTP 400`: `File exceeds 2MB limit.`
  - `HTTP 404`: `Client not found.`
  - `HTTP 500`: `Hindsight ingestion failed: [details]` (status in SQLite marked as `failed`).

---

## 3. Query & Continuity Retrieval

### 3.1 Query Client Memory

`POST /api/query`

Queries a client's long-term memory bank via Hindsight Recall, evaluates retrieved evidence, and generates a grounded, citation-backed response via an LLM.

- **Request Body (JSON):**
  ```json
  {
    "clientId": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "query": "What did the client decide regarding our database architecture?"
  }
  ```
- **Validation Rules:**
  - `clientId`: Required, non-empty.
  - `query`: Required, non-empty, max 1000 characters.
- **Processing Logic:**
  1. Resolves `hindsight_bank_id` for `clientId`.
  2. Executes `recallMemory(bankId, query, { topK: 10 })`.
  3. If facts count is 0: Returns deterministic short-circuit response without LLM invocation.
  4. If facts > 0: Passes structured evidence to LLM with negative grounding constraints.
- **Success Response (HTTP 200):**
  ```json
  {
    "answer": "The client initially approved PostgreSQL during the January 15 kickoff. However, during the March 12 architecture review, CTO Sarah Martinez mandated migrating to TimescaleDB to handle high-frequency IoT timeseries data.",
    "evidence": [
      {
        "id": "fact_99182",
        "fact": "Client approved PostgreSQL during initial kickoff meeting.",
        "occurredAt": "2026-01-15T10:00:00Z",
        "source": "kickoff_2026_01_15.txt",
        "confidence": 0.94
      },
      {
        "id": "fact_99214",
        "fact": "Sarah Martinez mandated migrating database to TimescaleDB for IoT telemetry.",
        "occurredAt": "2026-03-12T14:30:00Z",
        "source": "tech_architecture_review.txt",
        "confidence": 0.98
      }
    ],
    "factCount": 2,
    "llmProvider": "groq",
    "model": "llama-3.3-70b-versatile"
  }
  ```

---

### 3.2 Generate Account Handover Brief

`POST /api/handoff`

Generates an authoritative, multi-category continuity dossier for an incoming account manager taking over a client account.

- **Request Body (JSON):**
  ```json
  {
    "clientId": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
  ```
- **Validation Rules:**
  - `clientId`: Required, non-empty.
- **Processing Logic:**
  1. Resolves `hindsight_bank_id` for `clientId`.
  2. Executes multi-faceted recall queries covering:
     - Technical decisions & architecture
     - Key stakeholders, roles, and approval rules
     - Rejected concepts & failed approaches
     - Explicit client preferences and communication taboos
  3. Collates and deduplicates retrieved facts.
  4. Generates a structured Markdown handover dossier with verbatim evidence citations.
- **Success Response (HTTP 200):**
  ```json
  {
    "brief": "# Client Continuity & Handover Dossier: Acme Health\n\n## 1. Key Technical & Business Decisions\n- Database migrated from PostgreSQL to TimescaleDB (Approved by CTO Sarah Martinez on 2026-03-12).\n\n## 2. Rejected Approaches & What Failed\n- Client strictly rejected third-party analytics cookies due to HIPAA compliance concerns.\n\n## 3. Stakeholder Roles & Approval Hierarchy\n- Sarah Martinez holds final veto on database infrastructure.\n- David Chen approves budget changes exceeding $10,000.",
    "evidence": [ ... ],
    "factCount": 12,
    "llmProvider": "groq",
    "model": "llama-3.3-70b-versatile"
  }
  ```
- **Error Responses:**
  - `HTTP 400`: `clientId is required`
  - `HTTP 404`: `Client not found`

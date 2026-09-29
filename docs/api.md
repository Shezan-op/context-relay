# API Reference

This document provides complete technical specifications for all REST API endpoints implemented in ContextRelay. All endpoints are hosted under `/api` and implemented via Next.js App Router route handlers.

---

## Endpoint Summary

| Method | Endpoint | Purpose | Downstream Dependencies | Source File |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/clients` | List all registered clients with source counts | SQLite (`node:sqlite`) | [`src/app/api/clients/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/clients/route.ts) |
| `POST` | `/api/clients` | Register a new client and allocate Hindsight bank | SQLite, Hindsight (Bank resolution) | [`src/app/api/clients/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/clients/route.ts) |
| `GET` | `/api/clients/:id` | Get client details and associated source files | SQLite | [`src/app/api/clients/[id]/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/clients/[id]/route.ts) |
| `DELETE` | `/api/clients/:id` | Delete a client and associated metadata | SQLite | [`src/app/api/clients/[id]/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/clients/[id]/route.ts) |
| `POST` | `/api/sources` | Upload and ingest a meeting transcript (`.txt`, `.md`) | SQLite, Hindsight (`POST /banks/{bank_id}/retain`) | [`src/app/api/sources/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/sources/route.ts) |
| `GET` | `/api/sources` | List ingested source records for a client | SQLite | [`src/app/api/sources/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/sources/route.ts) |
| `GET` / `POST` | `/api/dont-repeat` | Retrieve rejected approaches, dislikes, and failed attempts | SQLite, Hindsight (`POST /banks/{bank_id}/recall`) | [`src/app/api/dont-repeat/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/dont-repeat/route.ts) |
| `GET` / `POST` | `/api/timeline` | Retrieve chronological decision evolution & superseded status | SQLite, Hindsight (`POST /banks/{bank_id}/recall`) | [`src/app/api/timeline/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/timeline/route.ts) |
| `GET` / `POST` | `/api/handoff` | Generate structured account handover brief | SQLite, Hindsight (`POST /banks/{bank_id}/recall`), LLM | [`src/app/api/handoff/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/handoff/route.ts) |
| `POST` | `/api/query` | Query client long-term memory with grounded response | SQLite, Hindsight (`POST /banks/{bank_id}/recall`), LLM | [`src/app/api/query/route.ts`](file:///c:/Users/techt/context-relay/src/app/api/query/route.ts) |

---

## 1. Client Management

### 1.1 List Clients

`GET /api/clients`

Retrieves all registered agency client workspaces and the number of ingested sources for each.

- **Request Headers:** None
- **Query Parameters:** None
- **Success Response (HTTP 200):**
  ```json
  {
    "clients": [
      {
        "id": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "name": "Acme Health",
        "hindsight_bank_id": "client-acme-health-x98f21",
        "created_at": "2026-01-15T10:00:00.000Z"
      }
    ]
  }
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
    "client": {
      "id": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "name": "Acme Health",
      "hindsight_bank_id": "client:9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "created_at": "2026-01-15T10:00:00.000Z"
    }
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
      "hindsight_bank_id": "client:9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "created_at": "2026-01-15T10:00:00.000Z"
    },
    "sources": [
      {
        "id": "src_1a2b3c4d",
        "client_id": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "original_filename": "kickoff_2026_01_15.txt",
        "content_type": "text/plain",
        "size_bytes": 1420,
        "meeting_date": "2026-01-15",
        "hindsight_document_id": "doc:src_1a2b3c4d",
        "ingestion_status": "stored",
        "error_message": null,
        "created_at": "2026-01-15T10:05:00.000Z"
      }
    ]
  }
  ```

---

## 2. Ingestion Pipeline

### 2.1 Ingest Source Document

`POST /api/sources`

Uploads a meeting transcript, records operational metadata in SQLite (`node:sqlite`), and invokes Hindsight Retain (`async: false`) to synchronously extract durable facts and entities into the client's memory bank.

- **Content-Type:** `multipart/form-data` or `application/json` (for programmatic ingestion)
- **Form Fields:**
  - `clientId` (string, required): Target client ID.
  - `file` (File, required): The document to ingest.
- **Validation Rules:**
  - File extension must be `.txt` or `.md`.
  - File size must not exceed **5MB** (5,242,880 bytes).
  - Target `clientId` must exist in SQLite.
- **Success Response (HTTP 201):**
  ```json
  {
    "source": {
      "id": "src_1a2b3c4d",
      "client_id": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "original_filename": "tech_architecture_review.txt",
      "content_type": "text/plain",
      "size_bytes": 2450,
      "meeting_date": null,
      "hindsight_document_id": "doc:src_1a2b3c4d",
      "ingestion_status": "stored",
      "error_message": null,
      "created_at": "2026-01-16T14:22:00.000Z"
    },
    "success": true,
    "message": "Transcript successfully retained in Hindsight client memory."
  }
  ```
- **Error Responses:**
  - `HTTP 400`: `Invalid file type. ContextRelay only accepts .txt and .md transcript files.`
  - `HTTP 400`: `File exceeds the 5MB size limit.`
  - `HTTP 400`: `Transcript file is empty.`
  - `HTTP 404`: `Client not found.`
  - `HTTP 422`: `Ingestion failed: [details]` (status in SQLite marked as `failed`).

---

## 3. Continuity Feature 1: Don't Repeat This

### 3.1 Retrieve Rejected Approaches & Failed Attempts

`GET /api/dont-repeat?clientId=...` or `POST /api/dont-repeat`

Queries Hindsight Recall for client-specific rejected ideas, failed attempts, and disliked technologies. Preserves reasons, dates, and evidence quotes.

- **Query / Body Parameters:** `clientId` (string, required)
- **Success Response (HTTP 200):**
  ```json
  {
    "clientName": "Acme Health",
    "hasEvidence": true,
    "items": [
      {
        "id": "rej-fact-102",
        "item": "Client strictly rejected third-party analytics cookies due to HIPAA compliance concerns.",
        "status": "active_rejection",
        "reason": "HIPAA compliance concerns",
        "date": "2026-01-15T10:00:00Z",
        "source": "kickoff_2026_01_15.txt",
        "sourceReference": "doc:src_1a2b3c4d",
        "evidenceQuote": "We strictly reject third-party tracking cookies because of HIPAA compliance.",
        "currentStatusNote": null,
        "evidenceId": "fact-102"
      }
    ],
    "evidence": [ ... ]
  }
  ```
- **Empty State Response (HTTP 200):**
  ```json
  {
    "clientName": "Acme Health",
    "hasEvidence": false,
    "items": [],
    "evidence": [],
    "message": "No recorded rejected approaches were found for this client."
  }
  ```

---

## 4. Continuity Feature 2: Decision Timeline

### 4.1 Retrieve Chronological Decision Evolution

`GET /api/timeline?clientId=...` or `POST /api/timeline`

Retrieves explicit client decisions and approvals, ordered chronologically, with automated detection of superseded decisions.

- **Query / Body Parameters:** `clientId` (string, required)
- **Success Response (HTTP 200):**
  ```json
  {
    "clientName": "Acme Health",
    "hasEvidence": true,
    "decisions": [
      {
        "id": "dec-fact-01",
        "statement": "Client approved standard PostgreSQL on AWS RDS for all services.",
        "status": "superseded",
        "date": "2026-01-10T10:00:00Z",
        "source": "kickoff_2026_01_10.txt",
        "supportingQuote": "PostgreSQL on AWS RDS is approved.",
        "supersededBy": "Client adopted TimescaleDB for time-series IoT telemetry...",
        "topic": "Database",
        "evidenceId": "fact-01"
      },
      {
        "id": "dec-fact-02",
        "statement": "Client adopted TimescaleDB for time-series telemetry while keeping PostgreSQL for core user records.",
        "status": "current",
        "date": "2026-03-20T14:00:00Z",
        "source": "review_2026_03_20.txt",
        "supportingQuote": "We decided to adopt TimescaleDB for telemetry.",
        "supersedes": "Client approved standard PostgreSQL on AWS RDS for all services.",
        "topic": "Database",
        "evidenceId": "fact-02"
      }
    ],
    "evidence": [ ... ]
  }
  ```

---

## 5. Continuity Feature 3: Handoff Brief

### 5.1 Generate Account Continuity Handover Brief

`GET /api/handoff?clientId=...` or `POST /api/handoff`

Compiles an authoritative handover dossier synthesizing active decisions, rejected approaches, stakeholder authorities, and constraints into a single operational brief.

- **Query / Body Parameters:** `clientId` (string, required)
- **Success Response (HTTP 200):**
  ```json
  {
    "clientName": "Acme Health",
    "hasEvidence": true,
    "brief": "### 1. Current State & Mandated Architecture\nTimescaleDB active for telemetry...\n\n### 2. Don't Repeat This\nThird-party tracking cookies strictly rejected...\n\n### 3. Stakeholder Governance\nSarah Martinez holds final veto authority...",
    "evidence": [ ... ],
    "dontRepeat": [ ... ],
    "decisions": [ ... ],
    "message": "Account continuity handover brief generated successfully."
  }
  ```

---

## 6. Targeted Memory Query

### 6.1 Query Client Memory

`POST /api/query`

Queries a client's long-term memory bank via Hindsight Recall, evaluates retrieved evidence, and generates a grounded response strictly bounded by recalled evidence.

- **Request Body (JSON):**
  ```json
  {
    "clientId": "clt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "question": "What database did Sarah approve?"
  }
  ```
- **Validation Rules:**
  - `clientId`: Required, non-empty.
  - `question`: Required, non-empty.
- **Success Response (HTTP 200):**
  ```json
  {
    "answer": "CTO Sarah Martinez initially approved PostgreSQL during the kickoff, but later mandated migrating telemetry data to TimescaleDB during the March architecture review.",
    "hasEvidence": true,
    "evidence": [ ... ],
    "clientName": "Acme Health"
  }
  ```

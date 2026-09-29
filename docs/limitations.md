# System Limitations & Non-Goals

ContextRelay is designed specifically to solve **agency-client institutional knowledge loss** across account manager transitions using durable long-term memory. To maintain engineering rigor and architectural clarity, it deliberately avoids bloated feature sets that distract from this core mission.

This document provides a candid assessment of what the system does **not** do, its architectural boundaries, and known operational constraints.

---

## 1. What ContextRelay Does NOT Do

| Domain | What Is NOT Implemented | Architectural Rationale / Impact |
| :--- | :--- | :--- |
| **Voice / Meeting Bots** | No autonomous meeting bots (e.g., Zoom, Google Meet, Teams recording bots like Recall.ai or Fireflies). | Ingestion requires raw meeting transcripts or call notes exported to `.txt`, `.md`, or `.json`. Audio transcription is an upstream pipeline responsibility. |
| **Automated CRM Sync** | No automated polling or webhook sync with HubSpot, Salesforce, or Pipedrive. | CRM deals and custom fields often contain high noise-to-signal ratios. ContextRelay focuses on rich conversational transcripts and client agreements. |
| **Direct Email / Slack Ingestion** | No IMAP/Gmail listeners or Slack app bot integrations. | Raw communication channels require rigorous filtering before ingestion. Documents must be explicitly submitted via the ingestion pipeline. |
| **Authentication & RBAC** | No user login, OAuth2, SAML/SSO, or role-based access control. | Currently structured as an internal agency single-tenant tool or trusted network service. Authentication must be managed at the edge/reverse-proxy layer. |
| **Multi-Agency Tenancy** | No multi-agency isolation. | The system isolates *clients within an agency* via separate Hindsight memory banks, but does not provide multi-tenant isolation between competing agencies on a shared database. |
| **Asynchronous Job Queues** | No Redis, BullMQ, RabbitMQ, or Celery background workers. | Document ingestion (`POST /api/sources`) is strictly synchronous (`async: false` in Hindsight Retain). Very large files (>5MB) or bulk uploads of dozens of transcripts will block the HTTP request until processing finishes. |
| **Automated HRIS Handoff Triggers** | No integration with BambooHR, Rippling, or Workday to detect when an employee leaves. | Account handover briefs are generated on-demand by the incoming account manager or team lead via the `POST /api/handoff` endpoint or UI. |
| **Autonomous Client Agent** | The system does NOT speak directly to clients or send autonomous emails. | ContextRelay is strictly an internal decision-support tool for account managers. It never interfaces externally with the agency's clients. |
| **Billing & Metering** | No Stripe integration, seat licenses, or usage quotas. | Open-source reference architecture with no billing middleware. |
| **Real-Time Telemetry** | No OpenTelemetry, Datadog, or Prometheus instrumentation. | Logging is stdout/stderr and SQLite source status records. |

---

## 2. Technical & Scale Boundaries

### 2.1 File Ingestion Boundaries
- **Maximum File Size:** Enforced at **5MB** (5,242,880 bytes) per transcript upload.
- **Accepted Formats:** Plain text (`.txt`) and Markdown (`.md`). Binary formats (PDF, DOCX, audio MP3/WAV) are rejected with HTTP 400.
- **Batch Processing:** Files must be uploaded individually or sequentially; there is no bulk ZIP ingestion endpoint.

### 2.2 Database Boundaries
- **Storage Engine:** SQLite via Node.js native `node:sqlite` (`DatabaseSync`).
- **Concurrency:** SQLite operates under single-writer locking with Write-Ahead Logging (WAL) enabled. While fine for agency account management teams, it is not architected for high-throughput write-heavy workloads.
- **Persistence:** In serverless or containerized environments, the SQLite database (`context_relay.sqlite`) will be destroyed on container restart unless persistent storage (or mounted volume) is configured.

### 2.3 Memory Model Boundaries
- **Lossy vs. Lossless:** Hindsight does not retain the exact verbatim text of an entire 10,000-word conversation; it extracts and structures durable entities, facts, decisions, and temporal relationships. Verbatim source quotes are preserved in evidence, but memory is semantic, not a raw mirror.
- **Recall Budget:** Memory recall retrieves a maximum of 10 to 15 relevant facts per query to fit within LLM context windows and maintain high precision. Broad inquiries like "Summarize everything that happened over 2 years" will retrieve the top 15 most salient memories, not an exhaustive encyclopedia.

---

## 3. Assumptions & Prerequisites

1. **Upstream Transcription:** Transcripts must be cleaned of basic garbage and formatted with speaker names (e.g., `Client Lead: ...`, `Account Manager: ...`) for optimal entity extraction.
2. **Connectivity:** Requires stable HTTPS outbound connectivity to Hindsight API endpoints (`https://api.hindsight.vectorize.io` or self-hosted instance) and the configured LLM inference provider (Groq, OpenAI, Anthropic, or Gemini).
3. **Environment Security:** API keys must be loaded via secure environment variables (`.env.local` or container secrets) and never exposed to client-side bundles.

---

## 4. Planned Future Roadmap (Non-Binding)

The following capabilities are architecturally compatible with ContextRelay and represent logical next steps:
1. **Asynchronous Ingestion Worker:** Transitioning `POST /api/sources` to return an ingestion job ID while an async queue processes Hindsight retain calls.
2. **Reverse Handoff Differential:** Comparing what the outgoing account manager was working on during their final 30 days versus the client's historical foundational decisions.
3. **Automated Export Packages:** One-click generation of encrypted offline handover dossiers (PDF/Markdown) for incoming leadership during emergency account reassignments.

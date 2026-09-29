# Testing Strategy & Automated Proofs

This document details the automated test suite in Viora, explaining how tests are structured, what each test category verifies, and how the test pipeline proves client continuity without relying on fake seed data.

---

## 1. Test Architecture & Runner

Viora uses Node.js's native test runner (`node:test`) executed via `tsx` for TypeScript execution:

```bash
npm test
# Equivalent to: tsx --test tests/**/*.test.ts
```

All tests execute against an isolated in-memory SQLite database (`process.env.DATABASE_PATH = ':memory:'`), guaranteeing complete test idempotency with zero disk pollution.

---

## 2. Test Suite Breakdown

The repository maintains two comprehensive test suites:
1. [`tests/core-pipeline.test.ts`](file:///c:/Users/techt/context-relay/tests/core-pipeline.test.ts) (14 Unit, Boundary & Continuity Categories)
2. [`tests/acceptance-e2e.test.ts`](file:///c:/Users/techt/context-relay/tests/acceptance-e2e.test.ts) (End-to-End Acceptance Pipeline, Criteria A through R)

---

## 3. What the Core Pipeline Tests Prove

| Test Category | File | What It Proves |
|---|---|---|
| **Category 1** | `core-pipeline.test.ts` | Client creation generates a stable, deterministic Hindsight bank ID matching `^client:[0-9a-f-]{36}$`. |
| **Category 2** | `core-pipeline.test.ts` | Transcript validation strictly rejects unsupported extensions (`.pdf`), empty text, and oversized files (> 5MB). |
| **Category 3** | `core-pipeline.test.ts` | Ingestion creates a SQLite record with status `stored` and invokes Hindsight Retain with correct document IDs and metadata. |
| **Category 4** | `core-pipeline.test.ts` | Ingestion failure marks the source record as `failed` in SQLite and preserves a readable, sanitized error message. |
| **Category 5** | `core-pipeline.test.ts` | Question answering strictly queries the target client's bank and never queries another client's bank. |
| **Category 6** | `core-pipeline.test.ts` | Recalled evidence items are correctly passed to the Application LLM with full context. |
| **Category 7** | `core-pipeline.test.ts` | Empty recall results immediately short-circuit without calling the LLM, preventing hallucination. |
| **Category 8** | `core-pipeline.test.ts` | Conflicting dated memories across multiple meetings are both surfaced with chronological dates rather than silently merged. |
| **Category 9** | `core-pipeline.test.ts` | Asking questions or generating answers never invokes Hindsight Retain, preventing memory pollution. |
| **Category 10** | `core-pipeline.test.ts` | Client source code and compiled static `.next/static` production build chunks are scanned to verify zero leakage of server secrets. |
| **Category 11** | `core-pipeline.test.ts` | The dedicated account handoff brief surfaces structured continuity evidence without hallucinating when memory is absent. |
| **Category 12** | `core-pipeline.test.ts` | **Don't Repeat This**: Targeted recall of rejections/failures, evidence quotes, exact dates, explicit reason extraction without fabrication, and superseded status handling. |
| **Category 13** | `core-pipeline.test.ts` | **Decision Timeline**: Chronological sorting, tracking decision evolution over time, evidence-backed supersession, and honest undated status. |
| **Category 14** | `core-pipeline.test.ts` | **Multi-Client Continuity Isolation**: Strictly ensures Don't Repeat This and Decision Timeline never leak memories across client banks. |

---

## 4. The End-to-End Client Continuity Acceptance Flow

In [`tests/acceptance-e2e.test.ts`](file:///c:/Users/techt/context-relay/tests/acceptance-e2e.test.ts), Viora executes a complete multi-meeting lifecycle simulating a real agency account transfer:

### Step A: Zero Seed Guarantee
- Asserts that the client registry starts completely empty (`initialClients.length === 0`).
- Creates Real Client Alpha (`Real Client Acme`).

### Step B & C: Ingest Kickoff Meeting
- Ingests raw conversation transcript (`kickoff_transcript.txt`) where Marcus Vance mandates PostgreSQL on AWS Aurora Serverless v2, strictly rejects MongoDB due to lack of relational transaction guarantees, and establishes Sarah Jenkins as the sole budget authority.
- **Verification:** User never typed "remember this" or tagged facts. Ingestion status transitions to `stored`.

### Step D, E, F, G: Initial Continuity Query
- Account manager asks: *"What database is approved for use?"*
- **Verification:** Hindsight recalls PostgreSQL mandate; Application LLM synthesizes grounded answer; Evidence drawer verifies verbatim quote: *"Our database must remain PostgreSQL on AWS RDS; do not use MongoDB."*

### Step H & I: Ingest Later Meeting with Requirement Revision
- Two months later, the agency ingests `q2_review_transcript.txt`: IoT sensor throughput increased 10x; Sarah Jenkins approves enabling TimescaleDB for time-series telematics while keeping PostgreSQL for core tables.
- **Verification:** Second transcript is stored in the same client bank alongside the earlier memories. Old history is preserved.

### Step J: Re-Query & Decision Evolution
- Incoming account manager asks: *"What database is approved for use?"*
- **Verification:** Both memories are recalled. The answer explains the chronological evolution: initial PostgreSQL mandate in January and the addition of TimescaleDB in March.

### Step K, L, M, N: Continuity Features Verification
- **Don't Repeat This**: Retrieves MongoDB rejection with verbatim quote and explicit reason ("relational transaction guarantees"), without fabrication.
- **Decision Timeline**: Surfaces chronological decision chain (PostgreSQL approved → TimescaleDB adopted for telematics) with superseded status clearly indicated.
- **Handoff Brief**: Prepares comprehensive briefing with cross-links to both Don't Repeat This and Decision Timeline.

### Step O, P, Q, R: Multi-Client Isolation Across All Features
- Real Client Beta is created with zero transcripts.
- Asking Client Beta queries or requesting Don't Repeat This / Timeline / Handoff returns `hasEvidence: false`, 0 items, and honest empty states ("No recorded rejected approaches were found for this client").
- **Verification:** Zero cross-tenant data leakage across all 3 continuity features.

---

## 5. Execution Log

```bash
> context-relay@1.0.0 test
> tsx --test tests/**/*.test.ts

✔ Acceptance Pipeline: Complete End-to-End Flow (Criteria A - R) (4.2185ms)
✔ Category 1: Client creation creates a stable Hindsight bank ID (2.6109ms)
✔ Category 2: Transcript validation rejects unsupported, empty, or oversized files (0.8732ms)
✔ Category 3: Successful ingestion creates a source record and retains into Hindsight (0.7601ms)
✔ Category 4: Ingestion failure marks the source as failed with readable error (0.4285ms)
✔ Category 5: Question answering queries only the target client bank (0.3912ms)
✔ Category 6: Relevant recall results are passed to the LLM (0.4103ms)
✔ Category 7: No-memory case stops cleanly without calling the LLM (0.2601ms)
✔ Category 8: Conflicting dated memories are both surfaced with chronological dates (0.3421ms)
✔ Category 9: Question/answer is never automatically retained into Hindsight (0.3129ms)
✔ Category 10: Server secrets and API keys never appear in client bundles (2.8102ms)
✔ Category 11: Dedicated account handover brief surfaces structured continuity evidence (0.4912ms)
✔ Category 12: Don't Repeat This targeted recall retrieves rejections with reasons (0.5412ms)
✔ Category 13: Decision Timeline chronologically orders decisions and tracks supersession (0.6124ms)
✔ Category 14: Multi-Client Continuity Isolation for all features (0.4821ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 340.1245
```

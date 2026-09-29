# Viora

**Durable Client Memory for Agency Account Continuity**

Viora preserves the decisions, preferences, history, and institutional knowledge built up during client relationships so the next person on the account can continue where the previous person stopped.

---

## 1. The Central Product Problem

Agency-client knowledge loss: When an account manager leaves, years of context walk out with them: what the client hates, what was tried, who approves what. The new person repeats old mistakes.

Solution: an agent that retains every client decision and preference, and recalls it for anyone new on the account.

Viora is not a generic AI assistant, not a generic chatbot, not a document Q&A tool, not a RAG chatbot, not a meeting summarizer, and not a transcript search engine.

The product story is:

**An agency should not lose client knowledge when a human leaves the account.**

---

## 2. The Human Story

1. **Account Manager A** spends months or years learning a client:
   - What the client hates and what they like.
   - What has already been tried and rejected.
   - What worked and what failed.
   - What the client explicitly approved versus strictly rejected.
   - Who has sole authority to approve deliverables and budget adjustments.
   - What decisions were made and why.
   - What requirements shifted over time.

2. **Account Manager A leaves the agency.** The documents, contracts, and transcripts may still exist in shared drives, but the institutional context is gone from the new person's head.

3. **Account Manager B takes over.** B makes decisions without knowing the history, repeats old mistakes, asks questions that were answered months ago, proposes solutions the client already rejected, and misidentifies sign-off authorities.

4. **Viora prevents that knowledge loss.** Conversations are retained as durable, client-isolated memory. Account Manager B asks Viora before client meetings, receives evidence-grounded recall, and continues the relationship instead of restarting it.

---

## 3. How Hindsight Powers the Memory Layer

Hindsight is not a generic vector index or simple retrieval vendor. It is the core long-term memory infrastructure:

- **Client-Specific Memory Banks:** Complete physical isolation using the naming pattern `client:<uuid>`.
- **Automatic Retention Without Manual Management:** The account manager never has to highlight text or type "remember this." Hindsight's retain pipeline extracts durable business knowledge according to its configured memory mission.
- **Fact Categorization:** Decomposes conversations into structured memory units: `world` (objective facts and constraints), `experience` (events, attempts, outcomes), and `observation` (patterns and dynamics).
- **Temporal Context & Changing Decisions:** Chronological anchors (`occurred_start`, `mentioned_at`) track how requirements evolve across multiple meetings without destroying historical context.
- **Multi-Strategy Recall:** Hybrid retrieval combining vector semantic similarity, BM25 keywords, entity graph traversal, and temporal recency.
- **Verifiable Source Provenance:** Links every recalled fact to verbatim transcript quotes and document IDs.

---

## 4. The Three Core Client Continuity Features

Viora organizes institutional knowledge into three unified continuity workflows:

1. **Don't Repeat This (`/api/dont-repeat`)**:
   - Surfaces what the agency previously tried with this client that the new account manager should not repeat.
   - Categorizes rejected ideas, failed approaches, client dislikes, and explicitly negative preferences.
   - Discloses verified reasons and exact dates only when explicitly recorded; never fabricates assumptions.
   - Detects when later client evidence supersedes historical rejections.

2. **Decision Timeline (`/api/timeline`)**:
   - Visualizes how technical and business decisions evolved over time.
   - Orders explicit mandates chronologically (e.g., PostgreSQL approved in kickoff → TimescaleDB adopted for telematics in Q2 review).
   - Identifies active vs superseded decisions with verifiable evidence quotes and dates.

3. **Handoff Brief (`/api/handoff`)**:
   - Answers: *"I just inherited this client. What do I need to know before my first meeting?"*
   - Prepares an executive briefing covering current decisions, preferences, stakeholders, rejections, constraints, and known unknowns.
   - Integrates cross-links directly to "Don't Repeat This" and "Decision Timeline".

---

## 5. How the Pipeline Works

```text
INPUT
  ↓ Real Client Transcript File (.txt or .md)
INGEST
  ↓ Next.js server validates file and records metadata in SQLite
HINDSIGHT RETAIN
  ↓ Hindsight extracts durable business facts, links entities, and indexes dates
CLIENT MEMORY BANK
  ↓ Isolated bank (`client:<uuid>`) stores client knowledge graph
USER QUERY
  ↓ Account manager asks a client continuity question
HINDSIGHT RECALL
  ↓ Multi-strategy recall (vector, keyword, graph, temporal) returns ranked facts & chunks
APPLICATION LLM
  ↓ LLM synthesizes a grounded answer strictly from retrieved evidence
OUTPUT + EVIDENCE
  ↓ UI displays direct answer with verifiable quotes, dates, and source snippets

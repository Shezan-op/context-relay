# An Account Manager Leaves. The Client Doesn't. But the Knowledge Does.

When an account manager leaves an agency after two years on a key client account, what actually walks out the door?

The agency still has the signed master service agreements. The shared Google Drive still holds pitch decks, creative briefs, Figma files, and invoices. The recording archives still hold hundreds of hours of Zoom, Teams, and Google Meet recordings.

Yet the moment the incoming account manager steps into their first client steering call, an uncomfortable reality emerges: the institutional context is gone.

The new account manager does not know what was tried six months ago and quietly discarded. They do not know that the client's CTO explicitly rejected MongoDB in the kickoff meeting and will react negatively if someone proposes a NoSQL document store again. They do not know that the Product Director holds approval authority for design deliverables up to $5,000, but any budget change above $10,000 requires the VP's personal signature. They do not know that the brand guidelines strictly forbid third-party analytics pixels due to HIPAA regulations, or that the database architecture was officially migrated from standard PostgreSQL to TimescaleDB during a midpoint review.

Without that context, the new account manager repeats old mistakes. They re-propose ideas the client already shot down. They ask questions the client already answered three times. They restart client discovery from zero.

This is agency-client knowledge loss. It is one of the most persistent, expensive operational drains in professional services. And it cannot be solved by dumping transcripts into a generic vector database.

---

## 1. The Hidden Cost of Account Manager Turnover

In digital agencies, consultancies, and technical service providers, account retention is built on nuanced human trust.

When an account manager resigns, the agency enters a danger zone:
1. **The Handover Scramble:** The agency frantically asks the departing manager to write a "handover doc" during their final two weeks. These documents are invariably rushed, incomplete, and superficial.
2. **The New Hire Trap:** The replacement manager inherits a calendar, an empty CRM thread, and 50 unsorted meeting recordings. Lacking 40 hours to watch video archives, they enter their first client call blind.
3. **The First Call Blunder:** The new manager innocently suggests an approach the client spent two months evaluating and rejecting last year.
4. **The Client Backlash:** The client feels exasperated: *"We explained this three times to your predecessor. Did they leave you any notes, or are we paying retainer rates to train your staff?"*

In seconds, eighteen months of accumulated client trust evaporates.

---

## 2. Why Transcripts Alone Are Not Enough

The modern agency does not lack transcripts. If anything, agencies suffer from transcript obesity. AI recording bots join every meeting, generating hundreds of pages of raw conversational text every week.

But raw transcripts are not institutional memory.
- A transcript is a chronological stream of consciousness filled with greetings, audio checks, conversational filler, scheduling logistics, and transient chatter.
- A single two-hour architecture meeting might contain forty pages of text, within which lie three permanent decisions, two brand constraints, and one updated deadline.
- Keyword search does not work: searching for "database" returns every casual joke, passing mention, and discarded alternative across twenty files, without telling the reader which database was approved, which was rejected, or why.
- Standard vector search (naive RAG) fails because splitting text into arbitrary 500-token chunks destroys temporal relationships and loses entity continuity when decisions evolve across meetings.

To solve account continuity, an agency needs a system that transforms conversations into structured, durable client memory—separating permanent institutional decisions from temporary conversational noise, preserving chronological shifts, and retrieving evidence when questions arise.

That is what **ContextRelay** does.

---

## 3. The Idea Behind ContextRelay

ContextRelay is built around a single premise:
**The person can leave. The client context should not.**

ContextRelay shifts institutional knowledge from an employee's ephemeral memory into a durable, client-isolated long-term memory layer. When meeting transcripts are uploaded, ContextRelay automatically extracts institutional business knowledge into an isolated memory bank dedicated to that client.

Crucially, the human account manager does not have to manually tag or format memory. They do not have to highlight text or command the system with "remember this." The raw meeting transcript itself is the input.

When an incoming account manager takes over the account, they do not have to guess what happened before. They can:
- Query specific historical decisions in natural language.
- Generate an authoritative **Account Handover Dossier** covering current technical decisions, key stakeholders, rejected approaches, and communication preferences.
- Review verifiable source quotes and meeting timestamps for every assertion.

---

## 4. Turning Conversations into Durable Client Memory

In ContextRelay, we enforce a strict distinction between four knowledge states:

```
[ TRANSCRIPT ] ──► [ CLIENT MEMORY ] ──► [ RETRIEVED EVIDENCE ] ──► [ GROUNDED ANSWER ]
```

1. **Transcript:** The raw, verbose conversational record of what was said.
2. **Client Memory:** Structured, durable entity-linked facts, preferences, constraints, and decisions extracted from the transcript.
3. **Retrieved Evidence:** The specific subset of verified facts recalled in response to a new manager's inquiry.
4. **Grounded Answer:** The concise natural-language briefing synthesized by an LLM strictly derived from the retrieved evidence.

---

## 5. How Hindsight Fits into the Architecture

ContextRelay relies on **Hindsight** as its dedicated long-term memory infrastructure.

```
Client Meeting Transcript (.txt / .md / .json)
                 │
                 ▼
Next.js Ingestion Route (/api/sources)
  - Validates client existence, format, and 2MB size limit
  - Records source metadata in local SQLite (status: 'processing')
                 │
                 ▼
Hindsight Retain Engine (async: false)
  - Discards pleasantries, filler, and transient logistics
  - Extracts durable facts, entities, decisions, and constraints
  - Anchors temporal markers and chronological relationships
  - Stores memory inside isolated client bank
  - Updates SQLite source status to 'stored'
                 │
                 ▼
Incoming Manager Query / Handover Brief (/api/query, /api/handoff)
  - Resolves target client's isolated bank ID
                 │
                 ▼
Hindsight Recall Engine
  - Returns ranked fact statements and verbatim source quotes
                 │
                 ▼
Application LLM Grounding
  - Evaluates retrieved evidence items
  - Enforces negative constraints (abstains if no memory exists)
  - Synthesizes concise answer or Handover Brief
                 │
                 ▼
User Interface: Answer + Verifiable Evidence Drawer
```

Hindsight owns durable entity extraction, temporal anchoring, and contextual recall. SQLite owns operational client registries and source ingestion tracking. The LLM owns natural-language synthesis.

---

## 6. Client Isolation

In agency environments, cross-client data contamination is catastrophic. Client A's confidential pricing or tech stack must never appear in responses to Client B.

ContextRelay enforces physical bank isolation:
- When a client is registered, the system allocates a dedicated Hindsight memory bank ID (e.g., `client-acme-health-x98f21`).
- Ingestion and recall resolve this bank ID server-side.
- There is no shared index or fragile metadata filter. Queries for Client A physically cannot access Client B's memory.

---

## 7. Retrieval & Ranking

When an incoming account manager submits a query, ContextRelay executes Hindsight recall within that client's bank.
- Retrieval evaluates semantic relevance, entity associations, and temporal recency.
- If zero relevant facts are found, the system triggers a **deterministic server-side short-circuit**, immediately returning:
  > *"No relevant stored client memory found for this inquiry."*
  The LLM is completely bypassed, eliminating hallucinations and saving tokens.

---

## 8. Verifiable Evidence

Every synthesized response in ContextRelay includes an expandable **Verifiable Evidence Drawer**.
The incoming manager can inspect:
- The exact extracted fact statement.
- The source transcript filename.
- The date and timestamp of the meeting.
- The confidence score.

The agency never has to trust a black-box AI; every claim is auditable against real meeting records.

---

## 9. Grounded Answer Generation

ContextRelay uses LLMs (Groq `llama-3.3-70b-versatile`, OpenAI `gpt-4o-mini`, Anthropic `claude-3-5-sonnet`, or Google `gemini-1.5-flash`) exclusively as a synthesis layer.

The LLM is prompted with strict negative grounding constraints:
- It is prohibited from using general pre-trained knowledge to speculate about client policies.
- It must derive its answer strictly from the supplied evidence facts.
- It must explicitly cite dates and stakeholders when presenting decisions.

---

## 10. Tracking Decision Changes Over Time

Client decisions are rarely static. In January, a client may approve standard PostgreSQL. In March, they may mandate migrating to TimescaleDB to handle high-frequency IoT telemetry.

In naive vector search, both documents exist as flat chunks, often causing the system to surface the older January decision as current.

In ContextRelay's memory model, memories preserve temporal progression:
- Both facts are retained with their respective timestamps.
- When recalled, the LLM recognizes the chronological evolution and explains:
  > *"The client initially approved PostgreSQL during the January 15 kickoff. However, during the March 12 architecture review, CTO Sarah Martinez mandated migrating to TimescaleDB to handle high-frequency IoT data."*

---

## 11. The Handover Scenario

When Account Manager Elena leaves and Account Manager Marcus takes over, Marcus opens ContextRelay and clicks **"Account Handover Brief"**.

The system aggregates multi-faceted memory recalls into an executive briefing document covering:
1. **Key Technical & Business Decisions**
2. **Rejected Concepts & Failed Approaches**
3. **Stakeholder Hierarchy (veto powers vs. budget signers)**
4. **Communication & Operational Preferences**

Marcus walks into his first meeting armed with two years of institutional knowledge, without Elena having spent a single hour writing handover documentation.

---

## 12. What ContextRelay Currently Supports

- Deterministic client creation and discrete Hindsight bank allocation.
- Ingestion of `.txt`, `.md`, and `.json` conversational transcripts up to 2MB.
- Synchronous memory retention with entity and temporal fact extraction.
- Natural-language queries with strict evidence grounding.
- Automated Account Handover Dossier synthesis.
- Expandable Verifiable Evidence Drawer with source quotes and timestamps.
- Multi-provider LLM support (Groq, OpenAI, Anthropic, Gemini).
- 100% automated test coverage across 12 core pipeline categories.

---

## 13. What ContextRelay Does NOT Do (Current Boundaries)

To maintain architectural rigor, ContextRelay deliberately avoids scope creep:
- **No live meeting recording bots:** It does not join Zoom or Google Meet calls as an audio bot. Ingestion requires exported text transcripts.
- **No automated CRM sync:** It does not scrape Salesforce or HubSpot custom fields.
- **No authentication / multi-agency RBAC:** It is designed as an internal single-tenant agency tool; network authentication must be managed via reverse proxy.
- **No background job queues:** Ingestion is synchronous (`async: false`).
- **No autonomous client-facing actions:** ContextRelay is an internal decision-support tool. It never emails or messages clients directly.

---

## 14. Why This Architecture Matters

Institutional knowledge loss is not a technological inevitability; it is an architectural failure.

By combining deterministic local metadata storage, entity-centric long-term memory via Hindsight, and strictly grounded LLM synthesis, ContextRelay provides agencies with a permanent institutional bridge between account managers.

When employees leave, the agency's equity remains intact. The person can leave. The client context stays.

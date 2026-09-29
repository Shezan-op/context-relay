# An Account Manager Leaves. The Client Doesn't. But the Knowledge Does.

When an account manager leaves an agency after two years on a key client account, what actually walks out the door?

The agency still has the contracts. The shared Google Drive still holds the pitch decks, creative briefs, design assets, and quarterly invoices. The recording archives still hold hundreds of hours of Zoom, Teams, and Google Meet transcripts. The documentation technically exists.

Yet the moment the incoming account manager steps into their first client steering call, an uncomfortable reality emerges: the institutional context is effectively gone.

The new account manager does not know what was tried six months ago and quietly discarded. They do not know that the client's VP of Technology explicitly rejected MongoDB in the kickoff meeting and will react negatively if someone proposes a NoSQL document store again. They do not know that the Product Director holds approval authority for design deliverables up to $5,000, but any budget change above $10,000 requires the VP's personal signature. They do not know that the brand guidelines strictly forbid pure-black backgrounds and neon accents, or that the beta launch deadline was officially pushed back from May 15 to June 30 during a midpoint review.

Without that context, the new account manager repeats old mistakes. They propose ideas the client already shot down. They ask questions the client already answered three times. They restart client discovery from zero.

This is agency-client knowledge loss. It is one of the most persistent operational drains in professional services. And it cannot be solved by dumping transcripts into a search engine.

---

## Why Transcripts Alone Fail

The modern agency does not lack recordings. If anything, agencies suffer from transcript obesity. AI recording bots join every meeting, generating hundreds of pages of raw conversational text every week.

But raw transcripts are not institutional memory. A transcript is a chronological stream of consciousness. It is filled with greetings, audio checks, conversational filler, scheduling logistics, and transient chatter. A single two-hour architecture meeting might contain forty pages of text, within which lie three permanent decisions, two brand constraints, and one updated deadline.

Expecting an incoming team member to read through forty past transcripts before taking over an account is a failure of workflow design. Keyword searches do not solve this either: searching for "database" returns every casual mention, joke, and side conversation across twenty files, without telling the reader which database was approved, which was rejected, or why.

To solve account continuity, an agency needs a system that transforms conversations into structured, durable client memory—separating permanent institutional decisions from temporary conversational noise, preserving chronological shifts, and retrieving evidence when questions arise.

That is what Viora does.

---

## How Viora Preserves Client Context

Viora is built around a single premise: an agency should not lose client knowledge when a human leaves the account.

The system acts as a durable client memory layer for agency workspaces. When meeting transcripts are uploaded, Viora automatically extracts institutional business knowledge into an isolated memory bank dedicated to that client.

Crucially, the human account manager does not have to manually manage memory. They do not have to highlight text, tag categories, or command the system with "remember that Sarah approves budgets." The source transcript itself is the input.

When an incoming account manager takes over the account, they do not have to guess what happened before. They ask direct questions in natural language:

- *"What technologies did the client explicitly reject or mandate?"*
- *"Who holds final sign-off authority for design changes versus budget modifications?"*
- *"What brand design rules and visual restrictions were established?"*
- *"Did the portal launch timeline change across meetings?"*

Viora recalls the relevant client memory, provides verifiable source evidence, and synthesizes a direct, grounded answer.

---

## The Architecture: Hindsight as the Memory Layer

To build true institutional continuity, Viora does not treat memory as a simple vector database lookup. It relies on Hindsight as its dedicated memory infrastructure.

```
Client Meeting Transcript (.txt / .md)
                 │
                 ▼
Next.js Ingestion Route (/api/sources)
  - Validates client existence, format, and 5MB size limit
  - Records source metadata in local SQLite (status: 'processing')
                 │
                 ▼
Hindsight Retain Engine
  - Guided by explicit Client Memory Mission
  - Discards pleasantries, filler, and credentials
  - Extracts durable facts ('world', 'experience', 'observation')
  - Builds entity graph and anchors temporal markers
  - Stores memory inside isolated bank (`client:<uuid>`)
  - Updates SQLite source status to 'stored'
                 │
                 ▼
Incoming Account Manager Query (/api/query)
  - Resolves target client's isolated bank ID
                 │
                 ▼
Hindsight Multi-Strategy Recall
  - Hybrid search: vector similarity, BM25 keywords, graph hops, temporal recency
  - Returns ranked fact statements and verbatim source chunks
                 │
                 ▼
Application LLM Grounding
  - Evaluates retrieved evidence items
  - Reconciles chronological conflicts across dates
  - Synthesizes concise answer (abstains if no memory exists)
                 │
                 ▼
User Interface: Answer + Verifiable Evidence Drawer
```

### Isolated Client Banks
Agency client data must never leak across account boundaries. When a client is created in Viora, the server provisions a dedicated Hindsight bank keyed by a stable UUID (`client:<uuid>`). Queries executed within Client A's workspace have no architectural access to Client B's memories.

### Mission-Driven Fact Extraction
Hindsight's retain engine operates under a rigorous client-memory mission. It prioritizes explicit client preferences, approvals, rejections, constraints, stakeholder sign-offs, and commitments, while explicitly ignoring greetings, filler, transient scheduling chatter, and credentials. It extracts atomic statements categorized into types:
- `world`: Objective requirements and technical architectural mandates.
- `experience`: Historical attempts, client reactions, and past outcomes.
- `observation`: Operational patterns and stakeholder dynamics.

### Temporal Tracking and Changing Decisions
Client requirements do not remain static. In January, a client may approve a May 15 launch date. In March, they may shift that date to June 30 due to an audit delay. 

Rather than overwriting history, Hindsight retains both statements as distinct facts anchored by their respective timestamps (`occurred_start`, `mentioned_at`). During recall, both facts are surfaced to the Application LLM, which recognizes the chronological evolution and explains the change clearly:
> *"The client originally targeted a May 15, 2026 launch in the January 15 kickoff meeting. However, during the March 20 review, the launch date was officially rescheduled to June 30, 2026 to accommodate an executive audit window."*

### Zero Memory Pollution
When an account manager queries Viora, the query and answer are strictly ephemeral. Viora never retains user lookups into Hindsight. This ensures that transient questions or hypothetical inquiries never contaminate the client's permanent institutional knowledge base.

---

## Before and After: A Real Account Handover

Consider Meridian Logistics, an enterprise logistics provider undergoing a major digital portal redesign:

### Before Viora
1. **Year 1:** Account Director Jordan Lee spends months establishing technical constraints with Meridian's leadership. The client mandates AWS Aurora Serverless v2 PostgreSQL, strictly rejects MongoDB due to enterprise audit compliance, specifies a Deep Navy brand palette forbidding pure-black or neon accents, and designates VP of Technology Marcus Vance as the sole signer for budgets over $10,000.
2. **Transition:** Jordan accepts an executive role at another firm and departs the agency.
3. **The Trap:** Incoming Account Manager Taylor Cole takes over the account. Taylor prepares a sprint review proposal suggesting MongoDB for the vehicle telemetry feed, includes a modern neon-accented dark UI mockup, and submits a $7,500 creative scope invoice directly to the VP.
4. **The Friction:** The client is frustrated. *"We explicitly rejected MongoDB four months ago. We told Jordan no neon accents. And why is Marcus being asked to approve a creative invoice when Elena has sign-off authority?"* The client relationship starts with friction and loss of trust.

### After Viora
1. **Retention:** Both the January kickoff transcript and the March architecture review transcript were ingested into Meridian's isolated memory bank.
2. **Transition:** Jordan departs. Taylor inherits the account.
3. **Query:** Before drafting the proposal, Taylor opens Meridian's workspace and asks:
   - *"What database technologies did the client reject or mandate?"*
   - Viora recalls: *"Client approved PostgreSQL on AWS Aurora Serverless v2 and strictly rejected MongoDB due to audit compliance mandates. On March 20, TimescaleDB was approved as a PostgreSQL extension for vehicle telemetry."*
   - Taylor asks: *"Who has approval authority for creative scope adjustments?"*
   - Viora recalls: *"Elena Rostova was officially delegated sign-off authority for creative sprint deliverables and design assets up to $5,000 on March 20, while Marcus Vance retains sign-off for alterations exceeding $10,000."*
4. **Evidence:** Beneath each answer, Taylor clicks to expand the exact transcript excerpt with timestamps and attendee names.
5. **The Outcome:** Taylor sends the invoice to Elena, specifies TimescaleDB on PostgreSQL, presents the Deep Navy palette, and continues the account with the confidence of someone who has been there for two years.

---

## An Honest Architectural Limitation

Viora is engineered to solve account amnesia with precision, which means it deliberately rejects scope creep:
- It does not listen to live microphones or inject automated recording bots into Zoom calls. It requires plain text or markdown transcripts.
- It does not attempt to be a general-purpose project management suite, CRM, or billing platform.
- It will not guess or invent client context. If a meeting transcript does not state who approved a decision, Viora reports that the information is absent from client memory rather than hallucinating an answer.

Institutional continuity is not about flashy chatbots. It is about preserving the hard-won decisions, preferences, and human nuances that make client partnerships work.

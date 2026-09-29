# Viora Memory Model

One of the most critical concepts in Viora is the architectural distinction between raw history, durable memory, retrieved evidence, and synthesized answers.

---

## 1. The Core Conceptual Separation

Many AI projects conflate four fundamentally different concepts into a generic "RAG" pipeline. Viora strictly separates them:

| Concept | What It Is | Where It Lives | Lifespan | Mutability |
|---|---|---|---|---|
| **Transcript** | Historical raw material (conversation record, spoken words, pleasantries, filler). | Uploaded file (`.txt`/`.md`), stored as source chunks in Hindsight. | Permanent source audit trail. | Immutable. |
| **Memory** | Structured, queryable client facts (preferences, mandates, rejections, sign-offs, dates, entity links). | Client-specific Hindsight bank (`client:<uuid>`). | Durable institutional memory. | Additive; layers over time. |
| **Evidence** | A subset of recalled facts and matching verbatim quotes relevant to a specific query. | In-memory payload passed to the server and UI. | Ephemeral (query lifecycle). | Read-only slice. |
| **LLM Answer** | Natural language synthesis explaining what the evidence means in the context of the user's question. | Rendered in browser UI; returned in JSON response. | Ephemeral (never retained). | Transient output. |

> **Key Architectural Insight:**  
> A transcript is a historical record of what happened.  
> A client memory system turns that history into structured context that the next account manager can actually query, understand, and use.

---

## 2. What "Memory" Means in Viora

In Viora, memory is not a text chunk or a floating vector embedding. Memory is a **typed atomic proposition** linked to entities and temporal markers:

### Fact Types Extracted by Hindsight:
1. `world`: Declarative client constraints, infrastructure requirements, tech stack rules, and explicit agreements.
   - *Example:* "Client requires PostgreSQL on AWS Aurora Serverless v2 in us-east-1."
   - *Example:* "Client enterprise compliance team strictly rejected MongoDB due to audit requirements."
2. `experience`: Historical trials, proposals, tests, and outcomes.
   - *Example:* "Client tried a previous vendor who proposed MongoDB, which failed the enterprise audit."
   - *Example:* "Client telemetry feed produced high indexing overhead during Sprint 4 load testing."
3. `observation`: Operational dynamics, patterns, and authority structures.
   - *Example:* "Marcus Vance holds sole sign-off authority for budget alterations exceeding $10,000."
   - *Example:* "Elena Rostova is authorized to approve creative assets and sprint scope adjustments up to $5,000."

---

## 3. The Client Memory Mission

Hindsight's retention pipeline is directed by the explicit **Client Memory Mission** configured in `src/lib/hindsight.ts`:

```
Extract durable business memory about this specific client. Prioritize explicit client preferences, likes/dislikes, decisions, approvals, rejections, constraints, goals, stakeholder roles, commitments, timelines, previous attempts, outcomes, and the reasons behind decisions when the reason is explicitly stated. Preserve temporal information and the source context. Prefer explicit statements over guesses. Ignore greetings, filler, small talk, transient scheduling chatter, generic conversation, repetitive phrasing, unrelated personal details, secrets, credentials, API keys, and information that has no likely future value for serving this client. Never invent facts.
```

### What Is Retained:
- Explicit client preferences (e.g., Deep Navy and Cobalt brand palette).
- Non-negotiable technical constraints (e.g., AWS us-east-1 only).
- Explicit rejections (e.g., strictly rejected MongoDB; forbid pure-black or neon modes).
- Stakeholder sign-off thresholds (e.g., Marcus Vance >$10k; Elena Rostova <=$5k).
- Timeline commitments and milestone changes.
- Stated business rationale behind decisions.

### What Is Discarded:
- Small talk ("How was your weekend?", "Can everyone see my screen?").
- Transient scheduling chatter ("Let's push this call back 10 minutes").
- Repetitive conversational filler and conversational pleasantries.
- Passwords, access tokens, API credentials, and personal private information.

---

## 4. Entity Linking & Knowledge Graph

Every extracted fact is connected to resolved entities in Hindsight's knowledge graph:
- **People Entities:** `Marcus Vance`, `Elena Rostova`, `Jordan Lee`, `Priya Patel`.
- **System Entities:** `AWS Aurora PostgreSQL`, `MongoDB`, `TimescaleDB`, `AWS us-east-1`.
- **Project Entities:** `Meridian Logistics Enterprise Portal`, `Sprint 1`, `Sprint 5`.

When a user asks: *"Who has sign-off authority for design assets?"*, Hindsight traverses edges connected to the entities `Elena Rostova` and `Marcus Vance`, surfacing the relevant delegation fact even if the exact keyword "sign-off" appeared elsewhere in the transcript.

---

## 5. Temporal Indexing & Chronological Layering

Client relationships evolve. Decisions made in month one are frequently revised in month three. Viora models time explicitly:

### Non-Destructive Ingestion
When a newer transcript (e.g., Meeting 2) is uploaded:
- Earlier memories from Meeting 1 are **never deleted or overwritten**.
- New memories are layered into the existing client bank.
- Each memory preserves its temporal anchors: `occurred_start`, `occurred_end`, and `mentioned_at`.

### Chronological Coexistence
```
Meeting 1 (2026-01-15):
  Fact: Beta portal launch target set to May 15, 2026.
  Anchor: occurred_start = "2026-01-15T10:00:00Z"

Meeting 2 (2026-03-20):
  Fact: Official launch deadline moved to June 30, 2026 for six weeks of load testing.
  Anchor: occurred_start = "2026-03-20T10:00:00Z"
```

### Conflict Resolution Strategy
When an incoming account manager asks: *"What is the portal launch deadline?"*:
1. Hindsight Recall retrieves **both** facts because both relate semantically to the portal launch deadline.
2. The Application LLM's grounding prompt explicitly instructs:
   > *"When sources conflict, identify the conflict and prefer the newest explicit statement when dates are available."*
3. The LLM explains the transition:
   > *"The portal launch was initially scheduled for May 15, 2026 during the January 15 kickoff. On March 20, 2026, the client officially updated the deadline to June 30, 2026 to accommodate an executive audit window and provide six additional weeks for load testing."*
4. The user receives complete continuity: they know both the current deadline and why it changed.

---

## 6. Zero Memory Pollution Guarantee

A common failure mode in naive AI memory products is retaining user questions and AI answers back into the memory store. Over time, this leads to **memory drift**, circular reinforcement of hallucinations, and prompt injection vulnerabilities.

In Viora:
- **Only validated meeting transcripts are retained into Hindsight.**
- **User queries and generated answers are strictly ephemeral.**
- An account manager can ask exploratory, hypothetical, or clarifying questions without risking contaminating the client's institutional knowledge graph.

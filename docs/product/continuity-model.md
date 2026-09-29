# The Client Continuity Model

## 1. The Core Conceptual Model

In traditional agency operations, client context is tied directly to the **individual human** managing the account. When the human departs, the connection breaks.

Viora introduces an architectural bridge that shifts institutional context from the employee's ephemeral memory into **durable client memory**.

```
ACCOUNT MANAGER A (Elena)
          │
          ▼ [Client Conversations]
    VIORA
          │
          ▼ [Retain Durable Facts]
    HINDSIGHT MEMORY BANK
          │
          ▼ (Elena Resigns)
   [CONTEXT SURVIVES]
          │
          ▼ [Recall Relevant Context]
ACCOUNT MANAGER B (Marcus)
          │
          ▼ [Informed Dialogue]
CONTINUED CLIENT RELATIONSHIP
(No Starting From Scratch)
```

---

## 2. The Four Knowledge States

To prevent confusion between raw documents, AI models, and memories, Viora enforces four strictly delineated knowledge states:

```
[ 1. TRANSCRIPT ]
"Raw, verbose, conversational stream of what was said."
        │
        ▼ (Hindsight Extraction & Retention)
[ 2. CLIENT MEMORY ]
"Structured, durable, entity-linked facts, preferences, and decisions."
        │
        ▼ (Contextual Recall)
[ 3. RETRIEVED EVIDENCE ]
"Specific subset of verified facts relevant to a new manager's inquiry."
        │
        ▼ (Strictly Grounded Synthesis)
[ 4. SYNTHESIZED ANSWER ]
"Clear, natural-language briefing directly citing the retrieved evidence."
```

| State | Definition | Where It Lives | Lifespan |
| :--- | :--- | :--- | :--- |
| **1. Transcript** | Verbatim transcript of a meeting or email exchange. | Raw uploaded file / SQLite source record. | Historical reference document. |
| **2. Memory** | Extracted facts, entities, decisions, and temporal relationships. | Client's isolated Hindsight memory bank. | Permanent institutional context. |
| **3. Evidence** | Relevant facts retrieved in response to a specific inquiry. | In-memory API payload with similarity & confidence scores. | Generated per query. |
| **4. Answer** | Synthesis produced by an LLM strictly bounded by the evidence facts. | HTTP response payload displayed in the UI. | Ephemeral presentation. |

---

## 3. Why This Model Solves the Turnover Crisis

### 3.1 Preserves Temporal Evolution
Decisions change over time. In Month 1, a client may approve PostgreSQL. In Month 3, they may mandate TimescaleDB.
- In a raw transcript folder, a new manager reading an old kickoff doc will assume PostgreSQL is current.
- In Viora's memory model, memories preserve temporal progression: the system recognizes that the Month 3 decision supersedes the Month 1 agreement while preserving the rationale for why the change occurred.

### 3.2 Anchors Rejected Approaches
The most dangerous mistake an incoming account manager can make is re-pitching something the client already evaluated and rejected.
- Transcripts bury rejections across 50 pages of chatter.
- Viora's memory extraction isolates rejections as explicit negative constraints (e.g., *"Client rejected third-party tracking pixels due to HIPAA regulations"*).

### 3.3 Guarantees Agency Auditability
Because answers are strictly synthesized from retrieved evidence, agency leadership can always click the **Evidence Drawer** to verify exactly which meeting and which client executive established a policy.

# How ContextRelay Works

ContextRelay bridges the knowledge gap between outgoing and incoming account managers through a streamlined five-step product workflow.

```
[ Meeting Transcripts ]
         │
         ▼ (1. Ingestion)
[ ContextRelay Engine ]
         │
         ▼ (2. Durable Retention)
[ Hindsight Client Memory Bank ]
         │
    ┌────┴──────────────────────────┐
    ▼                               ▼
(3. Specific Inquiries)    (4. Handover Dossier)
"What was rejected?"       "Generate Full Brief"
    │                               │
    ▼                               ▼
[ Grounded LLM Response ]  [ Structured Continuity Report ]
    │                               │
    └────► [ Verifiable Evidence ] ◄┘
           - Quotes, Dates, Sources
```

---

## Step 1: Ingest Client Conversations

Whenever an account manager conducts a client kickoff, sprint review, or architecture sync, they export the conversation transcript or meeting notes (`.txt`, `.md`, or `.json`) and drop it into ContextRelay.

- Ingestion takes 2 to 5 seconds.
- The system confirms file validity and records operational metadata in SQLite.

---

## Step 2: Extract Durable Client Memory

ContextRelay transmits the raw transcript to the client's isolated **Hindsight memory bank**.

Unlike simple document search engines that merely index chunks of text, Hindsight parses the conversation to identify:
- **Entities & Stakeholders:** Who said what, who gave approvals, and who raised objections.
- **Decisions & Rejections:** Concrete technical or scope determinations.
- **Temporal Progression:** Dates and chronological sequences (e.g., distinguishing what was decided in January vs. what was altered in March).

---

## Step 3: Incoming Manager Onboarding & Inquiries

When an account manager resigns, the incoming manager selects the client workspace in ContextRelay.

They can immediately query specific questions:
- *"What did the client decide regarding our cloud infrastructure?"*
- *"Who has final sign-off on scope changes?"*
- *"What design concepts or features were already rejected?"*
- *"Why did we stop using standard PostgreSQL?"*

---

## Step 4: Strict Evidence-Grounded Answers

ContextRelay queries Hindsight for memories matching the inquiry.
- If relevant memories exist, an LLM synthesizes an authoritative, concise response strictly bounded by the recalled facts.
- If no memory exists, the system deterministically replies: *"No relevant stored client memory found for this inquiry"*, eliminating AI hallucinations.

---

## Step 5: Verify via the Evidence Drawer

For complete transparency, every synthesized answer includes an expandable **Verifiable Evidence Drawer**.

The incoming account manager can inspect:
- The exact extracted fact statement.
- The source transcript filename.
- The date and timestamp of the meeting.
- The confidence score.

The new account manager enters their first client meeting armed with the same institutional knowledge as their predecessor.

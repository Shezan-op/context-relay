# X (Twitter) Thread: The Architecture of Client Continuity

### Tweet 1 (Hook)
An account manager leaves your agency.
The client stays. But 18 months of context—what the client hates, what was tried, who approves what—walks out the door with them.

The incoming person repeats old mistakes on Day 1.

Here is how we architected Viora to fix this 🧵👇

---

### Tweet 2 (The Failure Mode of Naive RAG)
Why not just drop transcripts into a standard vector DB?

Because chunking destroys temporal context.
If Client X approves Postgres in Jan, but mandates TimescaleDB in March, vector similarity often surfaces the Jan chunk. The new AM builds the wrong system.

---

### Tweet 3 (The Durable Memory Model)
Instead of arbitrary 500-token slicing, Viora uses @Hindsight for long-term memory:
- Extracts structured entities, decisions & rejections
- Preserves chronological timelines
- Tracks superseded decisions natively

Transcripts are input. Memory is durable context.

---

### Tweet 4 (Physical Bank Isolation)
In agencies, cross-client data leaks are catastrophic.

Viora provisions an isolated Hindsight memory bank per client.
No shared index with fragile metadata filters.
Queries for Client A physically cannot touch Client B's memory bank.

---

### Tweet 5 (Strict Negative Grounding & Auditability)
Two rules we enforce in production:
1. If recall returns 0 facts, short-circuit immediately. Don't call the LLM. Zero hallucinations.
2. Every answer includes a Verifiable Evidence Drawer with exact quotes, timestamps, and confidence scores.

---

### Tweet 6 (The North Star)
The goal isn't another AI chatbot.
The goal is client continuity:

"Can the next person on the account recover the institutional knowledge that used to live inside the previous account manager's head?"

Open source repo & architecture docs:
https://github.com/Shezan-op/context-relay

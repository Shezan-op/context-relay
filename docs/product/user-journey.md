# User Journey: The Zero-Loss Account Transition

This document charts the end-to-end user experience of Viora across the lifecycle of an agency-client relationship, contrasting the traditional chaotic handover with the Viora continuity journey.

---

## Journey Map: From Ongoing Work to Seamless Transition

| Phase | Traditional Handover (The Failure Path) | Viora Handover (The Continuity Path) |
| :--- | :--- | :--- |
| **Phase 1: Ongoing Work** | Account Manager A takes notes in personal scratchpads. Important client statements stay inside their head. | Account Manager A uploads meeting transcripts into Viora after calls. Memory builds continuously in the background. |
| **Phase 2: Departure** | Manager gives 2-week notice. Agency frantically asks for a "handover doc", which ends up rushed, incomplete, and superficial. | Manager resigns. No emergency documentation sprint required; 18 months of decisions and preferences are already structured in memory. |
| **Phase 3: Assignment** | New Manager B inherits empty CRM fields and 50 unsorted recordings. | New Manager B selects the client in Viora and clicks **"Generate Handover Brief"**. |
| **Phase 4: Preparation** | Manager B skims random docs, missing critical historical rejections and altered decisions. | Manager B reviews a synthesized dossier detailing current decisions, rejected concepts, stakeholder roles, and source quotes. |
| **Phase 5: First Call** | Manager B pitches an idea the client rejected 6 months ago. Client loses trust immediately. | Manager B speaks with authoritative mastery of past discussions. Client remarks: *"Your team didn't miss a beat."* |

---

## Detailed User Journey Stages

### Stage 1: Continuous Ingestion During Normal Operations
- **Actor:** Outgoing Account Manager (Elena).
- **Trigger:** Bi-weekly client sprint reviews and monthly architecture syncs.
- **Action:** Elena drags the exported transcript into the Viora workspace.
- **System Response:** Viora parses the text, records metadata in SQLite, and invokes Hindsight Retain. Durable facts (decisions, preferences, dates) are indexed in the client's bank.

### Stage 2: The Departure & Zero-Scramble Handover
- **Actor:** Agency Operations Lead / Managing Director.
- **Scenario:** Elena resigns to take another role.
- **Action:** Managing Director assigns Marcus to Acme Health.
- **Experience:** No frantic meetings asking Elena to remember what happened in Month 3. The agency owns the institutional memory, not the departing employee.

### Stage 3: Targeted Discovery & Pre-Meeting Briefing
- **Actor:** Incoming Account Manager (Marcus).
- **Goal:** Prepare for the upcoming Q2 strategy review with client CTO Sarah Martinez.
- **Actions in Viora:**
  1. Marcus opens the **Account Handover Brief** tab to get an immediate lay of the land.
  2. In the **Continuity Workspace**, Marcus runs targeted continuity queries:
     - *"What did Sarah Martinez say about our proposed database migration?"*
     - *"What analytics tools were rejected and why?"*
  3. Marcus expands the **Verifiable Evidence Drawer** to inspect exact quotes and dates from past meetings.

### Stage 4: High-Trust Client Execution
- **Actor:** Incoming Account Manager (Marcus) & Client CTO (Sarah).
- **Meeting:** Marcus leads the strategy session:
  - *"Sarah, looking at our March architecture review where we decided on TimescaleDB for telemetry ingest, we've structured this sprint to finalize those ingestion schemas without introducing external analytics pixels that violate HIPAA."*
- **Outcome:** The client feels respected, understood, and confident. Institutional continuity is preserved.

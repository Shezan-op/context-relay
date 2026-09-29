# Three Real-World Continuity Scenarios

These three scenarios illustrate how Viora prevents agency-client knowledge loss in everyday agency operations. All scenarios are based on real capabilities supported and verified by the automated test suite.

---

## Scenario 1: The Abrupt Handover

### Context
Elena managed the **Acme Health** account for eighteen months. She handled the initial kickoff, architecture syncs, and stakeholder negotiations. On Friday, Elena gives two weeks' notice to accept an in-house role. On Monday, incoming account manager Marcus is assigned to lead the account.

### The Breakdown (Without Viora)
Marcus inherits twenty raw Zoom recordings and a disorganized Google Drive folder. He has three days to prepare for a major Q2 roadmap meeting. Unable to review sixty hours of audio, he enters the meeting blind and asks the client to recap their cloud infrastructure decisions. The client is visibly frustrated that they must re-explain foundational requirements.

### The Continuity Flow (With Viora)
1. **Durable Memory in Place:** During her tenure, Elena uploaded transcripts after each milestone meeting into Viora.
2. **Immediate Briefing:** On Monday morning, Marcus opens the Acme Health workspace and selects **"Account Handover Brief"**.
3. **Targeted Inquiry:** Marcus queries:
   > *"What did the client decide about our deployment timeline and staging environment?"*
4. **Hindsight Recall:** Viora recalls the stored facts from the January 15 kickoff and March 12 review.
5. **Grounded Answer Delivered:**
   > *"The client mandated a two-week staging soak period before any production deployment. Staging deployments must occur exclusively on Tuesday mornings to avoid weekend support escalations."*
6. **Verifiable Audit:** Marcus clicks the Evidence Drawer to confirm that CTO Sarah Martinez established this rule in the March architecture review.
7. **Outcome:** Marcus leads the roadmap call with complete confidence. The client never feels the disruption of Elena's departure.

---

## Scenario 2: The Evolving Decision (Client Changes Their Mind)

### Context
Client technical requirements are not static; they evolve as projects scale. In January, Acme Health agreed on a standard relational database. By March, telemetry projections increased tenfold, prompting an architectural pivot.

### The Breakdown (Without Viora)
Marcus finds a document in Google Drive titled `Architecture_Spec_Final_v1.docx` dated January 18 stating *"PostgreSQL 15 selected for all services"*. Believing this is the current standard, Marcus instructs the engineering team to build ingestion microservices using vanilla PostgreSQL. Two weeks before delivery, the client discovers the mistake: they had already decided to switch to TimescaleDB in March.

### The Continuity Flow (With Viora)
1. **Both Historical Facts Retained:** Viora's Hindsight memory bank retains the initial January 15 decision and the subsequent March 12 pivot.
2. **Temporal Awareness:** Marcus asks Viora:
   > *"What database did the client approve for high-frequency telemetry?"*
3. **Recall & Synthesis:** Viora retrieves both facts, notes their chronological order, and generates the grounded synthesis:
   > *"While standard PostgreSQL was initially approved during the January 15 kickoff, CTO Sarah Martinez mandated migrating telemetry ingest to TimescaleDB during the March 12 architecture review to handle high-frequency IoT data."*
4. **Outcome:** Marcus directs the agency engineering team to build on TimescaleDB from Day 1, avoiding two weeks of wasted development and an embarrassing client confrontation.

---

## Scenario 3: Dodging the Re-Pitched Mistake

### Context
Acme Health operates a patient-facing health monitoring portal subject to stringent HIPAA and SOC 2 data privacy regulations. During the initial project kickoff, third-party tracking scripts were explicitly evaluated and rejected.

### The Breakdown (Without Viora)
Marcus notices high drop-off rates on the patient onboarding screen. Wanting to be proactive, Marcus prepares a slide for the Tuesday client sync: *"Proposal: Integrate Mixpanel / Google Tag Manager for User Drop-Off Analytics."*
During the call, Marcus pitches the slide. CTO Sarah Martinez immediately cuts him off:
> *"Marcus, we spent an hour explaining in January that third-party analytics pixels send un-sanitized IP addresses and referrers to external servers, violating our HIPAA covenants. Did your predecessor not brief you on this?"*
The agency looks amateurish and uncoordinated.

### The Continuity Flow (With Viora)
1. **Pre-Pitch Check:** Before adding the slide to his deck, Marcus queries Viora:
   > *"Has the client approved third-party analytics or tracking pixels?"*
2. **Hindsight Recall:** The memory engine recalls the extracted constraint from January 15:
   > Fact: *"Client strictly rejected third-party analytics cookies and external tracking pixels due to HIPAA compliance concerns."*
3. **Evidence Inspection:** Marcus checks the source evidence, noting that Sarah Martinez stated all analytics must run via an internal self-hosted proxy with scrubbed identifiers.
4. **Adjusted Strategy:** Marcus removes the third-party proposal and instead pitches an internal privacy-preserving telemetry pipeline.
5. **Outcome:** On the Tuesday call, Sarah praises Marcus:
   > *"I really appreciate that you kept our HIPAA constraints in mind without needing a reminder."*

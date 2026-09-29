# ContextRelay Product Demonstration Script

This script provides a narrative-driven, step-by-step walkthrough for demonstrating ContextRelay to technical leaders, agency directors, and operations executives.

---

## Demonstration Metadata
- **Duration:** 6–8 minutes
- **Core Narrative:** The Elena-to-Marcus Account Manager Handover
- **Sample Client:** Acme Health
- **Target Audience:** Agency Founders, VP of Client Services, Head of Operations

---

## Act 1: The Human Problem (0:00 – 1:30)

> *"In every agency and consultancy, the single greatest point of vulnerability is employee turnover. When an account manager who has run a client relationship for two years hands in their two-week notice, years of institutional context walk out the door.*
> 
> *The incoming manager inherits empty CRM fields and dozens of unorganized Zoom recordings. Inevitably, on their very first check-in call, they re-propose an idea the client rejected six months ago. The client gets frustrated, trust is damaged, and account retention plummets.*
> 
> *ContextRelay solves this. The core thesis is simple: **The person can leave. The client context should not.**"*

---

## Act 2: Continuous Memory Ingestion (1:30 – 2:45)

**[Action: Navigate to `http://localhost:3000` and select 'Acme Health']**

> *"Here is ContextRelay. Notice the minimalist, dark interface. We have selected our client workspace: Acme Health. Notice that Acme Health is assigned a dedicated, isolated Hindsight memory bank. Information stored here can never leak to any other client.*
> 
> *Let's simulate what Elena did while managing this account. After each major meeting, she dropped the transcript into ContextRelay."*

**[Action: Ingest `transcripts/meeting_1_kickoff_2026_01_15.txt` and `transcripts/meeting_2_tech_review_2026_03_12.txt`]**

> *"Notice how fast this is. In under four seconds, ContextRelay parses the raw conversational text, validates the file, and transmits it to Hindsight's retain engine.*
> 
> *Unlike naive search engines that just chunk text into arbitrary 500-word blocks, Hindsight extracts entities, technical decisions, stakeholder approval patterns, and temporal timestamps."*

---

## Act 3: The Handover Crisis (2:45 – 3:30)

> *"Now, let's fast-forward eighteen months. Elena resigns. Marcus is hired and assigned to take over Acme Health on Monday morning. His first strategy call with CTO Sarah Martinez is on Tuesday.*
> 
> *Marcus doesn't have thirty hours to watch recordings. Instead, he opens ContextRelay."*

---

## Act 4: The One-Click Handover Dossier (3:30 – 4:45)

**[Action: Click the 'Account Handover Brief' tab in the UI and click 'Generate Handover Brief']**

> *"Marcus clicks 'Account Handover Brief'. In seconds, ContextRelay executes multi-faceted recall queries across Hindsight and synthesizes an authoritative continuity dossier.*
> 
> *Notice the breakdown:*
> 1. *Current Technical & Business Decisions*
> 2. *Rejected Concepts & Failed Approaches*
> 3. *Stakeholder Hierarchy (who holds final veto vs. budget approvals)*
> 4. *Client Communication Preferences*
> 
> *Marcus instantly learns that CTO Sarah Martinez holds absolute veto over infrastructure, and that third-party analytics pixels were strictly rejected due to HIPAA regulations."*

---

## Act 5: Handling Temporal Evolution (4:45 – 6:00)

**[Action: Switch back to 'Continuity Workspace' and query: 'What database did the client approve?']**

> *"Now Marcus wants to verify the technical stack. In January, the kickoff transcript approved standard PostgreSQL. But in March, the client switched to TimescaleDB.*
> 
> *Let's see how ContextRelay handles this."*

**[Action: Submit query and show answer]**

> *"Look at the grounded synthesis: it explicitly states that while PostgreSQL was initially approved in January, CTO Sarah Martinez mandated migrating to TimescaleDB in March to handle high-frequency IoT telemetry.*
> 
> *It didn't get confused by the old document. It understood temporal progression."*

---

## Act 6: The Verifiable Evidence Drawer (6:00 – 6:45)

**[Action: Click 'Expand Evidence' below the answer]**

> *"Marcus doesn't have to take the AI's word for it. By expanding the Verifiable Evidence Drawer, he sees the exact source facts, timestamps, and confidence scores from Hindsight.*
> 
> *Every single statement links back to a verifiable source record."*

---

## Act 7: Negative Grounding & Hallucination Prevention (6:45 – 7:30)

**[Action: Query: 'What is the client budget for the European office expansion?']**

> *"What happens if Marcus asks something that was never discussed? A standard AI would guess. Watch ContextRelay."*

**[Action: Submit query]**

> *"The system deterministically returns: 'No relevant stored client memory found for this inquiry'. Because zero facts were recalled, the LLM was completely bypassed. No hallucinations. Zero token waste."*

---

## Act 8: Conclusion & Summary (7:30 – 8:00)

> *"When Marcus steps into his Tuesday morning call with Sarah Martinez, he speaks with the authority of someone who has been on the account for two years. He doesn't repeat old mistakes. He doesn't ask basic questions.*
> 
> *ContextRelay turns perishable human experience into permanent agency equity. Thank you."*

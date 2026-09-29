# Visual Verification & Screenshot Guide

This document defines the essential visual artifacts and screenshots required to demonstrate the production capabilities, client isolation, and handover workflows of Viora.

---

## Screenshot Inventory

| # | Screen / State | Target Route / Component | Primary Purpose | What It Proves | Recommended Caption |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **01** | **Client Registry & Workspace Header** | `/` (Header & Sidebar) | Demonstrates client isolation and active bank resolution. | Proves that the agency operates within discrete client workspaces, each backed by an isolated memory bank. | *"Discrete client workspaces with isolated Hindsight memory banks ensure agency-wide confidential tenant separation."* |
| **02** | **Source Ingestion Pipeline** | `/` (Upload Panel) | Shows transcript upload and synchronous status commitment. | Proves that meeting transcripts transition deterministically from upload to verified `stored` state with extracted fact counts. | *"Synchronous transcript ingestion: raw conversational text is parsed and committed to durable long-term memory."* |
| **03** | **Continuity Workspace: Query & Grounded Answer** | `/` (Continuity Workspace) | Displays user query regarding historical decisions and grounded response. | Proves that an incoming account manager can immediately recover decisions made months prior without contacting the previous manager. | *"An incoming account manager queries client history; the grounded LLM synthesizes an authoritative answer strictly from recalled facts."* |
| **04** | **Verifiable Evidence Drawer (Expanded)** | `/` (Evidence Drawer) | Displays underlying Hindsight facts, timestamps, and source documents. | Proves that answers are not AI hallucinations; every assertion links directly to an auditable source fact. | *"Verifiable audit trail: each synthesized insight reveals the underlying memory facts, confidence scores, and source transcripts."* |
| **05** | **Decision Evolution Over Time** | `/` (Query: "What database should we use?") | Shows the system correctly tracking when a client changed their decision. | Proves temporal awareness: the system surfaces both the initial approval and the subsequent migration requirement. | *"Temporal context in action: Viora identifies that while PostgreSQL was initially approved, the client mandated TimescaleDB in Q2."* |
| **06** | **Account Handover Dossier View** | `/` (Handover Brief Tab) | Displays full structured continuity report across all client dimensions. | Proves that an entire account can be transitioned in minutes with zero knowledge loss across rejected ideas, stakeholders, and preferences. | *"One-click Account Handover Dossier: comprehensive institutional knowledge synthesis for incoming account managers."* |
| **07** | **Negative Grounding / Unknown Query** | `/` (Query on unknown topic) | Displays deterministic fallback when no relevant memory exists. | Proves that the system refuses to guess or invent facts when long-term memory has no record of the topic. | *"Strict negative grounding: the system deterministically alerts the user when no client memory exists, preventing costly AI hallucinations."* |
| **08** | **Automated Test Suite Execution** | Terminal (`npm test`) | Displays test runner executing all 12 pipeline categories. | Proves engineering rigor: client isolation, multi-provider fallbacks, secret safety, and decision evolution are verified via automated CI tests. | *"100% automated test pass: 12 comprehensive categories verifying isolation, grounding, and memory evolution."* |

---

## Capture Instructions

### Local Capture Procedure
1. Launch the local development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000` in Google Chrome or Microsoft Edge.
3. Set browser viewport to **1440x900** (Retina / High-DPI scale recommended).
4. Ingest sample transcripts from `transcripts/meeting_1_kickoff_2026_01_15.txt` and `transcripts/meeting_2_tech_review_2026_03_12.txt`.
5. Capture screens 01 through 07 in dark mode.
6. For screen 08, run `npm test` in a clean terminal window with font size 14px and capture the passing summary output.

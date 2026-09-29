# Viora Documentation Index

Welcome to the technical and product documentation for **Viora** — an institutional memory and client continuity platform designed to prevent agency-client knowledge loss when account managers leave.

Use the navigation matrix below to locate relevant documentation based on your role and inquiry.

---

## Documentation Navigation Matrix

### "I want to understand the core product and business problem"
- [**Product Overview**](file:///c:/Users/techt/context-relay/docs/product/product-overview.md): High-level overview of Viora, target users, and core value proposition.
- [**The Problem: Agency-Client Knowledge Loss**](file:///c:/Users/techt/context-relay/docs/product/problem.md): Detailed agency narrative illustrating how context walks out the door.
- [**Client Continuity Model**](file:///c:/Users/techt/context-relay/docs/product/continuity-model.md): Conceptual model bridging outgoing and incoming account managers.
- [**Real-World Scenarios**](file:///c:/Users/techt/context-relay/docs/product/scenarios.md): 3 core storytelling scenarios (handover, mind change, avoiding repeated mistakes).
- [**Differentiation & Evidence**](file:///c:/Users/techt/context-relay/docs/product/differentiation.md): Why Viora is distinct from naive RAG and generic vector search.
- [**Interactive Visual Simulation**](file:///c:/Users/techt/context-relay/docs/scenarios/context-relay-scenarios.html): 13-step interactive visual simulation of the data journey.

---

### "I want to understand the architecture and system design"
- [**System Architecture**](file:///c:/Users/techt/context-relay/docs/architecture.md): High-level architecture, Mermaid diagrams, component roles, and request flows.
- [**System Design & Component Ownership**](file:///c:/Users/techt/context-relay/docs/system-design.md): Deep-dive into each subsystem, inputs, outputs, and ownership.
- [**End-to-End Data Flow**](file:///c:/Users/techt/context-relay/docs/data-flow.md): Step-by-step trace from file upload to grounded answer delivery.
- [**Repository Structure**](file:///c:/Users/techt/context-relay/docs/repository-structure.md): Directory tree and boundaries for every file and module.
- [**Technical Decisions (ADRs)**](file:///c:/Users/techt/context-relay/docs/technical-decisions.md): Architecture Decision Records explaining core technical choices.

---

### "I want to understand Hindsight and the memory model"
- [**Memory Model**](file:///c:/Users/techt/context-relay/docs/memory-model.md): Transcripts vs. Memories vs. Evidence vs. Answers; temporal layering.
- [**Ingestion Pipeline**](file:///c:/Users/techt/context-relay/docs/ingestion.md): How transcripts enter the system, validation rules, and Hindsight Retain calls.
- [**Retrieval Architecture**](file:///c:/Users/techt/context-relay/docs/retrieval.md): Multi-faceted recall strategies, ranking, and short-circuit guards.
- [**LLM Grounding & Synthesis**](file:///c:/Users/techt/context-relay/docs/llm-grounding.md): System prompts, evidence injection, and strict negative constraints.

---

### "I want to run it, deploy it, or integrate with it"
- [**API Reference**](file:///c:/Users/techt/context-relay/docs/api.md): Complete REST endpoint documentation with request/response schemas.
- [**Deployment Guide**](file:///c:/Users/techt/context-relay/docs/deployment.md): Runtime requirements, Docker topologies, and environment variables.
- [**Troubleshooting Guide**](file:///c:/Users/techt/context-relay/docs/troubleshooting.md): Diagnostic matrix for Hindsight errors, database locks, and LLM issues.
- [**Demo Runbook**](file:///c:/Users/techt/context-relay/DEMO_RUNBOOK.md): Step-by-step instructions for running an authoritative live demonstration.

---

### "I want to evaluate security, testing, and limitations"
- [**Client Isolation**](file:///c:/Users/techt/context-relay/docs/client-isolation.md): How tenant boundaries are enforced between client accounts.
- [**Security Boundaries**](file:///c:/Users/techt/context-relay/docs/security.md): Server-side secret isolation, sanitization, and security postures.
- [**Automated Test Suite**](file:///c:/Users/techt/context-relay/docs/testing.md): What the 15 automated pipeline test categories prove.
- [**System Limitations & Non-Goals**](file:///c:/Users/techt/context-relay/docs/limitations.md): Candid documentation of what the product does not do.
- [**Visual Screenshot Specifications**](file:///c:/Users/techt/context-relay/docs/screenshots.md): Visual verification plan for production interfaces.

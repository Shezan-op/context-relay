# LLM Grounding & Synthesis Boundary

This document specifies the exact role, prompting architecture, anti-hallucination controls, and provider configurations of the Application LLM layer in ContextRelay.

---

## 1. The Fundamental Architecture Boundary

To understand ContextRelay, one must understand what the LLM is and what it is not:

> **Hindsight is NOT the final answer generator.**  
> It does not write polished paragraphs or format conversational summaries for the user. It is the long-term memory engine that extracts, indexes, links, and recalls structured client evidence.
>
> **The LLM is NOT the memory store.**  
> It does not store client facts. It does not retain historical context in its weights. It has zero knowledge of the client until evidence is passed to it during an active query.
>
> **The LLM's Role:**  
> The Application LLM acts strictly as an **ephemeral reasoning and synthesis engine**. It receives user questions together with recalled evidence from Hindsight, reconciles dates, and synthesizes a direct answer.

---

## 2. Grounding System Prompt

Defined in [`src/lib/llm.ts`](file:///c:/Users/techt/context-relay/src/lib/llm.ts):

```
You answer questions about a specific client account using only the memory evidence supplied by ContextRelay. The evidence comes from Hindsight. Do not invent facts. If the evidence does not answer the question, clearly say that the stored client memory does not contain enough information. When sources conflict, identify the conflict and prefer the newest explicit statement when dates are available. Preserve the distinction between what the client explicitly said and what is merely inferred. Keep answers useful, professional, and direct.
```

---

## 3. Evidence Formatting & Context Window Efficiency

Rather than dumping full transcripts or arbitrary chunks into the prompt, ContextRelay formats the top evidence items (up to 8 for queries, up to 15 for handoff briefs) into structured evidence blocks:

```
CLIENT EVIDENCE FROM HINDSIGHT:
--------------------------------
[Evidence #1] (Type: world)
Fact: Client requires PostgreSQL on AWS Aurora Serverless v2 in us-east-1.
Date: 2026-01-15T10:00:00Z
Source Quote: "For our primary database, it must be PostgreSQL deployed on AWS Aurora Serverless v2. We cannot use Google Cloud or Azure for this workload."

[Evidence #2] (Type: world)
Fact: Client compliance team strictly rejected MongoDB due to audit requirements.
Date: 2026-01-15T10:00:00Z
Source Quote: "We had a previous vendor propose MongoDB, but our enterprise compliance team strictly rejected MongoDB due to audit requirements. PostgreSQL is non-negotiable."
--------------------------------

USER QUESTION:
What database technologies did the client reject or mandate?

Instructions:
Answer the question based strictly on the above client evidence.
If the evidence does not answer the question or is insufficient, explicitly state that stored client memory does not contain enough information.
If there are conflicting statements across different dates, highlight the change and prioritize the newer explicit statement.
Keep your answer clear, authoritative, and direct.
```

---

## 4. Grounding & Anti-Hallucination Controls

ContextRelay enforces four layers of hallucination prevention:

1. **Short-Circuit on Zero Memory:**  
   If Hindsight returns 0 memories, the LLM is never invoked. The server immediately returns `"No relevant stored client memory found regarding your question."`
2. **Explicit Evidence Confinement:**  
   The system prompt explicitly commands: *"answer questions about a specific client account using only the memory evidence supplied by ContextRelay. Do not invent facts."*
3. **Temporal Conflict Reconciliation:**  
   When evidence reflects conflicting decisions across different dates (e.g., launch date on Jan 15 vs. March 20), the LLM is instructed: *"identify the conflict and prefer the newest explicit statement when dates are available."*
4. **Low Sampling Temperature:**  
   All provider invocations enforce `temperature: 0.1` to minimize generative randomness and maximize factual fidelity.

---

## 5. Supported LLM Providers

ContextRelay is provider-agnostic. The provider is selected via the `LLM_PROVIDER` environment variable in `.env.local`:

| Provider | `LLM_PROVIDER` | Default Model | Configuration Env Var |
|---|---|---|---|
| **Groq (Recommended)** | `groq` | `llama-3.3-70b-versatile` | `GROQ_API_KEY` |
| **OpenAI** | `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| **Anthropic** | `anthropic` | `claude-3-5-haiku-latest` | `ANTHROPIC_API_KEY` |
| **Google Gemini** | `gemini` | `gemini-2.0-flash` | `GEMINI_API_KEY` or `GOOGLE_API_KEY` |

Custom OpenAI-compatible base URLs (such as local Ollama, vLLM, or LM Studio instances) can be configured using `LLM_API_BASE_URL`.

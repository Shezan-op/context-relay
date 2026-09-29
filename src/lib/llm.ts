import { RecalledEvidenceItem } from './hindsight';

export interface LLMAnswerResult {
  answer: string;
  conflictOrUncertainty?: string | null;
}

const SYSTEM_GROUNDING_PROMPT = `You answer questions about a specific client account using only the memory evidence supplied by ContextRelay. The evidence comes from Hindsight. Do not invent facts. If the evidence does not answer the question, clearly say that the stored client memory does not contain enough information. When sources conflict, identify the conflict and prefer the newest explicit statement when dates are available. Preserve the distinction between what the client explicitly said and what is merely inferred. Keep answers useful, professional, and direct.`;

const HANDOFF_SYSTEM_PROMPT = `You generate an Account Continuity Handover Brief for an incoming account manager taking over an agency client relationship. Use ONLY the supplied recalled memory evidence from Hindsight. Do not invent facts, companies, or requirements. If evidence is missing for a section, write "No recorded memory." Maintain strict grounding, professional clarity, and highlight any requirement changes over time.`;

export async function generateGroundedHandoffBrief(
  clientName: string,
  evidenceItems: RecalledEvidenceItem[]
): Promise<LLMAnswerResult> {
  const provider = (process.env.LLM_PROVIDER || 'groq').toLowerCase().trim();
  const apiKey =
    process.env.LLM_API_KEY ||
    (provider === 'groq' ? process.env.GROQ_API_KEY :
     provider === 'openai' ? process.env.OPENAI_API_KEY :
     provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY :
     provider === 'gemini' ? (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) :
     process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

  if (!apiKey) {
    throw new Error(
      `LLM API key not configured for provider '${provider}'. Please set ${
        provider === 'groq' ? 'GROQ_API_KEY' :
        provider === 'openai' ? 'OPENAI_API_KEY' :
        provider === 'anthropic' ? 'ANTHROPIC_API_KEY' :
        provider === 'gemini' ? 'GEMINI_API_KEY' : 'LLM_API_KEY'
      } in your .env.local file.`
    );
  }

  // Up to 15 evidence items for a comprehensive handoff overview
  const topItems = evidenceItems.slice(0, 15);
  const evidenceSummary = topItems
    .map((item, idx) => {
      let block = `[Evidence #${idx + 1}] (Type: ${item.type})\nFact: ${item.text}`;
      if (item.occurredStart || item.mentionedAt) {
        block += `\nDate: ${item.occurredStart || item.mentionedAt}`;
      }
      if (item.sourceChunk) {
        block += `\nSource Quote: "${item.sourceChunk.trim()}"`;
      }
      return block;
    })
    .join('\n\n');

  const userPrompt = `CLIENT EVIDENCE FROM HINDSIGHT FOR CLIENT "${clientName}":
--------------------------------
${evidenceSummary}
--------------------------------

Instructions:
Generate a structured Account Continuity Handover Brief for incoming team members inheriting this client account.
You must ground every statement in the evidence above.
Structure the brief with these 5 markdown sections:
### 1. Mandated Technical Architecture & Infrastructure
### 2. Explicit Rejections (What was tried or rejected and must never be proposed)
### 3. Stakeholder Governance & Approval Authorities (Who approves budget vs deliverables)
### 4. Brand & Visual Design Constraints
### 5. Timeline & Milestone Evolution (Note any dates that shifted over time)

If any section has no recorded evidence, state "No recorded client memory for this section."
Highlight any transitions where a decision changed between meetings.`;

  if (provider === 'groq' || provider === 'openai') {
    return callOpenAICompatible(provider, apiKey, userPrompt, HANDOFF_SYSTEM_PROMPT);
  } else if (provider === 'anthropic') {
    return callAnthropic(apiKey, userPrompt, HANDOFF_SYSTEM_PROMPT);
  } else if (provider === 'gemini') {
    return callGemini(apiKey, userPrompt, HANDOFF_SYSTEM_PROMPT);
  } else {
    return callOpenAICompatible(provider, apiKey, userPrompt, HANDOFF_SYSTEM_PROMPT);
  }
}

export async function generateGroundedAnswer(
  question: string,
  evidenceItems: RecalledEvidenceItem[],
  formattedContext: string
): Promise<LLMAnswerResult> {
  const provider = (process.env.LLM_PROVIDER || 'groq').toLowerCase().trim();
  const apiKey =
    process.env.LLM_API_KEY ||
    (provider === 'groq' ? process.env.GROQ_API_KEY :
     provider === 'openai' ? process.env.OPENAI_API_KEY :
     provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY :
     provider === 'gemini' ? (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) :
     process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

  if (!apiKey) {
    throw new Error(
      `LLM API key not configured for provider '${provider}'. Please set ${
        provider === 'groq' ? 'GROQ_API_KEY' :
        provider === 'openai' ? 'OPENAI_API_KEY' :
        provider === 'anthropic' ? 'ANTHROPIC_API_KEY' :
        provider === 'gemini' ? 'GEMINI_API_KEY' : 'LLM_API_KEY'
      } in your .env.local file.`
    );
  }

  // Select top most relevant items (up to 8) to maintain high token efficiency
  const topItems = evidenceItems.slice(0, 8);
  const evidenceSummary = topItems
    .map((item, idx) => {
      let block = `[Evidence #${idx + 1}] (Type: ${item.type})\nFact: ${item.text}`;
      if (item.occurredStart || item.mentionedAt) {
        block += `\nDate: ${item.occurredStart || item.mentionedAt}`;
      }
      if (item.sourceChunk) {
        block += `\nSource Quote: "${item.sourceChunk.trim()}"`;
      }
      return block;
    })
    .join('\n\n');

  const userPrompt = `CLIENT EVIDENCE FROM HINDSIGHT:
--------------------------------
${evidenceSummary}
--------------------------------

USER QUESTION:
${question}

Instructions:
Answer the question based strictly on the above client evidence.
If the evidence does not answer the question or is insufficient, explicitly state that stored client memory does not contain enough information.
If there are conflicting statements across different dates, highlight the change and prioritize the newer explicit statement.
Keep your answer clear, authoritative, and direct.`;

  if (provider === 'groq' || provider === 'openai') {
    return callOpenAICompatible(provider, apiKey, userPrompt);
  } else if (provider === 'anthropic') {
    return callAnthropic(apiKey, userPrompt);
  } else if (provider === 'gemini') {
    return callGemini(apiKey, userPrompt);
  } else {
    // Default to OpenAI-compatible interface with custom base URL or Groq
    return callOpenAICompatible(provider, apiKey, userPrompt);
  }
}

async function callOpenAICompatible(
  provider: string,
  apiKey: string,
  userPrompt: string,
  systemPrompt: string = SYSTEM_GROUNDING_PROMPT
): Promise<LLMAnswerResult> {
  const isGroq = provider === 'groq';
  const baseUrl = process.env.LLM_API_BASE_URL || (isGroq ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1');
  const defaultModel = isGroq ? 'openai/gpt-oss-120b' : 'gpt-4o-mini';
  const model = process.env.LLM_MODEL || defaultModel;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM provider '${provider}' request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return { answer: content.trim() };
}

async function callAnthropic(
  apiKey: string,
  userPrompt: string,
  systemPrompt: string = SYSTEM_GROUNDING_PROMPT
): Promise<LLMAnswerResult> {
  const model = process.env.LLM_MODEL || 'claude-3-5-haiku-latest';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  return { answer: text.trim() };
}

async function callGemini(
  apiKey: string,
  userPrompt: string,
  systemPrompt: string = SYSTEM_GROUNDING_PROMPT
): Promise<LLMAnswerResult> {
  const model = process.env.LLM_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { answer: text.trim() };
}

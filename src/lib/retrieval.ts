import { getClientRecord } from './db';
import { getHindsightClient, HindsightWrapper, RecalledEvidenceItem } from './hindsight';
import { generateGroundedAnswer, generateGroundedHandoffBrief, LLMAnswerResult } from './llm';

export interface ClientAnswerResponse {
  answer: string;
  hasEvidence: boolean;
  evidence: RecalledEvidenceItem[];
  clientName: string;
}

export interface ClientHandoffResponse {
  clientName: string;
  hasEvidence: boolean;
  brief: string;
  evidence: RecalledEvidenceItem[];
  message?: string;
}

export interface RetrievalOptions {
  hindsight?: HindsightWrapper;
  llmCaller?: (
    question: string,
    evidence: RecalledEvidenceItem[],
    formattedContext: string
  ) => Promise<LLMAnswerResult>;
  handoffLlmCaller?: (
    clientName: string,
    evidence: RecalledEvidenceItem[]
  ) => Promise<LLMAnswerResult>;
}

export async function answerClientQuestion(
  clientId: string,
  rawQuestion: string,
  options?: RetrievalOptions
): Promise<ClientAnswerResponse> {
  const question = (rawQuestion || '').trim();
  if (!question) {
    throw new Error('Please enter a question to ask about this client.');
  }

  // 1. Resolve client and bank from trusted SQLite record
  const client = getClientRecord(clientId);
  if (!client) {
    throw new Error(`Client with ID '${clientId}' was not found.`);
  }

  // 2. Query Hindsight Recall
  const hindsight = options?.hindsight || getHindsightClient();
  const recallPayload = await hindsight.recallMemories(client.hindsight_bank_id, question);

  // 3. Stop cleanly if evidence is absent (DO NOT call LLM)
  if (!recallPayload.results || recallPayload.results.length === 0) {
    return {
      answer: 'No relevant stored client memory found regarding your question.',
      hasEvidence: false,
      evidence: [],
      clientName: client.name,
    };
  }

  // 4. Grounded answer generation using Application LLM
  try {
    const caller = options?.llmCaller || generateGroundedAnswer;
    const llmResult = await caller(
      question,
      recallPayload.results,
      recallPayload.formattedContext
    );

    return {
      answer: llmResult.answer,
      hasEvidence: true,
      evidence: recallPayload.results,
      clientName: client.name,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    throw new Error(`Failed to generate grounded answer from retrieved memories: ${errorMsg}`);
  }
}

export async function generateClientHandoffBrief(
  clientId: string,
  options?: RetrievalOptions
): Promise<ClientHandoffResponse> {
  const client = getClientRecord(clientId);
  if (!client) {
    throw new Error(`Client with ID '${clientId}' was not found.`);
  }

  const hindsight = options?.hindsight || getHindsightClient();
  const continuityQuery = 'What are the client preferences, decisions, approvals, explicit rejections, constraints, stakeholder authorities, previous attempts, and timeline changes?';
  const recallPayload = await hindsight.recallMemories(client.hindsight_bank_id, continuityQuery);

  if (!recallPayload.results || recallPayload.results.length === 0) {
    return {
      clientName: client.name,
      hasEvidence: false,
      brief: '',
      evidence: [],
      message: 'No relevant stored client memory found to generate a handoff brief. Please ingest meeting transcripts first.',
    };
  }

  try {
    const caller = options?.handoffLlmCaller || generateGroundedHandoffBrief;
    const llmResult = await caller(client.name, recallPayload.results);

    return {
      clientName: client.name,
      hasEvidence: true,
      brief: llmResult.answer,
      evidence: recallPayload.results,
      message: 'Account continuity handover brief generated successfully.',
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    throw new Error(`Failed to generate client handoff brief: ${errorMsg}`);
  }
}

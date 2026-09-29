import { getClientRecord, getSourceByHindsightDocId } from './db';
import { getHindsightClient, HindsightWrapper } from './hindsight';
import { generateGroundedAnswer, generateGroundedHandoffBrief, LLMAnswerResult } from './llm';
import {
  RecalledEvidenceItem,
  DecisionItem,
  DecisionStatus,
  RejectedItem,
  RejectionStatus,
  DontRepeatResponse,
  TimelineResponse,
  ClientAnswerResponse,
  ClientHandoffResponse,
} from './types';

export type {
  ClientAnswerResponse,
  ClientHandoffResponse,
  DontRepeatResponse,
  TimelineResponse,
  DecisionItem,
  RejectedItem,
};

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

function getSourceDisplayName(docId?: string | null): string {
  if (!docId) return 'Client conversation transcript';
  try {
    const src = getSourceByHindsightDocId(docId);
    if (src && src.original_filename) {
      return src.original_filename;
    }
  } catch {
    // fallback
  }
  return docId;
}

function extractExplicitReason(text: string): string {
  // Only extract reason if explicitly stated in text
  const match = text.match(/(?:due to|because|owing to|reason:)\s+([^.;]+)/i);
  if (match && match[1]) {
    const rawReason = match[1].trim();
    if (rawReason.length > 3) {
      return rawReason.charAt(0).toUpperCase() + rawReason.slice(1);
    }
  }
  return 'Reason not recorded in available client memory.';
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

export async function getDontRepeatItems(
  clientId: string,
  options?: RetrievalOptions
): Promise<DontRepeatResponse> {
  const client = getClientRecord(clientId);
  if (!client) {
    throw new Error(`Client with ID '${clientId}' was not found.`);
  }

  const hindsight = options?.hindsight || getHindsightClient();
  const query = 'What ideas, approaches, technologies, or proposals were rejected, disliked, failed, or ruled out? What should not be repeated?';
  const recallPayload = await hindsight.recallMemories(client.hindsight_bank_id, query);

  if (!recallPayload.results || recallPayload.results.length === 0) {
    return {
      clientName: client.name,
      hasEvidence: false,
      items: [],
      evidence: [],
      message: 'No recorded rejected approaches were found for this client.',
    };
  }

  const rejectionRegex = /\b(reject|rejected|rejection|dislike|disliked|avoid|failed|failure|unsuccessful|do not use|must not|cannot use|ruled out|stopped using|no longer use|discarded)\b/i;

  const rawRejections = recallPayload.results.filter(
    (ev) => rejectionRegex.test(ev.text) || (ev.sourceChunk && rejectionRegex.test(ev.sourceChunk))
  );

  if (rawRejections.length === 0) {
    return {
      clientName: client.name,
      hasEvidence: false,
      items: [],
      evidence: recallPayload.results,
      message: 'No recorded rejected approaches were found for this client.',
    };
  }

  // Look for later approvals or overrides
  const approvalRegex = /\b(approved|adopted|mandated|selected|chose|agreed)\b/i;
  const approvals = recallPayload.results.filter(
    (ev) => approvalRegex.test(ev.text) && !rejectionRegex.test(ev.text)
  );

  const items: RejectedItem[] = rawRejections.map((ev) => {
    const text = ev.text.trim();
    const date = ev.occurredStart || ev.mentionedAt || null;
    const reason = extractExplicitReason(text + (ev.sourceChunk ? ' ' + ev.sourceChunk : ''));
    const source = getSourceDisplayName(ev.documentId);

    let status: RejectionStatus = 'active_rejection';
    let currentStatusNote: string | null = null;

    if (date) {
      for (const app of approvals) {
        const appDate = app.occurredStart || app.mentionedAt;
        if (appDate && new Date(appDate).getTime() > new Date(date).getTime()) {
          const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
          const hasOverlap = words.some((w) => app.text.toLowerCase().includes(w));
          if (hasOverlap) {
            status = 'superseded_rejection';
            currentStatusNote = `Superseded: Position later altered on ${appDate.split('T')[0]}`;
            break;
          }
        }
      }
    }

    return {
      id: `rej-${ev.id}`,
      item: text,
      status,
      reason,
      date,
      source,
      sourceReference: ev.documentId || null,
      evidenceQuote: ev.sourceChunk || ev.text || null,
      currentStatusNote,
      evidenceId: ev.id,
    };
  });

  return {
    clientName: client.name,
    hasEvidence: true,
    items,
    evidence: recallPayload.results,
  };
}

export async function getDecisionTimeline(
  clientId: string,
  options?: RetrievalOptions
): Promise<TimelineResponse> {
  const client = getClientRecord(clientId);
  if (!client) {
    throw new Error(`Client with ID '${clientId}' was not found.`);
  }

  const hindsight = options?.hindsight || getHindsightClient();
  const query = 'What decisions, approvals, technological mandates, architectural choices, and changed decisions were made?';
  const recallPayload = await hindsight.recallMemories(client.hindsight_bank_id, query);

  if (!recallPayload.results || recallPayload.results.length === 0) {
    return {
      clientName: client.name,
      hasEvidence: false,
      decisions: [],
      evidence: [],
      message: 'No recorded decisions found for this client.',
    };
  }

  const decisionRegex = /\b(approved|approval|decided|decision|mandated|mandate|selected|adopted|chose|agreed|switched|migrated|replaced|require|required|requires)\b/i;

  const rawDecisions = recallPayload.results.filter(
    (ev) => decisionRegex.test(ev.text) || (ev.sourceChunk && decisionRegex.test(ev.sourceChunk))
  );

  if (rawDecisions.length === 0) {
    return {
      clientName: client.name,
      hasEvidence: false,
      decisions: [],
      evidence: recallPayload.results,
      message: 'No recorded decisions found for this client.',
    };
  }

  const decisionItems: DecisionItem[] = rawDecisions.map((ev) => {
    const date = ev.occurredStart || ev.mentionedAt || null;
    const source = getSourceDisplayName(ev.documentId);
    return {
      id: `dec-${ev.id}`,
      statement: ev.text.trim(),
      status: 'current' as DecisionStatus,
      date,
      source,
      sourceReference: ev.documentId || null,
      supportingQuote: ev.sourceChunk || ev.text || null,
      entities: ev.entities || null,
      evidenceId: ev.id,
    };
  });

  // Sort chronologically: oldest first, undated at end
  decisionItems.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const domains = ['database', 'timescale', 'postgres', 'storage', 'cloud', 'aws', 'gcp', 'launch', 'timeline', 'budget', 'analytics'];

  for (let i = 0; i < decisionItems.length; i++) {
    for (let j = i + 1; j < decisionItems.length; j++) {
      const earlier = decisionItems[i];
      const later = decisionItems[j];

      if (earlier.date && later.date && new Date(later.date).getTime() > new Date(earlier.date).getTime()) {
        const earlierLower = earlier.statement.toLowerCase();
        const laterLower = later.statement.toLowerCase();

        const matchedDomain = domains.find((d) => earlierLower.includes(d) && laterLower.includes(d));
        const isChange = /\b(switch|switched|migrat|replac|adopt|change|supersed|pushed back)\b/i.test(laterLower);

        if (matchedDomain || isChange) {
          earlier.status = 'superseded';
          earlier.supersededBy = later.statement;
          later.status = 'current';
          later.supersedes = earlier.statement;
          later.topic = matchedDomain ? (matchedDomain.charAt(0).toUpperCase() + matchedDomain.slice(1)) : 'Architecture';
          earlier.topic = later.topic;
        }
      }
    }
  }

  return {
    clientName: client.name,
    hasEvidence: true,
    decisions: decisionItems,
    evidence: recallPayload.results,
  };
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
      dontRepeat: [],
      decisions: [],
      message: 'No relevant stored client memory found to generate a handoff brief. Please ingest meeting transcripts first.',
    };
  }

  try {
    const caller = options?.handoffLlmCaller || generateGroundedHandoffBrief;
    const llmResult = await caller(client.name, recallPayload.results);

    // Also extract the structured decisions and rejections for tight cross-feature linkage
    let dontRepeatItems: RejectedItem[] = [];
    let timelineDecisions: DecisionItem[] = [];

    try {
      const drResponse = await getDontRepeatItems(clientId, options);
      dontRepeatItems = drResponse.items;
    } catch {
      // Non-blocking
    }

    try {
      const tlResponse = await getDecisionTimeline(clientId, options);
      timelineDecisions = tlResponse.decisions;
    } catch {
      // Non-blocking
    }

    return {
      clientName: client.name,
      hasEvidence: true,
      brief: llmResult.answer,
      evidence: recallPayload.results,
      dontRepeat: dontRepeatItems,
      decisions: timelineDecisions,
      message: 'Account continuity handover brief generated successfully.',
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    throw new Error(`Failed to generate client handoff brief: ${errorMsg}`);
  }
}

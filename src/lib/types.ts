/**
 * Shared Continuity Data Model for ContextRelay
 *
 * Defines domain models derived from Hindsight evidence for:
 * 1. Don't Repeat This (Rejected & Failed Approaches)
 * 2. Decision Timeline (Chronological Decision Evolution)
 * 3. Handoff Brief (Comprehensive Client Continuity Dossier)
 */

export interface RecalledEvidenceItem {
  id: string;
  text: string;
  type: string; // 'world' | 'experience' | 'observation'
  context?: string | null;
  occurredStart?: string | null;
  occurredEnd?: string | null;
  mentionedAt?: string | null;
  documentId?: string | null;
  chunkId?: string | null;
  sourceChunk?: string | null;
  entities?: string[] | null;
}

export interface RecallResultPayload {
  results: RecalledEvidenceItem[];
  formattedContext: string;
}

export type DecisionStatus = 'current' | 'superseded' | 'historical';

export interface DecisionItem {
  id: string;
  statement: string;
  status: DecisionStatus;
  date: string | null;
  source: string;
  sourceReference?: string | null;
  supportingQuote?: string | null;
  entities?: string[] | null;
  supersedes?: string | null;
  supersededBy?: string | null;
  topic?: string | null;
  evidenceId: string;
}

export type RejectionStatus = 'active_rejection' | 'superseded_rejection' | 'historical_attempt';

export interface RejectedItem {
  id: string;
  item: string;
  status: RejectionStatus;
  reason: string; // Explicit reason if available, else "Reason not recorded in available client memory."
  date: string | null;
  source: string;
  sourceReference?: string | null;
  evidenceQuote?: string | null;
  currentStatusNote?: string | null;
  evidenceId: string;
}

export interface HandoffSection {
  id: string;
  title: string;
  content: string;
  items?: string[];
  isEmpty: boolean;
}

export interface HandoffBriefData {
  clientName: string;
  generatedAt: string;
  briefMarkdown: string;
  keyDecisions: DecisionItem[];
  dontRepeat: RejectedItem[];
  evidence: RecalledEvidenceItem[];
  hasEvidence: boolean;
  message?: string;
}

export interface DontRepeatResponse {
  clientName: string;
  hasEvidence: boolean;
  items: RejectedItem[];
  evidence: RecalledEvidenceItem[];
  message?: string;
}

export interface TimelineResponse {
  clientName: string;
  hasEvidence: boolean;
  decisions: DecisionItem[];
  evidence: RecalledEvidenceItem[];
  message?: string;
}

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
  dontRepeat?: RejectedItem[];
  decisions?: DecisionItem[];
  generatedAt?: string;
}


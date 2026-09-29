import { HindsightClient, recallResponseToPromptString } from '@vectorize-io/hindsight-client';
import { resolveKey } from './db';

const HINDSIGHT_MISSION = `Extract durable business memory about this specific client. Prioritize explicit client preferences, likes/dislikes, decisions, approvals, rejections, constraints, goals, stakeholder roles, commitments, timelines, previous attempts, outcomes, and the reasons behind decisions when the reason is explicitly stated. Preserve temporal information and the source context. Prefer explicit statements over guesses. Ignore greetings, filler, small talk, transient scheduling chatter, generic conversation, repetitive phrasing, unrelated personal details, secrets, credentials, API keys, and information that has no likely future value for serving this client. Never invent facts.`;

export interface HindsightConfig {
  baseUrl: string;
  apiKey?: string;
}

import { RecalledEvidenceItem, RecallResultPayload } from './types';
export type { RecalledEvidenceItem, RecallResultPayload };

export class HindsightWrapper {
  private client: HindsightClient;
  private baseUrl: string;

  constructor(config?: Partial<HindsightConfig>) {
    this.baseUrl = (config?.baseUrl || resolveKey('HINDSIGHT_API_URL', 'HINDSIGHT_API_URL') || process.env.HINDSIGHT_API_URL || 'http://localhost:8888').trim();
    const apiKey = config?.apiKey || resolveKey('HINDSIGHT_API_KEY', 'HINDSIGHT_API_KEY') || process.env.HINDSIGHT_API_KEY;

    this.client = new HindsightClient({
      baseUrl: this.baseUrl,
      headers: apiKey ? { Authorization: `Bearer ${apiKey.trim()}` } : undefined,
    });
  }

  /**
   * Ensures the bank exists for the client and applies the client-memory mission.
   */
  async ensureClientBank(bankId: string, clientName: string): Promise<void> {
    try {
      await this.client.createBank(bankId, {
        name: `Client: ${clientName}`,
        mission: `ContextRelay client bank for ${clientName}`,
        retainMission: HINDSIGHT_MISSION,
        retainExtractionMode: 'concise',
        enableObservations: true,
      });
    } catch (err: any) {
      // If bank already exists (HTTP 409), ensure its config is up to date
      const errorMsg = err?.message || String(err);
      if (errorMsg.includes('409') || errorMsg.includes('already exists') || err?.status === 409) {
        try {
          await this.client.updateBankConfig(bankId, {
            retainMission: HINDSIGHT_MISSION,
            retainExtractionMode: 'concise',
          });
          return;
        } catch (updateErr: any) {
          throw new Error(`Failed to update existing Hindsight bank configuration for ${bankId}: ${updateErr?.message || updateErr}`);
        }
      }
      throw new Error(`Failed to create Hindsight bank '${bankId}' at ${this.baseUrl}: ${errorMsg}`);
    }
  }

  /**
   * Retains a transcript document into the specified client bank.
   */
  async retainTranscript(
    bankId: string,
    content: string,
    documentId: string,
    metadata: Record<string, string> = {}
  ): Promise<any> {
    try {
      const response = await this.client.retain(bankId, content, {
        documentId,
        context: 'client-transcript',
        metadata: {
          ...metadata,
          source: 'context-relay-upload',
        },
        async: false, // Process synchronously so ingestion status updates immediately
      });
      return response;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      throw new Error(`Hindsight retain failed for document ${documentId} in bank ${bankId}: ${errorMsg}`);
    }
  }

  /**
   * Recalls relevant memories for a user query from the client's bank.
   */
  async recallMemories(bankId: string, query: string): Promise<RecallResultPayload> {
    try {
      const response = await this.client.recall(bankId, query, {
        budget: 'mid',
        maxTokens: 4096,
        types: ['world', 'experience', 'observation'],
        includeChunks: true,
        includeEntities: true,
        includeSourceFacts: true,
      });

      const chunksMap = response.chunks || {};
      const results: RecalledEvidenceItem[] = (response.results || []).map((r) => {
        const item: RecalledEvidenceItem = {
          id: r.id || '',
          text: r.text || '',
          type: r.type || 'world',
          context: r.context ?? null,
          occurredStart: r.occurred_start ?? null,
          occurredEnd: r.occurred_end ?? null,
          mentionedAt: r.mentioned_at ?? null,
          documentId: r.document_id ?? null,
          chunkId: r.chunk_id ?? null,
          entities: r.entities ?? null,
        };

        if (r.chunk_id && chunksMap[r.chunk_id]) {
          item.sourceChunk = chunksMap[r.chunk_id].text;
        }

        return item;
      });

      const formattedContext = recallResponseToPromptString(response);

      return {
        results,
        formattedContext,
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      // If 404, bank does not exist or has no data
      if (errorMsg.includes('404') || err?.status === 404) {
        return {
          results: [],
          formattedContext: '',
        };
      }
      throw new Error(`Hindsight recall failed for bank ${bankId}: ${errorMsg}`);
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Global singleton instance for server routes
const globalForHindsight = globalThis as unknown as {
  _hindsightWrapper?: HindsightWrapper;
};

export function getHindsightClient(): HindsightWrapper {
  if (!globalForHindsight._hindsightWrapper) {
    globalForHindsight._hindsightWrapper = new HindsightWrapper();
  }
  return globalForHindsight._hindsightWrapper;
}

'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Client {
  id: string;
  name: string;
  hindsight_bank_id: string;
  created_at: string;
}

interface Source {
  id: string;
  client_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  meeting_date: string | null;
  hindsight_document_id: string;
  ingestion_status: 'processing' | 'stored' | 'failed';
  error_message: string | null;
  created_at: string;
}

interface EvidenceItem {
  id: string;
  text: string;
  type: string;
  context?: string;
  occurredStart?: string;
  occurredEnd?: string;
  mentionedAt?: string;
  documentId?: string;
  chunkId?: string;
  sourceChunk?: string;
  entities?: string[];
}

interface QueryResult {
  answer: string;
  hasEvidence: boolean;
  evidence: EvidenceItem[];
  clientName: string;
}

interface HandoffResult {
  clientName: string;
  hasEvidence: boolean;
  brief: string;
  evidence: EvidenceItem[];
  message?: string;
}

export default function ContextRelayApp() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'workspace' | 'handoff'>('workspace');

  // Ingestion state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Continuity query state
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState(true);

  // Handoff brief state
  const [isGeneratingHandoff, setIsGeneratingHandoff] = useState(false);
  const [handoffResult, setHandoffResult] = useState<HandoffResult | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [expandedHandoffEvidence, setExpandedHandoffEvidence] = useState(false);

  // General error state
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchSources(selectedClientId);
      setQueryResult(null);
      setQueryError(null);
      setUploadError(null);
      setHandoffResult(null);
      setHandoffError(null);
    } else {
      setSources([]);
    }
  }, [selectedClientId]);

  async function fetchClients() {
    setIsLoadingClients(true);
    setGeneralError(null);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load clients');
      setClients(data.clients || []);
      if (data.clients && data.clients.length > 0 && !selectedClientId) {
        setSelectedClientId(data.clients[0].id);
      }
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoadingClients(false);
    }
  }

  async function fetchSources(clientId: string) {
    try {
      const res = await fetch(`/api/sources?clientId=${encodeURIComponent(clientId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load client sources');
      setSources(data.sources || []);
    } catch (err: any) {
      console.error('Failed to load sources:', err);
    }
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    const name = newClientName.trim();
    if (!name) return;

    setIsCreatingClient(true);
    setGeneralError(null);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client');

      const created = data.client as Client;
      setClients((prev) => [created, ...prev]);
      setSelectedClientId(created.id);
      setNewClientName('');
      setShowCreateModal(false);
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsCreatingClient(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedClientId) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('clientId', selectedClientId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to ingest transcript into Hindsight memory');
      }

      await fetchSources(selectedClientId);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setUploadError(err.message);
      await fetchSources(selectedClientId);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleQuery(e: React.FormEvent | undefined, customQuestion?: string) {
    if (e) e.preventDefault();
    const queryText = (customQuestion ?? question).trim();
    if (!queryText || !selectedClientId) return;

    if (customQuestion) {
      setQuestion(customQuestion);
    }

    setIsQuerying(true);
    setQueryError(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, question: queryText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Query recall processing failed');

      setQueryResult(data as QueryResult);
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setIsQuerying(false);
    }
  }

  async function handleGenerateHandoff() {
    if (!selectedClientId) return;

    setIsGeneratingHandoff(true);
    setHandoffError(null);

    try {
      const res = await fetch('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate account handoff brief');

      setHandoffResult(data as HandoffResult);
    } catch (err: any) {
      setHandoffError(err.message);
    } finally {
      setIsGeneratingHandoff(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-title">
            <div className="brand-logo-icon">CR</div>
            <span>ContextRelay</span>
          </div>
          <div className="brand-tagline">
            Durable institutional memory for agency account continuity.
          </div>
        </div>

        <div className="sidebar-actions">
          <div className="client-list-header">
            <span className="client-list-title">Client Accounts</span>
            <button
              id="btn-new-client"
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setShowCreateModal(true)}
            >
              + New Client
            </button>
          </div>
        </div>

        <div className="client-list">
          {isLoadingClients ? (
            <div className="sidebar-empty-state">Loading client registry...</div>
          ) : clients.length === 0 ? (
            <div className="sidebar-empty-state">
              No clients yet. Create a client account to begin preserving institutional context.
            </div>
          ) : (
            clients.map((client) => (
              <button
                key={client.id}
                id={`client-select-${client.id}`}
                className={`client-item ${selectedClientId === client.id ? 'active' : ''}`}
                onClick={() => setSelectedClientId(client.id)}
              >
                <span>{client.name}</span>
                {selectedClientId === client.id && <span className="client-item-indicator" />}
              </button>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div>Memory Engine: Hindsight</div>
          <div>Storage: Isolated Client Banks</div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-workspace">
        {generalError && (
          <div style={{ padding: '16px 36px 0' }}>
            <div className="alert-box alert-error">{generalError}</div>
          </div>
        )}

        {isLoadingClients ? (
          <div className="empty-hero">
            <div className="empty-hero-icon">CR</div>
            <h1 className="empty-hero-title">Connecting to Client Registry</h1>
            <p className="empty-hero-desc">Checking agency workspace for active client accounts...</p>
          </div>
        ) : clients.length === 0 ? (
          /* Empty State — Explaining the Product Truth */
          <div className="empty-hero">
            <div className="empty-hero-icon">CR</div>
            <h1 className="empty-hero-title">Prevent Agency-Client Knowledge Loss</h1>
            <p className="empty-hero-desc">
              When an account manager leaves, years of context walk out with them: what the client hates, what was tried, who approves what. The new person repeats old mistakes.
            </p>
            <div className="empty-hero-points">
              <div className="empty-hero-point-item">
                <span className="empty-hero-point-bullet" />
                <span>Retains client preferences, rejections, constraints, and stakeholder roles.</span>
              </div>
              <div className="empty-hero-point-item">
                <span className="empty-hero-point-bullet" />
                <span>Transforms raw transcripts into isolated Hindsight memory banks automatically.</span>
              </div>
              <div className="empty-hero-point-item">
                <span className="empty-hero-point-bullet" />
                <span>Provides incoming team members with evidence-grounded recall before client meetings.</span>
              </div>
            </div>
            <button
              id="btn-create-first-client"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              + Create First Client
            </button>
          </div>
        ) : selectedClient ? (
          <>
            {/* Top Bar */}
            <div className="workspace-top-bar">
              <div className="workspace-title-area">
                <h1 className="workspace-heading">{selectedClient.name}</h1>
                <span className="bank-id-pill" title="Hindsight Memory Bank Identifier">
                  {selectedClient.hindsight_bank_id}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {sources.filter(s => s.ingestion_status === 'stored').length} transcripts in durable memory
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="workspace-tabs">
              <button
                className={`workspace-tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
                onClick={() => setActiveTab('workspace')}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 2h10v12H3V2z" />
                  <path d="M6 5h4M6 8h4M6 11h2" />
                </svg>
                <span>Continuity Workspace</span>
              </button>
              <button
                className={`workspace-tab-btn ${activeTab === 'handoff' ? 'active' : ''}`}
                onClick={() => setActiveTab('handoff')}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4h12v9H2V4z" />
                  <path d="M5 2v2M11 2v2" />
                </svg>
                <span>Account Handover Brief</span>
              </button>
            </div>

            <div className="workspace-content">
              {activeTab === 'workspace' ? (
                <>
                  {/* Continuity Mission Banner */}
                  <div className="continuity-banner">
                    <div className="continuity-banner-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 5v3l2 1" />
                      </svg>
                    </div>
                    <div className="continuity-banner-text">
                      <div className="continuity-banner-title">Account Continuity Protocol Active</div>
                      Client decisions, brand restrictions, tech stack constraints, and stakeholder approval authorities are retained into an isolated Hindsight memory bank. Incoming account managers can recover history without re-asking settled questions.
                    </div>
                  </div>

                  {/* Transcript Ingestion Section */}
                  <section className="card">
                    <div className="card-title">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 2h7l4 4v8H3V2z" />
                        <path d="M10 2v4h4" />
                      </svg>
                      <span>Client Conversations & Transcripts</span>
                    </div>
                    <div className="card-subtitle">
                      Upload raw meeting transcripts (.txt or .md). Hindsight automatically extracts durable business knowledge into this client's isolated memory bank without requiring manual tagging.
                    </div>

                    {uploadError && (
                      <div className="alert-box alert-error">{uploadError}</div>
                    )}

                    <div
                      className="upload-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        id="transcript-file-input"
                        accept=".txt,.md,text/plain,text/markdown"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <div className="upload-icon">
                        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M8 11V3m0 0L5 6m3-3l3 3" />
                          <path d="M2 13h12" />
                        </svg>
                      </div>
                      <div className="upload-text">
                        {isUploading ? 'Retaining transcript in Hindsight client memory...' : 'Select or drop meeting transcript file'}
                      </div>
                      <div className="upload-hint">Accepted formats: .txt, .md (max 5MB)</div>
                    </div>

                    {/* Uploaded Sources Table */}
                    {sources.length > 0 && (
                      <table className="sources-table">
                        <thead>
                          <tr>
                            <th>Source File</th>
                            <th>Size</th>
                            <th>Retained</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sources.map((source) => (
                            <tr key={source.id}>
                              <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                {source.original_filename}
                              </td>
                              <td>{(source.size_bytes / 1024).toFixed(1)} KB</td>
                              <td>{new Date(source.created_at).toLocaleDateString()}</td>
                              <td>
                                <span className={`badge badge-${source.ingestion_status}`}>
                                  {source.ingestion_status}
                                </span>
                                {source.error_message && (
                                  <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>
                                    {source.error_message}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>

                  {/* Memory Query & Grounded Answer Section */}
                  <section className="card">
                    <div className="card-title">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="7" cy="7" r="4.5" />
                        <path d="M10.5 10.5L14 14" />
                      </svg>
                      <span>Query Client Institutional Memory</span>
                    </div>
                    <div className="card-subtitle">
                      Ask questions regarding client preferences, past rejections, technical constraints, timeline changes, or stakeholder approval authority.
                    </div>

                    <form onSubmit={(e) => handleQuery(e)} className="query-box">
                      <input
                        type="text"
                        id="query-input"
                        className="form-input"
                        placeholder="e.g., What technologies did the client reject or mandate?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={isQuerying}
                      />
                      <button
                        type="submit"
                        id="btn-ask-query"
                        className="btn btn-primary"
                        disabled={isQuerying || !question.trim()}
                      >
                        {isQuerying ? 'Recalling...' : 'Recall'}
                      </button>
                    </form>

                    {/* Continuity suggested queries */}
                    <div className="continuity-prompts">
                      <div className="continuity-prompts-label">Incoming Account Manager Prompts:</div>
                      <div className="continuity-prompts-list">
                        <button
                          type="button"
                          className="continuity-chip"
                          onClick={() => handleQuery(undefined, 'What has the client explicitly rejected or mandated?')}
                        >
                          Rejected or mandated technologies
                        </button>
                        <button
                          type="button"
                          className="continuity-chip"
                          onClick={() => handleQuery(undefined, 'Who has final approval authority on budget and deliverables?')}
                        >
                          Budget and sign-off authority
                        </button>
                        <button
                          type="button"
                          className="continuity-chip"
                          onClick={() => handleQuery(undefined, 'What are the client brand design rules and visual restrictions?')}
                        >
                          Brand design constraints
                        </button>
                        <button
                          type="button"
                          className="continuity-chip"
                          onClick={() => handleQuery(undefined, 'What deadlines or milestones changed over time?')}
                        >
                          Timeline changes over time
                        </button>
                      </div>
                    </div>

                    {queryError && (
                      <div className="alert-box alert-error" style={{ marginTop: '16px' }}>
                        {queryError}
                      </div>
                    )}

                    {/* Answer + Evidence Display */}
                    {queryResult && (
                      <div className="card answer-card">
                        <div className="answer-header">
                          <span className="answer-title">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M3 8l3 3 7-7" />
                            </svg>
                            <span>Grounded Client Memory Answer</span>
                          </span>
                          {queryResult.hasEvidence && (
                            <span className="evidence-count-tag">
                              {queryResult.evidence.length} Memories Recalled
                            </span>
                          )}
                        </div>

                        <div className="answer-text" id="grounded-answer-text">
                          {queryResult.answer}
                        </div>

                        {/* Evidence Drawer */}
                        {queryResult.hasEvidence && queryResult.evidence.length > 0 && (
                          <div className="evidence-section">
                            <div
                              className="evidence-header"
                              onClick={() => setExpandedEvidence(!expandedEvidence)}
                            >
                              <div className="evidence-title">
                                <span>Verifiable Hindsight Evidence</span>
                                <span className="evidence-count-tag">
                                  {expandedEvidence ? 'Collapse' : 'Expand'}
                                </span>
                              </div>
                            </div>

                            {expandedEvidence && (
                              <div className="evidence-list" id="evidence-drawer">
                                {queryResult.evidence.map((item, idx) => (
                                  <div key={item.id || idx} className="evidence-item">
                                    <div className="evidence-item-fact">{item.text}</div>
                                    <div className="evidence-meta">
                                      <span className="evidence-meta-pill">Type: {item.type}</span>
                                      {item.context && (
                                        <span className="evidence-meta-pill">Context: {item.context}</span>
                                      )}
                                      {(item.occurredStart || item.mentionedAt) && (
                                        <span className="evidence-meta-pill">
                                          Date: {item.occurredStart || item.mentionedAt}
                                        </span>
                                      )}
                                      {item.entities && item.entities.length > 0 && (
                                        <span className="evidence-meta-pill">
                                          Entities: {item.entities.join(', ')}
                                        </span>
                                      )}
                                    </div>
                                    {item.sourceChunk && (
                                      <div className="evidence-quote">
                                        "{item.sourceChunk.trim()}"
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                /* Dedicated Account Handover Brief Tab */
                <section className="card">
                  <div className="card-title">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 4h12v9H2V4z" />
                      <path d="M5 2v2M11 2v2" />
                    </svg>
                    <span>Account Continuity & Handover Dossier</span>
                  </div>
                  <div className="card-subtitle">
                    Generates a structured handover brief for incoming account managers inheriting {selectedClient.name}, synthesizing technical mandates, explicit rejections, stakeholder sign-offs, and timeline history directly from Hindsight memory.
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleGenerateHandoff}
                      disabled={isGeneratingHandoff}
                    >
                      {isGeneratingHandoff ? 'Synthesizing from Hindsight Memory...' : (handoffResult ? 'Regenerate Handover Brief' : 'Generate Account Handover Brief')}
                    </button>
                    {sources.length === 0 && (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Notice: No transcripts uploaded yet for this client.
                      </span>
                    )}
                  </div>

                  {handoffError && (
                    <div className="alert-box alert-error">{handoffError}</div>
                  )}

                  {handoffResult && (
                    <div className="card answer-card" style={{ marginTop: '16px' }}>
                      <div className="answer-header">
                        <span className="answer-title">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 8l3 3 7-7" />
                          </svg>
                          <span>Institutional Handover Dossier: {selectedClient.name}</span>
                        </span>
                        {handoffResult.hasEvidence && (
                          <span className="evidence-count-tag">
                            {handoffResult.evidence.length} Memories Recalled
                          </span>
                        )}
                      </div>

                      {handoffResult.hasEvidence ? (
                        <div className="answer-text">
                          {handoffResult.brief}
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '12px 0' }}>
                          {handoffResult.message || 'No relevant stored client memory found to generate a handoff brief. Ingest meeting transcripts to populate client memory.'}
                        </div>
                      )}

                      {/* Expandable Evidence Drawer */}
                      {handoffResult.hasEvidence && handoffResult.evidence.length > 0 && (
                        <div className="evidence-section">
                          <div
                            className="evidence-header"
                            onClick={() => setExpandedHandoffEvidence(!expandedHandoffEvidence)}
                          >
                            <div className="evidence-title">
                              <span>Underlying Hindsight Memory Facts</span>
                              <span className="evidence-count-tag">
                                {expandedHandoffEvidence ? 'Collapse' : 'Expand'}
                              </span>
                            </div>
                          </div>

                          {expandedHandoffEvidence && (
                            <div className="evidence-list">
                              {handoffResult.evidence.map((item, idx) => (
                                <div key={item.id || idx} className="evidence-item">
                                  <div className="evidence-item-fact">{item.text}</div>
                                  <div className="evidence-meta">
                                    <span className="evidence-meta-pill">Type: {item.type}</span>
                                    {(item.occurredStart || item.mentionedAt) && (
                                      <span className="evidence-meta-pill">
                                        Date: {item.occurredStart || item.mentionedAt}
                                      </span>
                                    )}
                                  </div>
                                  {item.sourceChunk && (
                                    <div className="evidence-quote">
                                      "{item.sourceChunk.trim()}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          </>
        ) : null}
      </main>

      {/* Create Client Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create Client Account</h2>
            <p className="modal-desc">
              Provisions an isolated Hindsight memory bank for this client to ensure context is never cross-contaminated between accounts.
            </p>
            <form onSubmit={handleCreateClient}>
              <input
                type="text"
                id="input-client-name"
                className="form-input"
                placeholder="Client Name (e.g., Meridian Logistics)"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                autoFocus
                required
                disabled={isCreatingClient}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingClient}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-client"
                  className="btn btn-primary"
                  disabled={isCreatingClient || !newClientName.trim()}
                >
                  {isCreatingClient ? 'Provisioning Bank...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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

export default function ContextRelayApp() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query state
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState(true);

  // General error
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load clients on initial mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Load sources when selected client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchSources(selectedClientId);
      setQueryResult(null);
      setQueryError(null);
      setUploadError(null);
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
      if (!res.ok) throw new Error(data.error || 'Failed to load sources');
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
        throw new Error(data.error || 'Failed to ingest transcript');
      }

      // Refresh sources list
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

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    const trimmedQ = question.trim();
    if (!trimmedQ || !selectedClientId) return;

    setIsQuerying(true);
    setQueryError(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, question: trimmedQ }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Query processing failed');

      setQueryResult(data as QueryResult);
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setIsQuerying(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="app-container">
      {/* Sidebar: Area 1 */}
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-title">
            <div className="brand-logo-icon">CR</div>
            ContextRelay
          </div>
          <div className="brand-tagline">
            Durable client memory for agency account continuity.
          </div>
        </div>

        <div className="sidebar-actions">
          <div className="client-list-header">
            <span className="client-list-title">Client Accounts</span>
            <button
              id="btn-new-client"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
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
              No clients yet.<br />Click "+ New Client" to start.
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
                {selectedClientId === client.id && <span className="client-item-dot" />}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Area: Area 2 & Area 3 */}
      <main className="main-workspace">
        {generalError && (
          <div style={{ padding: '16px 40px 0' }}>
            <div className="alert-box alert-error">{generalError}</div>
          </div>
        )}

        {isLoadingClients ? (
          <div className="empty-hero">
            <div className="empty-hero-icon" style={{ opacity: 0.8 }}>CR</div>
            <h1 className="empty-hero-title">Connecting to Client Registry</h1>
            <p className="empty-hero-desc">Checking agency workspace for active client accounts...</p>
          </div>
        ) : clients.length === 0 ? (
          /* Clean Empty State */
          <div className="empty-hero">
            <div className="empty-hero-icon">CR</div>
            <h1 className="empty-hero-title">Zero Stored Context Lost</h1>
            <p className="empty-hero-desc">
              When an account manager rolls off, critical client decisions vanish.
              ContextRelay turns real meeting transcripts into durable institutional memory using Hindsight, so the next person never repeats old mistakes.
            </p>
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
            </div>

            <div className="workspace-content">
              {/* Transcript Ingestion Card */}
              <section className="card">
                <div className="card-title">
                  <span>📄</span> Meeting Transcripts
                </div>
                <div className="card-subtitle">
                  Upload raw meeting transcripts (.txt or .md). Hindsight automatically extracts durable business knowledge into this client's isolated memory bank.
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
                  <div className="upload-icon">⬆️</div>
                  <div className="upload-text">
                    {isUploading ? 'Retaining transcript in Hindsight...' : 'Select or drop meeting transcript file'}
                  </div>
                  <div className="upload-hint">Accepted formats: .txt, .md (max 5MB)</div>
                </div>

                {/* Uploaded Sources Table */}
                {sources.length > 0 && (
                  <table className="sources-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sources.map((source) => (
                        <tr key={source.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
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

              {/* Memory Query & Grounded Answer Card */}
              <section className="card">
                <div className="card-title">
                  <span>🔍</span> Query Client Memory
                </div>
                <div className="card-subtitle">
                  Ask questions regarding past client decisions, constraints, tech stack requirements, or stakeholder sign-offs.
                </div>

                <form onSubmit={handleQuery} className="query-box">
                  <input
                    type="text"
                    id="query-input"
                    className="form-input"
                    placeholder="e.g., What visual preferences and constraints did the client establish?"
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
                    {isQuerying ? 'Recalling...' : 'Ask'}
                  </button>
                </form>

                {queryError && (
                  <div className="alert-box alert-error" style={{ marginTop: '16px' }}>
                    {queryError}
                  </div>
                )}

                {/* Answer + Evidence Display */}
                {queryResult && (
                  <div className="card answer-card" style={{ marginTop: '24px' }}>
                    <div className="answer-header">
                      <span className="answer-title">ContextRelay Grounded Answer</span>
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
                              {expandedEvidence ? 'Collapse ▲' : 'Expand ▼'}
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
            </div>
          </>
        ) : null}
      </main>

      {/* Create Client Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create Client Workspace</h2>
            <p className="modal-desc">
              Creates a dedicated, isolated Hindsight memory bank for this client.
            </p>
            <form onSubmit={handleCreateClient}>
              <input
                type="text"
                id="input-client-name"
                className="form-input"
                placeholder="Client Name (e.g. Acme Corp)"
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
                  {isCreatingClient ? 'Provisioning...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

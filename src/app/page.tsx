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
  context?: string | null;
  occurredStart?: string | null;
  occurredEnd?: string | null;
  mentionedAt?: string | null;
  documentId?: string | null;
  chunkId?: string | null;
  sourceChunk?: string | null;
  entities?: string[] | null;
}

interface RejectedItem {
  id: string;
  item: string;
  status: 'active_rejection' | 'superseded_rejection' | 'historical_attempt';
  reason: string;
  date: string | null;
  source: string;
  sourceReference?: string | null;
  evidenceQuote?: string | null;
  currentStatusNote?: string | null;
  evidenceId: string;
}

interface DecisionItem {
  id: string;
  statement: string;
  status: 'current' | 'superseded' | 'historical';
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
  dontRepeat?: RejectedItem[];
  decisions?: DecisionItem[];
  message?: string;
}

type ContinuityTab = 'overview' | 'dont-repeat' | 'timeline' | 'handoff' | 'query';

export default function ContextRelayApp() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<ContinuityTab>('overview');

  // Ingestion state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature 1: Don't Repeat This state
  const [dontRepeatItems, setDontRepeatItems] = useState<RejectedItem[]>([]);
  const [dontRepeatEvidence, setDontRepeatEvidence] = useState<EvidenceItem[]>([]);
  const [isLoadingDontRepeat, setIsLoadingDontRepeat] = useState(false);
  const [dontRepeatError, setDontRepeatError] = useState<string | null>(null);
  const [expandedRejectionEvidence, setExpandedRejectionEvidence] = useState<Record<string, boolean>>({});

  // Feature 2: Decision Timeline state
  const [timelineDecisions, setTimelineDecisions] = useState<DecisionItem[]>([]);
  const [timelineEvidence, setTimelineEvidence] = useState<EvidenceItem[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [expandedTimelineEvidence, setExpandedTimelineEvidence] = useState<Record<string, boolean>>({});

  // Feature 3: Handoff Brief state
  const [isGeneratingHandoff, setIsGeneratingHandoff] = useState(false);
  const [handoffResult, setHandoffResult] = useState<HandoffResult | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [expandedHandoffEvidence, setExpandedHandoffEvidence] = useState(false);

  // Query state (Ask Memory)
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [expandedQueryEvidence, setExpandedQueryEvidence] = useState(true);

  // General error state
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchSources(selectedClientId);
      // Reset feature states on client switch
      setQueryResult(null);
      setQueryError(null);
      setUploadError(null);
      setHandoffResult(null);
      setHandoffError(null);
      setDontRepeatItems([]);
      setDontRepeatEvidence([]);
      setTimelineDecisions([]);
      setTimelineEvidence([]);
      setExpandedRejectionEvidence({});
      setExpandedTimelineEvidence({});

      // Load initial continuity data for overview
      loadDontRepeat(selectedClientId);
      loadTimeline(selectedClientId);
    } else {
      setSources([]);
      setDontRepeatItems([]);
      setTimelineDecisions([]);
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
      if (!res.ok) throw new Error(data.error || 'Failed to ingest transcript');

      // Refresh sources and continuity data
      await fetchSources(selectedClientId);
      await loadDontRepeat(selectedClientId);
      await loadTimeline(selectedClientId);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function loadDontRepeat(clientId: string) {
    setIsLoadingDontRepeat(true);
    setDontRepeatError(null);
    try {
      const res = await fetch(`/api/dont-repeat?clientId=${encodeURIComponent(clientId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load rejected approaches');
      setDontRepeatItems(data.items || []);
      setDontRepeatEvidence(data.evidence || []);
    } catch (err: any) {
      setDontRepeatError(err.message);
    } finally {
      setIsLoadingDontRepeat(false);
    }
  }

  async function loadTimeline(clientId: string) {
    setIsLoadingTimeline(true);
    setTimelineError(null);
    try {
      const res = await fetch(`/api/timeline?clientId=${encodeURIComponent(clientId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load decision timeline');
      setTimelineDecisions(data.decisions || []);
      setTimelineEvidence(data.evidence || []);
    } catch (err: any) {
      setTimelineError(err.message);
    } finally {
      setIsLoadingTimeline(false);
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
      if (!res.ok) throw new Error(data.error || 'Failed to generate handoff brief');
      setHandoffResult(data);
    } catch (err: any) {
      setHandoffError(err.message);
    } finally {
      setIsGeneratingHandoff(false);
    }
  }

  async function handleQuerySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !selectedClientId) return;

    setIsQuerying(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          question: question.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process continuity query');
      setQueryResult(data);
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setIsQuerying(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-title">
            <span className="brand-logo-icon">CR</span>
            ContextRelay
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Client context that survives the person.
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-label">Client Accounts</div>
          <div className="client-list">
            {isLoadingClients ? (
              <div style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Loading workspaces...
              </div>
            ) : clients.length === 0 ? (
              <div style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                No clients registered.
              </div>
            ) : (
              clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className={`client-nav-btn ${selectedClientId === c.id ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="client-avatar-glyph">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span className="badge-mono">BANK</span>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '12px', fontSize: '12px' }}
          >
            + Register New Client
          </button>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span className="status-indicator-dot online" />
            <span>Memory Engine: Hindsight</span>
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            Isolation: Discrete Per-Client Bank
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {selectedClient ? (
          <>
            {/* Top Workspace Header */}
            <header className="workspace-header">
              <div className="workspace-title-row">
                <div className="workspace-title-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h1 className="workspace-client-name">{selectedClient.name}</h1>
                    <span className="badge-mono" style={{ color: '#4ade80', borderColor: '#1f3b2a' }}>
                      CONNECTED
                    </span>
                  </div>
                  <div className="workspace-bank-id">
                    <span>Hindsight Bank:</span>
                    <span className="truncate" style={{ maxWidth: '340px' }}>{selectedClient.hindsight_bank_id}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      loadDontRepeat(selectedClient.id);
                      loadTimeline(selectedClient.id);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px' }}
                    title="Refresh memory records"
                  >
                    Refresh Memory
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('handoff');
                      handleGenerateHandoff();
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '12px' }}
                    disabled={isGeneratingHandoff}
                  >
                    {isGeneratingHandoff ? 'Synthesizing...' : 'Prepare Handoff Brief'}
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="tabs-nav">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                >
                  Continuity Overview
                </button>
                <button
                  onClick={() => setActiveTab('dont-repeat')}
                  className={`tab-btn ${activeTab === 'dont-repeat' ? 'active' : ''}`}
                >
                  Don't Repeat This
                  {dontRepeatItems.length > 0 && (
                    <span className="tab-counter-badge">{dontRepeatItems.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                >
                  Decision Timeline
                  {timelineDecisions.length > 0 && (
                    <span className="tab-counter-badge">{timelineDecisions.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('handoff')}
                  className={`tab-btn ${activeTab === 'handoff' ? 'active' : ''}`}
                >
                  Handoff Brief
                </button>
                <button
                  onClick={() => setActiveTab('query')}
                  className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
                >
                  Ask Memory
                </button>
              </div>
            </header>

            {/* Error Notifications */}
            {generalError && <div className="alert-box alert-error">{generalError}</div>}

            <div className="workspace-body">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="feature-view-container">
                  {/* Primary Action Banner */}
                  <div className="overview-action-banner">
                    <div>
                      <div className="overview-banner-title">
                        Client Continuity Workspace: {selectedClient.name}
                      </div>
                      <div className="overview-banner-subtitle">
                        Preserves durable account history, past technical decisions, and rejected approaches so incoming account managers never start from zero.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('handoff');
                        handleGenerateHandoff();
                      }}
                      className="btn btn-primary"
                      disabled={isGeneratingHandoff}
                    >
                      {isGeneratingHandoff ? 'Generating...' : 'Prepare Full Handoff Brief →'}
                    </button>
                  </div>

                  {/* 2-Column Split: Don't Repeat vs Decision Timeline Preview */}
                  <div className="continuity-overview-grid">
                    {/* Don't Repeat This Column */}
                    <div className="panel">
                      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span className="panel-title" style={{ color: '#fca5a5' }}>
                            Don't Repeat This
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Rejected ideas and failed attempts
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('dont-repeat')}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          View All ({dontRepeatItems.length}) →
                        </button>
                      </div>

                      <div className="panel-body">
                        {isLoadingDontRepeat ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Retrieving recorded rejections...
                          </div>
                        ) : dontRepeatItems.length === 0 ? (
                          <div className="empty-continuity-state">
                            <div className="empty-continuity-title">No recorded rejected approaches</div>
                            <div className="empty-continuity-desc">
                              No rejected ideas, failed approaches, or disliked directions are currently recorded for this client.
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {dontRepeatItems.slice(0, 3).map((item) => (
                              <div key={item.id} className={`rejection-card ${item.status === 'superseded_rejection' ? 'superseded' : ''}`}>
                                <div className="rejection-header">
                                  <div className="rejection-item-text">{item.item}</div>
                                  <span className={`rejection-badge ${item.status === 'superseded_rejection' ? 'rejection-badge-superseded' : 'rejection-badge-active'}`}>
                                    {item.status === 'superseded_rejection' ? 'Superseded' : 'Active Rejection'}
                                  </span>
                                </div>
                                <div className="rejection-reason-block">
                                  <span className="rejection-reason-label">Reason:</span>
                                  {item.reason}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Decision Timeline Column */}
                    <div className="panel">
                      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span className="panel-title">Decision Timeline</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Chronological decision evolution
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('timeline')}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          View Full Timeline ({timelineDecisions.length}) →
                        </button>
                      </div>

                      <div className="panel-body">
                        {isLoadingTimeline ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Retrieving decision history...
                          </div>
                        ) : timelineDecisions.length === 0 ? (
                          <div className="empty-continuity-state">
                            <div className="empty-continuity-title">No recorded decisions</div>
                            <div className="empty-continuity-desc">
                              No explicit decisions, mandates, or approvals are currently recorded for this client.
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {timelineDecisions.slice(0, 3).map((d) => (
                              <div key={d.id} className="timeline-card">
                                <div className="timeline-card-header">
                                  <span className="timeline-date-tag">
                                    {d.date ? new Date(d.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date not recorded'}
                                  </span>
                                  <span className={`decision-status-badge ${d.status === 'current' ? 'decision-badge-current' : 'decision-badge-superseded'}`}>
                                    {d.status === 'current' ? 'Current' : 'Superseded'}
                                  </span>
                                </div>
                                <div className="decision-statement">{d.statement}</div>
                                {d.supersededBy && (
                                  <div className="decision-evolution-link">
                                    <span className="evolution-arrow">↳</span>
                                    <span>Superseded by later decision: {d.supersededBy}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transcript Ingestion Panel */}
                  <div className="panel" style={{ marginTop: '16px' }}>
                    <div className="panel-header">
                      <span className="panel-title">Client Transcripts & Source Documents</span>
                    </div>
                    <div className="panel-body">
                      <div className="upload-container">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.md"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                          id="file-upload"
                          disabled={isUploading}
                        />
                        <label htmlFor="file-upload" className={`upload-zone ${isUploading ? 'disabled' : ''}`}>
                          <div className="upload-icon">↑</div>
                          <div className="upload-prompt">
                            {isUploading ? 'Ingesting transcript into Hindsight memory...' : 'Drop meeting transcript (.txt or .md) here to retain durable context'}
                          </div>
                          <div className="upload-subtext">
                            ContextRelay synchronously parses client statements, decisions, and rejections into long-term memory.
                          </div>
                        </label>
                      </div>

                      {uploadError && <div className="alert-box alert-error" style={{ marginTop: '12px' }}>{uploadError}</div>}

                      {/* Sources Table */}
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.04em' }}>
                          INGESTED SOURCE REGISTRY ({sources.length})
                        </div>
                        {sources.length === 0 ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>
                            No transcripts uploaded for this client yet.
                          </div>
                        ) : (
                          <div className="sources-table-wrap">
                            <table className="sources-table">
                              <thead>
                                <tr>
                                  <th>File</th>
                                  <th>Status</th>
                                  <th>Size</th>
                                  <th>Ingested At</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sources.map((s) => (
                                  <tr key={s.id}>
                                    <td className="font-mono">{s.original_filename}</td>
                                    <td>
                                      <span className={`status-pill ${s.ingestion_status}`}>
                                        {s.ingestion_status.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="font-mono text-muted">{Math.round(s.size_bytes / 1024)} KB</td>
                                    <td className="font-mono text-muted">{new Date(s.created_at).toLocaleDateString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DON'T REPEAT THIS */}
              {activeTab === 'dont-repeat' && (
                <div className="feature-view-container">
                  <div className="feature-header">
                    <div className="feature-title-group">
                      <div className="feature-title">
                        <span style={{ color: '#f87171' }}>•</span>
                        Don't Repeat This: Client Rejections & Failed Approaches
                      </div>
                      <div className="feature-subtitle">
                        Identifies client-specific rejected ideas, failed attempts, and disliked technologies so the next account manager avoids repeating past mistakes.
                      </div>
                    </div>
                    <button
                      onClick={() => loadDontRepeat(selectedClient.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px' }}
                      disabled={isLoadingDontRepeat}
                    >
                      {isLoadingDontRepeat ? 'Refreshing...' : 'Refresh Rejections'}
                    </button>
                  </div>

                  {dontRepeatError && <div className="alert-box alert-error">{dontRepeatError}</div>}

                  {isLoadingDontRepeat ? (
                    <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Querying Hindsight long-term memory for rejected approaches...
                    </div>
                  ) : dontRepeatItems.length === 0 ? (
                    <div className="empty-continuity-state">
                      <div className="empty-continuity-title">No recorded rejected approaches were found for this client.</div>
                      <div className="empty-continuity-desc">
                        No meeting transcripts have recorded any explicit client rejections, dislikes, or failed attempts for this workspace.
                      </div>
                    </div>
                  ) : (
                    <div className="dont-repeat-list">
                      {dontRepeatItems.map((item) => {
                        const isExpanded = !!expandedRejectionEvidence[item.id];
                        return (
                          <div
                            key={item.id}
                            className={`rejection-card ${item.status === 'superseded_rejection' ? 'superseded' : ''}`}
                          >
                            <div className="rejection-header">
                              <div className="rejection-item-text">{item.item}</div>
                              <span
                                className={`rejection-badge ${
                                  item.status === 'superseded_rejection'
                                    ? 'rejection-badge-superseded'
                                    : 'rejection-badge-active'
                                }`}
                              >
                                {item.status === 'superseded_rejection'
                                  ? 'Superseded Rejection'
                                  : 'Active Prohibition'}
                              </span>
                            </div>

                            <div className="rejection-reason-block">
                              <span className="rejection-reason-label">Why:</span>
                              <span>{item.reason}</span>
                            </div>

                            {item.currentStatusNote && (
                              <div className="rejection-status-note">
                                ↳ {item.currentStatusNote}
                              </div>
                            )}

                            <div className="evidence-meta" style={{ marginTop: '10px' }}>
                              <span className="evidence-meta-pill">
                                When: {item.date ? new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date not recorded'}
                              </span>
                              <span className="evidence-meta-pill">Source: {item.source}</span>
                              <button
                                onClick={() =>
                                  setExpandedRejectionEvidence((prev) => ({
                                    ...prev,
                                    [item.id]: !prev[item.id],
                                  }))
                                }
                                className="btn btn-secondary"
                                style={{ fontSize: '10.5px', padding: '2px 6px', height: 'auto' }}
                              >
                                {isExpanded ? 'Hide Evidence Quote' : 'View Source Quote'}
                              </button>
                            </div>

                            {isExpanded && item.evidenceQuote && (
                              <div className="evidence-quote" style={{ marginTop: '10px' }}>
                                "{item.evidenceQuote}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DECISION TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="feature-view-container">
                  <div className="feature-header">
                    <div className="feature-title-group">
                      <div className="feature-title">
                        <span>•</span>
                        Decision Timeline: Chronological Evolution
                      </div>
                      <div className="feature-subtitle">
                        Tracks how client technical, operational, and architectural decisions evolved over time, highlighting when earlier decisions were superseded.
                      </div>
                    </div>
                    <button
                      onClick={() => loadTimeline(selectedClient.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px' }}
                      disabled={isLoadingTimeline}
                    >
                      {isLoadingTimeline ? 'Refreshing...' : 'Refresh Timeline'}
                    </button>
                  </div>

                  {timelineError && <div className="alert-box alert-error">{timelineError}</div>}

                  {isLoadingTimeline ? (
                    <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Retrieving chronological decisions from Hindsight...
                    </div>
                  ) : timelineDecisions.length === 0 ? (
                    <div className="empty-continuity-state">
                      <div className="empty-continuity-title">No recorded decisions found for this client.</div>
                      <div className="empty-continuity-desc">
                        No meeting transcripts have recorded any explicit technical or governance decisions for this client account.
                      </div>
                    </div>
                  ) : (
                    <div className="timeline-container">
                      <div className="timeline-track-line" />
                      {timelineDecisions.map((d, index) => {
                        const isExpanded = !!expandedTimelineEvidence[d.id];
                        return (
                          <div key={d.id} className="timeline-node">
                            <span
                              className={`timeline-marker-dot ${
                                d.status === 'current' ? 'current' : 'superseded'
                              }`}
                            />
                            <div className="timeline-card">
                              <div className="timeline-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="timeline-date-tag">
                                    {d.date
                                      ? new Date(d.date).toLocaleDateString(undefined, {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                        })
                                      : 'Date not recorded in memory'}
                                  </span>
                                  {d.topic && (
                                    <span className="evidence-meta-pill" style={{ color: '#93c5fd' }}>
                                      {d.topic}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`decision-status-badge ${
                                    d.status === 'current'
                                      ? 'decision-badge-current'
                                      : 'decision-badge-superseded'
                                  }`}
                                >
                                  {d.status === 'current' ? 'Current Known Decision' : 'Superseded'}
                                </span>
                              </div>

                              <div className="decision-statement">{d.statement}</div>

                              {d.supersededBy && (
                                <div className="decision-evolution-link">
                                  <span className="evolution-arrow">↳</span>
                                  <span>Superseded by later decision: "{d.supersededBy}"</span>
                                </div>
                              )}

                              {d.supersedes && (
                                <div className="decision-evolution-link" style={{ color: '#4ade80' }}>
                                  <span className="evolution-arrow">↳</span>
                                  <span>Supersedes prior decision: "{d.supersedes}"</span>
                                </div>
                              )}

                              <div className="evidence-meta" style={{ marginTop: '10px' }}>
                                <span className="evidence-meta-pill">Source: {d.source}</span>
                                <button
                                  onClick={() =>
                                    setExpandedTimelineEvidence((prev) => ({
                                      ...prev,
                                      [d.id]: !prev[d.id],
                                    }))
                                  }
                                  className="btn btn-secondary"
                                  style={{ fontSize: '10.5px', padding: '2px 6px', height: 'auto' }}
                                >
                                  {isExpanded ? 'Hide Supporting Evidence' : 'View Supporting Evidence'}
                                </button>
                              </div>

                              {isExpanded && d.supportingQuote && (
                                <div className="evidence-quote" style={{ marginTop: '8px' }}>
                                  "{d.supportingQuote}"
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HANDOFF BRIEF */}
              {activeTab === 'handoff' && (
                <div className="feature-view-container">
                  <div className="feature-header">
                    <div className="feature-title-group">
                      <div className="feature-title">
                        <span>•</span>
                        Account Continuity Handover Brief
                      </div>
                      <div className="feature-subtitle">
                        Executive handover dossier for incoming account managers inheriting this account, synthesized from real recalled Hindsight memories.
                      </div>
                    </div>
                    <button
                      onClick={handleGenerateHandoff}
                      className="btn btn-primary"
                      disabled={isGeneratingHandoff}
                    >
                      {isGeneratingHandoff ? 'Synthesizing Brief...' : 'Generate / Refresh Brief'}
                    </button>
                  </div>

                  {/* Cross-Link Bar linking all three features */}
                  <div className="handoff-cross-link-bar">
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center', fontWeight: 600 }}>
                      CONTINUITY DEEP DIVES:
                    </span>
                    <button
                      onClick={() => setActiveTab('dont-repeat')}
                      className="handoff-cross-link-btn"
                    >
                      <span>🚫</span>
                      <span>Review Don't Repeat This ({dontRepeatItems.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className="handoff-cross-link-btn"
                    >
                      <span>⏱️</span>
                      <span>Explore Decision Timeline ({timelineDecisions.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('query')}
                      className="handoff-cross-link-btn"
                    >
                      <span>💬</span>
                      <span>Ask Targeted Question</span>
                    </button>
                  </div>

                  {handoffError && <div className="alert-box alert-error">{handoffError}</div>}

                  {isGeneratingHandoff ? (
                    <div className="panel" style={{ padding: '60px 40px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                        Compiling Account Handover Dossier...
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '420px', margin: 'auto' }}>
                        Retrieving decisions, rejections, stakeholder authorities, and constraints from Hindsight memory bank.
                      </div>
                    </div>
                  ) : handoffResult ? (
                    <div>
                      {handoffResult.hasEvidence ? (
                        <div className="panel" style={{ borderLeft: '3px solid #3b82f6' }}>
                          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="panel-title">
                              HANDOVER DOSSIER: {handoffResult.clientName}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(handoffResult.brief);
                                alert('Handover brief copied to clipboard');
                              }}
                              className="btn btn-secondary"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              Copy Dossier
                            </button>
                          </div>
                          <div className="panel-body">
                            <div className="answer-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.65' }}>
                              {handoffResult.brief}
                            </div>

                            {/* Evidence Drawer for Handoff */}
                            <div className="evidence-section" style={{ marginTop: '24px' }}>
                              <div
                                onClick={() => setExpandedHandoffEvidence(!expandedHandoffEvidence)}
                                className="evidence-header"
                              >
                                <div className="evidence-title">
                                  <span>{expandedHandoffEvidence ? '▾' : '▸'}</span>
                                  <span>VERIFIABLE EVIDENCE AUDIT TRAIL</span>
                                </div>
                                <span className="evidence-count-tag">
                                  {handoffResult.evidence.length} RECALLED FACTS
                                </span>
                              </div>

                              {expandedHandoffEvidence && (
                                <div className="evidence-list">
                                  {handoffResult.evidence.map((ev, i) => (
                                    <div key={ev.id || i} className="evidence-item">
                                      <div className="evidence-item-fact">{ev.text}</div>
                                      <div className="evidence-meta">
                                        <span className="evidence-meta-pill">Type: {ev.type}</span>
                                        {ev.occurredStart && (
                                          <span className="evidence-meta-pill">Date: {ev.occurredStart}</span>
                                        )}
                                        {ev.documentId && (
                                          <span className="evidence-meta-pill">Document: {ev.documentId}</span>
                                        )}
                                      </div>
                                      {ev.sourceChunk && (
                                        <div className="evidence-quote">
                                          "{ev.sourceChunk.trim()}"
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="empty-continuity-state">
                          <div className="empty-continuity-title">No client memory recorded</div>
                          <div className="empty-continuity-desc">
                            {handoffResult.message || 'No relevant stored client memory found to generate a handoff brief. Please ingest meeting transcripts first.'}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-continuity-state">
                      <div className="empty-continuity-title">Handover Brief Not Yet Prepared</div>
                      <div className="empty-continuity-desc">
                        Click "Generate / Refresh Brief" to synthesize an executive briefing covering active decisions, stakeholder roles, and what the client rejected.
                      </div>
                      <button
                        onClick={handleGenerateHandoff}
                        className="btn btn-primary"
                        style={{ marginTop: '12px' }}
                      >
                        Prepare Handoff Brief Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ASK MEMORY (CONTINUITY QUERY) */}
              {activeTab === 'query' && (
                <div className="feature-view-container">
                  <div className="feature-header">
                    <div className="feature-title-group">
                      <div className="feature-title">
                        <span>•</span>
                        Ask Memory: Targeted Continuity Queries
                      </div>
                      <div className="feature-subtitle">
                        Ask specific questions about past client decisions, constraints, or agreements. Strictly grounded in Hindsight evidence.
                      </div>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-body">
                      <form onSubmit={handleQuerySubmit}>
                        <div className="input-group">
                          <label className="input-label">Query Client Memory</label>
                          <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="e.g. What database did Sarah approve? What did the client reject in kickoff?"
                            rows={3}
                            className="input-textarea"
                            disabled={isQuerying}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Answers are strictly synthesized from recalled evidence.
                          </span>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isQuerying || !question.trim()}
                          >
                            {isQuerying ? 'Recalling...' : 'Query Memory'}
                          </button>
                        </div>
                      </form>

                      {/* Suggested continuity queries */}
                      <div className="continuity-prompts">
                        <span className="continuity-prompts-label">SUGGESTED CONTINUITY QUESTIONS:</span>
                        <div className="continuity-prompts-list">
                          <button
                            type="button"
                            onClick={() => setQuestion('What database was approved or changed across our meetings?')}
                            className="continuity-chip"
                          >
                            What database was approved or changed?
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuestion('Who has final approval authority for budget changes versus design deliverables?')}
                            className="continuity-chip"
                          >
                            Who has budget vs deliverable sign-off?
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuestion('What technical approaches or tools did the client explicitly reject?')}
                            className="continuity-chip"
                          >
                            What tools did the client reject?
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuestion('Did the portal launch timeline or beta date change?')}
                            className="continuity-chip"
                          >
                            Did the launch date change?
                          </button>
                        </div>
                      </div>

                      {queryError && <div className="alert-box alert-error" style={{ marginTop: '14px' }}>{queryError}</div>}

                      {/* Answer Card */}
                      {queryResult && (
                        <div className="answer-card panel" style={{ marginTop: '20px' }}>
                          <div className="panel-body">
                            <div className="answer-header">
                              <span className="answer-title">GROUNDED CONTINUITY RESPONSE</span>
                              <span className={`status-pill ${queryResult.hasEvidence ? 'stored' : 'failed'}`}>
                                {queryResult.hasEvidence ? 'EVIDENCE FOUND' : 'NO RECORDED MEMORY'}
                              </span>
                            </div>
                            <div className="answer-text">{queryResult.answer}</div>

                            {/* Verifiable Evidence Drawer */}
                            {queryResult.hasEvidence && (
                              <div className="evidence-section">
                                <div
                                  onClick={() => setExpandedQueryEvidence(!expandedQueryEvidence)}
                                  className="evidence-header"
                                >
                                  <div className="evidence-title">
                                    <span>{expandedQueryEvidence ? '▾' : '▸'}</span>
                                    <span>VERIFIABLE EVIDENCE DRAWER</span>
                                  </div>
                                  <span className="evidence-count-tag">
                                    {queryResult.evidence.length} STORED FACTS
                                  </span>
                                </div>

                                {expandedQueryEvidence && (
                                  <div className="evidence-list">
                                    {queryResult.evidence.map((item, idx) => (
                                      <div key={item.id || idx} className="evidence-item">
                                        <div className="evidence-item-fact">{item.text}</div>
                                        <div className="evidence-meta">
                                          <span className="evidence-meta-pill">Type: {item.type}</span>
                                          {item.occurredStart && (
                                            <span className="evidence-meta-pill">Date: {item.occurredStart}</span>
                                          )}
                                          {item.documentId && (
                                            <span className="evidence-meta-pill">Document: {item.documentId}</span>
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
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-hero">
            <div className="empty-hero-icon">CR</div>
            <h2 className="empty-hero-title">Select a Client Account to Begin</h2>
            <p className="empty-hero-desc">
              ContextRelay maintains durable client institutional memory across account manager transitions.
              Register or select a client workspace on the left to review historical decisions, rejected approaches, and handover briefs.
            </p>
            <div className="empty-hero-points">
              <div className="empty-hero-point-item">
                <span className="empty-hero-point-bullet" />
                <span>Isolated Hindsight memory banks guarantee zero cross-client context leakage.</span>
              </div>
              <div className="empty-hero-point-item">
                <span className="empty-hero-point-bullet" />
                <span>Automatic extraction of explicit client preferences, decisions, and rejections.</span>
              </div>
              <div className="empty-hero-point-item">
                <span className="empty-hero-point-bullet" />
                <span>Strictly grounded LLM responses backed by verifiable transcript evidence.</span>
              </div>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Register First Client
            </button>
          </div>
        )}
      </main>

      {/* Register Client Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Register Client Workspace</h3>
            <p className="modal-desc">
              Each client receives a dedicated, isolated Hindsight memory bank to ensure strict confidentiality.
            </p>
            <form onSubmit={handleCreateClient}>
              <div className="input-group">
                <label className="input-label">Client Name</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Acme Corporation, Meridian Health"
                  className="input-text"
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={isCreatingClient}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreatingClient || !newClientName.trim()}
                >
                  {isCreatingClient ? 'Registering...' : 'Register Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

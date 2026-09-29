'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  ArrowRight,
  Clock,
  Ban,
  MessageSquare,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

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

// Reusable Presentation Components
function ErrorBanner({
  message = "Couldn't load memory for this client",
  detail,
  onRetry,
}: {
  message?: string;
  detail?: string | null;
  onRetry?: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  if (!detail) return null;

  return (
    <div className="alert-error-box" role="alert">
      <div className="alert-error-main">
        <div className="alert-error-text">
          <AlertCircle size={16} />
          <span>{message}</span>
        </div>
        <div className="alert-error-actions">
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm">
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDetail(!showDetail)}
            className="btn btn-subtle btn-sm"
          >
            {showDetail ? 'Hide details' : 'Show details'}
          </button>
        </div>
      </div>
      {showDetail && (
        <div className="alert-error-details">
          {detail}
        </div>
      )}
    </div>
  );
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-container" aria-label="Loading data">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  );
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

  // Copy status for Bank ID and Dossier
  const [copiedBankId, setCopiedBankId] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

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

  function handleCopyBankId(bankId: string) {
    navigator.clipboard.writeText(bankId);
    setCopiedBankId(true);
    setTimeout(() => setCopiedBankId(false), 2000);
  }

  function handleCopyBrief(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-title">
            <span className="brand-logo-icon">CR</span>
            <span>ContextRelay</span>
          </div>
          <div className="brand-tagline">
            Client context that survives the person.
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-label">Client accounts</div>
          <div className="client-list">
            {isLoadingClients ? (
              <div style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Loading accounts...
              </div>
            ) : clients.length === 0 ? (
              <div style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                No clients registered.
              </div>
            ) : (
              clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClientId(c.id)}
                  className={`client-nav-btn ${selectedClientId === c.id ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span className="client-avatar-glyph">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span className="client-badge-status">Memory active</span>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-secondary sidebar-register-btn"
          >
            <Plus size={14} />
            <span>Register new client</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">
            <div>Memory engine: Hindsight</div>
            <div>Isolation: per-client bank</div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-content">
        {selectedClient ? (
          <>
            {/* Header Card */}
            <header className="workspace-header">
              <div className="workspace-title-row">
                <div className="workspace-title-group">
                  <div className="workspace-title-line">
                    <h1 className="workspace-client-name">{selectedClient.name}</h1>
                    <span className="pill-connected">
                      <span className="pill-dot" />
                      Connected
                    </span>
                  </div>
                  <div className="workspace-bank-meta">
                    <span>Memory bank:</span>
                    <span className="workspace-bank-id-text" title={selectedClient.hindsight_bank_id}>
                      {selectedClient.hindsight_bank_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyBankId(selectedClient.hindsight_bank_id)}
                      className="copy-bank-btn"
                      title="Copy bank ID"
                    >
                      {copiedBankId ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedBankId ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="workspace-actions">
                  <button
                    type="button"
                    onClick={() => {
                      loadDontRepeat(selectedClient.id);
                      loadTimeline(selectedClient.id);
                    }}
                    className="btn btn-secondary"
                    title="Refresh memory records"
                  >
                    <RefreshCw size={14} />
                    <span>Refresh memory</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('handoff');
                      handleGenerateHandoff();
                    }}
                    className="btn btn-primary"
                    disabled={isGeneratingHandoff}
                  >
                    {isGeneratingHandoff ? (
                      <>
                        <span className="spinner" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        <span>Prepare handoff brief</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Underline Tabs */}
              <div className="tabs-nav" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'overview'}
                  onClick={() => setActiveTab('overview')}
                  className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                >
                  Continuity overview
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'dont-repeat'}
                  onClick={() => setActiveTab('dont-repeat')}
                  className={`tab-btn ${activeTab === 'dont-repeat' ? 'active' : ''}`}
                >
                  <span>Don't repeat this</span>
                  {dontRepeatItems.length > 0 && (
                    <span className="tab-counter-badge">{dontRepeatItems.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'timeline'}
                  onClick={() => setActiveTab('timeline')}
                  className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                >
                  <span>Decision timeline</span>
                  {timelineDecisions.length > 0 && (
                    <span className="tab-counter-badge">{timelineDecisions.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'handoff'}
                  onClick={() => setActiveTab('handoff')}
                  className={`tab-btn ${activeTab === 'handoff' ? 'active' : ''}`}
                >
                  Handoff brief
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'query'}
                  onClick={() => setActiveTab('query')}
                  className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
                >
                  Ask memory
                </button>
              </div>
            </header>

            {/* General Error Alert */}
            {generalError && (
              <ErrorBanner
                message="Couldn't load client data"
                detail={generalError}
                onRetry={fetchClients}
              />
            )}

            {/* TAB 1: CONTINUITY OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="feature-view-container">
                <div className="overview-action-banner">
                  <div>
                    <h2 className="overview-banner-title">
                      Client continuity workspace: {selectedClient.name}
                    </h2>
                    <p className="overview-banner-subtitle">
                      Preserves durable account history, past technical decisions, and rejected approaches so incoming account managers never start from zero.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('handoff');
                      handleGenerateHandoff();
                    }}
                    className="btn btn-primary"
                    disabled={isGeneratingHandoff}
                  >
                    <span>Prepare full handoff brief</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* 2-Column Split: Don't Repeat vs Decision Timeline */}
                <div className="continuity-overview-grid">
                  {/* Left Column: Don't Repeat This Preview */}
                  <div className="panel">
                    <div className="panel-header">
                      <div className="panel-header-left">
                        <h3 className="panel-title">Don't repeat this</h3>
                        <p className="panel-subtitle">Rejected ideas and failed attempts</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('dont-repeat')}
                        className="btn btn-secondary btn-sm"
                      >
                        View all ({dontRepeatItems.length})
                      </button>
                    </div>

                    <div className="panel-body">
                      {isLoadingDontRepeat ? (
                        <SkeletonRows count={3} />
                      ) : dontRepeatError ? (
                        <ErrorBanner
                          message="Couldn't load rejected approaches"
                          detail={dontRepeatError}
                          onRetry={() => loadDontRepeat(selectedClient.id)}
                        />
                      ) : dontRepeatItems.length === 0 ? (
                        <div className="empty-state">
                          <h4 className="empty-state-title">No recorded rejected approaches</h4>
                          <p className="empty-state-desc">
                            No rejected ideas, failed approaches, or disliked directions are currently recorded for this client.
                          </p>
                          <label htmlFor="overview-file-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                            Add meeting notes to start building memory
                          </label>
                        </div>
                      ) : (
                        <div className="dont-repeat-list">
                          {dontRepeatItems.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={`rejection-card ${item.status === 'superseded_rejection' ? 'superseded' : ''}`}
                            >
                              <div className="rejection-header">
                                <span className="rejection-item-text">{item.item}</span>
                                <span
                                  className={`rejection-badge ${
                                    item.status === 'superseded_rejection'
                                      ? 'rejection-badge-superseded'
                                      : 'rejection-badge-active'
                                  }`}
                                >
                                  {item.status === 'superseded_rejection' ? 'Superseded' : 'Active rejection'}
                                </span>
                              </div>
                              <div className="rejection-reason-block">
                                <span className="rejection-reason-label">Reason:</span>
                                <span>{item.reason}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Decision Timeline Preview */}
                  <div className="panel">
                    <div className="panel-header">
                      <div className="panel-header-left">
                        <h3 className="panel-title">Decision timeline</h3>
                        <p className="panel-subtitle">Chronological decision evolution</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('timeline')}
                        className="btn btn-secondary btn-sm"
                      >
                        View full timeline ({timelineDecisions.length})
                      </button>
                    </div>

                    <div className="panel-body">
                      {isLoadingTimeline ? (
                        <SkeletonRows count={3} />
                      ) : timelineError ? (
                        <ErrorBanner
                          message="Couldn't load decision timeline"
                          detail={timelineError}
                          onRetry={() => loadTimeline(selectedClient.id)}
                        />
                      ) : timelineDecisions.length === 0 ? (
                        <div className="empty-state">
                          <h4 className="empty-state-title">No recorded decisions</h4>
                          <p className="empty-state-desc">
                            No explicit decisions, mandates, or approvals are currently recorded for this client.
                          </p>
                          <label htmlFor="overview-file-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                            Add meeting notes to start building memory
                          </label>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {timelineDecisions.slice(0, 3).map((d) => (
                            <div key={d.id} className="timeline-card">
                              <div className="timeline-card-header">
                                <span className="timeline-date-tag">
                                  {d.date
                                    ? new Date(d.date).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })
                                    : 'Date not recorded'}
                                </span>
                                <span
                                  className={`decision-status-badge ${
                                    d.status === 'current'
                                      ? 'decision-badge-current'
                                      : 'decision-badge-superseded'
                                  }`}
                                >
                                  {d.status === 'current' ? 'Current' : 'Superseded'}
                                </span>
                              </div>
                              <div className="decision-statement">{d.statement}</div>
                              {d.supersededBy && (
                                <div className="decision-evolution-link">
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

                {/* Transcripts and Ingestion Panel */}
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-header-left">
                      <h3 className="panel-title">Client transcripts and source documents</h3>
                      <p className="panel-subtitle">Upload transcripts to build durable institutional memory</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="upload-container">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        id="overview-file-upload"
                        disabled={isUploading}
                      />
                      <label htmlFor="overview-file-upload" className={`upload-zone ${isUploading ? 'disabled' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                          <UploadCloud size={24} color="var(--primary)" />
                        </div>
                        <div className="upload-prompt">
                          {isUploading
                            ? 'Ingesting transcript into Hindsight memory...'
                            : 'Drop meeting transcript (.txt or .md) here to retain durable context'}
                        </div>
                        <div className="upload-subtext">
                          ContextRelay synchronously parses client statements, decisions, and rejections into long-term memory.
                        </div>
                      </label>
                    </div>

                    {uploadError && (
                      <div style={{ marginTop: '12px' }}>
                        <ErrorBanner
                          message="Transcript ingestion failed"
                          detail={uploadError}
                        />
                      </div>
                    )}

                    {/* Sources Table */}
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Ingested source registry ({sources.length})
                      </div>
                      {sources.length === 0 ? (
                        <div className="empty-state" style={{ padding: '24px' }}>
                          <p className="empty-state-desc" style={{ margin: 0 }}>
                            No transcripts uploaded for this client yet.
                          </p>
                        </div>
                      ) : (
                        <div className="sources-table-wrap">
                          <table className="sources-table">
                            <thead>
                              <tr>
                                <th>File</th>
                                <th>Status</th>
                                <th>Size</th>
                                <th>Ingested at</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sources.map((s) => (
                                <tr key={s.id}>
                                  <td className="font-mono">{s.original_filename}</td>
                                  <td>
                                    <span className={`status-pill ${s.ingestion_status}`}>
                                      {s.ingestion_status === 'stored'
                                        ? 'Stored'
                                        : s.ingestion_status === 'processing'
                                        ? 'Processing'
                                        : 'Failed'}
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
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-header-left">
                      <h2 className="panel-title">Don't repeat this: client rejections and failed approaches</h2>
                      <p className="panel-subtitle">
                        Identifies client-specific rejected ideas, failed attempts, and disliked technologies so the next account manager avoids repeating past mistakes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadDontRepeat(selectedClient.id)}
                      className="btn btn-secondary btn-sm"
                      disabled={isLoadingDontRepeat}
                    >
                      <RefreshCw size={13} />
                      <span>{isLoadingDontRepeat ? 'Refreshing...' : 'Refresh rejections'}</span>
                    </button>
                  </div>

                  <div className="panel-body">
                    {dontRepeatError && (
                      <ErrorBanner
                        message="Couldn't load memory for this client"
                        detail={dontRepeatError}
                        onRetry={() => loadDontRepeat(selectedClient.id)}
                      />
                    )}

                    {isLoadingDontRepeat ? (
                      <SkeletonRows count={4} />
                    ) : dontRepeatError ? null : dontRepeatItems.length === 0 ? (
                      <div className="empty-state">
                        <h3 className="empty-state-title">No recorded rejected approaches</h3>
                        <p className="empty-state-desc">
                          Add meeting notes to start building memory. No meeting transcripts have recorded any explicit client rejections, dislikes, or failed attempts for this workspace.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('overview')}
                          className="btn btn-secondary btn-sm"
                        >
                          Upload transcripts in overview
                        </button>
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
                                <span className="rejection-item-text">{item.item}</span>
                                <span
                                  className={`rejection-badge ${
                                    item.status === 'superseded_rejection'
                                      ? 'rejection-badge-superseded'
                                      : 'rejection-badge-active'
                                  }`}
                                >
                                  {item.status === 'superseded_rejection'
                                    ? 'Superseded rejection'
                                    : 'Active prohibition'}
                                </span>
                              </div>

                              <div className="rejection-reason-block">
                                <span className="rejection-reason-label">Why:</span>
                                <span>{item.reason}</span>
                              </div>

                              {item.currentStatusNote && (
                                <div className="rejection-status-note">
                                  {item.currentStatusNote}
                                </div>
                              )}

                              <div className="evidence-meta" style={{ marginTop: '6px' }}>
                                <span className="evidence-meta-pill">
                                  Date: {item.date ? new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date not recorded'}
                                </span>
                                <span className="evidence-meta-pill">Source: {item.source}</span>
                                {item.evidenceQuote && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRejectionEvidence((prev) => ({
                                        ...prev,
                                        [item.id]: !prev[item.id],
                                      }))
                                    }
                                    className="btn btn-subtle btn-sm"
                                  >
                                    {isExpanded ? 'Hide evidence quote' : 'View source quote'}
                                  </button>
                                )}
                              </div>

                              {isExpanded && item.evidenceQuote && (
                                <div className="evidence-quote">
                                  "{item.evidenceQuote}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DECISION TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="feature-view-container">
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-header-left">
                      <h2 className="panel-title">Decision timeline: chronological evolution</h2>
                      <p className="panel-subtitle">
                        Tracks how client technical, operational, and architectural decisions evolved over time, highlighting when earlier decisions were superseded.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadTimeline(selectedClient.id)}
                      className="btn btn-secondary btn-sm"
                      disabled={isLoadingTimeline}
                    >
                      <RefreshCw size={13} />
                      <span>{isLoadingTimeline ? 'Refreshing...' : 'Refresh timeline'}</span>
                    </button>
                  </div>

                  <div className="panel-body">
                    {timelineError && (
                      <ErrorBanner
                        message="Couldn't load memory for this client"
                        detail={timelineError}
                        onRetry={() => loadTimeline(selectedClient.id)}
                      />
                    )}

                    {isLoadingTimeline ? (
                      <SkeletonRows count={4} />
                    ) : timelineError ? null : timelineDecisions.length === 0 ? (
                      <div className="empty-state">
                        <h3 className="empty-state-title">No recorded decisions</h3>
                        <p className="empty-state-desc">
                          Add meeting notes to start building memory. No meeting transcripts have recorded any explicit technical or governance decisions for this client account.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('overview')}
                          className="btn btn-secondary btn-sm"
                        >
                          Upload transcripts in overview
                        </button>
                      </div>
                    ) : (
                      <div className="timeline-container">
                        <div className="timeline-track-line" />
                        {timelineDecisions.map((d) => {
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span className="timeline-date-tag">
                                      {d.date
                                        ? new Date(d.date).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                          })
                                        : 'Date not recorded'}
                                    </span>
                                    {d.topic && (
                                      <span className="evidence-meta-pill">
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
                                    {d.status === 'current' ? 'Current known decision' : 'Superseded'}
                                  </span>
                                </div>

                                <div className="decision-statement">{d.statement}</div>

                                {d.supersededBy && (
                                  <div className="decision-evolution-link">
                                    <span>Superseded by later decision: "{d.supersededBy}"</span>
                                  </div>
                                )}

                                {d.supersedes && (
                                  <div className="decision-evolution-link">
                                    <span>Supersedes prior decision: "{d.supersedes}"</span>
                                  </div>
                                )}

                                <div className="evidence-meta" style={{ marginTop: '6px' }}>
                                  <span className="evidence-meta-pill">Source: {d.source}</span>
                                  {d.supportingQuote && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedTimelineEvidence((prev) => ({
                                          ...prev,
                                          [d.id]: !prev[d.id],
                                        }))
                                      }
                                      className="btn btn-subtle btn-sm"
                                    >
                                      {isExpanded ? 'Hide supporting evidence' : 'View supporting evidence'}
                                    </button>
                                  )}
                                </div>

                                {isExpanded && d.supportingQuote && (
                                  <div className="evidence-quote">
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
                </div>
              </div>
            )}

            {/* TAB 4: HANDOFF BRIEF */}
            {activeTab === 'handoff' && (
              <div className="feature-view-container">
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-header-left">
                      <h2 className="panel-title">Account continuity handover brief</h2>
                      <p className="panel-subtitle">
                        Executive handover dossier for incoming account managers inheriting this account, synthesized from real recalled Hindsight memories.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateHandoff}
                      className="btn btn-primary"
                      disabled={isGeneratingHandoff}
                    >
                      {isGeneratingHandoff ? (
                        <>
                          <span className="spinner" />
                          <span>Synthesizing brief...</span>
                        </>
                      ) : (
                        <span>Generate / refresh brief</span>
                      )}
                    </button>
                  </div>

                  {/* Cross-Link Bar linking features */}
                  <div className="handoff-cross-link-bar" style={{ borderBottom: '1px solid var(--border-subtle)', borderRadius: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Continuity deep dives:
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dont-repeat')}
                      className="handoff-cross-link-btn"
                    >
                      <Ban size={14} />
                      <span>Review don't repeat this ({dontRepeatItems.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('timeline')}
                      className="handoff-cross-link-btn"
                    >
                      <Clock size={14} />
                      <span>Explore decision timeline ({timelineDecisions.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('query')}
                      className="handoff-cross-link-btn"
                    >
                      <MessageSquare size={14} />
                      <span>Ask targeted question</span>
                    </button>
                  </div>

                  <div className="panel-body">
                    {handoffError && (
                      <ErrorBanner
                        message="Couldn't load memory for this client"
                        detail={handoffError}
                        onRetry={handleGenerateHandoff}
                      />
                    )}

                    {isGeneratingHandoff ? (
                      <div className="empty-state">
                        <span className="spinner" style={{ width: '24px', height: '24px', marginBottom: '12px', color: 'var(--primary)' }} />
                        <h3 className="empty-state-title">Compiling account handover dossier...</h3>
                        <p className="empty-state-desc">
                          Retrieving decisions, rejections, stakeholder authorities, and constraints from Hindsight memory bank.
                        </p>
                        <SkeletonRows count={3} />
                      </div>
                    ) : handoffError ? null : handoffResult ? (
                      <div>
                        {handoffResult.hasEvidence ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                HANDOVER DOSSIER: {handoffResult.clientName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyBrief(handoffResult.brief)}
                                className="btn btn-secondary btn-sm"
                              >
                                {copiedBrief ? <Check size={13} /> : <Copy size={13} />}
                                <span>{copiedBrief ? 'Copied to clipboard' : 'Copy dossier'}</span>
                              </button>
                            </div>

                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.65', color: 'var(--text-title)', fontSize: '14px' }}>
                              {handoffResult.brief}
                            </div>

                            {/* Evidence Drawer for Handoff */}
                            <div className="evidence-section" style={{ marginTop: '24px' }}>
                              <div
                                onClick={() => setExpandedHandoffEvidence(!expandedHandoffEvidence)}
                                className="evidence-header"
                              >
                                <div className="evidence-title">
                                  {expandedHandoffEvidence ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  <span>Verifiable evidence audit trail</span>
                                </div>
                                <span className="evidence-count-tag">
                                  {handoffResult.evidence.length} recalled facts
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
                        ) : (
                          <div className="empty-state">
                            <h3 className="empty-state-title">No client memory recorded</h3>
                            <p className="empty-state-desc">
                              {handoffResult.message || 'No relevant stored client memory found to generate a handoff brief. Please ingest meeting transcripts first.'}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <h3 className="empty-state-title">Handover brief not yet prepared</h3>
                        <p className="empty-state-desc">
                          Click "Prepare handoff brief" to synthesize an executive briefing covering active decisions, stakeholder roles, and what the client rejected.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateHandoff}
                          className="btn btn-primary"
                        >
                          Prepare handoff brief now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ASK MEMORY (CONTINUITY QUERY) */}
            {activeTab === 'query' && (
              <div className="feature-view-container">
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-header-left">
                      <h2 className="panel-title">Ask memory: targeted continuity queries</h2>
                      <p className="panel-subtitle">
                        Ask specific questions about past client decisions, constraints, or agreements. Strictly grounded in Hindsight evidence.
                      </p>
                    </div>
                  </div>

                  <div className="panel-body">
                    <form onSubmit={handleQuerySubmit}>
                      <div className="input-group">
                        <label className="input-label" htmlFor="query-input">
                          Query client memory
                        </label>
                        <textarea
                          id="query-input"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="e.g. What database did Sarah approve? What did the client reject in kickoff?"
                          rows={3}
                          className="input-textarea"
                          disabled={isQuerying}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Answers are strictly synthesized from recalled evidence.
                        </span>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={isQuerying || !question.trim()}
                        >
                          {isQuerying ? (
                            <>
                              <span className="spinner" />
                              <span>Recalling...</span>
                            </>
                          ) : (
                            <>
                              <Search size={14} />
                              <span>Ask</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Suggested Continuity Queries */}
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

                    {queryError && (
                      <div style={{ marginTop: '16px' }}>
                        <ErrorBanner
                          message="Query processing failed"
                          detail={queryError}
                          onRetry={handleQuerySubmit}
                        />
                      </div>
                    )}

                    {/* Answer Card */}
                    {queryResult && (
                      <div className="panel" style={{ marginTop: '20px', borderLeft: '3px solid var(--primary)' }}>
                        <div className="panel-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              GROUNDED CONTINUITY RESPONSE
                            </span>
                            <span className={`status-pill ${queryResult.hasEvidence ? 'stored' : 'failed'}`}>
                              {queryResult.hasEvidence ? 'Evidence found' : 'No recorded memory'}
                            </span>
                          </div>

                          <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-title)', whiteSpace: 'pre-wrap' }}>
                            {queryResult.answer}
                          </div>

                          {/* Verifiable Evidence Drawer / Sources */}
                          {queryResult.hasEvidence && (
                            <div className="evidence-section" style={{ marginTop: '20px' }}>
                              <div
                                onClick={() => setExpandedQueryEvidence(!expandedQueryEvidence)}
                                className="evidence-header"
                              >
                                <div className="evidence-title">
                                  {expandedQueryEvidence ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  <span>Sources and verifiable evidence</span>
                                </div>
                                <span className="evidence-count-tag">
                                  {queryResult.evidence.length} stored facts
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
          </>
        ) : (
          <div className="empty-hero">
            <div className="empty-hero-icon">CR</div>
            <h2 className="empty-hero-title">Select a client account to begin</h2>
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
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus size={14} />
              <span>Register first client</span>
            </button>
          </div>
        )}
      </main>

      {/* Register Client Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Register client workspace</h3>
            <p className="modal-desc">
              Each client receives a dedicated, isolated Hindsight memory bank to ensure strict confidentiality.
            </p>
            <form onSubmit={handleCreateClient}>
              <div className="input-group">
                <label className="input-label" htmlFor="new-client-name">Client name</label>
                <input
                  id="new-client-name"
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
                  {isCreatingClient ? (
                    <>
                      <span className="spinner" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register workspace</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

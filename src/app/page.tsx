'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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
  Pin,
  MoreVertical,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  X,
  FileUp,
  LayoutDashboard,
  Users,
  Edit2,
  Download,
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

const sectionTitles: Record<ContinuityTab, string> = {
  overview: 'Continuity overview',
  'dont-repeat': "Don't repeat this",
  timeline: 'Decision timeline',
  handoff: 'Handoff brief',
  query: 'Ask memory',
};

// Compact Error Alert
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

// Skeleton Loader
function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-container" aria-label="Loading data">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  );
}

export default function VioraApp() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createClientError, setCreateClientError] = useState<string | null>(null);

  // Clients Popup state
  const [isClientsPopupOpen, setIsClientsPopupOpen] = useState(false);
  const [popupSearchQuery, setPopupSearchQuery] = useState('');
  const [openClientMenuId, setOpenClientMenuId] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  // Edit Client Modal state
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientError, setEditClientError] = useState<string | null>(null);

  // Delete Source state
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const [isDeletingSource, setIsDeletingSource] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Collapsible sidebar state with localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return (localStorage.getItem('viora_sidebar_collapsed') || localStorage.getItem('contextrelay_sidebar_collapsed')) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Pinned clients with localStorage
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('viora_pinned_clients') || localStorage.getItem('contextrelay_pinned_clients');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Tab state (Active Sidebar Item)
  const [activeTab, setActiveTab] = useState<ContinuityTab>('overview');

  // Notes / Document Input state
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [noteSourceType, setNoteSourceType] = useState('Meeting');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSuccessMsg, setNoteSuccessMsg] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const noteFileInputRef = useRef<HTMLInputElement>(null);

  // Feature 1: Don't Repeat This state
  const [dontRepeatItems, setDontRepeatItems] = useState<RejectedItem[]>([]);
  const [dontRepeatEvidence, setDontRepeatEvidence] = useState<EvidenceItem[]>([]);
  const [isLoadingDontRepeat, setIsLoadingDontRepeat] = useState(false);
  const [dontRepeatError, setDontRepeatError] = useState<string | null>(null);
  const [expandedRejectionIds, setExpandedRejectionIds] = useState<Record<string, boolean>>({});

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

  // Copy status for Dossier
  const [copiedBrief, setCopiedBrief] = useState(false);

  // Close menus on Esc key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsClientsPopupOpen(false);
        setOpenClientMenuId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchSources(selectedClientId);
      setQueryResult(null);
      setQueryError(null);
      setNoteError(null);
      setNoteSuccessMsg(null);
      setHandoffResult(null);
      setHandoffError(null);
      setDontRepeatItems([]);
      setDontRepeatEvidence([]);
      setTimelineDecisions([]);
      setTimelineEvidence([]);
      setExpandedRejectionIds({});
      setExpandedTimelineEvidence({});

      loadDontRepeat(selectedClientId);
      loadTimeline(selectedClientId);
    } else {
      setSources([]);
      setDontRepeatItems([]);
      setTimelineDecisions([]);
    }
  }, [selectedClientId]);

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('viora_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  function togglePinClient(clientId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId];
      try {
        localStorage.setItem('viora_pinned_clients', JSON.stringify(next));
      } catch {}
      return next;
    });
  }

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
    setCreateClientError(null);
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
      setCreateClientError(null);
      setShowCreateModal(false);
      setIsClientsPopupOpen(false);
    } catch (err: any) {
      setCreateClientError(err.message || 'Failed to create client workspace');
      setGeneralError(err.message);
    } finally {
      setIsCreatingClient(false);
    }
  }

  async function confirmDeleteClient() {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    try {
      const res = await fetch(`/api/clients?clientId=${encodeURIComponent(clientToDelete.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete client');
      }

      const remaining = clients.filter((c) => c.id !== clientToDelete.id);
      setClients(remaining);
      setPinnedIds((prev) => {
        const next = prev.filter((id) => id !== clientToDelete.id);
        try {
          localStorage.setItem('viora_pinned_clients', JSON.stringify(next));
        } catch {}
        return next;
      });

      if (selectedClientId === clientToDelete.id) {
        setSelectedClientId(remaining.length > 0 ? remaining[0].id : null);
      }
      setClientToDelete(null);
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsDeletingClient(false);
    }
  }

  async function handleUpdateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!clientToEdit) return;
    const name = editClientName.trim();
    if (!name) return;

    setIsEditingClient(true);
    setEditClientError(null);
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientToEdit.id, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update client name');

      const updated = data.client as Client;
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setClientToEdit(null);
      setEditClientName('');
    } catch (err: any) {
      setEditClientError(err.message || 'Failed to update client name');
    } finally {
      setIsEditingClient(false);
    }
  }

  async function confirmDeleteSource() {
    if (!sourceToDelete) return;
    setIsDeletingSource(true);
    try {
      const res = await fetch(`/api/sources?sourceId=${encodeURIComponent(sourceToDelete.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete source document');
      }

      setSources((prev) => prev.filter((s) => s.id !== sourceToDelete.id));
      setSourceToDelete(null);
      if (selectedClientId) {
        await loadDontRepeat(selectedClientId);
        await loadTimeline(selectedClientId);
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to delete source document');
    } finally {
      setIsDeletingSource(false);
    }
  }

  async function handleExportData(format: 'json' | 'markdown' = 'json') {
    if (!selectedClientId) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/export?clientId=${encodeURIComponent(selectedClientId)}&format=${format}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to export client memory');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'markdown' ? 'md' : 'json';
      const safeName = (selectedClient?.name || 'client').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}_institutional_memory.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  }

  // Handle Top Document Input Submission
  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !selectedClientId) return;

    setIsSavingNote(true);
    setNoteError(null);
    setNoteSuccessMsg(null);

    try {
      const filename = `${noteSourceType.toLowerCase()}-${noteDate || new Date().toISOString().slice(0, 10)}.txt`;
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          filename,
          content: noteText.trim(),
          contentType: 'text/plain',
          meetingDate: noteDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save notes into client memory');

      setNoteSuccessMsg('Saved to memory and indexed into Hindsight.');
      setNoteText('');
      setTimeout(() => setNoteSuccessMsg(null), 4000);

      // Refresh memory & sources
      await fetchSources(selectedClientId);
      await loadDontRepeat(selectedClientId);
      await loadTimeline(selectedClientId);
    } catch (err: any) {
      setNoteError(err.message);
    } finally {
      setIsSavingNote(false);
    }
  }

  function handleFileToTextarea(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setNoteText(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

  async function handleQuerySubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
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

  function handleCopyBrief(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Filter clients for popup
  const filteredPopupClients = clients.filter((c) =>
    c.name.toLowerCase().includes(popupSearchQuery.toLowerCase())
  );
  const popupPinnedClients = filteredPopupClients.filter((c) => pinnedIds.includes(c.id));
  const popupUnpinnedClients = filteredPopupClients.filter((c) => !pinnedIds.includes(c.id));

  // Sort Don't Repeat items newest first
  const sortedDontRepeat = [...dontRepeatItems].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="app-container">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 1. SIDEBAR = MAIN MENU */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand-header">
          <div className="brand-title-wrap">
            <div className="brand-logo-icon">V</div>
            {!isSidebarCollapsed && (
              <div>
                <div className="brand-title-text">Viora</div>
                <div className="brand-tagline">Client context that survives the person.</div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-toggle-btn"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* 5 Vertical Navigation Menu Items */}
        <nav role="navigation" className="sidebar-nav">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            aria-current={activeTab === 'overview' ? 'page' : undefined}
            title="Continuity overview"
          >
            <div className="sidebar-nav-item-left">
              <LayoutDashboard size={16} />
              {!isSidebarCollapsed && <span>Continuity overview</span>}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dont-repeat')}
            className={`sidebar-nav-item ${activeTab === 'dont-repeat' ? 'active' : ''}`}
            aria-current={activeTab === 'dont-repeat' ? 'page' : undefined}
            title={`Don't repeat this${dontRepeatItems.length > 0 ? ` (${dontRepeatItems.length})` : ''}`}
          >
            <div className="sidebar-nav-item-left">
              <Ban size={16} />
              {!isSidebarCollapsed && <span>Don't repeat this</span>}
            </div>
            {!isSidebarCollapsed && dontRepeatItems.length > 0 && (
              <span className="sidebar-nav-counter">{dontRepeatItems.length}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`sidebar-nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
            aria-current={activeTab === 'timeline' ? 'page' : undefined}
            title={`Decision timeline${timelineDecisions.length > 0 ? ` (${timelineDecisions.length})` : ''}`}
          >
            <div className="sidebar-nav-item-left">
              <Clock size={16} />
              {!isSidebarCollapsed && <span>Decision timeline</span>}
            </div>
            {!isSidebarCollapsed && timelineDecisions.length > 0 && (
              <span className="sidebar-nav-counter">{timelineDecisions.length}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('handoff')}
            className={`sidebar-nav-item ${activeTab === 'handoff' ? 'active' : ''}`}
            aria-current={activeTab === 'handoff' ? 'page' : undefined}
            title="Handoff brief"
          >
            <div className="sidebar-nav-item-left">
              <FileText size={16} />
              {!isSidebarCollapsed && <span>Handoff brief</span>}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('query')}
            className={`sidebar-nav-item ${activeTab === 'query' ? 'active' : ''}`}
            aria-current={activeTab === 'query' ? 'page' : undefined}
            title="Ask memory"
          >
            <div className="sidebar-nav-item-left">
              <MessageSquare size={16} />
              {!isSidebarCollapsed && <span>Ask memory</span>}
            </div>
          </button>
        </nav>

        {/* 2. SIDEBAR BOTTOM: CLIENTS BUTTON & + NEW CLIENT STACKED */}
        <div className="sidebar-bottom">
          {/* a) Clients Selector Button */}
          <button
            type="button"
            onClick={() => setIsClientsPopupOpen(!isClientsPopupOpen)}
            className="sidebar-clients-btn"
            title={`Clients: ${selectedClient ? selectedClient.name : 'None'}`}
            aria-haspopup="dialog"
            aria-expanded={isClientsPopupOpen}
          >
            {!isSidebarCollapsed ? (
              <>
                <div>
                  <div className="sidebar-clients-title">Clients</div>
                  <div className="sidebar-clients-selected truncate">
                    {selectedClient ? `/ ${selectedClient.name}` : 'No client selected'}
                  </div>
                </div>
                <ChevronRight size={16} className="sidebar-clients-chevron" />
              </>
            ) : (
              <Users size={16} color="var(--primary)" />
            )}
          </button>

          {/* b) Directly Under: + New Client Full-Width Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-secondary sidebar-new-client-btn"
            title="Register new client"
          >
            <Plus size={14} />
            {!isSidebarCollapsed && <span>New client</span>}
          </button>

          {/* 1. FLOATING CLIENTS POPOVER (Anchored next to the Clients button) */}
          {isClientsPopupOpen && (
            <>
              <div
                className="popover-click-catcher"
                onClick={() => setIsClientsPopupOpen(false)}
                aria-hidden="true"
              />
              <div
                className="clients-popover-card"
                role="dialog"
                aria-label="Clients directory"
              >
                {/* Popover Header */}
                <div className="popover-header">
                  <span className="popover-title">Clients</span>
                  <button
                    type="button"
                    onClick={() => setIsClientsPopupOpen(false)}
                    className="popover-close-btn"
                    title="Close popover (Esc)"
                    aria-label="Close popover"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Popover Search */}
                <div className="popover-search-wrap">
                  <Search size={14} className="popover-search-icon" />
                  <input
                    type="text"
                    placeholder="Search clients"
                    value={popupSearchQuery}
                    onChange={(e) => setPopupSearchQuery(e.target.value)}
                    className="popover-search-input"
                    autoFocus
                  />
                </div>

                {/* Scrollable Clients List */}
                <div className="popover-clients-list">
                  {/* Pinned Group */}
                  {popupPinnedClients.length > 0 && (
                    <>
                      <div className="popover-group-label">Pinned</div>
                      {popupPinnedClients.map((c) => (
                        <div
                          key={c.id}
                          className={`popover-client-row ${selectedClientId === c.id ? 'selected' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setIsClientsPopupOpen(false);
                            }}
                            className="popover-client-btn"
                            title={c.name}
                          >
                            <span className="client-avatar-glyph">
                              {c.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate">{c.name}</span>
                          </button>

                          <div className="popover-client-actions">
                            <button
                              type="button"
                              onClick={(e) => togglePinClient(c.id, e)}
                              className="client-action-icon-btn pinned"
                              title="Unpin client"
                            >
                              <Pin size={12} fill="currentColor" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenClientMenuId(openClientMenuId === c.id ? null : c.id);
                              }}
                              className="client-action-icon-btn"
                              title="More options"
                            >
                              <MoreVertical size={13} />
                            </button>
                          </div>

                          {openClientMenuId === c.id && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '36px',
                                right: '6px',
                                background: '#FFFFFF',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                boxShadow: 'var(--shadow-dropdown)',
                                zIndex: 60,
                                padding: '4px',
                                minWidth: '120px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenClientMenuId(null);
                                  setClientToDelete(c);
                                }}
                                className="btn btn-subtle btn-sm"
                                style={{ width: '100%', justifyContent: 'flex-start', color: '#DC2626' }}
                              >
                                <Trash2 size={13} />
                                <span>Delete client</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* All / Unpinned Group */}
                  {popupUnpinnedClients.length > 0 && (
                    <>
                      <div className="popover-group-label">
                        {popupPinnedClients.length > 0 ? 'All clients' : 'Clients'}
                      </div>
                      {popupUnpinnedClients.map((c) => (
                        <div
                          key={c.id}
                          className={`popover-client-row ${selectedClientId === c.id ? 'selected' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setIsClientsPopupOpen(false);
                            }}
                            className="popover-client-btn"
                            title={c.name}
                          >
                            <span className="client-avatar-glyph">
                              {c.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate">{c.name}</span>
                          </button>

                          <div className="popover-client-actions">
                            <button
                              type="button"
                              onClick={(e) => togglePinClient(c.id, e)}
                              className="client-action-icon-btn"
                              title="Pin client to top"
                            >
                              <Pin size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenClientMenuId(openClientMenuId === c.id ? null : c.id);
                              }}
                              className="client-action-icon-btn"
                              title="More options"
                            >
                              <MoreVertical size={13} />
                            </button>
                          </div>

                          {openClientMenuId === c.id && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '36px',
                                right: '6px',
                                background: '#FFFFFF',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                boxShadow: 'var(--shadow-dropdown)',
                                zIndex: 60,
                                padding: '4px',
                                minWidth: '120px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenClientMenuId(null);
                                  setClientToEdit(c);
                                  setEditClientName(c.name);
                                  setEditClientError(null);
                                }}
                                className="btn btn-subtle btn-sm"
                                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-body)' }}
                              >
                                <Edit2 size={13} />
                                <span>Edit name</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenClientMenuId(null);
                                  setClientToDelete(c);
                                }}
                                className="btn btn-subtle btn-sm"
                                style={{ width: '100%', justifyContent: 'flex-start', color: '#DC2626' }}
                              >
                                <Trash2 size={13} />
                                <span>Delete client</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Empty state with register link */}
                  {filteredPopupClients.length === 0 && (
                    <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div>No matching clients found.</div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsClientsPopupOpen(false);
                          setShowCreateModal(true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          marginTop: '6px',
                          fontWeight: 500,
                          fontSize: '12.5px',
                        }}
                      >
                        No clients yet? Register one
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* 3. MAIN AREA WITH EXACT ORDER */}
      <main className="main-content">
        {selectedClient ? (
          <>
            {/* COMBINED TOP BLOCK: (1) Title & Actions + (2) Notes Input directly below */}
            <div className="client-top-block">
              {/* 1) Title Row */}
              <div className="client-title-row">
                <div className="client-title-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 className="client-page-title">{selectedClient.name}</h1>
                    <button
                      type="button"
                      onClick={() => {
                        setClientToEdit(selectedClient);
                        setEditClientName(selectedClient.name);
                        setEditClientError(null);
                      }}
                      className="btn btn-subtle btn-sm"
                      title="Edit client name"
                      style={{ padding: '4px 6px' }}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  <div className="client-page-subtitle">{sectionTitles[activeTab]}</div>
                </div>

                <div className="client-header-actions">
                  {/* Export Options */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleExportData('markdown')}
                      className="btn btn-secondary"
                      disabled={isExporting}
                      title="Export institutional memory as Markdown dossier"
                    >
                      <Download size={14} />
                      <span>Export MD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportData('json')}
                      className="btn btn-secondary"
                      disabled={isExporting}
                      title="Export complete memory data as JSON"
                    >
                      <Download size={14} />
                      <span>Export JSON</span>
                    </button>
                  </div>

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

              {/* 2) Compact Notes/Document Input Section */}
              <div className="quick-notes-section">
                <div className="quick-notes-label-row">
                  <label className="quick-notes-label" htmlFor="quick-notes-textarea">
                    Add meeting notes, email or document
                  </label>
                  <div>
                    <input
                      ref={noteFileInputRef}
                      type="file"
                      accept=".txt,.md"
                      onChange={handleFileToTextarea}
                      style={{ display: 'none' }}
                      id="note-file-loader"
                    />
                    <button
                      type="button"
                      onClick={() => noteFileInputRef.current?.click()}
                      className="quick-notes-upload-link"
                      title="Load text from a file into the box"
                    >
                      <FileUp size={13} />
                      <span>Upload file to fill</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveNote}>
                  <textarea
                    id="quick-notes-textarea"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Paste client call notes, decisions, emails, or rejected directions..."
                    className="quick-notes-textarea"
                    rows={3}
                    disabled={isSavingNote}
                  />

                  <div className="quick-notes-controls-row" style={{ marginTop: '8px' }}>
                    <div className="quick-notes-meta-left">
                      <input
                        type="date"
                        value={noteDate}
                        onChange={(e) => setNoteDate(e.target.value)}
                        className="quick-notes-date-input"
                        title="Date of note or meeting"
                      />
                      <select
                        value={noteSourceType}
                        onChange={(e) => setNoteSourceType(e.target.value)}
                        className="quick-notes-select"
                        title="Source type"
                      >
                        <option value="Meeting">Meeting</option>
                        <option value="Call">Call</option>
                        <option value="Email">Email</option>
                        <option value="Document">Document</option>
                        <option value="Other">Other</option>
                      </select>

                      {noteSuccessMsg && (
                        <span className="quick-notes-success-msg">
                          <Check size={13} />
                          <span>{noteSuccessMsg}</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isSavingNote || !noteText.trim()}
                    >
                      {isSavingNote ? (
                        <>
                          <span className="spinner" />
                          <span>Saving to memory...</span>
                        </>
                      ) : (
                        <span>Save to memory</span>
                      )}
                    </button>
                  </div>
                </form>

                {noteError && (
                  <div style={{ marginTop: '4px' }}>
                    <ErrorBanner
                      message="Failed to save note to memory"
                      detail={noteError}
                    />
                  </div>
                )}
              </div>
            </div>

            {generalError && (
              <ErrorBanner
                message="Couldn't load client data"
                detail={generalError}
                onRetry={fetchClients}
              />
            )}

            {/* 3) Active Section Content */}
            {/* TAB 1: CONTINUITY OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="continuity-overview-grid">
                  {/* Left Column: Don't Repeat This Preview */}
                  <div className="panel">
                    <div className="panel-header">
                      <div className="panel-header-left">
                        <h2 className="panel-title">Don't repeat this</h2>
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

                    <div className="panel-body" style={{ padding: '12px' }}>
                      {isLoadingDontRepeat ? (
                        <SkeletonRows count={3} />
                      ) : dontRepeatError ? (
                        <ErrorBanner
                          message="Couldn't load rejected approaches"
                          detail={dontRepeatError}
                          onRetry={() => loadDontRepeat(selectedClient.id)}
                        />
                      ) : sortedDontRepeat.length === 0 ? (
                        <div className="empty-state">
                          <h3 className="empty-state-title">No recorded rejected approaches</h3>
                          <p className="empty-state-desc">
                            No rejected ideas, failed approaches, or disliked directions recorded yet.
                          </p>
                        </div>
                      ) : (
                        <div className="dont-repeat-compact-list" style={{ border: 'none' }}>
                          {sortedDontRepeat.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="dont-repeat-row"
                              onClick={() => setActiveTab('dont-repeat')}
                            >
                              <div className="dont-repeat-row-header">
                                <span className="dont-repeat-subject">{item.item}</span>
                                <span
                                  className={`rejection-badge ${
                                    item.status === 'superseded_rejection'
                                      ? 'rejection-badge-superseded'
                                      : 'rejection-badge-active'
                                  }`}
                                >
                                  {item.status === 'superseded_rejection' ? 'Superseded' : 'Active'}
                                </span>
                              </div>
                              <div className="dont-repeat-overview truncated">
                                {item.reason}
                              </div>
                              <div className="dont-repeat-row-meta">
                                {item.source && <span className="tag-source">{item.source}</span>}
                                <span className="tag-date">
                                  {item.date ? new Date(item.date).toLocaleDateString() : 'Date not recorded'}
                                </span>
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
                        <h2 className="panel-title">Decision timeline</h2>
                        <p className="panel-subtitle">Chronological decision evolution</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('timeline')}
                        className="btn btn-secondary btn-sm"
                      >
                        View timeline ({timelineDecisions.length})
                      </button>
                    </div>

                    <div className="panel-body" style={{ padding: '12px' }}>
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
                          <h3 className="empty-state-title">No recorded decisions</h3>
                          <p className="empty-state-desc">
                            No explicit decisions, mandates, or approvals recorded yet.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {timelineDecisions.slice(0, 3).map((d) => (
                            <div key={d.id} className="timeline-card" style={{ padding: '10px 12px' }}>
                              <div className="timeline-card-header">
                                <span className="tag-date">
                                  {d.date ? new Date(d.date).toLocaleDateString() : 'Date not recorded'}
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
                              <div className="decision-statement">
                                {d.statement}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sources Registry Panel */}
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-header-left">
                      <h2 className="panel-title">Ingested source documents ({sources.length})</h2>
                      <p className="panel-subtitle">Meeting transcripts and client records indexed in memory</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    {sources.length === 0 ? (
                      <div className="empty-state" style={{ padding: '20px' }}>
                        <p className="empty-state-desc" style={{ margin: 0 }}>
                          No transcripts uploaded for this client yet. Use the notes input above to add content.
                        </p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>File</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Status</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Size</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Ingested at</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sources.map((s) => (
                              <tr key={s.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{s.original_filename}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: s.ingestion_status === 'stored' ? 'var(--success-bg)' : 'var(--error-bg)',
                                      color: s.ingestion_status === 'stored' ? 'var(--success-text)' : 'var(--error-text)',
                                    }}
                                  >
                                    {s.ingestion_status === 'stored' ? 'Stored' : s.ingestion_status}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                                  {Math.round(s.size_bytes / 1024)} KB
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                                  {new Date(s.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => setSourceToDelete(s)}
                                    className="btn btn-subtle btn-sm"
                                    style={{ color: '#DC2626', padding: '4px 6px' }}
                                    title="Delete transcript from memory"
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DON'T REPEAT THIS */}
            {activeTab === 'dont-repeat' && (
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-header-left">
                    <h2 className="panel-title">Don't repeat this</h2>
                    <p className="panel-subtitle">
                      Client-specific rejected ideas, failed attempts, and disliked technologies. Sorted newest first.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadDontRepeat(selectedClient.id)}
                    className="btn btn-secondary btn-sm"
                    disabled={isLoadingDontRepeat}
                  >
                    <RefreshCw size={13} />
                    <span>{isLoadingDontRepeat ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>

                <div className="panel-body" style={{ padding: sortedDontRepeat.length > 0 ? 0 : '20px' }}>
                  {dontRepeatError && (
                    <div style={{ padding: '16px' }}>
                      <ErrorBanner
                        message="Couldn't load memory for this client"
                        detail={dontRepeatError}
                        onRetry={() => loadDontRepeat(selectedClient.id)}
                      />
                    </div>
                  )}

                  {isLoadingDontRepeat ? (
                    <div style={{ padding: '16px' }}>
                      <SkeletonRows count={4} />
                    </div>
                  ) : dontRepeatError ? null : sortedDontRepeat.length === 0 ? (
                    <div className="empty-state">
                      <h3 className="empty-state-title">No recorded rejected approaches</h3>
                      <p className="empty-state-desc">
                        Add meeting notes above to start capturing rejected client approaches and preferences.
                      </p>
                    </div>
                  ) : (
                    <div className="dont-repeat-compact-list" style={{ border: 'none', borderRadius: 0 }}>
                      {sortedDontRepeat.map((item) => {
                        const isExpanded = !!expandedRejectionIds[item.id];
                        return (
                          <div
                            key={item.id}
                            className="dont-repeat-row"
                            onClick={() =>
                              setExpandedRejectionIds((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                          >
                            <div className="dont-repeat-row-header">
                              <span className="dont-repeat-subject">{item.item}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  className={`rejection-badge ${
                                    item.status === 'superseded_rejection'
                                      ? 'rejection-badge-superseded'
                                      : 'rejection-badge-active'
                                  }`}
                                >
                                  {item.status === 'superseded_rejection' ? 'Superseded' : 'Active rejection'}
                                </span>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                            </div>

                            <div className={`dont-repeat-overview ${!isExpanded ? 'truncated' : ''}`}>
                              {item.reason}
                            </div>

                            {isExpanded && item.currentStatusNote && (
                              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', background: '#F0F6FB', padding: '6px 10px', borderRadius: '4px' }}>
                                {item.currentStatusNote}
                              </div>
                            )}

                            {isExpanded && item.evidenceQuote && (
                              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', borderLeft: '2px solid var(--primary)', paddingLeft: '8px', marginTop: '4px' }}>
                                "{item.evidenceQuote}"
                              </div>
                            )}

                            <div className="dont-repeat-row-meta">
                              {item.source && <span className="tag-source">{item.source}</span>}
                              <span className="tag-date">
                                {item.date ? new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date not recorded'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DECISION TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-header-left">
                    <h2 className="panel-title">Decision timeline</h2>
                    <p className="panel-subtitle">
                      Chronological evolution of client technical, operational, and architectural decisions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadTimeline(selectedClient.id)}
                    className="btn btn-secondary btn-sm"
                    disabled={isLoadingTimeline}
                  >
                    <RefreshCw size={13} />
                    <span>{isLoadingTimeline ? 'Refreshing...' : 'Refresh'}</span>
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
                        Add meeting notes above to track decisions and mandates for this client.
                      </p>
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
                                  <span className="tag-date">
                                    {d.date
                                      ? new Date(d.date).toLocaleDateString(undefined, {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                        })
                                      : 'Date not recorded'}
                                  </span>
                                  {d.topic && <span className="tag-source">{d.topic}</span>}
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
                                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', background: '#F0F6FB', padding: '4px 8px', borderRadius: '4px' }}>
                                  Superseded by later decision: "{d.supersededBy}"
                                </div>
                              )}

                              {d.supersedes && (
                                <div style={{ fontSize: '12.5px', color: 'var(--success-text)', background: 'var(--success-bg)', padding: '4px 8px', borderRadius: '4px' }}>
                                  Supersedes prior decision: "{d.supersedes}"
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                {d.source && <span className="tag-source">Source: {d.source}</span>}
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
                                    {isExpanded ? 'Hide evidence' : 'View supporting evidence'}
                                  </button>
                                )}
                              </div>

                              {isExpanded && d.supportingQuote && (
                                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', borderLeft: '2px solid var(--primary)', paddingLeft: '8px', marginTop: '4px' }}>
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
            )}

            {/* TAB 4: HANDOFF BRIEF */}
            {activeTab === 'handoff' && (
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-header-left">
                    <h2 className="panel-title">Account continuity handover brief</h2>
                    <p className="panel-subtitle">
                      Executive handover dossier for incoming account managers inheriting this account.
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
                      <span className="spinner" style={{ width: '22px', height: '22px', marginBottom: '12px', color: 'var(--primary)' }} />
                      <h3 className="empty-state-title">Compiling account handover dossier...</h3>
                      <p className="empty-state-desc">
                        Retrieving decisions, rejections, stakeholder authorities, and constraints from Hindsight memory bank.
                      </p>
                      <SkeletonRows count={3} />
                    </div>
                  ) : handoffError ? null : handoffResult ? (
                    <div>
                      {handoffResult.hasEvidence ? (
                        <div className="handover-dossier-card">
                          <div className="handover-dossier-header">
                            <div className="handover-dossier-header-left">
                              <span className="handover-dossier-badge">
                                HANDOVER DOSSIER: {(handoffResult.clientName || selectedClient.name).toUpperCase()}
                              </span>
                              <span className="handover-dossier-meta">
                                Executive account continuity brief • Grounded in {handoffResult.evidence?.length || 0} verified facts
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyBrief(handoffResult.brief)}
                              className="btn btn-secondary btn-sm"
                              title="Copy handover dossier content"
                            >
                              {copiedBrief ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copiedBrief ? 'Copied' : 'Copy dossier'}</span>
                            </button>
                          </div>

                          <div className="handover-dossier-body">
                            <ReactMarkdown>
                              {handoffResult.brief}
                            </ReactMarkdown>
                          </div>

                          {/* Verifiable Evidence Drawer */}
                          <div className="handover-evidence-drawer">
                            <button
                              type="button"
                              className="handover-evidence-btn"
                              onClick={() => setExpandedHandoffEvidence(!expandedHandoffEvidence)}
                              aria-expanded={expandedHandoffEvidence}
                            >
                              <div className="handover-evidence-btn-title">
                                {expandedHandoffEvidence ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span>Verifiable evidence audit trail ({handoffResult.evidence.length} facts)</span>
                              </div>
                              <span className="handover-evidence-btn-action">
                                {expandedHandoffEvidence ? 'Hide facts' : 'View provenance'}
                              </span>
                            </button>

                            {expandedHandoffEvidence && (
                              <div className="handover-evidence-list">
                                {handoffResult.evidence.map((ev, i) => (
                                  <div key={ev.id || i} className="handover-evidence-item">
                                    <div className="handover-evidence-text">{ev.text}</div>
                                    <div className="handover-evidence-meta-row">
                                      <span className="tag-source">Type: {ev.type}</span>
                                      {ev.occurredStart && <span className="tag-source">Date: {ev.occurredStart}</span>}
                                    </div>
                                    {ev.sourceChunk && (
                                      <div className="handover-evidence-chunk">
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
                            {handoffResult.message || 'No stored memory found for this client. Add notes above to start building memory.'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3 className="empty-state-title">Handover brief not yet prepared</h3>
                      <p className="empty-state-desc">
                        Click "Generate / refresh brief" to synthesize an executive briefing covering active decisions and what the client rejected.
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
            )}

            {/* TAB 5: ASK MEMORY (CONTINUITY QUERY) */}
            {activeTab === 'query' && (
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-header-left">
                    <h2 className="panel-title">Ask memory</h2>
                    <p className="panel-subtitle">
                      Targeted continuity queries grounded strictly in Hindsight evidence.
                    </p>
                  </div>
                </div>

                <div className="panel-body">
                  <form onSubmit={handleQuerySubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-title)' }} htmlFor="ask-memory-input">
                        Question for client memory
                      </label>
                      <textarea
                        id="ask-memory-input"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="e.g. What database did the client approve? What did they reject in kickoff?"
                        rows={3}
                        className="quick-notes-textarea"
                        disabled={isQuerying}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
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

                  {/* Suggested Queries */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      SUGGESTED QUESTIONS:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setQuestion('What database was approved or changed across our meetings?')}
                        className="btn btn-secondary btn-sm"
                      >
                        What database was approved or changed?
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestion('Who has final approval authority for budget changes versus design deliverables?')}
                        className="btn btn-secondary btn-sm"
                      >
                        Who has budget vs deliverable sign-off?
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestion('What technical approaches or tools did the client explicitly reject?')}
                        className="btn btn-secondary btn-sm"
                      >
                        What tools did the client reject?
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

                  {/* Grounded Answer Card */}
                  {queryResult && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          GROUNDED CONTINUITY RESPONSE
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: queryResult.hasEvidence ? 'var(--success-bg)' : 'var(--error-bg)',
                            color: queryResult.hasEvidence ? 'var(--success-text)' : 'var(--error-text)',
                          }}
                        >
                          {queryResult.hasEvidence ? 'Evidence found' : 'No recorded memory'}
                        </span>
                      </div>

                      <div className="continuity-query-answer">
                        <ReactMarkdown>
                          {queryResult.answer}
                        </ReactMarkdown>
                      </div>

                      {/* Evidence / Sources */}
                      {queryResult.hasEvidence && (
                        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-muted)', paddingTop: '12px' }}>
                          <div
                            onClick={() => setExpandedQueryEvidence(!expandedQueryEvidence)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {expandedQueryEvidence ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span>Sources and verifiable evidence ({queryResult.evidence.length})</span>
                            </span>
                          </div>

                          {expandedQueryEvidence && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                              {queryResult.evidence.map((item, idx) => (
                                <div key={item.id || idx} style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
                                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-title)' }}>{item.text}</div>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    <span className="tag-source">Type: {item.type}</span>
                                    {item.occurredStart && <span className="tag-source">Date: {item.occurredStart}</span>}
                                  </div>
                                  {item.sourceChunk && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state" style={{ maxWidth: '560px', margin: '60px auto' }}>
            <div className="brand-logo-icon" style={{ width: '48px', height: '48px', fontSize: '18px', margin: '0 auto 16px' }}>
              V
            </div>
            <h2 className="empty-state-title" style={{ fontSize: '20px' }}>Select or register a client account</h2>
            <p className="empty-state-desc">
              Viora maintains durable client institutional memory across account manager transitions.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={14} />
              <span>Register new client</span>
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
            {createClientError && (
              <div className="alert-error-box" style={{ marginBottom: '14px' }} role="alert">
                <div className="alert-error-main">
                  <div className="alert-error-text">
                    <AlertCircle size={16} />
                    <span>{createClientError}</span>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleCreateClient}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-title)' }} htmlFor="new-client-name-input">
                  Client name
                </label>
                <input
                  id="new-client-name-input"
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Acme Corporation, Meridian Health"
                  className="quick-notes-textarea"
                  style={{ minHeight: '38px', height: '38px', resize: 'none' }}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateClientError(null);
                  }}
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

      {/* Delete Client Confirmation Modal */}
      {clientToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Delete client workspace</h3>
            <p className="modal-desc">
              This will remove <strong>{clientToDelete.name}</strong> from Viora. Any associated local source records will also be removed.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="btn btn-secondary"
                disabled={isDeletingClient}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                className="btn btn-danger"
                disabled={isDeletingClient}
              >
                {isDeletingClient ? 'Deleting...' : 'Delete client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {clientToEdit && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Edit client workspace name</h3>
            <p className="modal-desc">
              Update the registered client name for <strong>{clientToEdit.name}</strong>.
            </p>
            {editClientError && (
              <div className="alert-error-box" style={{ marginBottom: '14px' }} role="alert">
                <div className="alert-error-main">
                  <div className="alert-error-text">
                    <AlertCircle size={16} />
                    <span>{editClientError}</span>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleUpdateClient}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-title)' }} htmlFor="edit-client-name-input">
                  Client name
                </label>
                <input
                  id="edit-client-name-input"
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="quick-notes-textarea"
                  style={{ minHeight: '38px', height: '38px', resize: 'none' }}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setClientToEdit(null);
                    setEditClientError(null);
                  }}
                  className="btn btn-secondary"
                  disabled={isEditingClient}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isEditingClient || !editClientName.trim()}
                >
                  {isEditingClient ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Source Confirmation Modal */}
      {sourceToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Delete source transcript</h3>
            <p className="modal-desc">
              Are you sure you want to remove <strong>{sourceToDelete.original_filename}</strong> from memory?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setSourceToDelete(null)}
                className="btn btn-secondary"
                disabled={isDeletingSource}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSource}
                className="btn btn-danger"
                disabled={isDeletingSource}
              >
                {isDeletingSource ? 'Deleting...' : 'Delete source'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

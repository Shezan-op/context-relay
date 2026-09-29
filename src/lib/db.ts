import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export interface ClientRecord {
  id: string;
  name: string;
  hindsight_bank_id: string;
  created_at: string;
}

export interface ApiKeyRecord {
  key_name: string;
  key_value: string;
  updated_at: string;
}

export interface SourceRecord {
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

// Global singleton to prevent multiple SQLite connections in development
const globalForDb = globalThis as unknown as {
  _vioraDb?: DatabaseSync;
  _contextRelayDb?: DatabaseSync;
};

export function getDatabase(): DatabaseSync {
  if (!globalForDb._vioraDb && !globalForDb._contextRelayDb) {
    const rawPath = process.env.DATABASE_PATH || (process.env.VERCEL ? '/tmp/viora.db' : 'context_relay.sqlite');
    const isMemory = rawPath === ':memory:';
    const resolvedDbPath = isMemory
      ? ':memory:'
      : path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawPath);
    
    // Ensure parent directory exists for file-based DB
    if (!isMemory) {
      const parentDir = path.dirname(resolvedDbPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    }

    const db = new DatabaseSync(resolvedDbPath);

    // Enable WAL mode for disk databases and foreign keys for data integrity
    db.exec(`
      ${isMemory ? '' : 'PRAGMA journal_mode = WAL;'}
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        hindsight_bank_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        original_filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        meeting_date TEXT,
        hindsight_document_id TEXT NOT NULL,
        ingestion_status TEXT NOT NULL CHECK(ingestion_status IN ('processing', 'stored', 'failed')),
        error_message TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        key_name TEXT PRIMARY KEY,
        key_value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sources_client_id ON sources(client_id);
    `);

    globalForDb._vioraDb = db;
  }

  return globalForDb._vioraDb || globalForDb._contextRelayDb!;
}

// Client repository functions
export function createClientRecord(client: ClientRecord): void {
  const db = getDatabase();
  const stmt = db.prepare(
    'INSERT INTO clients (id, name, hindsight_bank_id, created_at) VALUES (?, ?, ?, ?)'
  );
  stmt.run(client.id, client.name, client.hindsight_bank_id, client.created_at);
}

export function listClientRecords(): ClientRecord[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, name, hindsight_bank_id, created_at FROM clients ORDER BY created_at DESC');
  return stmt.all() as unknown as ClientRecord[];
}

export function getClientRecord(id: string): ClientRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, name, hindsight_bank_id, created_at FROM clients WHERE id = ?');
  const result = stmt.get(id);
  return (result as unknown as ClientRecord) || null;
}

export function updateClientRecord(id: string, name: string): ClientRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE clients SET name = ? WHERE id = ?');
  stmt.run(name, id);
  return getClientRecord(id);
}

export function deleteClientRecord(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
  stmt.run(id);
}

// Source repository functions
export function createSourceRecord(source: SourceRecord): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO sources (
      id, client_id, original_filename, content_type, size_bytes,
      meeting_date, hindsight_document_id, ingestion_status, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    source.id,
    source.client_id,
    source.original_filename,
    source.content_type,
    source.size_bytes,
    source.meeting_date ?? null,
    source.hindsight_document_id,
    source.ingestion_status,
    source.error_message ?? null,
    source.created_at
  );
}

export function updateSourceStatus(
  id: string,
  status: 'processing' | 'stored' | 'failed',
  errorMessage: string | null = null
): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE sources SET ingestion_status = ?, error_message = ? WHERE id = ?');
  stmt.run(status, errorMessage ?? null, id);
}

export function deleteSourceRecord(id: string): SourceRecord | null {
  const db = getDatabase();
  const source = getSourceRecord(id);
  if (!source) return null;
  const stmt = db.prepare('DELETE FROM sources WHERE id = ?');
  stmt.run(id);
  return source;
}

export function listSourcesForClient(clientId: string): SourceRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id, client_id, original_filename, content_type, size_bytes,
           meeting_date, hindsight_document_id, ingestion_status, error_message, created_at
    FROM sources
    WHERE client_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(clientId) as unknown as SourceRecord[];
}

export function getSourceRecord(id: string): SourceRecord | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id, client_id, original_filename, content_type, size_bytes,
           meeting_date, hindsight_document_id, ingestion_status, error_message, created_at
    FROM sources
    WHERE id = ?
  `);
  const result = stmt.get(id);
  return (result as unknown as SourceRecord) || null;
}

export function getSourceByHindsightDocId(docId: string): SourceRecord | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id, client_id, original_filename, content_type, size_bytes,
           meeting_date, hindsight_document_id, ingestion_status, error_message, created_at
    FROM sources
    WHERE hindsight_document_id = ? OR id = ?
    LIMIT 1
  `);
  const cleanId = docId.startsWith('doc:') ? docId.substring(4) : docId;
  const result = stmt.get(docId, cleanId);
  return (result as unknown as SourceRecord) || null;
}

// API Key repository functions
export function setApiKey(keyName: string, keyValue: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO api_keys (key_name, key_value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value, updated_at = excluded.updated_at'
  );
  stmt.run(keyName, keyValue, now);
}

export function getApiKey(keyName: string): string | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT key_value FROM api_keys WHERE key_name = ?');
  const result = stmt.get(keyName) as { key_value: string } | undefined;
  return result?.key_value ?? null;
}

export function listApiKeys(): ApiKeyRecord[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT key_name, key_value, updated_at FROM api_keys ORDER BY key_name');
  return stmt.all() as unknown as ApiKeyRecord[];
}

export function deleteApiKey(keyName: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM api_keys WHERE key_name = ?');
  stmt.run(keyName);
}

/**
 * Resolves a key: DB takes priority over environment variables.
 */
export function resolveKey(keyName: string, envVar: string): string | null {
  const val = getApiKey(keyName) || process.env[envVar] || null;
  return val ? val.trim() : null;
}

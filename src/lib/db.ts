import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export interface ClientRecord {
  id: string;
  name: string;
  hindsight_bank_id: string;
  created_at: string;
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
  _contextRelayDb?: DatabaseSync;
};

export function getDatabase(): DatabaseSync {
  if (!globalForDb._contextRelayDb) {
    const defaultDbPath = process.env.VERCEL
      ? path.join('/tmp', 'context-relay.db')
      : path.join(process.cwd(), 'context_relay.sqlite');
    const dbPath = process.env.DATABASE_PATH || defaultDbPath;
    
    // Ensure parent directory exists if a custom nested path is provided
    const parentDir = path.dirname(path.resolve(/*turbopackIgnore: true*/ dbPath));
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const db = new DatabaseSync(dbPath);

    // Enable WAL mode and foreign keys for performance and data integrity
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

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

      CREATE INDEX IF NOT EXISTS idx_sources_client_id ON sources(client_id);
    `);

    globalForDb._contextRelayDb = db;
  }

  return globalForDb._contextRelayDb;
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
    source.meeting_date,
    source.hindsight_document_id,
    source.ingestion_status,
    source.error_message,
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
  stmt.run(status, errorMessage, id);
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

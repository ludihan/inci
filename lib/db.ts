import { mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";
import { DATA_DIR } from "./data-dir";

const DB_PATH = path.join(DATA_DIR, "db.sqlite");

declare global {
  var __inciDb: DatabaseSync | undefined;
}

function createDb(): DatabaseSync {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  initSchema(db);
  return db;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      logo_path TEXT
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      cpf TEXT NOT NULL,
      subject TEXT NOT NULL,
      place_id TEXT,
      status TEXT NOT NULL,
      assigned_to TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      photo_path TEXT,
      sender TEXT NOT NULL,
      sender_name TEXT,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      photo_path TEXT,
      place_id TEXT,
      status TEXT NOT NULL,
      assigned_to TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaint_responses (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      photo_path TEXT,
      sender TEXT NOT NULL,
      sender_name TEXT,
      action TEXT NOT NULL DEFAULT 'message',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_message_attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaint_attachments (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaint_response_attachments (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL REFERENCES complaint_responses(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_cpf ON tickets(cpf);
    CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_code ON complaints(code);
    CREATE INDEX IF NOT EXISTS idx_complaint_responses_complaint ON complaint_responses(complaint_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_message_attachments_message ON ticket_message_attachments(message_id);
    CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint ON complaint_attachments(complaint_id);
    CREATE INDEX IF NOT EXISTS idx_complaint_response_attachments_response ON complaint_response_attachments(response_id);
  `);

  ensureColumn(db, "complaint_responses", "action", "TEXT NOT NULL DEFAULT 'message'");
  ensureColumn(db, "tickets", "assigned_to", "TEXT");
  ensureColumn(db, "complaints", "assigned_to", "TEXT");
  ensureColumn(db, "complaint_responses", "photo_path", "TEXT");
  ensureColumn(db, "tickets", "requester_name", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "requester_phone", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "role", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "equipment", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "equipment_brand", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "equipment_model", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "notes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "criticality", "TEXT NOT NULL DEFAULT 'medio'");
  ensureColumn(db, "ticket_messages", "signature_path", "TEXT");
  ensureColumn(db, "ticket_messages", "geo_lat", "REAL");
  ensureColumn(db, "ticket_messages", "geo_lng", "REAL");

  const settingsCount = db.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number };
  if (settingsCount.n === 0) {
    db.prepare("INSERT INTO settings (id, logo_path) VALUES (?, ?)").run(
      "main",
      null
    );
  }

  const count = db.prepare("SELECT COUNT(*) AS n FROM admins").get() as { n: number };
  if (count.n === 0) {
    db.prepare(
      `INSERT INTO admins (id, name, username, password_hash, role, permissions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      "Administrador",
      "admin",
      hashPassword("admin123"),
      "superadmin",
      JSON.stringify(["it", "maintenance"]),
      new Date().toISOString()
    );
  }
}

export function getDb(): DatabaseSync {
  if (!globalThis.__inciDb) {
    globalThis.__inciDb = createDb();
  }
  return globalThis.__inciDb;
}

function ensureColumn(
  db: DatabaseSync,
  table: string,
  column: string,
  definition: string
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function inTransaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

import { mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";

const DATA_DIR = path.join(process.cwd(), "data");
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaint_responses (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      sender TEXT NOT NULL,
      sender_name TEXT,
      action TEXT NOT NULL DEFAULT 'message',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_cpf ON tickets(cpf);
    CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_code ON complaints(code);
    CREATE INDEX IF NOT EXISTS idx_complaint_responses_complaint ON complaint_responses(complaint_id);
  `);

  ensureColumn(db, "complaint_responses", "action", "TEXT NOT NULL DEFAULT 'message'");

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
      JSON.stringify(["it", "maintenance", "complaints"]),
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

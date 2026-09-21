import { mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";
import { DATA_DIR } from "./data-dir";
import { hashMatricula } from "./matricula";

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

function renameTableIfNeeded(db: DatabaseSync, from: string, to: string): void {
  const exists = (name: string) =>
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name) !== undefined;
  if (exists(from) && !exists(to)) {
    db.exec(`ALTER TABLE ${from} RENAME TO ${to}`);
  }
}

function renameColumnIfNeeded(
  db: DatabaseSync,
  table: string,
  from: string,
  to: string
): void {
  const exists = (name: string) =>
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name) !== undefined;
  if (!exists(table)) return;
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (cols.some((c) => c.name === from) && !cols.some((c) => c.name === to)) {
    db.exec(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`);
  }
}

function initSchema(db: DatabaseSync): void {
  // Place -> Unit rename predates the CREATE TABLE IF NOT EXISTS block below so
  // existing databases get migrated in place instead of ending up with both an
  // old `places` table and a fresh, empty `units` table.
  renameTableIfNeeded(db, "places", "units");
  renameColumnIfNeeded(db, "tickets", "place_id", "unit_id");
  renameColumnIfNeeded(db, "complaints", "place_id", "unit_id");

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

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      cnpj TEXT,
      company_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      -- Unused going forward; kept only so legacy rows (created before the
      -- matrícula switch) still have their original value. See matricula_hash.
      cpf TEXT NOT NULL DEFAULT '',
      matricula_hash TEXT,
      subject TEXT NOT NULL,
      unit_id TEXT,
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
      unit_id TEXT,
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

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      default_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_items (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES items(id),
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(ticket_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      cnpj TEXT NOT NULL DEFAULT '',
      address_street TEXT NOT NULL DEFAULT '',
      address_number TEXT NOT NULL DEFAULT '',
      address_neighborhood TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      form_code TEXT NOT NULL DEFAULT '',
      logo_path TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      cnpj TEXT NOT NULL DEFAULT '',
      address_street TEXT NOT NULL DEFAULT '',
      address_number TEXT NOT NULL DEFAULT '',
      address_neighborhood TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      form_code TEXT NOT NULL DEFAULT '',
      logo_path TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      default_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_services (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      service_type_id TEXT NOT NULL REFERENCES service_types(id),
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(ticket_id, service_type_id)
    );

    CREATE INDEX IF NOT EXISTS idx_units_company ON units(company_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_services_ticket ON ticket_services(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_services_service ON ticket_services(service_type_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket ON ticket_items(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_items_item ON ticket_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_code ON complaints(code);
    CREATE INDEX IF NOT EXISTS idx_complaint_responses_complaint ON complaint_responses(complaint_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_message_attachments_message ON ticket_message_attachments(message_id);
    CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint ON complaint_attachments(complaint_id);
    CREATE INDEX IF NOT EXISTS idx_complaint_response_attachments_response ON complaint_response_attachments(response_id);
  `);

  ensureColumn(db, "complaint_responses", "action", "TEXT NOT NULL DEFAULT 'message'");
  ensureColumn(db, "units", "cnpj", "TEXT");
  ensureColumn(db, "units", "company_id", "TEXT");
  ensureColumn(db, "tickets", "area_id", "TEXT");
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
  ensureColumn(db, "ticket_messages", "signature_client_path", "TEXT");
  ensureColumn(db, "tickets", "client_timezone", "TEXT");
  ensureColumn(db, "tickets", "matricula_hash", "TEXT");
  ensureColumn(db, "settings", "matricula_digits", "INTEGER NOT NULL DEFAULT 4");
  db.exec("CREATE INDEX IF NOT EXISTS idx_tickets_matricula_hash ON tickets(matricula_hash);");

  // matrícula replaces plaintext CPF as the public identifier. Existing rows
  // only have the old `cpf` column filled in — backfill matricula_hash from it
  // so those tickets stay searchable (via the CPF-length fallback in
  // isValidRequesterCode). New tickets never touch `cpf` again; the column is
  // left in place but unused, same precedent as the removed geoLat/geoLng columns.
  const unhashed = db
    .prepare("SELECT id, cpf FROM tickets WHERE matricula_hash IS NULL")
    .all() as { id: string; cpf: string }[];
  if (unhashed.length > 0) {
    const update = db.prepare("UPDATE tickets SET matricula_hash = ? WHERE id = ?");
    for (const row of unhashed) {
      update.run(hashMatricula(row.cpf), row.id);
    }
  }

  const settingsCount = db.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number };
  if (settingsCount.n === 0) {
    db.prepare("INSERT INTO settings (id, logo_path) VALUES (?, ?)").run(
      "main",
      null
    );
  }

  // `companies` is the multi-row successor to the old singleton
  // `company_settings`. The legacy table is left in place, unused, so a
  // downgrade or a stray read of it doesn't lose data (same precedent as the
  // unused geoLat/geoLng ticket-message columns).
  const companiesCount = db
    .prepare("SELECT COUNT(*) AS n FROM companies")
    .get() as { n: number };
  if (companiesCount.n === 0) {
    const legacy = db
      .prepare("SELECT * FROM company_settings WHERE id = 'default'")
      .get() as
      | {
          name: string;
          cnpj: string;
          address_street: string;
          address_number: string;
          address_neighborhood: string;
          phone: string;
          form_code: string;
          logo_path: string | null;
        }
      | undefined;
    if (legacy) {
      db.prepare(
        `INSERT INTO companies
           (id, name, cnpj, address_street, address_number, address_neighborhood, phone, form_code, logo_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        legacy.name,
        legacy.cnpj,
        legacy.address_street,
        legacy.address_number,
        legacy.address_neighborhood,
        legacy.phone,
        legacy.form_code,
        legacy.logo_path,
        new Date().toISOString()
      );
    } else {
      db.prepare(
        `INSERT INTO companies
           (id, name, cnpj, address_street, address_number, address_neighborhood, phone, form_code, logo_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        process.env.COMPANY_NAME ?? "",
        (process.env.COMPANY_CNPJ ?? "").replace(/\D/g, ""),
        process.env.COMPANY_ADDRESS ?? "",
        "",
        "",
        (process.env.COMPANY_PHONE ?? "").replace(/\D/g, ""),
        "",
        null,
        new Date().toISOString()
      );
    }
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

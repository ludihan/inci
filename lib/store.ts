import { randomUUID } from "crypto";
import { getDb, inTransaction } from "./db";
import { hashPassword } from "./password";
import type {
  Admin,
  Complaint,
  ComplaintResponse,
  DB,
  Place,
  Settings,
  Ticket,
  TicketMessage,
  TicketType,
} from "./types";

type Row = Record<string, unknown>;

function rowToAdmin(row: Row): Admin {
  return {
    id: String(row.id),
    name: String(row.name),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    role: row.role === "superadmin" ? "superadmin" : "admin",
    permissions: JSON.parse(String(row.permissions)) as Admin["permissions"],
    createdAt: String(row.created_at),
  };
}

function rowToPlace(row: Row): Place {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
  };
}

function rowToTicketMessage(row: Row): TicketMessage {
  return {
    id: String(row.id),
    content: String(row.content),
    photoPath: row.photo_path ? String(row.photo_path) : undefined,
    sender: row.sender === "admin" ? "admin" : "user",
    senderName: row.sender_name ? String(row.sender_name) : undefined,
    action: row.action as TicketMessage["action"],
    createdAt: String(row.created_at),
  };
}

function findPlace(id: string): Place | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM places WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToPlace(row) : null;
}

function rowToTicket(row: Row): Ticket {
  const db = getDb();
  const messages = db
    .prepare(
      "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC"
    )
    .all(String(row.id))
    .map((r) => rowToTicketMessage(r as Row));
  const place =
    row.place_id !== null && row.place_id !== undefined
      ? findPlace(String(row.place_id))
      : null;
  return {
    id: String(row.id),
    type: row.type === "it" ? "it" : "maintenance",
    cpf: String(row.cpf),
    subject: String(row.subject),
    place,
    status: row.status === "closed" ? "closed" : "open",
    messages,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToComplaint(row: Row): Complaint {
  const db = getDb();
  const responses = db
    .prepare(
      "SELECT * FROM complaint_responses WHERE complaint_id = ? ORDER BY created_at ASC"
    )
    .all(String(row.id))
    .map((r) => rowToComplaintResponse(r as Row));
  const place =
    row.place_id !== null && row.place_id !== undefined
      ? findPlace(String(row.place_id))
      : null;
  return {
    id: String(row.id),
    code: String(row.code),
    subject: String(row.subject),
    content: String(row.content),
    photoPath: row.photo_path ? String(row.photo_path) : undefined,
    place,
    status: row.status === "closed" ? "closed" : "open",
    responses,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToComplaintResponse(row: Row): ComplaintResponse {
  return {
    id: String(row.id),
    content: String(row.content),
    sender: row.sender === "admin" ? "admin" : "user",
    senderName: row.sender_name ? String(row.sender_name) : undefined,
    createdAt: String(row.created_at),
  };
}

// ---- Read ----

export async function getDB(): Promise<DB> {
  const db = getDb();
  const admins = db.prepare("SELECT * FROM admins ORDER BY created_at ASC").all() as Row[];
  const places = db.prepare("SELECT * FROM places ORDER BY name ASC").all() as Row[];
  const tickets = db.prepare("SELECT * FROM tickets").all() as Row[];
  const complaints = db.prepare("SELECT * FROM complaints").all() as Row[];
  return {
    admins: admins.map(rowToAdmin),
    places: places.map(rowToPlace),
    tickets: tickets.map(rowToTicket),
    complaints: complaints.map(rowToComplaint),
  };
}

// ---- Tickets ----

export async function createTicket(input: {
  type: TicketType;
  cpf: string;
  subject: string;
  placeId: string;
  message: string;
  photoPath: string;
}): Promise<Ticket> {
  const db = getDb();
  const now = new Date().toISOString();
  const ticketId = `TCK-${randomUUID().slice(0, 8).toUpperCase()}`;
  const messageId = randomUUID();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO tickets (id, type, cpf, subject, place_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      ticketId,
      input.type,
      input.cpf,
      input.subject,
      input.placeId,
      "open",
      now,
      now
    );
    db.prepare(
      `INSERT INTO ticket_messages (id, ticket_id, content, photo_path, sender, sender_name, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      messageId,
      ticketId,
      input.message,
      input.photoPath,
      "user",
      null,
      "open",
      now
    );
  });
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId) as Row;
  return rowToTicket(row);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToTicket(row) : null;
}

export async function getTicketsByCpf(cpf: string): Promise<Ticket[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM tickets WHERE cpf = ? ORDER BY created_at DESC")
    .all(cpf) as Row[];
  return rows.map(rowToTicket);
}

export async function addTicketMessage(
  id: string,
  input: {
    content: string;
    photoPath?: string;
    sender: "user" | "admin";
    senderName?: string;
    action: "message" | "close" | "open";
  }
): Promise<Ticket | null> {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  if (!ticket) return null;
  const now = new Date().toISOString();
  const status = input.action === "close" ? "closed" : "open";
  inTransaction(() => {
    db.prepare(
      `INSERT INTO ticket_messages (id, ticket_id, content, photo_path, sender, sender_name, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      id,
      input.content,
      input.photoPath ?? null,
      input.sender,
      input.senderName ?? null,
      input.action,
      now
    );
    db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?").run(
      status,
      now,
      id
    );
  });
  const updated = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row;
  return rowToTicket(updated);
}

// ---- Complaints ----

export async function createComplaint(input: {
  subject: string;
  content: string;
  photoPath?: string;
  code: string;
  placeId: string;
}): Promise<Complaint> {
  const db = getDb();
  const now = new Date().toISOString();
  const complaintId = randomUUID();
  db.prepare(
    `INSERT INTO complaints (id, code, subject, content, photo_path, place_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    complaintId,
    input.code,
    input.subject,
    input.content,
    input.photoPath ?? null,
    input.placeId,
    "open",
    now,
    now
  );
  const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(complaintId) as Row;
  return rowToComplaint(row);
}

export async function getComplaintByCode(code: string): Promise<Complaint | null> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row | undefined;
  return row ? rowToComplaint(row) : null;
}

export async function getComplaintById(id: string): Promise<Complaint | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToComplaint(row) : null;
}

export async function addComplaintResponse(
  code: string,
  input: { content: string; sender: "user" | "admin"; senderName?: string }
): Promise<Complaint | null> {
  const db = getDb();
  const complaint = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row | undefined;
  if (!complaint) return null;
  const now = new Date().toISOString();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO complaint_responses (id, complaint_id, content, sender, sender_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      String(complaint.id),
      input.content,
      input.sender,
      input.senderName ?? null,
      now
    );
    db.prepare("UPDATE complaints SET updated_at = ? WHERE id = ?").run(
      now,
      String(complaint.id)
    );
  });
  const updated = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row;
  return rowToComplaint(updated);
}

export async function setComplaintStatus(
  code: string,
  status: "open" | "closed"
): Promise<Complaint | null> {
  const db = getDb();
  const complaint = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row | undefined;
  if (!complaint) return null;
  db.prepare("UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?").run(
    status,
    new Date().toISOString(),
    String(complaint.id)
  );
  const updated = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row;
  return rowToComplaint(updated);
}

// ---- Places ----

export async function listPlaces(): Promise<Place[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM places ORDER BY name ASC").all() as Row[];
  return rows.map(rowToPlace);
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM places WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToPlace(row) : null;
}

export async function getPlaceByName(name: string): Promise<Place | null> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM places WHERE LOWER(name) = LOWER(?)")
    .get(name) as Row | undefined;
  return row ? rowToPlace(row) : null;
}

export async function createPlace(name: string): Promise<Place> {
  const db = getDb();
  const place: Place = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  db.prepare("INSERT INTO places (id, name, created_at) VALUES (?, ?, ?)").run(
    place.id,
    place.name,
    place.createdAt
  );
  return place;
}

export async function deletePlace(id: string): Promise<boolean> {
  const db = getDb();
  return inTransaction(() => {
    db.prepare("UPDATE tickets SET place_id = NULL WHERE place_id = ?").run(id);
    db.prepare("UPDATE complaints SET place_id = NULL WHERE place_id = ?").run(id);
    const result = db.prepare("DELETE FROM places WHERE id = ?").run(id);
    return result.changes > 0;
  });
}

// ---- Settings ----

export async function getSettings(): Promise<Settings> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM settings WHERE id = 'main'").get() as
    | Row
    | undefined;
  return {
    logoPath: row?.logo_path ? String(row.logo_path) : null,
  };
}

export async function setLogoPath(logoPath: string | null): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE settings SET logo_path = ? WHERE id = 'main'").run(
    logoPath
  );
}

// ---- Admins ----

export async function getAdminById(id: string): Promise<Admin | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM admins WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToAdmin(row) : null;
}

export async function getAdminByUsername(username: string): Promise<Admin | null> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM admins WHERE LOWER(username) = LOWER(?)")
    .get(username) as Row | undefined;
  return row ? rowToAdmin(row) : null;
}

export async function listAdmins(): Promise<Admin[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM admins ORDER BY created_at ASC").all() as Row[];
  return rows.map(rowToAdmin);
}

export async function createAdmin(input: {
  name: string;
  username: string;
  password: string;
  role: Admin["role"];
  permissions: Admin["permissions"];
}): Promise<{ ok: boolean; error?: string; admin?: Admin }> {
  const existing = await getAdminByUsername(input.username);
  if (existing) return { ok: false, error: "duplicate-username" };
  const db = getDb();
  const admin: Admin = {
    id: randomUUID(),
    name: input.name,
    username: input.username,
    passwordHash: hashPassword(input.password),
    role: input.role,
    permissions: input.permissions,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO admins (id, name, username, password_hash, role, permissions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    admin.id,
    admin.name,
    admin.username,
    admin.passwordHash,
    admin.role,
    JSON.stringify(admin.permissions),
    admin.createdAt
  );
  return { ok: true, admin };
}

export async function updateAdmin(
  id: string,
  patch: {
    name?: string;
    username?: string;
    password?: string;
    role?: Admin["role"];
    permissions?: Admin["permissions"];
  }
): Promise<{ ok: boolean; error?: string }> {
  if (patch.username) {
    const existing = await getAdminByUsername(patch.username);
    if (existing && existing.id !== id) {
      return { ok: false, error: "duplicate-username" };
    }
  }
  const db = getDb();
  const admin = db.prepare("SELECT * FROM admins WHERE id = ?").get(id) as Row | undefined;
  if (!admin) return { ok: false, error: "not-found" };

  const name = patch.name ?? String(admin.name);
  const username = patch.username ?? String(admin.username);
  const role = patch.role ?? (admin.role === "superadmin" ? "superadmin" : "admin");
  const permissions = patch.permissions
    ? JSON.stringify(patch.permissions)
    : String(admin.permissions);
  let passwordHash = String(admin.password_hash);
  if (patch.password && patch.password.length >= 6) {
    passwordHash = hashPassword(patch.password);
  }
  db.prepare(
    `UPDATE admins SET name = ?, username = ?, role = ?, permissions = ?, password_hash = ? WHERE id = ?`
  ).run(name, username, role, permissions, passwordHash, id);
  return { ok: true };
}

export async function deleteAdmin(id: string): Promise<boolean> {
  const db = getDb();
  const result = db.prepare("DELETE FROM admins WHERE id = ?").run(id);
  return result.changes > 0;
}

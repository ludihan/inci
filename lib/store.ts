import { randomUUID } from "crypto";
import { getDb, inTransaction } from "./db";
import { hashPassword } from "./password";
import { hashMatricula } from "./matricula";
import { publishAdminEvent } from "./events";
import type {
  Admin,
  Area,
  Attachment,
  Company,
  Complaint,
  ComplaintResponse,
  DB,
  Item,
  Unit,
  ServiceType,
  Settings,
  Ticket,
  TicketCriticality,
  TicketItemUsage,
  TicketMessage,
  TicketServiceUsage,
  TicketType,
} from "./types";

type Row = Record<string, unknown>;
type AttachmentRef = { path: string; kind: "image" | "video" };

export const TICKET_CRITICALITIES: TicketCriticality[] = [
  "critica",
  "urgente",
  "medio",
  "baixo",
];

function toCriticality(value: unknown): TicketCriticality {
  return TICKET_CRITICALITIES.includes(value as TicketCriticality)
    ? (value as TicketCriticality)
    : "medio";
}

function rowToAttachment(row: Row): Attachment {
  return {
    id: String(row.id),
    path: String(row.path),
    kind: row.kind === "video" ? "video" : "image",
  };
}

function findAttachments(
  table: string,
  fkColumn: string,
  fkValue: string
): Attachment[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM ${table} WHERE ${fkColumn} = ? ORDER BY created_at ASC`)
    .all(fkValue) as Row[];
  return rows.map(rowToAttachment);
}

function insertAttachments(
  table: string,
  fkColumn: string,
  fkValue: string,
  attachments: AttachmentRef[]
): void {
  if (attachments.length === 0) return;
  const db = getDb();
  const now = new Date().toISOString();
  for (const att of attachments) {
    db.prepare(
      `INSERT INTO ${table} (id, ${fkColumn}, path, kind, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(randomUUID(), fkValue, att.path, att.kind, now);
  }
}

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

function rowToUnit(row: Row): Unit {
  const cnpj = row.cnpj == null ? "" : String(row.cnpj);
  const companyId = row.company_id == null ? "" : String(row.company_id);
  return {
    id: String(row.id),
    name: String(row.name),
    cnpj: cnpj || undefined,
    companyId: companyId || undefined,
    company: companyId ? findCompany(companyId) : null,
    createdAt: String(row.created_at),
  };
}

function findCompany(id: string): Company | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM companies WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? rowToCompany(row) : null;
}

function rowToArea(row: Row): Area {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
  };
}

function findArea(id: string): Area | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM areas WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? rowToArea(row) : null;
}

function rowToTicketMessage(row: Row): TicketMessage {
  // Legacy rows created before multi-attachment support stored a single
  // image directly on the message via photo_path.
  const legacy: Attachment[] = row.photo_path
    ? [{ id: `${row.id}-legacy`, path: String(row.photo_path), kind: "image" }]
    : [];
  return {
    id: String(row.id),
    content: String(row.content),
    attachments: [
      ...legacy,
      ...findAttachments("ticket_message_attachments", "message_id", String(row.id)),
    ],
    sender: row.sender === "admin" ? "admin" : "user",
    senderName: row.sender_name ? String(row.sender_name) : undefined,
    action: row.action as TicketMessage["action"],
    signaturePath: row.signature_path ? String(row.signature_path) : undefined,
    signatureClientPath: row.signature_client_path
      ? String(row.signature_client_path)
      : undefined,
    createdAt: String(row.created_at),
  };
}

function findUnit(id: string): Unit | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM units WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToUnit(row) : null;
}

function findAdminName(id: unknown): string | undefined {
  if (id === null || id === undefined) return undefined;
  const db = getDb();
  const row = db
    .prepare("SELECT name FROM admins WHERE id = ?")
    .get(String(id)) as Row | undefined;
  return row ? String(row.name) : undefined;
}

function rowToItem(row: Row): Item {
  return {
    id: String(row.id),
    name: String(row.name),
    defaultPrice: Number(row.default_price ?? 0),
    createdAt: String(row.created_at),
  };
}

function rowToTicketItemUsage(row: Row): TicketItemUsage {
  const quantity = Number(row.quantity ?? 0);
  const unitPrice = Number(row.unit_price ?? 0);
  const discount = Number(row.discount ?? 0);
  return {
    id: String(row.id),
    item: {
      id: String(row.item_id),
      name: String(row.item_name),
      defaultPrice: Number(row.default_price ?? 0),
      createdAt: String(row.item_created_at),
    },
    quantity,
    unitPrice,
    discount,
    total: Math.max(0, quantity * unitPrice - discount),
  };
}

function rowToServiceType(row: Row): ServiceType {
  return {
    id: String(row.id),
    name: String(row.name),
    defaultPrice: Number(row.default_price ?? 0),
    createdAt: String(row.created_at),
  };
}

function rowToTicketServiceUsage(row: Row): TicketServiceUsage {
  const quantity = Number(row.quantity ?? 0);
  const unitPrice = Number(row.unit_price ?? 0);
  const discount = Number(row.discount ?? 0);
  return {
    id: String(row.id),
    serviceType: {
      id: String(row.service_type_id),
      name: String(row.service_type_name),
      defaultPrice: Number(row.default_price ?? 0),
      createdAt: String(row.service_type_created_at),
    },
    quantity,
    unitPrice,
    discount,
    total: Math.max(0, quantity * unitPrice - discount),
  };
}

function findTicketServices(ticketId: string): TicketServiceUsage[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ts.*, s.name AS service_type_name, s.default_price AS default_price,
              s.created_at AS service_type_created_at
       FROM ticket_services ts
       JOIN service_types s ON s.id = ts.service_type_id
       WHERE ts.ticket_id = ?
       ORDER BY ts.created_at ASC`
    )
    .all(ticketId) as Row[];
  return rows.map(rowToTicketServiceUsage);
}

function findTicketItems(ticketId: string): TicketItemUsage[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ti.*, i.name AS item_name, i.default_price AS default_price,
              i.created_at AS item_created_at
       FROM ticket_items ti
       JOIN items i ON i.id = ti.item_id
       WHERE ti.ticket_id = ?
       ORDER BY ti.created_at ASC`
    )
    .all(ticketId) as Row[];
  return rows.map(rowToTicketItemUsage);
}

function rowToTicket(row: Row): Ticket {
  const db = getDb();
  const messages = db
    .prepare(
      "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC"
    )
    .all(String(row.id))
    .map((r) => rowToTicketMessage(r as Row));
  const unit =
    row.unit_id !== null && row.unit_id !== undefined
      ? findUnit(String(row.unit_id))
      : null;
  const assignedToId =
    row.assigned_to !== null && row.assigned_to !== undefined
      ? String(row.assigned_to)
      : undefined;
  return {
    id: String(row.id),
    type: row.type === "it" ? "it" : "maintenance",
    matriculaHash: String(row.matricula_hash ?? ""),
    subject: String(row.subject),
    requesterName: String(row.requester_name ?? ""),
    requesterPhone: String(row.requester_phone ?? ""),
    role: String(row.role ?? ""),
    equipment: String(row.equipment ?? ""),
    equipmentBrand: String(row.equipment_brand ?? ""),
    equipmentModel: String(row.equipment_model ?? ""),
    notes: String(row.notes ?? ""),
    criticality: toCriticality(row.criticality),
    items: findTicketItems(String(row.id)),
    services: findTicketServices(String(row.id)),
    unit,
    area:
      row.area_id !== null && row.area_id !== undefined
        ? findArea(String(row.area_id))
        : null,
    status:
      row.status === "closed"
        ? "closed"
        : row.status === "in_progress"
          ? "in_progress"
          : "open",
    assignedToId,
    assignedToName: assignedToId ? findAdminName(assignedToId) : undefined,
    messages,
    createdAt: String(row.created_at),
    clientTimezone: row.client_timezone ? String(row.client_timezone) : undefined,
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
  const unit =
    row.unit_id !== null && row.unit_id !== undefined
      ? findUnit(String(row.unit_id))
      : null;
  const assignedToId =
    row.assigned_to !== null && row.assigned_to !== undefined
      ? String(row.assigned_to)
      : undefined;
  const legacy: Attachment[] = row.photo_path
    ? [{ id: `${row.id}-legacy`, path: String(row.photo_path), kind: "image" }]
    : [];
  return {
    id: String(row.id),
    code: String(row.code),
    subject: String(row.subject),
    content: String(row.content),
    attachments: [
      ...legacy,
      ...findAttachments("complaint_attachments", "complaint_id", String(row.id)),
    ],
    unit,
    status: row.status === "closed" ? "closed" : "open",
    assignedToId,
    assignedToName: assignedToId ? findAdminName(assignedToId) : undefined,
    responses,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToComplaintResponse(row: Row): ComplaintResponse {
  const action = String(row.action);
  const legacy: Attachment[] = row.photo_path
    ? [{ id: `${row.id}-legacy`, path: String(row.photo_path), kind: "image" }]
    : [];
  return {
    id: String(row.id),
    content: String(row.content),
    attachments: [
      ...legacy,
      ...findAttachments("complaint_response_attachments", "response_id", String(row.id)),
    ],
    sender: row.sender === "admin" ? "admin" : "user",
    senderName: row.sender_name ? String(row.sender_name) : undefined,
    action:
      action === "open" ||
      action === "close" ||
      action === "assume" ||
      action === "forward" ||
      action === "release"
        ? (action as ComplaintResponse["action"])
        : "message",
    createdAt: String(row.created_at),
  };
}

// ---- Read ----

export async function getDB(): Promise<DB> {
  const db = getDb();
  const admins = db.prepare("SELECT * FROM admins ORDER BY created_at ASC").all() as Row[];
  const units = db.prepare("SELECT * FROM units ORDER BY name ASC").all() as Row[];
  const companies = db.prepare("SELECT * FROM companies ORDER BY name ASC").all() as Row[];
  const areas = db.prepare("SELECT * FROM areas ORDER BY name ASC").all() as Row[];
  const items = db.prepare("SELECT * FROM items ORDER BY name ASC").all() as Row[];
  const serviceTypes = db
    .prepare("SELECT * FROM service_types ORDER BY name ASC")
    .all() as Row[];
  const tickets = db.prepare("SELECT * FROM tickets").all() as Row[];
  const complaints = db.prepare("SELECT * FROM complaints").all() as Row[];
  return {
    admins: admins.map(rowToAdmin),
    units: units.map(rowToUnit),
    companies: companies.map(rowToCompany),
    areas: areas.map(rowToArea),
    items: items.map(rowToItem),
    serviceTypes: serviceTypes.map(rowToServiceType),
    tickets: tickets.map(rowToTicket),
    complaints: complaints.map(rowToComplaint),
  };
}

// ---- Tickets ----

export async function createTicket(input: {
  type: TicketType;
  matricula: string;
  subject: string;
  unitId: string;
  areaId: string;
  message: string;
  attachments: AttachmentRef[];
  requesterName?: string;
  requesterPhone?: string;
  role?: string;
  equipment?: string;
  equipmentBrand?: string;
  equipmentModel?: string;
  notes?: string;
  criticality?: TicketCriticality;
  clientTimezone?: string;
}): Promise<Ticket> {
  const db = getDb();
  const now = new Date().toISOString();
  const ticketId = `TCK-${randomUUID().slice(0, 8).toUpperCase()}`;
  const messageId = randomUUID();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO tickets
         (id, type, matricula_hash, subject, unit_id, area_id, status, created_at, updated_at,
          requester_name, requester_phone, role, equipment, equipment_brand,
          equipment_model, notes, criticality, client_timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      ticketId,
      input.type,
      hashMatricula(input.matricula),
      input.subject,
      input.unitId,
      input.areaId,
      "open",
      now,
      now,
      input.requesterName ?? "",
      input.requesterPhone ?? "",
      input.role ?? "",
      input.equipment ?? "",
      input.equipmentBrand ?? "",
      input.equipmentModel ?? "",
      input.notes ?? "",
      toCriticality(input.criticality),
      input.clientTimezone ?? null
    );
    db.prepare(
      `INSERT INTO ticket_messages (id, ticket_id, content, photo_path, sender, sender_name, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(messageId, ticketId, input.message, null, "user", null, "open", now);
    insertAttachments("ticket_message_attachments", "message_id", messageId, input.attachments);
  });
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId) as Row;
  publishAdminEvent(ticketId);
  return rowToTicket(row);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToTicket(row) : null;
}

// `code` is the raw matrícula (or a legacy CPF); matched against the stored hash.
export async function getTicketsByMatricula(code: string): Promise<Ticket[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM tickets WHERE matricula_hash = ? ORDER BY created_at DESC")
    .all(hashMatricula(code)) as Row[];
  return rows.map(rowToTicket);
}

export async function addTicketMessage(
  id: string,
  input: {
    content: string;
    attachments?: AttachmentRef[];
    sender: "user" | "admin";
    senderName?: string;
    action: "message" | "close" | "open";
    signaturePath?: string;
    signatureClientPath?: string;
  }
): Promise<Ticket | null> {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  if (!ticket) return null;
  const now = new Date().toISOString();
  const status =
    input.action === "close"
      ? "closed"
      : ticket.assigned_to
        ? "in_progress"
        : "open";
  const messageId = randomUUID();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO ticket_messages (id, ticket_id, content, photo_path, sender, sender_name, action, signature_path, signature_client_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      messageId,
      id,
      input.content,
      null,
      input.sender,
      input.senderName ?? null,
      input.action,
      input.signaturePath ?? null,
      input.signatureClientPath ?? null,
      now
    );
    insertAttachments(
      "ticket_message_attachments",
      "message_id",
      messageId,
      input.attachments ?? []
    );
    db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?").run(
      status,
      now,
      id
    );
  });
  const updated = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row;
  publishAdminEvent(id);
  return rowToTicket(updated);
}

export async function addTicketAssignment(
  id: string,
  input: { action: "assume" | "forward" | "release"; actorName: string; targetName?: string }
): Promise<Ticket | null> {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  if (!ticket) return null;
  const now = new Date().toISOString();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO ticket_messages (id, ticket_id, content, photo_path, sender, sender_name, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      id,
      input.action === "forward" ? (input.targetName ?? "") : "",
      null,
      "admin",
      input.actorName,
      input.action,
      now
    );
    db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(now, id);
  });
  const updated = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row;
  publishAdminEvent(id);
  return rowToTicket(updated);
}

// ---- Complaints ----

export async function createComplaint(input: {
  subject: string;
  content: string;
  attachments?: AttachmentRef[];
  code: string;
  unitId: string;
}): Promise<Complaint> {
  const db = getDb();
  const now = new Date().toISOString();
  const complaintId = randomUUID();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO complaints (id, code, subject, content, photo_path, unit_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      complaintId,
      input.code,
      input.subject,
      input.content,
      null,
      input.unitId,
      "open",
      now,
      now
    );
    insertAttachments(
      "complaint_attachments",
      "complaint_id",
      complaintId,
      input.attachments ?? []
    );
    db.prepare(
      `INSERT INTO complaint_responses (id, complaint_id, content, photo_path, sender, sender_name, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      complaintId,
      input.content,
      null,
      "user",
      null,
      "open",
      now
    );
  });
  const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(complaintId) as Row;
  publishAdminEvent(input.code);
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
  input: {
    content: string;
    sender: "user" | "admin";
    senderName?: string;
    attachments?: AttachmentRef[];
  }
): Promise<Complaint | null> {
  const db = getDb();
  const complaint = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row | undefined;
  if (!complaint) return null;
  const now = new Date().toISOString();
  const responseId = randomUUID();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO complaint_responses (id, complaint_id, content, photo_path, sender, sender_name, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      responseId,
      String(complaint.id),
      input.content,
      null,
      input.sender,
      input.senderName ?? null,
      "message",
      now
    );
    insertAttachments(
      "complaint_response_attachments",
      "response_id",
      responseId,
      input.attachments ?? []
    );
    db.prepare("UPDATE complaints SET updated_at = ? WHERE id = ?").run(
      now,
      String(complaint.id)
    );
  });
  const updated = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row;
  publishAdminEvent(code);
  return rowToComplaint(updated);
}

export async function addComplaintAssignment(
  code: string,
  input: { action: "assume" | "forward" | "release"; actorName: string; targetName?: string }
): Promise<Complaint | null> {
  const db = getDb();
  const complaint = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row | undefined;
  if (!complaint) return null;
  const now = new Date().toISOString();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO complaint_responses (id, complaint_id, content, photo_path, sender, sender_name, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      String(complaint.id),
      input.action === "forward" ? (input.targetName ?? "") : "",
      null,
      "admin",
      input.actorName,
      input.action,
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
  publishAdminEvent(code);
  return rowToComplaint(updated);
}

export async function setComplaintStatus(
  code: string,
  status: "open" | "closed",
  content: string,
  senderName?: string,
  attachments?: AttachmentRef[]
): Promise<Complaint | null> {
  const db = getDb();
  const complaint = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row | undefined;
  if (!complaint) return null;
  const now = new Date().toISOString();
  const responseId = randomUUID();
  inTransaction(() => {
    db.prepare(
      `INSERT INTO complaint_responses (id, complaint_id, content, photo_path, sender, sender_name, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      responseId,
      String(complaint.id),
      content,
      null,
      "admin",
      senderName ?? null,
      status === "closed" ? "close" : "open",
      now
    );
    insertAttachments(
      "complaint_response_attachments",
      "response_id",
      responseId,
      attachments ?? []
    );
    db.prepare("UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?").run(
      status,
      now,
      String(complaint.id)
    );
  });
  const updated = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row;
  publishAdminEvent(code);
  return rowToComplaint(updated);
}

export async function hasAssignedComplaints(adminId: string): Promise<boolean> {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM complaints WHERE assigned_to = ?")
    .get(adminId) as { n: number };
  return row.n > 0;
}

export async function assignTicket(
  id: string,
  adminId: string
): Promise<Ticket | null> {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  if (!ticket) return null;
  const status = ticket.status === "closed" ? "closed" : "in_progress";
  db.prepare(
    "UPDATE tickets SET assigned_to = ?, status = ?, updated_at = ? WHERE id = ?"
  ).run(adminId, status, new Date().toISOString(), id);
  publishAdminEvent(id);
  return rowToTicket(db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row);
}

export async function updateTicketCriticality(
  id: string,
  criticality: TicketCriticality
): Promise<Ticket | null> {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  if (!ticket) return null;
  db.prepare(
    "UPDATE tickets SET criticality = ?, updated_at = ? WHERE id = ?"
  ).run(toCriticality(criticality), new Date().toISOString(), id);
  publishAdminEvent(id);
  return rowToTicket(db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row);
}

// Reassigns a ticket to the other module (e.g. a user mistakenly opened it
// as TI instead of Manutenção). The current assignee may not have
// permission over the new module, so the ticket is released back to the
// unassigned queue rather than left stuck with an assignee who can no
// longer act on it.
export async function updateTicketType(
  id: string,
  type: TicketType
): Promise<Ticket | null> {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  if (!ticket) return null;
  const status = ticket.status === "closed" ? "closed" : "open";
  db.prepare(
    "UPDATE tickets SET type = ?, assigned_to = NULL, status = ?, updated_at = ? WHERE id = ?"
  ).run(type, status, new Date().toISOString(), id);
  publishAdminEvent(id);
  return rowToTicket(db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row);
}

// Permanently removes a ticket and everything tied to it (messages, item/
// service usage) via ON DELETE CASCADE. Returns the ticket as it was right
// before deletion so the caller can clean up its attachment/signature files
// on disk — the DB doesn't know about those.
export async function deleteTicket(id: string): Promise<Ticket | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  if (!row) return null;
  const ticket = rowToTicket(row);
  inTransaction(() => {
    db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  });
  publishAdminEvent(id);
  return ticket;
}

export async function releaseTicket(id: string): Promise<Ticket | null> {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row | undefined;
  if (!ticket) return null;
  const status = ticket.status === "closed" ? "closed" : "open";
  db.prepare(
    "UPDATE tickets SET assigned_to = NULL, status = ?, updated_at = ? WHERE id = ?"
  ).run(status, new Date().toISOString(), id);
  publishAdminEvent(id);
  return rowToTicket(db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Row);
}

// ---- Items ----

export async function listItems(): Promise<Item[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM items ORDER BY name ASC").all() as Row[];
  return rows.map(rowToItem);
}

export async function createItem(
  name: string,
  defaultPrice = 0
): Promise<{ ok: boolean; error?: string; item?: Item }> {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM items WHERE LOWER(name) = LOWER(?)")
    .get(name) as Row | undefined;
  if (existing) return { ok: false, error: "duplicate-item" };
  const item: Item = {
    id: randomUUID(),
    name,
    defaultPrice: Number.isFinite(defaultPrice) ? Math.max(0, defaultPrice) : 0,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO items (id, name, default_price, created_at) VALUES (?, ?, ?, ?)"
  ).run(item.id, item.name, item.defaultPrice, item.createdAt);
  return { ok: true, item };
}

export async function updateItem(
  id: string,
  name: string,
  defaultPrice: number
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Row | undefined;
  if (!item) return { ok: false, error: "not-found" };
  const clash = db
    .prepare("SELECT id FROM items WHERE LOWER(name) = LOWER(?) AND id != ?")
    .get(name, id) as Row | undefined;
  if (clash) return { ok: false, error: "duplicate-item" };
  db.prepare("UPDATE items SET name = ?, default_price = ? WHERE id = ?").run(
    name,
    Number.isFinite(defaultPrice) ? Math.max(0, defaultPrice) : 0,
    id
  );
  return { ok: true };
}

export async function deleteItem(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const usage = db
    .prepare("SELECT COUNT(*) AS n FROM ticket_items WHERE item_id = ?")
    .get(id) as { n: number };
  if (usage.n > 0) return { ok: false, error: "item-in-use" };
  const result = db.prepare("DELETE FROM items WHERE id = ?").run(id);
  return { ok: result.changes > 0 };
}

export async function addTicketItem(input: {
  ticketId: string;
  itemId?: string;
  newItemName?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const ticket = db
    .prepare("SELECT id FROM tickets WHERE id = ?")
    .get(input.ticketId);
  if (!ticket) return { ok: false, error: "not-found" };

  let itemId = input.itemId;
  if (!itemId) {
    const name = (input.newItemName ?? "").trim();
    if (!name) return { ok: false, error: "itemRequired" };
    const existing = db
      .prepare("SELECT id FROM items WHERE LOWER(name) = LOWER(?)")
      .get(name) as Row | undefined;
    if (existing) {
      itemId = String(existing.id);
    } else {
      const created = await createItem(name, input.unitPrice);
      if (!created.ok || !created.item) return { ok: false, error: "generic" };
      itemId = created.item.id;
    }
  } else {
    const item = db.prepare("SELECT id FROM items WHERE id = ?").get(itemId);
    if (!item) return { ok: false, error: "itemRequired" };
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ticket_items (id, ticket_id, item_id, quantity, unit_price, discount, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(ticket_id, item_id) DO UPDATE SET
       quantity = excluded.quantity,
       unit_price = excluded.unit_price,
       discount = excluded.discount`
  ).run(
    randomUUID(),
    input.ticketId,
    itemId,
    input.quantity,
    input.unitPrice,
    input.discount,
    now
  );
  db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(now, input.ticketId);
  publishAdminEvent(input.ticketId);
  return { ok: true };
}

export async function updateTicketItem(
  ticketId: string,
  itemId: string,
  quantity: number,
  unitPrice: number,
  discount: number
): Promise<{ ok: boolean }> {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE ticket_items SET quantity = ?, unit_price = ?, discount = ? WHERE ticket_id = ? AND item_id = ?"
    )
    .run(quantity, unitPrice, discount, ticketId, itemId);
  db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    ticketId
  );
  publishAdminEvent(ticketId);
  return { ok: result.changes > 0 };
}

export async function removeTicketItem(
  ticketId: string,
  itemId: string
): Promise<{ ok: boolean }> {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM ticket_items WHERE ticket_id = ? AND item_id = ?")
    .run(ticketId, itemId);
  db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    ticketId
  );
  publishAdminEvent(ticketId);
  return { ok: result.changes > 0 };
}

// ---- Service types ----

export async function listServiceTypes(): Promise<ServiceType[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM service_types ORDER BY name ASC")
    .all() as Row[];
  return rows.map(rowToServiceType);
}

export async function createServiceType(
  name: string,
  defaultPrice = 0
): Promise<{ ok: boolean; error?: string; serviceType?: ServiceType }> {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM service_types WHERE LOWER(name) = LOWER(?)")
    .get(name) as Row | undefined;
  if (existing) return { ok: false, error: "duplicate-service-type" };
  const serviceType: ServiceType = {
    id: randomUUID(),
    name,
    defaultPrice: Number.isFinite(defaultPrice) ? Math.max(0, defaultPrice) : 0,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO service_types (id, name, default_price, created_at) VALUES (?, ?, ?, ?)"
  ).run(
    serviceType.id,
    serviceType.name,
    serviceType.defaultPrice,
    serviceType.createdAt
  );
  return { ok: true, serviceType };
}

export async function updateServiceType(
  id: string,
  name: string,
  defaultPrice: number
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM service_types WHERE id = ?")
    .get(id) as Row | undefined;
  if (!row) return { ok: false, error: "not-found" };
  const clash = db
    .prepare("SELECT id FROM service_types WHERE LOWER(name) = LOWER(?) AND id != ?")
    .get(name, id) as Row | undefined;
  if (clash) return { ok: false, error: "duplicate-service-type" };
  db.prepare(
    "UPDATE service_types SET name = ?, default_price = ? WHERE id = ?"
  ).run(
    name,
    Number.isFinite(defaultPrice) ? Math.max(0, defaultPrice) : 0,
    id
  );
  return { ok: true };
}

export async function deleteServiceType(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const usage = db
    .prepare("SELECT COUNT(*) AS n FROM ticket_services WHERE service_type_id = ?")
    .get(id) as { n: number };
  if (usage.n > 0) return { ok: false, error: "service-type-in-use" };
  const result = db.prepare("DELETE FROM service_types WHERE id = ?").run(id);
  return { ok: result.changes > 0 };
}

export async function addTicketService(input: {
  ticketId: string;
  serviceTypeId?: string;
  newServiceName?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const ticket = db
    .prepare("SELECT id FROM tickets WHERE id = ?")
    .get(input.ticketId);
  if (!ticket) return { ok: false, error: "not-found" };

  let serviceTypeId = input.serviceTypeId;
  if (!serviceTypeId) {
    const name = (input.newServiceName ?? "").trim();
    if (!name) return { ok: false, error: "serviceRequired" };
    const existing = db
      .prepare("SELECT id FROM service_types WHERE LOWER(name) = LOWER(?)")
      .get(name) as Row | undefined;
    if (existing) {
      serviceTypeId = String(existing.id);
    } else {
      const created = await createServiceType(name, input.unitPrice);
      if (!created.ok || !created.serviceType) {
        return { ok: false, error: "generic" };
      }
      serviceTypeId = created.serviceType.id;
    }
  } else {
    const row = db
      .prepare("SELECT id FROM service_types WHERE id = ?")
      .get(serviceTypeId);
    if (!row) return { ok: false, error: "serviceRequired" };
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ticket_services (id, ticket_id, service_type_id, quantity, unit_price, discount, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(ticket_id, service_type_id) DO UPDATE SET
       quantity = excluded.quantity,
       unit_price = excluded.unit_price,
       discount = excluded.discount`
  ).run(
    randomUUID(),
    input.ticketId,
    serviceTypeId,
    input.quantity,
    input.unitPrice,
    input.discount,
    now
  );
  db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(
    now,
    input.ticketId
  );
  publishAdminEvent(input.ticketId);
  return { ok: true };
}

export async function updateTicketService(
  ticketId: string,
  serviceTypeId: string,
  quantity: number,
  unitPrice: number,
  discount: number
): Promise<{ ok: boolean }> {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE ticket_services SET quantity = ?, unit_price = ?, discount = ? WHERE ticket_id = ? AND service_type_id = ?"
    )
    .run(quantity, unitPrice, discount, ticketId, serviceTypeId);
  db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    ticketId
  );
  publishAdminEvent(ticketId);
  return { ok: result.changes > 0 };
}

export async function removeTicketService(
  ticketId: string,
  serviceTypeId: string
): Promise<{ ok: boolean }> {
  const db = getDb();
  const result = db
    .prepare(
      "DELETE FROM ticket_services WHERE ticket_id = ? AND service_type_id = ?"
    )
    .run(ticketId, serviceTypeId);
  db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    ticketId
  );
  publishAdminEvent(ticketId);
  return { ok: result.changes > 0 };
}

export async function assignComplaint(
  code: string,
  adminId: string
): Promise<Complaint | null> {
  const db = getDb();
  const complaint = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row | undefined;
  if (!complaint) return null;
  db.prepare(
    "UPDATE complaints SET assigned_to = ?, updated_at = ? WHERE id = ?"
  ).run(adminId, new Date().toISOString(), String(complaint.id));
  const updated = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row;
  publishAdminEvent(code);
  return rowToComplaint(updated);
}

export async function releaseComplaint(code: string): Promise<Complaint | null> {
  const db = getDb();
  const complaint = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row | undefined;
  if (!complaint) return null;
  db.prepare(
    "UPDATE complaints SET assigned_to = NULL, updated_at = ? WHERE id = ?"
  ).run(new Date().toISOString(), String(complaint.id));
  const updated = db
    .prepare("SELECT * FROM complaints WHERE LOWER(code) = LOWER(?)")
    .get(code) as Row;
  publishAdminEvent(code);
  return rowToComplaint(updated);
}

// ---- Units ----

export async function listUnits(): Promise<Unit[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM units ORDER BY name ASC").all() as Row[];
  return rows.map(rowToUnit);
}

export async function getUnitById(id: string): Promise<Unit | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM units WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToUnit(row) : null;
}

export async function getUnitByName(name: string): Promise<Unit | null> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM units WHERE LOWER(name) = LOWER(?)")
    .get(name) as Row | undefined;
  return row ? rowToUnit(row) : null;
}

export async function createUnit(
  name: string,
  cnpj?: string,
  companyId?: string
): Promise<Unit> {
  const db = getDb();
  const unit: Unit = {
    id: randomUUID(),
    name,
    cnpj: cnpj || undefined,
    companyId: companyId || undefined,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO units (id, name, cnpj, company_id, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(unit.id, unit.name, cnpj || null, companyId || null, unit.createdAt);
  return unit;
}

export async function deleteUnit(id: string): Promise<boolean> {
  const db = getDb();
  return inTransaction(() => {
    db.prepare("UPDATE tickets SET unit_id = NULL WHERE unit_id = ?").run(id);
    db.prepare("UPDATE complaints SET unit_id = NULL WHERE unit_id = ?").run(id);
    const result = db.prepare("DELETE FROM units WHERE id = ?").run(id);
    return result.changes > 0;
  });
}

export async function renameUnit(
  id: string,
  name: string,
  cnpj?: string,
  companyId?: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const unit = db.prepare("SELECT * FROM units WHERE id = ?").get(id) as Row | undefined;
  if (!unit) return { ok: false, error: "not-found" };
  const existing = db
    .prepare("SELECT * FROM units WHERE LOWER(name) = LOWER(?) AND id != ?")
    .get(name, id) as Row | undefined;
  if (existing) return { ok: false, error: "duplicate-unit" };
  db.prepare(
    "UPDATE units SET name = ?, cnpj = ?, company_id = ? WHERE id = ?"
  ).run(name, cnpj || null, companyId || null, id);
  return { ok: true };
}

// ---- Areas ----

export async function listAreas(): Promise<Area[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM areas ORDER BY name ASC").all() as Row[];
  return rows.map(rowToArea);
}

export async function getAreaById(id: string): Promise<Area | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM areas WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? rowToArea(row) : null;
}

export async function getAreaByName(name: string): Promise<Area | null> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM areas WHERE LOWER(name) = LOWER(?)")
    .get(name) as Row | undefined;
  return row ? rowToArea(row) : null;
}

export async function createArea(name: string): Promise<Area> {
  const db = getDb();
  const area: Area = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  db.prepare("INSERT INTO areas (id, name, created_at) VALUES (?, ?, ?)").run(
    area.id,
    area.name,
    area.createdAt
  );
  return area;
}

export async function renameArea(
  id: string,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const area = db.prepare("SELECT * FROM areas WHERE id = ?").get(id) as
    | Row
    | undefined;
  if (!area) return { ok: false, error: "not-found" };
  const existing = db
    .prepare("SELECT * FROM areas WHERE LOWER(name) = LOWER(?) AND id != ?")
    .get(name, id) as Row | undefined;
  if (existing) return { ok: false, error: "duplicate-area" };
  db.prepare("UPDATE areas SET name = ? WHERE id = ?").run(name, id);
  return { ok: true };
}

export async function deleteArea(id: string): Promise<boolean> {
  const db = getDb();
  return inTransaction(() => {
    db.prepare("UPDATE tickets SET area_id = NULL WHERE area_id = ?").run(id);
    const result = db.prepare("DELETE FROM areas WHERE id = ?").run(id);
    return result.changes > 0;
  });
}

// ---- Settings ----

export async function getSettings(): Promise<Settings> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM settings WHERE id = 'main'").get() as
    | Row
    | undefined;
  const digits = Number(row?.matricula_digits);
  return {
    logoPath: row?.logo_path ? String(row.logo_path) : null,
    matriculaDigits: Number.isInteger(digits) && digits > 0 ? digits : 4,
  };
}

export async function setLogoPath(logoPath: string | null): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE settings SET logo_path = ? WHERE id = 'main'").run(
    logoPath
  );
}

export async function setMatriculaDigits(digits: number): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE settings SET matricula_digits = ? WHERE id = 'main'").run(
    digits
  );
}

// ---- Companies (service providers) ----

function rowToCompany(row: Row): Company {
  const s = (v: unknown, fallback = ""): string =>
    v == null || v === "" ? fallback : String(v);
  return {
    id: String(row.id),
    name: s(row.name),
    cnpj: s(row.cnpj),
    addressStreet: s(row.address_street),
    addressNumber: s(row.address_number),
    addressNeighborhood: s(row.address_neighborhood),
    phone: s(row.phone),
    formCode: s(row.form_code),
    logoPath: row.logo_path ? String(row.logo_path) : null,
    createdAt: String(row.created_at),
  };
}

// The primary company: the oldest row, used as the fallback O.S. header when a
// ticket's unit has no company of its own, and on public pages. Falls back to
// the legacy COMPANY_* env vars only when no company row exists at all (should
// not happen post-migration, since initSchema always seeds one).
export async function getPrimaryCompany(): Promise<Company> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM companies ORDER BY created_at ASC LIMIT 1")
    .get() as Row | undefined;
  if (row) return rowToCompany(row);
  const s = (fallback: string) => fallback;
  return {
    id: "",
    name: s(process.env.COMPANY_NAME ?? ""),
    cnpj: (process.env.COMPANY_CNPJ ?? "").replace(/\D/g, ""),
    addressStreet: process.env.COMPANY_ADDRESS ?? "",
    addressNumber: "",
    addressNeighborhood: "",
    phone: (process.env.COMPANY_PHONE ?? "").replace(/\D/g, ""),
    formCode: "",
    logoPath: null,
    createdAt: new Date().toISOString(),
  };
}

export async function listCompanies(): Promise<Company[]> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM units u WHERE u.company_id = c.id) AS unit_count
       FROM companies c ORDER BY c.name ASC`
    )
    .all() as Row[];
  return rows.map((row) => ({
    ...rowToCompany(row),
    unitCount: Number(row.unit_count ?? 0),
  }));
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM companies WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? rowToCompany(row) : null;
}

export interface SaveCompanyInput {
  id?: string;
  name: string;
  cnpj: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  phone: string;
  formCode: string;
  logoPath?: string | null;
}

export async function saveCompany(input: SaveCompanyInput): Promise<Company> {
  const db = getDb();
  const setLogo = input.logoPath !== undefined;
  if (input.id) {
    db.prepare(
      `UPDATE companies SET
         name = ?, cnpj = ?, address_street = ?, address_number = ?,
         address_neighborhood = ?, phone = ?, form_code = ?
         ${setLogo ? ", logo_path = ?" : ""}
       WHERE id = ?`
    ).run(
      ...[
        input.name,
        input.cnpj,
        input.addressStreet,
        input.addressNumber,
        input.addressNeighborhood,
        input.phone,
        input.formCode,
        ...(setLogo ? [input.logoPath ?? null] : []),
        input.id,
      ]
    );
    publishAdminEvent("company");
    return (await getCompanyById(input.id))!;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO companies
       (id, name, cnpj, address_street, address_number, address_neighborhood, phone, form_code, logo_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.cnpj,
    input.addressStreet,
    input.addressNumber,
    input.addressNeighborhood,
    input.phone,
    input.formCode,
    setLogo ? input.logoPath ?? null : null,
    new Date().toISOString()
  );
  publishAdminEvent("company");
  return (await getCompanyById(id))!;
}

export async function deleteCompany(id: string): Promise<boolean> {
  const db = getDb();
  return inTransaction(() => {
    db.prepare("UPDATE units SET company_id = NULL WHERE company_id = ?").run(id);
    const result = db.prepare("DELETE FROM companies WHERE id = ?").run(id);
    publishAdminEvent("company");
    return result.changes > 0;
  });
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

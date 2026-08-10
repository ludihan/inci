import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { hashPassword } from "./password";
import type {
  Admin,
  Complaint,
  ComplaintResponse,
  DB,
  Ticket,
  TicketMessage,
  TicketType,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => undefined);
  return next;
}

export function seedDB(): DB {
  const superAdmin: Admin = {
    id: randomUUID(),
    name: "Administrador",
    username: "admin",
    passwordHash: hashPassword("admin123"),
    role: "superadmin",
    permissions: ["it", "maintenance", "complaints"],
    createdAt: new Date().toISOString(),
  };
  return {
    admins: [superAdmin],
    tickets: [],
    complaints: [],
  };
}

function readDB(): DB {
  if (!existsSync(DB_PATH)) {
    const seed = seedDB();
    writeDB(seed);
    return seed;
  }
  try {
    const raw = readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as DB;
    if (!parsed.admins || !parsed.tickets || !parsed.complaints) {
      throw new Error("invalid db file");
    }
    return parsed;
  } catch {
    const seed = seedDB();
    writeDB(seed);
    return seed;
  }
}

function writeDB(db: DB): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
  renameSync(tmp, DB_PATH);
}

async function mutate<T>(
  fn: (db: DB) => { db: DB; result: T }
): Promise<T> {
  return enqueue(async () => {
    const db = readDB();
    const { db: next, result } = fn(db);
    writeDB(next);
    return result;
  });
}

export async function getDB(): Promise<DB> {
  return readDB();
}

// ---- Tickets ----

export async function createTicket(input: {
  type: TicketType;
  cpf: string;
  subject: string;
  message: string;
  photoPath: string;
}): Promise<Ticket> {
  return mutate((db) => {
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: `TCK-${randomUUID().slice(0, 8).toUpperCase()}`,
      type: input.type,
      cpf: input.cpf,
      subject: input.subject,
      status: "open",
      messages: [
        {
          id: randomUUID(),
          content: input.message,
          photoPath: input.photoPath,
          sender: "user",
          action: "open",
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    db.tickets.unshift(ticket);
    return { db, result: ticket };
  });
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const db = await getDB();
  return db.tickets.find((t) => t.id === id) ?? null;
}

export async function getTicketsByCpf(cpf: string): Promise<Ticket[]> {
  const db = await getDB();
  return db.tickets
    .filter((t) => t.cpf === cpf)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.id === id);
    if (!ticket) return { db, result: null };
    const message: TicketMessage = {
      id: randomUUID(),
      content: input.content,
      photoPath: input.photoPath,
      sender: input.sender,
      senderName: input.senderName,
      action: input.action,
      createdAt: new Date().toISOString(),
    };
    ticket.messages.push(message);
    ticket.updatedAt = message.createdAt;
    if (input.action === "close") ticket.status = "closed";
    if (input.action === "open") ticket.status = "open";
    return { db, result: ticket };
  });
}

// ---- Complaints ----

export async function createComplaint(input: {
  content: string;
  photoPath?: string;
  code: string;
}): Promise<Complaint> {
  return mutate((db) => {
    const now = new Date().toISOString();
    const complaint: Complaint = {
      id: randomUUID(),
      code: input.code,
      content: input.content,
      photoPath: input.photoPath,
      status: "open",
      responses: [],
      createdAt: now,
      updatedAt: now,
    };
    db.complaints.unshift(complaint);
    return { db, result: complaint };
  });
}

export async function getComplaintByCode(code: string): Promise<Complaint | null> {
  const db = await getDB();
  return (
    db.complaints.find(
      (c) => c.code.toLowerCase() === code.toLowerCase()
    ) ?? null
  );
}

export async function getComplaintById(id: string): Promise<Complaint | null> {
  const db = await getDB();
  return db.complaints.find((c) => c.id === id) ?? null;
}

export async function addComplaintResponse(
  code: string,
  input: { content: string; sender: "user" | "admin"; senderName?: string }
): Promise<Complaint | null> {
  return mutate((db) => {
    const complaint = db.complaints.find(
      (c) => c.code.toLowerCase() === code.toLowerCase()
    );
    if (!complaint) return { db, result: null };
    const response: ComplaintResponse = {
      id: randomUUID(),
      content: input.content,
      sender: input.sender,
      senderName: input.senderName,
      createdAt: new Date().toISOString(),
    };
    complaint.responses.push(response);
    complaint.updatedAt = response.createdAt;
    return { db, result: complaint };
  });
}

export async function setComplaintStatus(
  code: string,
  status: "open" | "closed"
): Promise<Complaint | null> {
  return mutate((db) => {
    const complaint = db.complaints.find(
      (c) => c.code.toLowerCase() === code.toLowerCase()
    );
    if (!complaint) return { db, result: null };
    complaint.status = status;
    complaint.updatedAt = new Date().toISOString();
    return { db, result: complaint };
  });
}

// ---- Admins ----

export async function getAdminById(id: string): Promise<Admin | null> {
  const db = await getDB();
  return db.admins.find((a) => a.id === id) ?? null;
}

export async function getAdminByUsername(username: string): Promise<Admin | null> {
  const db = await getDB();
  return (
    db.admins.find(
      (a) => a.username.toLowerCase() === username.toLowerCase()
    ) ?? null
  );
}

export async function listAdmins(): Promise<Admin[]> {
  const db = await getDB();
  return [...db.admins].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
  return mutate((db) => {
    const admin: Admin = {
      id: randomUUID(),
      name: input.name,
      username: input.username,
      passwordHash: hashPassword(input.password),
      role: input.role,
      permissions: input.permissions,
      createdAt: new Date().toISOString(),
    };
    db.admins.push(admin);
    return { db, result: { ok: true as const, admin } };
  });
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
  return mutate<{ ok: boolean; error?: string }>(
    (db): { db: DB; result: { ok: boolean; error?: string } } => {
      const admin = db.admins.find((a) => a.id === id);
      if (!admin) return { db, result: { ok: false, error: "not-found" } };
      if (patch.name !== undefined) admin.name = patch.name;
      if (patch.username !== undefined) admin.username = patch.username;
      if (patch.role !== undefined) admin.role = patch.role;
      if (patch.permissions !== undefined) admin.permissions = patch.permissions;
      if (patch.password && patch.password.length >= 6) {
        admin.passwordHash = hashPassword(patch.password);
      }
      return { db, result: { ok: true } };
    }
  );
}

export async function deleteAdmin(id: string): Promise<boolean> {
  return mutate((db) => {
    const index = db.admins.findIndex((a) => a.id === id);
    if (index === -1) return { db, result: false };
    db.admins.splice(index, 1);
    return { db, result: true };
  });
}

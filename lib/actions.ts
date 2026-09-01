"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasLocale } from "./i18n";
import {
  getTicketById,
  createTicket as storeCreateTicket,
  createComplaint as storeCreateComplaint,
  addTicketMessage as storeAddTicketMessage,
  addComplaintResponse as storeAddComplaintResponse,
  setComplaintStatus as storeSetComplaintStatus,
  getComplaintByCode,
  assignTicket as storeAssignTicket,
  releaseTicket as storeReleaseTicket,
  assignComplaint as storeAssignComplaint,
  releaseComplaint as storeReleaseComplaint,
  addTicketAssignment as storeAddTicketAssignment,
  addComplaintAssignment as storeAddComplaintAssignment,
  getPlaceById,
  getPlaceByName,
  createPlace as storeCreatePlace,
  deletePlace as storeDeletePlace,
  renamePlace as storeRenamePlace,
  getSettings,
  setLogoPath,
  getAdminByUsername,
  getAdminById,
  createAdmin as storeCreateAdmin,
  updateAdmin as storeUpdateAdmin,
  deleteAdmin as storeDeleteAdmin,
} from "./store";
import {
  saveImage,
  saveAttachment,
  saveSignature,
  deleteImage,
  MAX_IMAGES_PER_MESSAGE,
  MAX_VIDEOS_PER_MESSAGE,
} from "./uploads";
import { isValidCpf, onlyDigits, generateComplaintCode } from "./utils";
import { createPowChallenge, verifyPowSolution, type PowChallenge } from "./pow";
import { verifyPassword } from "./password";
import { features, ticketsEnabled } from "./features";
import { getDb } from "./db";
import {
  SQL_QUERY_MAX_LENGTH,
  NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
} from "./limits";
import {
  createSession,
  deleteSession,
  getCurrentAdmin,
  hasPermission,
  isSuperAdmin,
  moduleForTicketType,
} from "./auth";
import type { Admin, ComplaintStatus, Module } from "./types";

export type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function lang(formData: FormData): string {
  const value = str(formData, "lang");
  return hasLocale(value) ? value : "pt";
}

function optionalNum(formData: FormData, key: string): number | undefined {
  const raw = str(formData, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function getPowChallenge(): Promise<PowChallenge> {
  return createPowChallenge();
}

function checkPow(formData: FormData): { error?: string } {
  const token = str(formData, "powToken");
  const solution = str(formData, "powSolution");
  if (!token || !solution) return { error: "powRequired" };
  if (!verifyPowSolution(token, solution)) return { error: "powInvalid" };
  return {};
}

type Attachment = { path: string; kind: "image" | "video" };

async function attachmentsFromForm(
  formData: FormData
): Promise<{ attachments?: Attachment[]; error?: string }> {
  const imageFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const videoFiles = formData
    .getAll("videos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (imageFiles.length > MAX_IMAGES_PER_MESSAGE) return { error: "tooManyImages" };
  if (videoFiles.length > MAX_VIDEOS_PER_MESSAGE) return { error: "tooManyVideos" };

  const saved: Attachment[] = [];
  const queue: { file: File; kind: "image" | "video" }[] = [
    ...imageFiles.map((file) => ({ file, kind: "image" as const })),
    ...videoFiles.map((file) => ({ file, kind: "video" as const })),
  ];

  for (const item of queue) {
    const result = await saveAttachment(item.file, item.kind);
    if (!result.ok) {
      for (const s of saved) await deleteImage(s.path);
      return { error: result.error };
    }
    saved.push({ path: result.path, kind: item.kind });
  }

  return { attachments: saved };
}

// ---- User: tickets ----

export async function createTicket(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const type = str(formData, "type");
  const cpf = onlyDigits(str(formData, "cpf"));
  const subject = str(formData, "subject");
  const message = str(formData, "message");
  const placeId = str(formData, "placeId");

  if (cpf.length === 0) return { error: "cpfRequired" };
  if (!isValidCpf(cpf)) return { error: "cpfInvalid" };
  if (!subject) return { error: "subjectRequired" };
  if (subject.length > NAME_MAX_LENGTH) return { error: "textTooLong" };
  if (!message) return { error: "messageRequired" };
  if (message.length > MESSAGE_MAX_LENGTH) return { error: "textTooLong" };
  if (type !== "it" && type !== "maintenance") return { error: "generic" };
  if (!ticketsEnabled) return { error: "generic" };
  if (
    (type === "it" && !features.itTicketsEnabled) ||
    (type === "maintenance" && !features.maintenanceTicketsEnabled)
  ) {
    return { error: "generic" };
  }
  if (!placeId) return { error: "placeRequired" };
  const place = await getPlaceById(placeId);
  if (!place) return { error: "placeInvalid" };

  const powResult = checkPow(formData);
  if (powResult.error) return { error: powResult.error };

  const attachmentsResult = await attachmentsFromForm(formData);
  if (attachmentsResult.error === "invalid-type") return { error: "invalidFileType" };
  if (attachmentsResult.error === "too-large") return { error: "fileTooLarge" };
  if (attachmentsResult.error === "tooManyImages") return { error: "tooManyImages" };
  if (attachmentsResult.error === "tooManyVideos") return { error: "tooManyVideos" };
  if (!attachmentsResult.attachments || attachmentsResult.attachments.length === 0) {
    return { error: "attachmentsRequired" };
  }

  const ticket = await storeCreateTicket({
    type,
    cpf,
    subject,
    message,
    placeId,
    attachments: attachmentsResult.attachments,
  });

  redirect(`/${l}/track/ticket/${ticket.id}?cpf=${encodeURIComponent(cpf)}`);
}

export async function addTicketMessage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const ticketId = str(formData, "ticketId");
  const cpf = onlyDigits(str(formData, "cpf"));
  const content = str(formData, "content");

  const ticket = await getTicketById(ticketId);
  if (!ticket) return { error: "notFound" };
  if (ticket.cpf !== cpf) return { error: "wrongCpf" };
  if (!content) return { error: "messageRequired" };
  if (content.length > MESSAGE_MAX_LENGTH) return { error: "textTooLong" };

  const powResult = checkPow(formData);
  if (powResult.error) return { error: powResult.error };

  const attachmentsResult = await attachmentsFromForm(formData);
  if (attachmentsResult.error) return { error: "generic" };

  await storeAddTicketMessage(ticketId, {
    content,
    attachments: attachmentsResult.attachments,
    sender: "user",
    action: "message",
  });

  redirect(`/${l}/track/ticket/${ticketId}?cpf=${encodeURIComponent(cpf)}`);
}

export async function userTicketTransition(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const ticketId = str(formData, "ticketId");
  const cpf = onlyDigits(str(formData, "cpf"));
  const transition = str(formData, "transition") as "close" | "open";
  const content = str(formData, "content");

  const ticket = await getTicketById(ticketId);
  if (!ticket) return { error: "notFound" };
  if (ticket.cpf !== cpf) return { error: "wrongCpf" };
  if (transition !== "close" && transition !== "open")
    return { error: "generic" };
  if (!content) return { error: "messageRequired" };
  if (content.length > MESSAGE_MAX_LENGTH) return { error: "textTooLong" };

  const powResult = checkPow(formData);
  if (powResult.error) return { error: powResult.error };

  const attachmentsResult = await attachmentsFromForm(formData);
  if (attachmentsResult.error === "invalid-type") return { error: "invalidFileType" };
  if (attachmentsResult.error === "too-large") return { error: "fileTooLarge" };
  if (attachmentsResult.error === "tooManyImages") return { error: "tooManyImages" };
  if (attachmentsResult.error === "tooManyVideos") return { error: "tooManyVideos" };

  let signaturePath: string | undefined;
  let geoLat: number | undefined;
  let geoLng: number | undefined;
  if (transition === "close") {
    signaturePath = (await saveSignature(str(formData, "signature"))) ?? undefined;
    if (!signaturePath) return { error: "signatureRequired" };
    geoLat = optionalNum(formData, "geoLat");
    geoLng = optionalNum(formData, "geoLng");
  }

  await storeAddTicketMessage(ticketId, {
    content,
    attachments: attachmentsResult.attachments,
    sender: "user",
    action: transition,
    signaturePath,
    geoLat,
    geoLng,
  });

  redirect(`/${l}/track/ticket/${ticketId}?cpf=${encodeURIComponent(cpf)}`);
}

// ---- User: complaints ----

export async function createComplaint(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const subject = str(formData, "subject");
  const content = str(formData, "content");
  const placeId = str(formData, "placeId");

  if (!features.complaintsEnabled) return { error: "generic" };
  if (!subject) return { error: "subjectRequired" };
  if (!content) return { error: "messageRequired" };
  if (!placeId) return { error: "placeRequired" };
  const place = await getPlaceById(placeId);
  if (!place) return { error: "placeInvalid" };

  const powResult = checkPow(formData);
  if (powResult.error) return { error: powResult.error };

  const attachmentsResult = await attachmentsFromForm(formData);
  if (attachmentsResult.error === "invalid-type") return { error: "invalidFileType" };
  if (attachmentsResult.error === "too-large") return { error: "fileTooLarge" };
  if (attachmentsResult.error === "tooManyImages") return { error: "tooManyImages" };
  if (attachmentsResult.error === "tooManyVideos") return { error: "tooManyVideos" };

  let code = generateComplaintCode();
  while (await getComplaintByCode(code)) {
    code = generateComplaintCode();
  }

  const complaint = await storeCreateComplaint({
    subject,
    content,
    attachments: attachmentsResult.attachments,
    code,
    placeId,
  });

  redirect(`/${l}/track/complaint/${complaint.code}`);
}

export async function submitComplaintReply(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const code = str(formData, "code");
  const content = str(formData, "content");

  const complaint = await getComplaintByCode(code);
  if (!complaint) return { error: "notFound" };
  if (complaint.status === "closed") return { error: "replyClosed" };
  if (!content) return { error: "messageRequired" };

  const powResult = checkPow(formData);
  if (powResult.error) return { error: powResult.error };

  const attachmentsResult = await attachmentsFromForm(formData);
  if (attachmentsResult.error) return { error: "generic" };

  await storeAddComplaintResponse(code, {
    content,
    attachments: attachmentsResult.attachments,
    sender: "user",
  });

  redirect(`/${l}/track/complaint/${complaint.code}`);
}

// ---- Admin: tickets ----

async function requireAdminForModule(module: Module) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  if (!hasPermission(admin, module)) {
    redirect("/admin");
  }
  return admin;
}

async function requireComplaintAdmin(
  l: string,
  code: string
): Promise<Admin | null> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect(`/${l}/admin/login`);
  }
  const complaint = await getComplaintByCode(code);
  if (!complaint) return null;
  if (!isSuperAdmin(admin) && complaint.assignedToId !== admin.id) {
    redirect(`/${l}/admin`);
  }
  return admin;
}

export async function adminAddTicketMessage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const ticketId = str(formData, "ticketId");
  const content = str(formData, "content");

  const ticket = await getTicketById(ticketId);
  if (!ticket) return { error: "notFound" };

  const admin = await requireAdminForModule(moduleForTicketType(ticket.type));
  if (!content) return { error: "messageRequired" };
  if (content.length > MESSAGE_MAX_LENGTH) return { error: "textTooLong" };

  const attachmentsResult = await attachmentsFromForm(formData);
  if (attachmentsResult.error) return { error: "generic" };

  await storeAddTicketMessage(ticketId, {
    content,
    attachments: attachmentsResult.attachments,
    sender: "admin",
    senderName: admin.name,
    action: "message",
  });

  revalidatePath(`/${l}/admin/tickets/${ticketId}`);
  revalidatePath(`/${l}/admin/tickets`);
}

export async function adminTicketTransition(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const ticketId = str(formData, "ticketId");
  const transition = str(formData, "transition") as "close" | "open";
  const content = str(formData, "content");

  const ticket = await getTicketById(ticketId);
  if (!ticket) return { error: "notFound" };

  const admin = await requireAdminForModule(moduleForTicketType(ticket.type));
  if (transition !== "close" && transition !== "open")
    return { error: "generic" };
  if (!content) return { error: "messageRequired" };
  if (content.length > MESSAGE_MAX_LENGTH) return { error: "textTooLong" };

  const attachmentsResult = await attachmentsFromForm(formData);
  if (attachmentsResult.error === "invalid-type") return { error: "invalidFileType" };
  if (attachmentsResult.error === "too-large") return { error: "fileTooLarge" };
  if (attachmentsResult.error === "tooManyImages") return { error: "tooManyImages" };
  if (attachmentsResult.error === "tooManyVideos") return { error: "tooManyVideos" };

  let signaturePath: string | undefined;
  let geoLat: number | undefined;
  let geoLng: number | undefined;
  if (transition === "close") {
    signaturePath = (await saveSignature(str(formData, "signature"))) ?? undefined;
    if (!signaturePath) return { error: "signatureRequired" };
    geoLat = optionalNum(formData, "geoLat");
    geoLng = optionalNum(formData, "geoLng");
  }

  await storeAddTicketMessage(ticketId, {
    content,
    attachments: attachmentsResult.attachments,
    sender: "admin",
    senderName: admin.name,
    action: transition,
    signaturePath,
    geoLat,
    geoLng,
  });

  revalidatePath(`/${l}/admin/tickets/${ticketId}`);
  revalidatePath(`/${l}/admin/tickets`);
}

// ---- Admin: complaints ----

export async function adminAddComplaintResponse(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const code = str(formData, "code");
  const content = str(formData, "content");

  const complaint = await getComplaintByCode(code);
  if (!complaint) return { error: "notFound" };

  const admin = await requireComplaintAdmin(l, code);
  if (!admin) return { error: "notFound" };
  if (!content) return { error: "messageRequired" };

  await storeAddComplaintResponse(code, {
    content,
    sender: "admin",
    senderName: admin.name,
  });

  revalidatePath(`/${l}/admin/complaints/${code}`);
  revalidatePath(`/${l}/admin/complaints`);
}

export async function adminSetComplaintStatus(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const code = str(formData, "code");
  const status = str(formData, "status") as ComplaintStatus;
  const content = str(formData, "content");

  const complaint = await getComplaintByCode(code);
  if (!complaint) return { error: "notFound" };

  const admin = await requireComplaintAdmin(l, code);
  if (!admin) return { error: "notFound" };
  if (status !== "open" && status !== "closed") return { error: "generic" };
  if (!content) return { error: "statusContentRequired" };

  const attachmentsResult = await attachmentsFromForm(formData);
  if (attachmentsResult.error === "invalid-type") return { error: "invalidFileType" };
  if (attachmentsResult.error === "too-large") return { error: "fileTooLarge" };
  if (attachmentsResult.error === "tooManyImages") return { error: "tooManyImages" };
  if (attachmentsResult.error === "tooManyVideos") return { error: "tooManyVideos" };

  await storeSetComplaintStatus(
    code,
    status,
    content,
    admin.name,
    attachmentsResult.attachments
  );

  revalidatePath(`/${l}/admin/complaints/${code}`);
  revalidatePath(`/${l}/admin/complaints`);
}

// ---- Admin: assume ----

export async function assumeTicket(formData: FormData): Promise<void> {
  const l = lang(formData);
  const id = str(formData, "id");
  const ticket = await getTicketById(id);
  if (!ticket) return;
  const admin = await requireAdminForModule(moduleForTicketType(ticket.type));
  await storeAssignTicket(id, admin.id);
  await storeAddTicketAssignment(id, { action: "assume", actorName: admin.name });
  revalidatePath(`/${l}/admin/tickets/${id}`);
  revalidatePath(`/${l}/admin/tickets`);
}

export async function releaseTicket(formData: FormData): Promise<void> {
  const l = lang(formData);
  const id = str(formData, "id");
  const ticket = await getTicketById(id);
  if (!ticket) return;
  const admin = await requireAdminForModule(moduleForTicketType(ticket.type));
  await storeReleaseTicket(id);
  await storeAddTicketAssignment(id, { action: "release", actorName: admin.name });
  revalidatePath(`/${l}/admin/tickets/${id}`);
  revalidatePath(`/${l}/admin/tickets`);
}

export async function assumeComplaint(formData: FormData): Promise<void> {
  const l = lang(formData);
  const code = str(formData, "code");
  const admin = await requireComplaintAdmin(l, code);
  if (!admin) redirect(`/${l}/admin/complaints`);
  await storeAssignComplaint(code, admin.id);
  await storeAddComplaintAssignment(code, { action: "assume", actorName: admin.name });
  revalidatePath(`/${l}/admin/complaints/${code}`);
  revalidatePath(`/${l}/admin/complaints`);
}

export async function forwardComplaint(formData: FormData): Promise<void> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current) redirect(`/${l}/admin/login`);
  if (!isSuperAdmin(current)) redirect(`/${l}/admin`);

  const code = str(formData, "code");
  const adminId = str(formData, "adminId");
  const target = await getAdminById(adminId);
  if (!target) redirect(`/${l}/admin/complaints/${code}`);

  await storeAssignComplaint(code, target.id);
  await storeAddComplaintAssignment(code, {
    action: "forward",
    actorName: current.name,
    targetName: target.name,
  });
  revalidatePath(`/${l}/admin/complaints/${code}`);
  revalidatePath(`/${l}/admin/complaints`);
}

export async function releaseComplaint(formData: FormData): Promise<void> {
  const l = lang(formData);
  const code = str(formData, "code");
  const admin = await requireComplaintAdmin(l, code);
  if (!admin) redirect(`/${l}/admin/complaints`);
  await storeReleaseComplaint(code);
  await storeAddComplaintAssignment(code, { action: "release", actorName: admin.name });
  revalidatePath(`/${l}/admin/complaints/${code}`);
  revalidatePath(`/${l}/admin/complaints`);
}

// ---- Admin: auth ----

export async function login(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const username = str(formData, "username");
  const password = str(formData, "password");

  if (!username) return { error: "usernameRequired" };
  if (!password) return { error: "passwordRequired" };

  const admin = await getAdminByUsername(username);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return { error: "invalidCredentials" };
  }

  await createSession(admin.id);
  redirect(`/${l}/admin`);
}

export async function logout(formData: FormData): Promise<void> {
  const l = lang(formData);
  await deleteSession();
  redirect(`/${l}`);
}

// ---- Admin: places ----

export async function createPlace(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }

  const name = str(formData, "name");
  if (!name) return { error: "nameRequired" };

  const existing = await getPlaceByName(name);
  if (existing) return { error: "duplicate-place" };

  await storeCreatePlace(name);
  redirect(`/${l}/admin/places`);
}

export async function deletePlace(formData: FormData): Promise<void> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }
  const id = str(formData, "id");
  await storeDeletePlace(id);
  redirect(`/${l}/admin/places`);
}

export async function renamePlace(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return { error: "nameRequired" };

  const result = await storeRenamePlace(id, name);
  if (!result.ok) {
    if (result.error === "not-found") return { error: "notFound" };
    return { error: "duplicate-place" };
  }

  redirect(`/${l}/admin/places`);
}

// ---- Admin: settings ----

export async function updateLogo(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }

  const file = formData.get("logo");
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "logoRequired" };
  }
  const result = await saveImage(file as File);
  if (!result.ok) {
    if (result.error === "invalid-type") return { error: "invalidPhotoType" };
    if (result.error === "too-large") return { error: "photoTooLarge" };
    return { error: "generic" };
  }

  const settings = await getSettings();
  await setLogoPath(result.path);
  await deleteImage(settings.logoPath ?? undefined);

  redirect(`/${l}/admin/settings`);
}

export async function removeLogo(formData: FormData): Promise<void> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }

  const settings = await getSettings();
  await setLogoPath(null);
  await deleteImage(settings.logoPath ?? undefined);

  redirect(`/${l}/admin/settings`);
}

// ---- Admin: user management ----

export async function createAdmin(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }

  const name = str(formData, "name");
  const username = str(formData, "username");
  const password = str(formData, "password");
  const role = str(formData, "role") === "superadmin" ? "superadmin" : "admin";
  const permissions = (formData.getAll("permissions") as string[]).filter(
    (p): p is Module => p === "it" || p === "maintenance" 
  );

  if (!name || !username || !password) return { error: "missingFields" };
  if (password.length < 6) return { error: "passwordTooShort" };

  const result = await storeCreateAdmin({
    name,
    username,
    password,
    role,
    permissions,
  });
  if (!result.ok) return { error: result.error ?? "generic" };

  redirect(`/${l}/admin/users`);
}

export async function updateAdmin(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }

  const id = str(formData, "id");
  const name = str(formData, "name");
  const username = str(formData, "username");
  const password = str(formData, "password");
  const role = str(formData, "role") === "superadmin" ? "superadmin" : "admin";
  const permissions = (formData.getAll("permissions") as string[]).filter(
    (p): p is Module => p === "it" || p === "maintenance" 
  );

  if (!name || !username) return { error: "missingFields" };
  if (password && password.length < 6) return { error: "passwordTooShort" };

  const result = await storeUpdateAdmin(id, {
    name,
    username,
    password: password || undefined,
    role,
    permissions,
  });
  if (!result.ok) return { error: result.error ?? "generic" };

  redirect(`/${l}/admin/users`);
}

export async function deleteAdmin(
  formData: FormData
): Promise<void> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }
  const id = str(formData, "id");
  if (id === current.id) return;
  await storeDeleteAdmin(id);
  redirect(`/${l}/admin/users`);
}

// ---- Admin: SQL console ----

const SQL_ROW_RETURNING_KEYWORDS = ["SELECT", "PRAGMA", "EXPLAIN", "WITH"];

export type SqlActionState =
  | {
      ok: false;
      query: string;
      error: string;
    }
  | {
      ok: true;
      query: string;
      columns: string[];
      rows: Record<string, unknown>[];
      changes?: number;
      lastInsertRowid?: string;
      elapsedMs: number;
    }
  | undefined;

function serializeSqlValue(value: unknown): unknown {
  if (value instanceof Uint8Array) return `<blob: ${value.length} bytes>`;
  if (typeof value === "bigint") return value.toString();
  return value;
}

export async function runSqlQuery(
  _prev: SqlActionState,
  formData: FormData
): Promise<SqlActionState> {
  const l = lang(formData);
  const current = await getCurrentAdmin();
  if (!current || !isSuperAdmin(current)) {
    redirect(`/${l}/admin`);
  }

  const query = str(formData, "query");
  if (!query) return { ok: false, query, error: "empty" };
  if (query.length > SQL_QUERY_MAX_LENGTH) {
    return { ok: false, query, error: "tooLong" };
  }

  const trimmed = query.replace(/;\s*$/, "");
  const firstWord = trimmed.match(/^\s*(\w+)/)?.[1]?.toUpperCase() ?? "";
  const returnsRows = SQL_ROW_RETURNING_KEYWORDS.includes(firstWord);

  const db = getDb();
  const start = performance.now();
  try {
    const stmt = db.prepare(trimmed);
    if (returnsRows) {
      const rawRows = stmt.all() as Record<string, unknown>[];
      const columns = stmt.columns().map((c) => c.name as string);
      const rows = rawRows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(row)) out[key] = serializeSqlValue(row[key]);
        return out;
      });
      return { ok: true, query, columns, rows, elapsedMs: performance.now() - start };
    }
    const info = stmt.run();
    return {
      ok: true,
      query,
      columns: [],
      rows: [],
      changes: Number(info.changes),
      lastInsertRowid: String(info.lastInsertRowid),
      elapsedMs: performance.now() - start,
    };
  } catch (error) {
    return {
      ok: false,
      query,
      error: error instanceof Error ? error.message : "generic",
    };
  }
}

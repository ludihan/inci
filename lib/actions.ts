"use server";

import { redirect } from "next/navigation";
import { hasLocale } from "./i18n";
import {
  getTicketById,
  createTicket as storeCreateTicket,
  createComplaint as storeCreateComplaint,
  addTicketMessage as storeAddTicketMessage,
  addComplaintResponse as storeAddComplaintResponse,
  setComplaintStatus as storeSetComplaintStatus,
  getComplaintByCode,
  getPlaceById,
  getPlaceByName,
  createPlace as storeCreatePlace,
  deletePlace as storeDeletePlace,
  renamePlace as storeRenamePlace,
  getSettings,
  setLogoPath,
  getAdminByUsername,
  createAdmin as storeCreateAdmin,
  updateAdmin as storeUpdateAdmin,
  deleteAdmin as storeDeleteAdmin,
} from "./store";
import { saveImage, deleteImage } from "./uploads";
import { isValidCpf, onlyDigits, generateComplaintCode } from "./utils";
import { verifyPassword } from "./password";
import { features, ticketsEnabled } from "./features";
import {
  createSession,
  deleteSession,
  getCurrentAdmin,
  hasPermission,
  isSuperAdmin,
  moduleForTicketType,
} from "./auth";
import type { ComplaintStatus, Module } from "./types";

export type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function lang(formData: FormData): string {
  const value = str(formData, "lang");
  return hasLocale(value) ? value : "pt";
}

async function photoFromForm(
  formData: FormData
): Promise<{ path?: string; error?: string }> {
  const file = formData.get("photo");
  if (!file || typeof file === "string" || file.size === 0) {
    return { path: undefined };
  }
  const result = await saveImage(file as File);
  if (!result.ok) return { error: result.error };
  return { path: result.path };
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
  if (!message) return { error: "messageRequired" };
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

  const photo = await photoFromForm(formData);
  if (photo.error === "invalid-type") return { error: "invalidPhotoType" };
  if (photo.error === "too-large") return { error: "photoTooLarge" };
  if (!photo.path) return { error: "photoRequired" };

  const ticket = await storeCreateTicket({
    type,
    cpf,
    subject,
    message,
    placeId,
    photoPath: photo.path,
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

  const photo = await photoFromForm(formData);
  if (photo.error) return { error: "generic" };

  await storeAddTicketMessage(ticketId, {
    content,
    photoPath: photo.path,
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

  const photo = await photoFromForm(formData);
  if (photo.error === "invalid-type") return { error: "invalidPhotoType" };
  if (photo.error === "too-large") return { error: "photoTooLarge" };

  await storeAddTicketMessage(ticketId, {
    content,
    photoPath: photo.path,
    sender: "user",
    action: transition,
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

  const photo = await photoFromForm(formData);
  if (photo.error === "invalid-type") return { error: "invalidPhotoType" };
  if (photo.error === "too-large") return { error: "photoTooLarge" };

  let code = generateComplaintCode();
  while (await getComplaintByCode(code)) {
    code = generateComplaintCode();
  }

  const complaint = await storeCreateComplaint({
    subject,
    content,
    photoPath: photo.path,
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

  const photo = await photoFromForm(formData);
  if (photo.error === "invalid-type") return { error: "invalidPhotoType" };
  if (photo.error === "too-large") return { error: "photoTooLarge" };

  await storeAddComplaintResponse(code, {
    content,
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

  const photo = await photoFromForm(formData);
  if (photo.error) return { error: "generic" };

  await storeAddTicketMessage(ticketId, {
    content,
    photoPath: photo.path,
    sender: "admin",
    senderName: admin.name,
    action: "message",
  });

  redirect(`/${l}/admin/tickets/${ticketId}`);
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

  const photo = await photoFromForm(formData);
  if (photo.error === "invalid-type") return { error: "invalidPhotoType" };
  if (photo.error === "too-large") return { error: "photoTooLarge" };

  await storeAddTicketMessage(ticketId, {
    content,
    photoPath: photo.path,
    sender: "admin",
    senderName: admin.name,
    action: transition,
  });

  redirect(`/${l}/admin/tickets/${ticketId}`);
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

  const admin = await requireAdminForModule("complaints");
  if (!content) return { error: "messageRequired" };

  await storeAddComplaintResponse(code, {
    content,
    sender: "admin",
    senderName: admin.name,
  });

  redirect(`/${l}/admin/complaints/${code}`);
}

export async function adminSetComplaintStatus(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const l = lang(formData);
  const code = str(formData, "code");
  const status = str(formData, "status") as ComplaintStatus;

  const complaint = await getComplaintByCode(code);
  if (!complaint) return { error: "notFound" };

  await requireAdminForModule("complaints");
  if (status !== "open" && status !== "closed") return { error: "generic" };

  await storeSetComplaintStatus(code, status);

  redirect(`/${l}/admin/complaints/${code}`);
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
    (p): p is Module => p === "it" || p === "maintenance" || p === "complaints"
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
    (p): p is Module => p === "it" || p === "maintenance" || p === "complaints"
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

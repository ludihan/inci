import { EventEmitter } from "events";
import type { Module, TicketCriticality, TicketType } from "./types";

declare global {
  var __inciAdminEvents: EventEmitter | undefined;
}

const EVENT_NAME = "admin-changed";
const NOTIFICATION_EVENT = "admin-notification";

export interface AdminNotification {
  /** Only admins with permission over this module receive it. */
  module: Module;
  /** When set, only this admin receives it (e.g. the ticket's assignee). */
  adminId?: string;
  /** What happened; the text is built in the admin's own language (client). */
  kind: "new" | "message" | "closed" | "reopened";
  ticketId: string;
  ticketType: TicketType;
  criticality: TicketCriticality;
  requesterName: string;
  excerpt: string;
  /** Admin-panel path opened when the notification is clicked. */
  url: string;
  /** Notifications sharing a tag replace each other instead of stacking. */
  tag: string;
}

function emitter(): EventEmitter {
  if (!globalThis.__inciAdminEvents) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    globalThis.__inciAdminEvents = emitter;
  }
  return globalThis.__inciAdminEvents;
}

export function publishAdminEvent(detail: string): void {
  emitter().emit(EVENT_NAME, detail);
}

export function subscribeAdminEvents(
  listener: (detail: string) => void
): () => void {
  const target = emitter();
  target.on(EVENT_NAME, listener);
  return () => target.off(EVENT_NAME, listener);
}

export function publishAdminNotification(notification: AdminNotification): void {
  emitter().emit(NOTIFICATION_EVENT, notification);
}

export function subscribeAdminNotifications(
  listener: (notification: AdminNotification) => void
): () => void {
  const target = emitter();
  target.on(NOTIFICATION_EVENT, listener);
  return () => target.off(NOTIFICATION_EVENT, listener);
}

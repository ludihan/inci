import { EventEmitter } from "events";

declare global {
  var __inciAdminEvents: EventEmitter | undefined;
}

const EVENT_NAME = "admin-changed";

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

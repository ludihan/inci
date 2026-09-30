import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { subscribeAdminEvents, subscribeAdminNotifications } from "@/lib/events";
import { features } from "@/lib/features";
import { getAdminById } from "@/lib/store";
import type { Module } from "@/lib/types";

const MODULE_ENABLED: Record<Module, boolean> = {
  it: features.itTicketsEnabled,
  maintenance: features.maintenanceTicketsEnabled,
};

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let unsubscribeNotifications: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // A subscriber's controller can go bad (closed/errored) without a
      // clean `abort` — flaky network, a backgrounded mobile tab — and
      // `controller.enqueue` then throws. Since `publishAdminEvent` invokes
      // every listener synchronously via EventEmitter, an uncaught throw
      // here would both skip any other admins' listeners still queued
      // after this one and propagate back into the unrelated server
      // action that triggered the event. Every enqueue is guarded so a
      // dead connection only tears itself down.
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe?.();
        unsubscribeNotifications?.();
        try {
          controller.close();
        } catch {
          // already closed/errored
        }
      };

      const send = (event: string, data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          cleanup();
        }
      };

      unsubscribe = subscribeAdminEvents((detail) => {
        send("admin-changed", detail);
      });

      // The connection outlives any permission change made while it's open
      // (and the admin could even be deleted), so who may see a notification
      // is re-checked against the current record each time, not the one
      // loaded when the stream was opened.
      unsubscribeNotifications = subscribeAdminNotifications((notification) => {
        if (notification.adminId && notification.adminId !== admin.id) return;
        if (!MODULE_ENABLED[notification.module]) return;
        void getAdminById(admin.id).then((current) => {
          if (closed || !current) return;
          if (!hasPermission(current, notification.module)) return;
          const { kind, ticketId, ticketType, criticality, requesterName, excerpt, url, tag } =
            notification;
          send(
            "notification",
            JSON.stringify({ kind, ticketId, ticketType, criticality, requesterName, excerpt, url, tag })
          );
        }, () => {});
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 25000);

      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      clearInterval(heartbeat);
      unsubscribe?.();
      unsubscribeNotifications?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

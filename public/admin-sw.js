// Service worker used only to show admin-panel notifications. It has no
// `fetch` handler on purpose: it never intercepts or caches requests.
//
// Showing notifications through a registration (instead of
// `new Notification()`) is what makes them work on Android Chrome, where
// the page constructor throws.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function openNotificationTarget(url) {
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  // Reuse an open admin tab and let the page do a client-side navigation,
  // so it keeps its SSE connection and state. The login page has no
  // listener, so it doesn't count.
  const adminTab = windows.find((client) => {
    const { pathname } = new URL(client.url);
    return pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  });
  if (adminTab) {
    // Message first: `focus()` can reject (the browser decides whether the
    // click still grants focus), and that mustn't cost the navigation.
    adminTab.postMessage({ type: "admin-notification-click", url });
    await adminTab.focus().catch(() => {});
    return;
  }
  await self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || "/admin",
    self.location.origin
  ).href;
  event.waitUntil(openNotificationTarget(url));
});

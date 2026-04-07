const CACHE = "mesa-admin-v1";

// Cache the admin shell on install
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["/admin", "/admin/bookings", "/admin/guests", "/admin/slots", "/admin/tables"])
    )
  );
});

self.addEventListener("activate", (e) => {
  // Clear old caches
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Only handle navigation requests (page loads) — API calls always go to network
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});

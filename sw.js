// Service worker: network-first, so players always get your latest campaign.js when online,
// and the cached copy when offline. No version numbers to bump.
const CACHE = "hunters-codex";
const CORE = [
  "./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "data/srd-spells.js", "data/srd-rules.js", "data/campaign.js",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        // Cache good responses (including Google Fonts) for offline use.
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")))
  );
});

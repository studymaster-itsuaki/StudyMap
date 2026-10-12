const DIAGNOSTIC_VERSION = "sw-diag-20261012-1";
const CACHE = "studymap-beta2.3-audio-v2";
const BASE = new URL("./", self.location).pathname;
const PRECACHE = [
  "./", "index.html", "manifest.webmanifest", "core/studymap.css", "core/studymap.js",
  "core/pwa.js", "core/bgm.js", "core/bgm-diagnostic.js", "core/sfx.js", "assets/studymap-logo.svg",
  "assets/icon-192.png", "assets/icon-512.png", "elementary/", "junior/",
  "packages/japan/", "packages/japan/genre.html", "packages/japan/play.html",
  "packages/japan/specialty-learn.html", "packages/japan/image-credits.html",
  "packages/japan/data/specialties.js"
].map(path => new URL(path, self.location).pathname);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  // Diagnostic build: retain old caches as evidence. No cache deletion.
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  // Media range responses (206) cannot be stored with Cache.put().
  if (event.request.headers.has("range") || new URL(event.request.url).pathname.startsWith(BASE + "assets/audio/")) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {}));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === "navigate" ? caches.match(BASE) : undefined))));
});

// Read-only identity probe; never clears or rewrites caches.
self.addEventListener("message", event => {
  if(event.data?.type === "STUDYMAP_BGM_DIAGNOSTIC" && event.ports[0]){
    event.ports[0].postMessage({version: DIAGNOSTIC_VERSION, cache: CACHE});
  }
});

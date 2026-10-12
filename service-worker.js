const DIAGNOSTIC_VERSION = "sw-diag-20261012-2";
const CACHE = "studymap-beta2.3-audio-v3";
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
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(url => new Request(url, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  // Keep old caches as evidence, but fetch fallback reads only this version.
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  // Media range responses (206) cannot be stored with Cache.put().
  if (event.request.headers.has("range") || new URL(event.request.url).pathname.startsWith(BASE + "assets/audio/")) return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(BASE)) return;
  // fetch() with default cache mode can return fresh-but-old HTTP cache entries.
  const revalidate = event.request.mode === "navigate" ||
    url.pathname.endsWith(".html") || url.pathname.endsWith("/") ||
    (url.pathname.startsWith(BASE + "core/") && url.pathname.endsWith(".js"));
  const result = (async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(revalidate ? new Request(event.request, {cache: "no-cache"}) : event.request);
      if (response.ok) {
        try { await cache.put(event.request, response.clone()); } catch (_) {}
      }
      // HTTP errors stay errors: never substitute unrelated or outdated HTML.
      return response;
    } catch (_) {
      // Exact URL, including query: do not return the top page for another route.
      return await cache.match(event.request) || Response.error();
    }
  })();
  event.respondWith(result);
  event.waitUntil(result.then(() => {}, () => {}));
});

// Read-only identity probe; never clears or rewrites caches.
self.addEventListener("message", event => {
  if(event.data?.type === "STUDYMAP_BGM_DIAGNOSTIC" && event.ports[0]){
    event.ports[0].postMessage({version: DIAGNOSTIC_VERSION, cache: CACHE});
  }
});

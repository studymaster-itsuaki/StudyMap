const CACHE = "studymap-beta2-specialties-photos-v2";
const BASE = new URL("./", self.location).pathname;
const PRECACHE = [
  "./", "index.html", "manifest.webmanifest", "core/studymap.css", "core/studymap.js",
  "core/pwa.js", "core/bgm.js", "core/sfx.js", "assets/studymap-logo.svg",
  "assets/icon-192.png", "assets/icon-512.png", "elementary/", "junior/",
  "packages/japan/", "packages/japan/genre.html", "packages/japan/play.html",
  "packages/japan/specialty-learn.html", "packages/japan/image-credits.html",
  "packages/japan/data/specialties.js"
].map(path => new URL(path, self.location).pathname);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === "navigate" ? caches.match(BASE) : undefined))));
});

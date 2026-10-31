const CACHE = "studyhub-v2";
const FILES = ["./", "index.html", "style.css", "app.js", "manifest.json", "icon-192.png", "icon-512.png", "tutor.html", "tutor.js"];

// Lần đầu: lưu sẵn các file của app vào máy
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Có mạng thì lấy bản mới, mất mạng thì dùng bản đã lưu
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});

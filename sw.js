// فایل‌های همین دامنه: اول شبکه، بعد کش. فایل‌های CDN (بوت‌استرپ، آیکون، فونت): کش‌شده و به‌روزرسانی در پس‌زمینه.
// درخواست‌های API (script.google.com) هرگز کش نمی‌شوند.
var CACHE = 'honarestan-v2', CDN = 'honarestan-cdn-v1';
var ASSETS = ['./', './index.html', './config.js', './api-shim.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (a) { return c.add(a).catch(function () {}); }));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== CDN; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(CDN).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) {
          if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
          return r;
        }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); })
  );
});

/* Tidal Echo 鈥?service worker (offline shell + Web Push).
   IMPORTANT: bump CACHE on every front-end change, or installed clients keep the
   old shell (the precached index.html won't refresh until the SW reinstalls). */
const AI_NAME = "TA";              // push-title fallback; keep in sync with index.html CONFIG.AI_NAME
const CACHE = "collide-tidal-v222";
const PRECACHE = [
"./index.html",
"./bigstore.js",
"./local-server.js",
"./gift.js",
  "./default-me.jpg",
  "./default-ta.jpg",
  "./chat-light.webp", "./chat-harbor.webp",
  "./menu-light.webp", "./menu-harbor.webp",
  "./avatar-sea.png",
  "./wall-blush.jpg",
  "./begin.jpg",
  "./1.jpg",
  "./2.jpg",
  "./ta-media/photo-1.jpg",
  "./ta-media/photo-2.jpg",
  "./ta-media/photo-3.jpg",
  "./ta-media/photo-4.jpg",
  "./ta-media/photo-5.jpg",
  "./ta-media/photo-6.jpg",
  "./ta-media/sticker-1.jpg",
  "./ta-media/sticker-10.jpg",
  "./ta-media/sticker-11.jpg",
  "./ta-media/sticker-12.jpg",
  "./ta-media/sticker-13.jpg",
  "./ta-media/sticker-14.jpg",
  "./ta-media/sticker-15.jpg",
  "./ta-media/sticker-2.jpg",
  "./ta-media/sticker-3.jpg",
  "./ta-media/sticker-4.jpg",
  "./ta-media/sticker-5.jpg",
  "./ta-media/sticker-6.jpg",
  "./ta-media/sticker-7.jpg",
  "./ta-media/sticker-8.jpg",
  "./ta-media/sticker-9.jpg",
  "./ta-media/sticker-happy-1.jpg",
  "./ta-media/sticker-happy-2.jpg",
  "./ta-media/sticker-happy-3.jpg",
  "./ta-media/sticker-happy-4.jpg",
  "./ta-media/sticker-happy-5.jpg",
  "./ta-media/sticker-happy-6.jpg",
  "./ta-media/sticker-happy-7.jpg",
];

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(async (c) => {
        // 寮哄埗璧扮綉缁?cache:reload), 閬垮厤 addAll 鍛戒腑娴忚鍣ㄦ棫 HTTP 缂撳瓨;
        // 鍗曚釜璧勬簮澶辫触涓嶅啀璁╂暣涓缂撳瓨 reject(鍙€夊浘鐗囩己澶变笉褰卞搷澹冲畨瑁?
        for (const url of PRECACHE) {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res && res.ok) await c.put(url, res);
          } catch (_) {}
        }
      })
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // 姘镐笉鎷︽埅 API 璇锋眰: /relay/(鏃ф祦鏈嶅姟) 涓?/api/(鏈」鐩悗绔? 閮界洿杩炵綉缁? 閬垮厤杩斿洖缂撳瓨鏃ф暟鎹?  if (url.pathname.startsWith("/relay/") || url.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    // network-first for the page 鈫?an online reload always gets the latest index.html
    e.respondWith(fetch(e.request, { cache: "reload" }).catch(() => caches.match("./index.html")));
    return;
  }
  if (e.request.method === "GET" && url.origin === location.origin) {
    // JS 走 stale-while-revalidate：有缓存先给（打开快），同时后台拉新版写进缓存，
    // 下一次进来就是新的。老手机浏览器不支持流式、热修复发版频繁，cache-first 会让人长期跑旧代码。
    if (/\.js$/.test(url.pathname)) {
      e.respondWith(
        caches.match(e.request).then((cached) => {
          const network = fetch(e.request, { cache: "reload" })
            .then((res) => {
              if (res && res.ok) {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(e.request, copy));
              }
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      );
      return;
    }
    // 其余静态资源（图片/字体等）维持 cache-first
    e.respondWith(
      caches.match(e.request).then((r) => {
        if (r) return r;
        return fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        });
      })
    );
  }
});

// 鈹€鈹€ Web Push (VAPID) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// The relay sends a push when the AI replies and no PWA tab is holding the stream;
// here we surface it on the lock screen.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (_) { d = { body: (e.data && e.data.text && e.data.text()) || "" }; }
  const title = d.title || AI_NAME;                        // backend sends RELAY_AI_NAME as title
  const body  = d.body  || "浣犳湁涓€鏉℃柊娑堟伅";
  const tag   = d.id ? ("companion-" + d.id) : "companion-msg";
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      icon:  "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [80, 40, 80],
      data: { url: d.url || "./" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    // matchAll only returns clients this SW controls (our own scope), so focus the first one.
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cls) => {
      for (const c of cls) {
        if ("focus" in c){ c.postMessage({ type: "backfill" }); return c.focus(); }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : null;
    })
  );
});

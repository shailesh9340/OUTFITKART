/* ============================================================
   OutfitKart Service Worker — v4
   Push Notifications + Caching
   ============================================================ */

const STATIC_CACHE  = 'outfitkart-static-v4';
const DYNAMIC_CACHE = 'outfitkart-dynamic-v4';
const PRECACHE_URLS = ['./index.html', './script.js', './manifest.json'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE_URLS).catch(()=>{})));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==STATIC_CACHE&&k!==DYNAMIC_CACHE).map(k=>caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;
    const url = new URL(event.request.url);
    if (url.hostname.includes('supabase.co')||url.hostname.includes('razorpay.com')||url.hostname.includes('imgbb.com')||url.hostname.includes('scrapingbee.com')) return;
    if (event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(fetch(event.request).then(res=>{caches.open(STATIC_CACHE).then(c=>c.put(event.request,res.clone()));return res;}).catch(()=>caches.match('./index.html')));
        return;
    }
    if (url.pathname.match(/\.(js|css|woff2?)$/)) {
        event.respondWith(caches.open(STATIC_CACHE).then(cache=>cache.match(event.request).then(cached=>{const fresh=fetch(event.request).then(res=>{cache.put(event.request,res.clone());return res;});return cached||fresh;})));
        return;
    }
    if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/)||url.hostname.includes('placehold.co')||url.hostname.includes('ibb.co')) {
        event.respondWith(caches.open(DYNAMIC_CACHE).then(cache=>cache.match(event.request).then(cached=>{if(cached)return cached;return fetch(event.request).then(res=>{if(res.ok)cache.put(event.request,res.clone());return res;}).catch(()=>cached);})));
        return;
    }
    event.respondWith(fetch(event.request).then(res=>{if(res.ok)caches.open(DYNAMIC_CACHE).then(c=>c.put(event.request,res.clone()));return res;}).catch(()=>caches.match(event.request)));
});

/* ── PUSH NOTIFICATION RECEIVE ───────────────────────────── */
self.addEventListener('push', event => {
    if (!event.data) return;
    let payload;
    try { payload = event.data.json(); } catch { payload = { title: 'OutfitKart', body: event.data.text() }; }
    const title   = payload.title || 'OutfitKart 🛍️';
    const options = {
        body:    payload.body  || 'Aapke liye kuch khaas hai!',
        icon:    payload.icon  || 'https://placehold.co/192x192/e11d48/ffffff?text=OK',
        badge:   payload.badge || 'https://placehold.co/96x96/e11d48/ffffff?text=OK',
        image:   payload.image || undefined,
        tag:     payload.tag   || 'outfitkart',
        renotify: true,
        vibrate: [200,100,200],
        requireInteraction: false,
        data: {
            url:     payload.url     || './',
            pid:     payload.pid     || null,
            orderId: payload.orderId || null,
        },
        actions: [
            { action: 'open',    title: '🛍️ Open App' },
            { action: 'dismiss', title: '✕ Dismiss'   },
        ],
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

/* ── NOTIFICATION CLICK ──────────────────────────────────── */
self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || './';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            /* If app already open — focus and navigate */
            for (const c of list) {
                if ('focus' in c) {
                    c.focus();
                    c.postMessage({
                        type:    'NOTIFICATION_CLICK',
                        url:     targetUrl,
                        pid:     event.notification.data?.pid  || null,
                        orderId: event.notification.data?.orderId || null,
                    });
                    return;
                }
            }
            /* Open new window with the product/order URL */
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

/* ============================================================
   OutfitKart Service Worker — v3
   Works on: iPhone (Safari), Android (Chrome), Windows (Edge/Chrome)
   ============================================================ */

const CACHE_NAME     = 'outfitkart-v3';
const STATIC_CACHE   = 'outfitkart-static-v3';
const DYNAMIC_CACHE  = 'outfitkart-dynamic-v3';

/* Files to cache on install */
const PRECACHE_URLS = [
    './index.html',
    './script.js',
    './manifest.json',
];

/* External CDN URLs to cache */
const CDN_CACHE_URLS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

/* ── INSTALL ────────────────────────────────────────────── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            return cache.addAll(PRECACHE_URLS).catch(err => {
                console.warn('[SW] Precache failed:', err);
            });
        })
    );
    self.skipWaiting();
});

/* ── ACTIVATE ───────────────────────────────────────────── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
                    .map(k => {
                        console.log('[SW] Deleting old cache:', k);
                        return caches.delete(k);
                    })
            )
        )
    );
    self.clients.claim();
});

/* ── FETCH ──────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    /* Skip non-GET and non-http */
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    /* Skip Supabase API calls — always fetch live */
    if (url.hostname.includes('supabase.co')) return;

    /* Skip Razorpay */
    if (url.hostname.includes('razorpay.com')) return;

    /* Skip ImgBB */
    if (url.hostname.includes('imgbb.com')) return;

    /* Skip ScrapingBee */
    if (url.hostname.includes('scrapingbee.com')) return;

    /* HTML pages — Network first, fallback to cache */
    if (event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    /* JS / CSS — Stale-while-revalidate */
    if (
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.woff')
    ) {
        event.respondWith(
            caches.open(STATIC_CACHE).then(cache =>
                cache.match(event.request).then(cached => {
                    const fetchPromise = fetch(event.request).then(response => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                    return cached || fetchPromise;
                })
            )
        );
        return;
    }

    /* Images — Cache first */
    if (
        url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/) ||
        url.hostname.includes('placehold.co') ||
        url.hostname.includes('unsplash.com') ||
        url.hostname.includes('ibb.co')
    ) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE).then(cache =>
                cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request).then(response => {
                        if (response.ok) cache.put(event.request, response.clone());
                        return response;
                    }).catch(() => cached);
                })
            )
        );
        return;
    }

    /* Everything else — Network first with cache fallback */
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

/* ── PUSH NOTIFICATIONS (future use) ───────────────────── */
self.addEventListener('push', event => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'OutfitKart', {
            body:    data.body    || 'You have a new update!',
            icon:    data.icon   || 'https://placehold.co/192x192/e11d48/ffffff?text=OK',
            badge:   data.badge  || 'https://placehold.co/96x96/e11d48/ffffff?text=OK',
            vibrate: [200, 100, 200],
            data:    { url: data.url || './' },
            actions: [
                { action: 'open',    title: 'Open App' },
                { action: 'dismiss', title: 'Dismiss'  },
            ],
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;
    const url = event.notification.data?.url || './';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

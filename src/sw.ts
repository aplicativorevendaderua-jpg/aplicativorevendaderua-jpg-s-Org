import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const BADGE_CACHE = 'flux-badge-cache';
const BADGE_KEY = '/__flux_badge_count__';

async function getBadgeCount(): Promise<number> {
  const cache = await caches.open(BADGE_CACHE);
  const res = await cache.match(BADGE_KEY);
  if (!res) return 0;
  try {
    const json = (await res.json()) as { count?: unknown };
    const count = Number(json?.count ?? 0);
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

async function setBadgeCount(count: number): Promise<void> {
  const cache = await caches.open(BADGE_CACHE);
  await cache.put(
    BADGE_KEY,
    new Response(JSON.stringify({ count: Math.max(0, Math.trunc(count)) }), {
      headers: { 'content-type': 'application/json' },
    }),
  );
}

async function setAppBadge(count: number): Promise<void> {
  const reg: any = self.registration as any;
  if (typeof reg?.setAppBadge === 'function') {
    await reg.setAppBadge(count);
  }
}

async function clearAppBadge(): Promise<void> {
  const reg: any = self.registration as any;
  if (typeof reg?.clearAppBadge === 'function') {
    await reg.clearAppBadge();
  }
}

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(
    (async () => {
      let payload: any = {};
      try {
        payload = event.data?.json() ?? {};
      } catch {
        payload = { body: event.data?.text?.() };
      }

      const title = String(payload?.title ?? 'FLUX');
      const body = String(payload?.body ?? 'Você tem uma nova notificação.');
      const data = (payload?.data && typeof payload.data === 'object') ? payload.data : {};
      const orderId = data.orderId ?? data.order_id ?? null;
      const url = typeof data.url === 'string'
        ? data.url
        : orderId
          ? `/#/orders?orderId=${encodeURIComponent(String(orderId))}`
          : '/';

      const tag = typeof payload?.tag === 'string'
        ? payload.tag
        : orderId
          ? `order-${String(orderId)}`
          : `flux-${Date.now()}`;

      await self.registration.showNotification(title, {
        body,
        icon: '/icon.png',
        badge: '/pwa-72x72.png',
        data: { ...data, url, orderId },
        tag,
        renotify: true,
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
      } as any);

      const next = (await getBadgeCount()) + 1;
      await setBadgeCount(next);
      await setAppBadge(next);

      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        (client as any).postMessage?.({ type: 'PUSH_RECEIVED', badgeCount: next });
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = (event.notification as any)?.data?.url ?? '/';

      await setBadgeCount(0);
      await clearAppBadge();

      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client) {
          await (client as WindowClient).focus();
          (client as any).postMessage?.({ type: 'NOTIFICATION_CLICKED', url });
          return;
        }
      }

      await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const msg = (event.data && typeof event.data === 'object') ? event.data : null;
  const type = msg?.type;

  if (type === 'GET_BADGE_COUNT') {
    event.waitUntil(
      (async () => {
        const count = await getBadgeCount();
        (event.source as any)?.postMessage?.({ type: 'BADGE_COUNT', count });
      })(),
    );
    return;
  }

  if (type === 'SET_BADGE_COUNT') {
    event.waitUntil(
      (async () => {
        const count = Number(msg?.count ?? 0);
        const normalized = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
        await setBadgeCount(normalized);
        await setAppBadge(normalized);
      })(),
    );
    return;
  }

  if (type === 'CLEAR_BADGE') {
    event.waitUntil(
      (async () => {
        await setBadgeCount(0);
        await clearAppBadge();
      })(),
    );
  }
});


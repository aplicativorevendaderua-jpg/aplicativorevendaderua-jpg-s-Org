import { SupabaseClient } from '@supabase/supabase-js';

type PushSubscriptionUpsert = {
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | null;
  user_agent: string | null;
  active: boolean;
};

function base64FromArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function urlBase64ToUint8Array(base64UrlString: string): Uint8Array {
  const padding = '='.repeat((4 - (base64UrlString.length % 4)) % 4);
  const base64 = (base64UrlString + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return await Notification.requestPermission();
}

export async function ensurePushSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  if (!isPushSupported()) return;

  const publicVapidKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
  if (!publicVapidKey) return;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing
    ? existing
    : await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey) as unknown as BufferSource,
      });

  const json = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh =
    json.keys?.p256dh ??
    (subscription.getKey('p256dh') ? base64FromArrayBuffer(subscription.getKey('p256dh') as ArrayBuffer) : '');
  const auth =
    json.keys?.auth ??
    (subscription.getKey('auth') ? base64FromArrayBuffer(subscription.getKey('auth') as ArrayBuffer) : '');

  if (!endpoint || !p256dh || !auth) return;

  const payload: PushSubscriptionUpsert = {
    endpoint,
    p256dh,
    auth,
    expiration_time: (json as any).expirationTime ?? null,
    user_agent: navigator.userAgent ?? null,
    active: true,
  };

  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      ...payload,
      updated_at: new Date().toISOString(),
    } as any,
    { onConflict: 'user_id,endpoint' } as any,
  );
}

export async function setAppBadge(count: number): Promise<void> {
  const nav: any = navigator as any;
  if (typeof nav?.setAppBadge === 'function') {
    await nav.setAppBadge(Math.max(0, Math.trunc(count)));
  }

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SET_BADGE_COUNT', count });
  }
}

export async function clearAppBadge(): Promise<void> {
  const nav: any = navigator as any;
  if (typeof nav?.clearAppBadge === 'function') {
    await nav.clearAppBadge();
  }

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_BADGE' });
  }
}

export function listenToServiceWorkerMessages(handlers: {
  onBadgeCount?: (count: number) => void;
  onNotificationClicked?: (url: string) => void;
}): () => void {
  const listener = (event: MessageEvent) => {
    const msg = event.data && typeof event.data === 'object' ? event.data : null;
    if (!msg) return;
    if (msg.type === 'BADGE_COUNT' && typeof msg.count === 'number') handlers.onBadgeCount?.(msg.count);
    if (msg.type === 'PUSH_RECEIVED' && typeof msg.badgeCount === 'number') handlers.onBadgeCount?.(msg.badgeCount);
    if (msg.type === 'NOTIFICATION_CLICKED' && typeof msg.url === 'string') handlers.onNotificationClicked?.(msg.url);
  };
  navigator.serviceWorker?.addEventListener?.('message', listener);
  return () => navigator.serviceWorker?.removeEventListener?.('message', listener);
}

export async function requestBadgeCountFromServiceWorker(): Promise<void> {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: 'GET_BADGE_COUNT' });
}


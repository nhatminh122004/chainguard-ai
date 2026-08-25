/**
 * Push Notifications Service — ChainGuard AI
 * Uses Firebase Cloud Messaging (FCM) — FREE on Spark plan
 * Also supports browser Notification API as fallback
 */

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || '';

// === PERMISSION ===

export type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission as NotificationPermission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    throw new Error('Trình duyệt không hỗ trợ notifications');
  }

  const permission = await Notification.requestPermission();
  return permission as NotificationPermission;
}

// === FCM TOKEN ===

/**
 * Get FCM token for push notifications
 * Returns null if FCM is not configured or not supported
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported || !VAPID_KEY || VAPID_KEY === 'placeholder') return null;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token;
  } catch (err) {
    console.warn('FCM token error:', err);
    return null;
  }
}

/**
 * Listen for foreground FCM messages
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  try {
    if (typeof window === 'undefined') return null;
    
    // Check async support but set up listener optimistically
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
      // Also show a browser notification for foreground messages
      if (payload.notification) {
        showLocalNotification(
          payload.notification.title || 'ChainGuard AI',
          payload.notification.body || '',
          payload.notification.icon
        );
      }
    });
    return unsubscribe;
  } catch {
    return null;
  }
}

// === LOCAL NOTIFICATIONS (no FCM needed) ===

/**
 * Show a local browser notification immediately
 * Works without FCM — uses the browser Notification API directly
 */
export function showLocalNotification(
  title: string,
  body: string,
  icon?: string,
  tag?: string,
  onClick?: () => void
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  const notification = new Notification(title, {
    body,
    icon: icon || '/icon.svg',
    badge: '/icon.svg',
    tag: tag || 'chainguard-' + Date.now(),
    requireInteraction: false,
    silent: false,
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  // Auto-close after 8 seconds
  setTimeout(() => notification.close(), 8000);

  return notification;
}

// === PRESET NOTIFICATIONS ===

/**
 * Send a fraud alert notification
 */
export function notifyFraudAlert(transactionName: string, reason: string) {
  return showLocalNotification(
    '🚨 Cảnh báo gian lận!',
    `${transactionName}: ${reason}`,
    undefined,
    'fraud-alert'
  );
}

/**
 * Send a transaction verified notification
 */
export function notifyTransactionVerified(name: string, txHash?: string) {
  return showLocalNotification(
    '✅ Giao dịch đã verified!',
    `${name} đã được ghi on-chain${txHash ? ' • ' + txHash.slice(0, 10) + '...' : ''}`,
    undefined,
    'tx-verified'
  );
}

/**
 * Send a credit score change notification
 */
export function notifyCreditScoreChange(oldScore: number, newScore: number) {
  const direction = newScore > oldScore ? '📈 Tăng' : '📉 Giảm';
  return showLocalNotification(
    `${direction} Credit Score`,
    `${oldScore} → ${newScore} (${newScore > oldScore ? '+' : ''}${newScore - oldScore} điểm)`,
    undefined,
    'credit-score'
  );
}

/**
 * Send a payment reminder notification
 */
export function notifyPaymentReminder(name: string, amount: string) {
  return showLocalNotification(
    '💰 Nhắc thanh toán',
    `${name}: ${amount}`,
    undefined,
    'payment-reminder'
  );
}

/**
 * Send a test notification
 */
export function sendTestNotification() {
  return showLocalNotification(
    '🛡️ ChainGuard AI',
    'Push notification hoạt động! Bạn sẽ nhận thông báo khi có cảnh báo gian lận, giao dịch verified, hoặc thay đổi credit score.',
    undefined,
    'test-notification'
  );
}

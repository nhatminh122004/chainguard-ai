// Firebase Cloud Messaging Service Worker
// Handles background push notifications for ChainGuard AI

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCG2CruZYRhnx8R_q3_1t_HBKBO5Tb21Zk',
  authDomain: 'chainguard-ai-489c3.firebaseapp.com',
  projectId: 'chainguard-ai-489c3',
  storageBucket: 'chainguard-ai-489c3.firebasestorage.app',
  messagingSenderId: '106184315643',
  appId: '1:106184315643:web:998c618993fdd73b57165e',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || '🛡️ ChainGuard AI';
  const body = payload.notification?.body || 'Bạn có thông báo mới';

  const options = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.data?.tag || 'chainguard-bg',
    data: payload.data,
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Mở ChainGuard' },
      { action: 'dismiss', title: 'Bỏ qua' },
    ],
  };

  self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('localhost') || client.url.includes('chainguard')) {
          return client.focus();
        }
      }
      return clients.openWindow('/dashboard');
    })
  );
});

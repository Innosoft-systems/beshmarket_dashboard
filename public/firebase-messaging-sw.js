importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

// Config ni /api/firebase-config dan olamiz
self.addEventListener('install', () => self.skipWaiting());

async function initFirebase() {
  try {
    const res = await fetch('/api/firebase-config');
    if (!res.ok) return;
    const config = await res.json();
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (!title) return;
      const imageUrl = payload.data?.image_url || payload.notification?.image;
      self.registration.showNotification(title, {
        body: body || '',
        icon: '/favicon.ico',
        data: payload.data,
        ...(imageUrl ? { image: imageUrl } : {}),
      });
    });
  } catch (e) {
    console.error('Firebase SW init failed', e);
  }
}

initFirebase();

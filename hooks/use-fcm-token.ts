"use client"

import { useEffect } from "react"
import { initializeApp, getApps } from "firebase/app"
import { getMessaging, getToken, onMessage } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

function getOrCreateDeviceId(): string {
  const key = "fcm_device_id"
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function useFcmToken(accessToken: string | null) {
  useEffect(() => {
    if (!accessToken) return
    if (typeof window === "undefined" || !("Notification" in window)) return

    const init = async () => {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== "granted") return

        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
        const messaging = getMessaging(app)

        const token = await getToken(messaging, { vapidKey: VAPID_KEY })
        if (!token) return

        const deviceId = getOrCreateDeviceId()
        const storedToken = localStorage.getItem("fcm_token")

        if (storedToken !== token) {
          // Token changed or first time — (re)register with stable device_id so backend
          // can update the existing row rather than creating a duplicate.
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/my/device-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ token, platform: "web", device_name: "Dashboard", device_id: deviceId }),
          })
          localStorage.setItem("fcm_token", token)
        }

        // Foreground messages: WS already shows toasts via useAdminSocket.
        // Register the handler only to prevent the default browser notification
        // from firing while the tab is focused (onMessage suppresses it).
        onMessage(messaging, () => { /* intentionally suppress foreground FCM toast — WS handles it */ })
      } catch (e) {
        console.error("FCM init failed", e)
      }
    }

    init()
  }, [accessToken])
}

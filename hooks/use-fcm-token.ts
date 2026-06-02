"use client"

import { useEffect } from "react"
import { initializeApp, getApps } from "firebase/app"
import { getMessaging, getToken, onMessage } from "firebase/messaging"
import { toast } from "sonner"

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

async function registerDeviceToken(accessToken: string, fcmToken: string, deviceId: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/my/device-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ token: fcmToken, platform: "web", device_name: "Dashboard", device_id: deviceId }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Registration failed: ${res.status}`)
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

        const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY })
        if (!fcmToken) return

        const deviceId = getOrCreateDeviceId()
        const storedToken = localStorage.getItem("fcm_token")

        if (storedToken !== fcmToken) {
          try {
            await registerDeviceToken(accessToken, fcmToken, deviceId)
            localStorage.setItem("fcm_token", fcmToken)
          } catch (err) {
            // Non-fatal: app works but push notifications won't arrive
            console.error("FCM device registration failed", err)
            toast.warning("Push bildirishnomalar ishlamaydi — keyinroq urinib ko'ring", { duration: 4000 })
          }
        }

        // Suppress browser's default foreground notification — WS handles toasts
        onMessage(messaging, () => { /* intentionally empty */ })
      } catch (e) {
        console.error("FCM init failed", e)
      }
    }

    init()
  }, [accessToken])
}

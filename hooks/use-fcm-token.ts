"use client"

import { useEffect } from "react"
import { initializeApp, getApps, type FirebaseOptions } from "firebase/app"
import { getMessaging, getToken, isSupported, onMessage, type Unsubscribe } from "firebase/messaging"
import { toast } from "sonner"

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

function getFirebaseConfig(): FirebaseOptions | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  const isComplete = Object.values(config).every(
    (value) => typeof value === "string" && value.trim().length > 0,
  )

  return isComplete ? config as FirebaseOptions : null
}

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

    const config = getFirebaseConfig()
    if (!config || !VAPID_KEY?.trim()) return

    let cancelled = false
    let unsubscribe: Unsubscribe | undefined

    const init = async () => {
      try {
        if (!(await isSupported()) || cancelled) return

        const permission = await Notification.requestPermission()
        if (permission !== "granted" || cancelled) return

        const app = getApps().length ? getApps()[0] : initializeApp(config)
        const messaging = getMessaging(app)

        const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY })
        if (!fcmToken || cancelled) return

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
        unsubscribe = onMessage(messaging, () => { /* intentionally empty */ })
      } catch (e) {
        if (!cancelled) console.error("FCM init failed", e)
      }
    }

    init()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [accessToken])
}

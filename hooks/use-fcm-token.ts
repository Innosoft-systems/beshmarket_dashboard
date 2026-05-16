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

        // Avval register bo'lgan token bilan taqqoslash
        const storedToken = localStorage.getItem("fcm_token")
        if (storedToken === token) {
          // Allaqachon register qilingan — faqat foreground listener qo'shamiz
          onMessage(messaging, (payload) => {
            toast.info(payload.notification?.title || "Yangi xabar", {
              description: payload.notification?.body,
              duration: 5000,
            })
          })
          return
        }

        // Yangi token — register qilamiz
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/my/device-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ token, platform: "web", device_name: "Dashboard" }),
        })
        localStorage.setItem("fcm_token", token)

        onMessage(messaging, (payload) => {
          toast.info(payload.notification?.title || "Yangi xabar", {
            description: payload.notification?.body,
            duration: 5000,
          })
        })
      } catch (e) {
        console.error("FCM init failed", e)
      }
    }

    init()
  }, [accessToken])
}

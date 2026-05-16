"use client"

import { useEffect, useCallback } from "react"
import { io } from "socket.io-client"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export interface AdminNotificationPayload {
  _id: string
  type: string
  title: string
  body: string
  data?: Record<string, string>
  is_read: boolean
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  new_order: "🛒",
  order_cancelled: "❌",
  new_review: "⭐",
  new_penalty: "⚠️",
  new_courier: "🚴",
}

let globalSocket: ReturnType<typeof io> | null = null

export function useAdminSocket(
  accessToken: string | null,
  onNotification: (n: AdminNotificationPayload) => void,
) {
  const stableCallback = useCallback(onNotification, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!accessToken) return
    if (globalSocket?.connected) {
      globalSocket.on("admin.notification", stableCallback)
      return () => { globalSocket?.off("admin.notification", stableCallback) }
    }

    const socket = io(`${API_URL}/orders`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })

    socket.on("connect", () => {
      globalSocket = socket
    })

    socket.on("admin.notification", (payload: AdminNotificationPayload) => {
      stableCallback(payload)
      const icon = TYPE_ICONS[payload.type] || "🔔"
      toast.info(`${icon} ${payload.title}`, {
        description: payload.body,
        duration: 6000,
        action: payload.data?.link
          ? { label: "Ko'rish", onClick: () => { if (typeof window !== "undefined") window.location.href = payload.data!.link } }
          : undefined,
      })
    })

    return () => {
      socket.off("admin.notification", stableCallback)
      // Socket ni yopmang — boshqa joylarda ham ishlash kerak
    }
  }, [accessToken, stableCallback])
}

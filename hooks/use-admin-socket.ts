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
  actor_user_id?: string
}

const TYPE_ICONS: Record<string, string> = {
  new_order: "🛒",
  order_cancelled: "❌",
  new_review: "⭐",
  new_penalty: "⚠️",
  new_courier: "🚴",
}

let globalSocket: ReturnType<typeof io> | null = null
let globalToken: string | null = null

export function useAdminSocket(
  accessToken: string | null,
  onNotification: (n: AdminNotificationPayload) => void,
  currentUserId?: string,
) {
  const stableCallback = useCallback(onNotification, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!accessToken) return

    // Reuse existing socket if already established for this token
    if (globalSocket && globalToken === accessToken) {
      globalSocket.off("admin.notification")
      globalSocket.on("admin.notification", (payload: AdminNotificationPayload) => {
        if (currentUserId && payload.actor_user_id === currentUserId) return
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
      return () => { globalSocket?.off("admin.notification") }
    }

    // Token changed — disconnect stale socket before creating a new one
    if (globalSocket && globalToken !== accessToken) {
      globalSocket.disconnect()
      globalSocket = null
      globalToken = null
    }

    const socket = io(`${API_URL}/orders`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })
    globalSocket = socket
    globalToken = accessToken

    socket.on("admin.notification", (payload: AdminNotificationPayload) => {
      if (currentUserId && payload.actor_user_id === currentUserId) return
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

    socket.on("order.new", (payload: { orderNumber: string; restaurantName?: string; total: number }) => {
      toast.info(`🛒 Yangi buyurtma: ${payload.orderNumber}`, {
        description: payload.restaurantName ? `${payload.restaurantName} — ${payload.total.toLocaleString()} so'm` : `${payload.total.toLocaleString()} so'm`,
        duration: 10000,
      })
    })

    return () => {
      socket.off("admin.notification")
    }
  }, [accessToken, stableCallback, currentUserId])
}

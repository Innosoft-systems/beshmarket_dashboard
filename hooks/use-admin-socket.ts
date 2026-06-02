"use client"

import { useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { toast } from "sonner"
import { refreshAccessToken } from "@/lib/auth/refresh-client"
import { isSafeInternalUrl } from "@/lib/utils/safe-url"

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

// Singleton socket shared across re-renders to avoid reconnects on navigation.
// Cleaned up only when token changes (logout/login cycle).
let globalSocket: ReturnType<typeof io> | null = null
let globalToken: string | null = null

export function useAdminSocket(
  accessToken: string | null,
  onNotification: (n: AdminNotificationPayload) => void,
  currentUserId?: string,
) {
  // useRef avoids stale closure — callback always up-to-date without re-subscribing
  const onNotificationRef = useRef(onNotification)
  const currentUserIdRef = useRef(currentUserId)
  useEffect(() => { onNotificationRef.current = onNotification }, [onNotification])
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])

  useEffect(() => {
    if (!accessToken) return

    function attachListeners(socket: ReturnType<typeof io>) {
      socket.off("admin.notification")
      socket.off("order.new")

      socket.on("admin.notification", (payload: AdminNotificationPayload) => {
        if (currentUserIdRef.current && payload.actor_user_id === currentUserIdRef.current) return
        onNotificationRef.current(payload)
        const icon = TYPE_ICONS[payload.type] || "🔔"
        toast.info(`${icon} ${payload.title}`, {
          description: payload.body,
          duration: 6000,
          action: payload.data?.link
            ? {
                label: "Ko'rish",
                onClick: () => {
                  if (typeof window !== "undefined" && isSafeInternalUrl(payload.data?.link)) {
                    window.location.href = payload.data!.link
                  }
                },
              }
            : undefined,
        })
      })

      socket.on("order.new", (payload: { orderNumber: string; restaurantName?: string; total: number }) => {
        toast.info(`🛒 Yangi buyurtma: ${payload.orderNumber}`, {
          description: payload.restaurantName
            ? `${payload.restaurantName} — ${payload.total.toLocaleString()} so'm`
            : `${payload.total.toLocaleString()} so'm`,
          duration: 10000,
        })
      })
    }

    // Reuse existing socket if token unchanged
    if (globalSocket && globalToken === accessToken) {
      attachListeners(globalSocket)
      return () => {
        globalSocket?.off("admin.notification")
        globalSocket?.off("order.new")
      }
    }

    // Token changed — disconnect stale socket
    if (globalSocket) {
      globalSocket.disconnect()
      globalSocket = null
      globalToken = null
    }

    const socket = io(`${API_URL}/orders`, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    })
    globalSocket = socket
    globalToken = accessToken

    attachListeners(socket)

    socket.on("connect_error", async (err) => {
      const isAuthError = err.message?.toLowerCase().includes("auth") ||
        (err as unknown as { data?: { statusCode?: number } }).data?.statusCode === 401

      if (!isAuthError) return

      const newToken = await refreshAccessToken()
      if (!newToken) {
        // Refresh failed — redirect to login
        if (typeof window !== "undefined") window.location.href = "/login"
        return
      }

      // Reconnect with fresh token
      globalSocket?.disconnect()
      globalSocket = null
      globalToken = null

      const newSocket = io(`${API_URL}/orders`, {
        auth: { token: newToken },
        transports: ["websocket"],
        reconnectionAttempts: 5,
      })
      globalSocket = newSocket
      globalToken = newToken
      attachListeners(newSocket)
    })

    return () => {
      socket.off("admin.notification")
      socket.off("order.new")
    }
  }, [accessToken])
}

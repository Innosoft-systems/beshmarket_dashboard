"use client"

import { useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { refreshAccessToken } from "@/lib/auth/refresh-client"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

function useThrottledCallback<T extends (...args: unknown[]) => void>(fn: T, wait: number): T {
  const lastRun = useRef(0)
  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastRun.current >= wait) {
        lastRun.current = now
        fn(...args)
      }
    },
    [fn, wait],
  ) as T
}

export function useRestaurantSocket(accessToken: string | null) {
  const router = useRouter()
  const socketRef = useRef<Socket | null>(null)

  const throttledRefresh = useThrottledCallback(() => router.refresh(), 2000)

  useEffect(() => {
    if (!accessToken) return

    function createSocket(token: string): Socket {
      const socket = io(`${API_URL}/orders`, {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
      })

      socket.on("order.new", (payload: { orderId: string; orderNumber: string; total: number }) => {
        toast.info(`Yangi buyurtma: ${payload.orderNumber}`, {
          description: `${payload.total.toLocaleString()} so'm`,
          duration: 15000,
          action: {
            label: "Ko'rish",
            onClick: () => router.push(`/restaurant/orders/${payload.orderId}`),
          },
        })
        throttledRefresh()
      })

      socket.on("order.status.updated", () => {
        throttledRefresh()
      })

      socket.on("connect_error", async (err) => {
        const isAuthError = err.message?.toLowerCase().includes("auth") ||
          (err as unknown as { data?: { statusCode?: number } }).data?.statusCode === 401

        if (!isAuthError) return

        const newToken = await refreshAccessToken()
        if (!newToken) {
          if (typeof window !== "undefined") window.location.href = "/restaurant/login"
          return
        }

        socket.disconnect()
        socketRef.current = createSocket(newToken)
      })

      return socket
    }

    socketRef.current = createSocket(accessToken)

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps
}

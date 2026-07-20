"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { refreshAccessToken } from "@/lib/auth/refresh-client"
import { DEFAULT_ORDER_SOUND_URL, fetchOrderSoundUrl } from "@/lib/order-sound"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export interface NewOrderPayload {
  orderId: string
  orderNumber: string
  restaurantName: string
  total: number
  groupId?: string
}

export interface StatusUpdatedPayload {
  orderId: string
  status: string
  orderNumber?: string
  updatedAt: string
}

interface UseOrderSocketOptions {
  onNewOrder?: (payload: NewOrderPayload) => void
  onStatusUpdated?: (payload: StatusUpdatedPayload) => void
}

export function useOrderSocket(
  accessToken: string | null,
  options: UseOrderSocketOptions = {},
) {
  const socketRef = useRef<Socket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onNewOrderRef = useRef(options.onNewOrder)
  const onStatusUpdatedRef = useRef(options.onStatusUpdated)

  useEffect(() => { onNewOrderRef.current = options.onNewOrder }, [options.onNewOrder])
  useEffect(() => { onStatusUpdatedRef.current = options.onStatusUpdated }, [options.onStatusUpdated])

  useEffect(() => {
    if (!accessToken) return

    let active = true
    audioRef.current = new Audio(DEFAULT_ORDER_SOUND_URL)
    fetchOrderSoundUrl().then((url) => {
      if (active) audioRef.current = new Audio(url)
    })

    function createSocket(token: string): Socket {
      const socket = io(`${API_URL}/orders`, {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
      })

      socket.on("order.new", (payload: NewOrderPayload) => {
        audioRef.current?.play().catch(() => {})
        toast.info(`🛒 Yangi buyurtma: ${payload.orderNumber}`, {
          description: `${payload.restaurantName} — ${payload.total.toLocaleString()} so'm`,
          duration: 10000,
          action: {
            label: "Ko'rish",
            onClick: () => { window.location.href = `/orders` },
          },
        })
        onNewOrderRef.current?.(payload)
      })

      socket.on("order.status.updated", (payload: StatusUpdatedPayload) => {
        onStatusUpdatedRef.current?.(payload)
      })

      socket.on("connect_error", async (err) => {
        const isAuthError = err.message?.toLowerCase().includes("auth") ||
          (err as unknown as { data?: { statusCode?: number } }).data?.statusCode === 401

        if (!isAuthError) return

        const newToken = await refreshAccessToken()
        if (!newToken) {
          if (typeof window !== "undefined") window.location.href = "/login"
          return
        }

        socket.disconnect()
        socketRef.current = createSocket(newToken)
      })

      return socket
    }

    socketRef.current = createSocket(accessToken)

    return () => {
      active = false
      socketRef.current?.disconnect()
      socketRef.current = null
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [accessToken])
}

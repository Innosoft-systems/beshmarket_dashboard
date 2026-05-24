"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"

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

    audioRef.current = new Audio("/sounds/order_sound.wav")

    const socket = io(`${API_URL}/orders`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })

    socket.on("connect", () => {
      console.log("[WS] Connected to orders namespace")
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

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken])
}
